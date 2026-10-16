import { GPU_POST_COMMON } from "../../shaders/webgpu-post.wgsl.js";

export async function checkedModule(device, code, label) {
  const module = device.createShaderModule({ code, label });
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter((m) => m.type === "error");
  if (errors.length)
    throw new Error(
      `${label}: ${errors.map((m) => `${m.lineNum}:${m.linePos} ${m.message}`).join("\n")}`,
    );
  return module;
}
export class GPUPasses {
  constructor(device, resources) {
    this.device = device;
    this.resources = resources;
    this.pipelines = new Map();
    this.groups = new Map();
    this.ids = new WeakMap();
    this.nextID = 0;
    this.uniform = device.createBuffer({
      label: "PolyShade post parameters",
      size: 736,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.sampler = device.createSampler({
      minFilter: "linear",
      magFilter: "linear",
    });
    const texture = (binding, sampleType = "float") => ({
      binding,
      visibility: GPUShaderStage.FRAGMENT,
      texture: { sampleType },
    });
    this.layout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        texture(1),
        texture(2, "depth"),
        texture(3),
        texture(4),
        texture(5),
        texture(6),
        { binding: 7, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
        texture(8),
        texture(9),
        texture(10, "unfilterable-float"),
        texture(11),
      ],
    });
    this.pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [this.layout],
    });
    this.zero = resources.get("zero", 1, 1);
    this.white = resources.get("white", 1, 1);
    const encoder = device.createCommandEncoder();
    for (const [target, value] of [
      [this.zero, 0],
      [this.white, 1],
    ]) {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: target.view,
            clearValue: [value, value, value, value],
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });
      pass.end();
    }
    device.queue.submit([encoder.finish()]);
  }
  async compile(name, shader, format = "rgba16float") {
    const module = await checkedModule(
      this.device,
      GPU_POST_COMMON + shader,
      name,
    );
    const pipeline = await this.device.createRenderPipelineAsync({
      label: `PolyShade ${name}`,
      layout: this.pipelineLayout,
      vertex: { module, entryPoint: "vertex" },
      fragment: { module, entryPoint: "fragment", targets: [{ format }] },
      primitive: { topology: "triangle-list" },
    });
    this.pipelines.set(name, pipeline);
  }
  draw(encoder, name, target, inputs, profiler, load = false) {
    const view = (value) =>
      value?.view ?? value?.createView?.() ?? this.zero.view;
    const entries = [
      { binding: 0, resource: { buffer: this.uniform } },
      { binding: 7, resource: this.sampler },
    ];
    const identities = [];
    // Bind groups include unused entries too. Never bind the writable target
    // as a sampled input, even when this particular entry point ignores it.
    for (const [binding, key] of [
      [1, "color"],
      [2, "depth"],
      [3, "velocity"],
      [4, "ao"],
      [5, "bloom"],
      [6, "rays"],
      [8, "volume"],
      [9, "sun"],
      [10, "rejection"],
      [11, "sunMask"],
    ]) {
      const value = inputs[key];
      const aliases =
        value && (value.texture ?? value) === (target.texture ?? target);
      const resource = aliases ? this.zero : (value ?? this.zero);
      const texture = resource.texture ?? resource;
      if (!this.ids.has(texture)) this.ids.set(texture, ++this.nextID);
      identities.push(this.ids.get(texture));
      entries.push({ binding, resource: view(resource) });
    }
    if (this.resizeVersion !== this.resources.resizes) {
      this.groups.clear();
      this.resizeVersion = this.resources.resizes;
    }
    const key = identities.join(":");
    let group = this.groups.get(key);
    if (!group) {
      group = this.device.createBindGroup({ layout: this.layout, entries });
      this.groups.set(key, group);
    }
    const pass = encoder.beginRenderPass({
      label: name,
      colorAttachments: [
        {
          view: view(target),
          loadOp: load ? "load" : "clear",
          clearValue: [0, 0, 0, 0],
          storeOp: "store",
        },
      ],
      ...profiler?.descriptor(name),
    });
    pass.setPipeline(this.pipelines.get(name));
    pass.setBindGroup(0, group);
    pass.draw(3);
    pass.end();
  }
  dispose() {
    this.uniform.destroy();
    this.pipelines.clear();
    this.groups.clear();
  }
}
