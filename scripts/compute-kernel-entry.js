import { SGSR2Compute } from "../src/rendering/sgsr2-compute.js";
import { GPUResources } from "../src/rendering/webgpu/resources.js";
export async function verifyKernel() {
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance",
  });
  const device = await adapter.requestDevice();
  const errors = [];
  device.addEventListener("uncapturederror", (e) =>
    errors.push(e.error.message),
  );
  const r = new GPUResources(device);
  const s = new SGSR2Compute(device, r);
  await s.init();
  const color = r.get("color", 65, 49),
    velocity = r.get("velocity", 65, 49);
  const depth = device.createTexture({
    size: [65, 49],
    format: "depth32float",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  const encoder = device.createCommandEncoder();
  for (const [target, value] of [
    [color, [0.2, 0.3, 0.4, 1]],
    [velocity, [0, 0, 0, 100]],
  ]) {
    const p = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: target.view,
          loadOp: "clear",
          storeOp: "store",
          clearValue: value,
        },
      ],
    });
    p.end();
  }
  const dp = encoder.beginRenderPass({
    colorAttachments: [],
    depthStencilAttachment: {
      view: depth.createView(),
      depthLoadOp: "clear",
      depthStoreOp: "store",
      depthClearValue: 1,
    },
  });
  dp.end();
  device.queue.submit([encoder.finish()]);
  const temporal = {
    width: 65,
    height: 49,
    outputWidth: 97,
    outputHeight: 73,
    jitter: { x: 0.25, y: -0.1666667 },
    projection: { elements: [1] },
    stillFrames: 10,
    valid: false,
    jitterUV: {
      toArray: () => [0.25 / 65, -0.1666667 / 49, 0.25 / 65, -0.1666667 / 49],
    },
  };
  for (let i = 0; i < 3; i++) {
    const e = device.createCommandEncoder();
    s.reconstruct(e, color, depth, velocity, temporal);
    device.queue.submit([e.finish()]);
    temporal.valid = true;
  }
  const n = 97 * 73;
  const buffer = device.createBuffer({
    size: n * 16,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const read = device.createBuffer({
    size: n * 16,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const module = device.createShaderModule({
    code: "@group(0)@binding(0)var image:texture_2d<f32>;@group(0)@binding(1)var<storage,read_write> pixels:array<vec4f>;@compute @workgroup_size(8,8)fn main(@builtin(global_invocation_id)id:vec3u){if(any(id.xy>=textureDimensions(image))){return;}pixels[id.y*textureDimensions(image).x+id.x]=textureLoad(image,vec2i(id.xy),0);}",
  });
  const p = await device.createComputePipelineAsync({
    layout: "auto",
    compute: { module, entryPoint: "main" },
  });
  const group = device.createBindGroup({
    layout: p.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: s.output.view },
      { binding: 1, resource: { buffer } },
    ],
  });
  const e = device.createCommandEncoder();
  const pass = e.beginComputePass();
  pass.setPipeline(p);
  pass.setBindGroup(0, group);
  pass.dispatchWorkgroups(13, 10);
  pass.end();
  e.copyBufferToBuffer(buffer, 0, read, 0, n * 16);
  device.queue.submit([e.finish()]);
  await read.mapAsync(GPUMapMode.READ);
  const values = new Float32Array(read.getMappedRange()).slice();
  read.unmap();
  const ranges = [0, 1, 2, 3].map((channel) => {
    const a = Array.from({ length: n }, (_, i) => values[i * 4 + channel]);
    return {
      min: Math.min(...a),
      max: Math.max(...a),
      mean: a.reduce((a, b) => a + b, 0) / n,
    };
  });
  return { ranges, errors, pixels: Array.from(values.slice(0, 64)) };
}
