import {
  SGSR2_CONVERT_WGSL,
  SGSR2_UPSCALE_WGSL,
} from "../shaders/sgsr2-compute.wgsl.js";
import { checkedModule } from "./webgpu/passes.js";

export class SGSR2Compute {
  constructor(device, resources) {
    this.device = device;
    this.resources = resources;
    this.ping = 0;
    this.dispatches = 0;
    this.params = new ArrayBuffer(80);
    this.floats = new Float32Array(this.params);
    this.uints = new Uint32Array(this.params);
    this.uniform = device.createBuffer({
      label: "SGSR2 parameters",
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.sampler = device.createSampler({
      minFilter: "linear",
      magFilter: "linear",
    });
  }
  async init() {
    const uniform = {
      binding: 0,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "uniform" },
    };
    const texture = (binding, sampleType = "float") => ({
      binding,
      visibility: GPUShaderStage.COMPUTE,
      texture: { sampleType },
    });
    const storage = (binding, format) => ({
      binding,
      visibility: GPUShaderStage.COMPUTE,
      storageTexture: { access: "write-only", format },
    });
    this.convertLayout = this.device.createBindGroupLayout({
      entries: [
        uniform,
        texture(1),
        texture(2, "depth"),
        texture(3),
        texture(4),
        storage(5, "rgba16float"),
        storage(6, "r32uint"),
        storage(7, "r32float"),
      ],
    });
    this.upscaleLayout = this.device.createBindGroupLayout({
      entries: [
        uniform,
        texture(1),
        texture(2),
        texture(3, "uint"),
        texture(4, "unfilterable-float"),
        storage(5, "rgba16float"),
        storage(6, "rgba16float"),
        { binding: 7, visibility: GPUShaderStage.COMPUTE, sampler: {} },
      ],
    });
    for (const [name, code, layout] of [
      ["convert", SGSR2_CONVERT_WGSL, this.convertLayout],
      ["upscale", SGSR2_UPSCALE_WGSL, this.upscaleLayout],
    ]) {
      const module = await checkedModule(this.device, code, `SGSR2 ${name}`);
      this[name] = await this.device.createComputePipelineAsync({
        label: `SGSR2 ${name}`,
        layout: this.device.createPipelineLayout({
          bindGroupLayouts: [layout],
        }),
        compute: { module, entryPoint: "main" },
      });
    }
  }
  reconstruct(encoder, color, depth, velocity, temporal, profiler) {
    const { width: w, height: h, outputWidth: ow, outputHeight: oh } = temporal;
    const get = (name, x, y, format = "rgba16float", storage = true) =>
      this.resources.get(`sgsr-${name}`, x, y, format, storage);
    const converted = get("converted", w, h),
      packed = get("ycocg", w, h, "r32uint"),
      rejection = get("rejection", w, h, "r32float");
    const histories = [get("history-a", ow, oh), get("history-b", ow, oh)];
    const geometry = get("geometry", w, h, "rgba16float", false);
    const output = get("output", ow, oh);
    this.uints.set([w, h, ow, oh]);
    this.floats.set(
      [
        1 / w,
        1 / h,
        1 / ow,
        1 / oh,
        temporal.jitter.x,
        temporal.jitter.y,
        1,
        1 / Math.max(temporal.projection.elements[0], 1e-5),
        temporal.stillFrames > 5 ? 0.5 : 0,
      ],
      4,
    );
    this.uints.set(
      [temporal.stillFrames, temporal.valid ? 0 : 1, temporal.valid ? 1 : 0],
      13,
    );
    this.floats.set(temporal.jitterUV.toArray(), 16);
    this.device.queue.writeBuffer(this.uniform, 0, this.params);
    const textures = [color,depth,velocity,geometry,converted,packed,rejection,
      histories[0],histories[1],output];
    if (!this.bindingTextures || textures.some((t,i)=>t!==this.bindingTextures[i])) {
    this.bindingTextures = textures;
    const view = (t) => t.view ?? t.createView();
    this.convertGroup = this.device.createBindGroup({
      layout: this.convertLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniform } },
        ...[color, depth, velocity, geometry, converted, packed, rejection].map(
          (t, i) => ({ binding: i + 1, resource: view(t) }),
        ),
      ],
    });
    this.upscaleGroups = [0,1].map(ping=>this.device.createBindGroup({
      layout: this.upscaleLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniform } },
        ...[
          histories[ping],
          converted,
          packed,
          rejection,
          output,
          histories[1 - ping],
        ].map((t, i) => ({ binding: i + 1, resource: view(t) })),
        { binding: 7, resource: this.sampler },
      ],
    }));
    }
    for (const [name, pipeline, group, x, y] of [
      ["convert", this.convert, this.convertGroup, w, h],
      ["upscale", this.upscale, this.upscaleGroups[this.ping], ow, oh],
    ]) {
      const pass = encoder.beginComputePass({
        label: `SGSR2 ${name}`,
        ...profiler?.descriptor(`sgsr2-${name}`),
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, group);
      const groupSize = 16;
      pass.dispatchWorkgroups(
        Math.ceil(x / groupSize),
        Math.ceil(y / groupSize),
      );
      pass.end();
      this.dispatches++;
    }
    this.previousHistory = histories[this.ping];
    this.ping = 1 - this.ping;
    this.geometry = geometry;
    this.output = output;
    this.rejection = rejection;
    this.converted = converted;
    this.workgroups = {
      convert: [Math.ceil(w / 16), Math.ceil(h / 16), 1],
      upscale: [Math.ceil(ow / 16), Math.ceil(oh / 16), 1],
    };
    return output;
  }
  releaseResources() {
    this.bindingTextures = this.convertGroup = this.upscaleGroups = null;
    this.previousHistory = this.geometry = this.output = this.rejection = this.converted = null;
    this.ping = 0;
  }
  dispose() {
    this.releaseResources();
    this.uniform.destroy();
  }
  report() {
    return {
      dispatches: this.dispatches,
      ping: this.ping,
      workgroups: this.workgroups,
    };
  }
}
