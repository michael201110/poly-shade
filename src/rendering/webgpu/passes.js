import { GPU_POST_COMMON } from "../../shaders/webgpu-post.wgsl.js";
const INPUT_BINDINGS = [[1,'color'],[2,'depth'],[3,'velocity'],[4,'ao'],
  [5,'bloom'],[6,'rays'],[8,'volume'],[9,'sun'],[10,'rejection'],[11,'sunMask'],[12,'source']];

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
    this.views = new WeakMap();
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
        texture(12),
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
    if (this.resizeVersion !== this.resources.resizes) {
      this.groups.clear();
      this.resizeVersion = this.resources.resizes;
    }
    let binding = this.groups.get(name);
    if (!binding) {
      binding = {textures: [], resources: [], group: null};
      this.groups.set(name, binding);
    }
    let changed = !binding.group;
    // Bind groups include unused entries too. Never bind the writable target
    // as a sampled input, even when this particular entry point ignores it.
    for (let i=0;i<INPUT_BINDINGS.length;i++) {
      const key = INPUT_BINDINGS[i][1];
      const value = inputs[key];
      const aliases =
        value && (value.texture ?? value) === (target.texture ?? target);
      const resource = aliases ? this.zero : (value ?? this.zero);
      const texture = resource.texture ?? resource;
      if (binding.textures[i] !== texture) {
        changed = true;
        binding.textures[i] = texture;
        binding.resources[i] = resource;
      }
    }
    if (changed) {
      const entries = [{binding:0,resource:{buffer:this.uniform}},
        {binding:7,resource:this.sampler}];
      for(let i=0;i<INPUT_BINDINGS.length;i++)
        entries.push({binding:INPUT_BINDINGS[i][0],resource:this.view(binding.resources[i])});
      binding.group = this.device.createBindGroup({layout:this.layout,entries});
    }
    const pass = encoder.beginRenderPass({
      label: name,
      colorAttachments: [
        {
          view: this.view(target),
          loadOp: load ? "load" : "clear",
          clearValue: [0, 0, 0, 0],
          storeOp: "store",
        },
      ],
      ...profiler?.descriptor(name),
    });
    pass.setPipeline(this.pipelines.get(name));
    pass.setBindGroup(0, binding.group);
    pass.draw(3);
    pass.end();
  }
  view(value) {
    if (value?.view) return value.view;
    if (!value?.createView) return this.zero.view;
    let view = this.views.get(value);
    if (!view) { view = value.createView(); this.views.set(value, view); }
    return view;
  }
  dispose() {
    this.uniform.destroy();
    this.pipelines.clear();
    this.groups.clear();
  }
}
