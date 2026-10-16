import * as T from "three/webgpu";
import { checkedModule } from "./passes.js";

const SHADER = `
struct Params{mvp:mat4x4f,previousMVP:mat4x4f,previousInverseProjection:mat4x4f,jitter:vec4f,flags:vec4f,weights:array<vec4f,2>,oldWeights:array<vec4f,2>,morph:vec4u};
@group(0) @binding(0)var<uniform> p:Params;
@group(0) @binding(1)var depth:texture_depth_2d;
@group(0) @binding(2)var<storage,read> morphs:array<vec4f>;
struct V{@builtin(position)position:vec4f,@location(0)previous:vec4f};
@vertex fn vertex(@location(0)position:vec3f,@builtin(vertex_index)index:u32)->V{var current=position;var previous=position;
 for(var i=0u;i<p.morph.x;i++){var delta=morphs[i*p.morph.y+index].xyz;if(p.morph.z==0u){delta-=position;}current+=delta*p.weights[i/4u][i%4u];previous+=delta*p.oldWeights[i/4u][i%4u];}
 var v:V;v.position=p.mvp*vec4f(current,1);v.previous=p.previousMVP*vec4f(previous,1);return v;}
@fragment fn fragment(v:V)->@location(0)vec4f{
 let uv=v.position.xy/vec2f(textureDimensions(depth));let d=textureLoad(depth,vec2i(v.position.xy),0);
 if(abs(v.position.z-d)>max(.0000002,fwidth(v.position.z)*.5)){discard;}
 let delta=(uv-p.jitter.xy)*vec2f(2,-2)+vec2f(-1,1)-v.previous.xy/max(v.previous.w,1e-6)+p.jitter.zw*vec2f(2,-2);
 let old=p.previousInverseProjection*v.previous;return vec4f(delta,1.+p.flags.x+2.*p.flags.y,clamp(-old.z/max(old.w,1e-6),0.,65000.));
}`;
export class GPUMotion {
  constructor(device) {
    this.device = device;
    this.entries = new Map();
    this.geometry = new Map();
    this.lastScan = -Infinity;
    this.mvp = new T.Matrix4();
    this.previousMVP = new T.Matrix4();
  }
  async init() {
    const module = await checkedModule(
      this.device,
      SHADER,
      "Rigid car velocity",
    );
    this.pipeline = await this.device.createRenderPipelineAsync({
      label: "Rigid car velocity",
      layout: "auto",
      vertex: {
        module,
        entryPoint: "vertex",
        buffers: [
          {
            arrayStride: 12,
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }],
          },
        ],
      },
      fragment: {
        module,
        entryPoint: "fragment",
        targets: [{ format: "rgba16float" }],
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
    });
  }
  scan(scene) {
    if (scene !== this.source) {
      this.clear();
      this.source = scene;
    }
    if (performance.now() - this.lastScan < 500) return;
    this.lastScan = performance.now();
    const sources = new Set();
    scene.traverse((body) => {
      if (!body.isMesh || body.userData.polyShadeOwned) return;
      const ms = [].concat(body.material ?? []);
      if (
        !ms.some((m) => m.name === "BrakeLight") &&
        !body.userData.polyShadeDynamic
      )
        return;
      const root = body.userData.polyShadeDynamic
        ? body
        : body.parent?.isGroup
          ? body.parent
          : body;
      root.traverse((o) => {
        if (
          o.isMesh &&
          !o.userData.polyShadeOwned &&
          !o.isSkinnedMesh &&
          !o.isInstancedMesh &&
          ![].concat(o.material).some((m) => m.transparent || m.opacity < 0.98)
        )
          sources.add(o);
      });
    });
    for (const [o, e] of this.entries)
      if (!sources.has(o)) {
        e.uniform.destroy();
        this.entries.delete(o);
      }
    for (const o of sources)
      if (!this.entries.has(o))
        this.entries.set(o, {
          previous: new T.Matrix4().copy(o.matrixWorld),
          fresh: true,
          uniform: this.device.createBuffer({
            label: "Car velocity parameters",
            size: 304,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
          }),
          data: new Float32Array(76),
          weights: new Float32Array(8),
        });
  }
  buffers(g) {
    if (!this.geometry.has(g)) {
      const a = g.attributes.position;
      if (a.itemSize !== 3 || a.isInterleavedBufferAttribute)
        throw new Error("Car velocity requires packed vec3 positions");
      const vertices = this.device.createBuffer({
        size: Math.ceil(a.array.byteLength / 4) * 4,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      this.device.queue.writeBuffer(vertices, 0, a.array);
      let indices, indexFormat;
      if (g.index) {
        const data = g.index.array;
        indexFormat = data.BYTES_PER_ELEMENT === 2 ? "uint16" : "uint32";
        indices = this.device.createBuffer({
          size: Math.ceil(data.byteLength / 4) * 4,
          usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        const padded = new Uint8Array(Math.ceil(data.byteLength / 4) * 4);
        padded.set(
          new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
        );
        this.device.queue.writeBuffer(indices, 0, padded);
      }
      const targets = g.morphAttributes.position ?? [];
      if (targets.length > 8)
        throw new Error("Car velocity supports up to eight morph targets");
      const morphs = this.device.createBuffer({
        size: Math.max(16, a.count * targets.length * 16),
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      if (targets.length) {
        const data = new Float32Array(a.count * targets.length * 4);
        targets.forEach((m, i) => {
          for (let j = 0; j < a.count; j++)
            data.set([m.getX(j), m.getY(j), m.getZ(j)], (i * a.count + j) * 4);
        });
        this.device.queue.writeBuffer(morphs, 0, data);
      }
      this.geometry.set(g, {
        vertices,
        indices,
        indexFormat,
        morphs,
        morphCount: targets.length,
        vertexCount: a.count,
        count: g.index?.count ?? a.count,
      });
    }
    return this.geometry.get(g);
  }
  render(encoder, target, depth, source, camera, temporal, profiler) {
    this.scan(source);
    const pass = encoder.beginRenderPass({
      label: "Car velocity",
      colorAttachments: [
        { view: target.view, loadOp: "load", storeOp: "store" },
      ],
      ...profiler?.descriptor("car-velocity"),
    });
    pass.setPipeline(this.pipeline);
    for (const [o, e] of this.entries) {
      let visible = true;
      for (let n = o; n; n = n.parent) if (!n.visible) visible = false;
      if (!visible) continue;
      const a = o.matrixWorld.elements,
        b = e.previous.elements;
      const moving = a.some((v, i) => Math.abs(v - b[i]) > 1e-6);
      const travel = Math.hypot(a[12] - b[12], a[13] - b[13], a[14] - b[14]);
      const valid =
        temporal.valid &&
        !e.fresh &&
        travel < Math.max(8, temporal.deltaMs * 0.8) &&
        (!e.previousGeometry || e.previousGeometry === o.geometry);
      this.mvp.multiplyMatrices(temporal.currentJitteredVP, o.matrixWorld);
      this.previousMVP.multiplyMatrices(
        temporal.previousJitteredVP,
        valid ? e.previous : o.matrixWorld,
      );
      const g = this.buffers(o.geometry);
      const weights = o.morphTargetInfluences ?? [];
      const morphed = weights.some((v, i) => Math.abs(v - e.weights[i]) > 1e-6);
      e.data.set(this.mvp.elements);
      e.data.set(this.previousMVP.elements, 16);
      e.data.set(temporal.previousInverseProjection.elements, 32);
      e.data.set(temporal.jitterUV.toArray(), 48);
      e.data.set([moving || morphed ? 1 : 0, valid ? 0 : 1, 0, 0], 52);
      e.data.fill(0, 56, 72);
      e.data.set(weights.slice(0, 8), 56);
      e.data.set(valid ? e.weights : weights.slice(0, 8), 64);
      new Uint32Array(e.data.buffer).set(
        [
          g.morphCount,
          g.vertexCount,
          o.geometry.morphTargetsRelative ? 1 : 0,
          0,
        ],
        72,
      );
      this.device.queue.writeBuffer(e.uniform, 0, e.data);
      const group = this.device.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: e.uniform } },
          { binding: 1, resource: depth.createView() },
          { binding: 2, resource: { buffer: g.morphs } },
        ],
      });
      pass.setBindGroup(0, group);
      pass.setVertexBuffer(0, g.vertices);
      if (g.indices) {
        pass.setIndexBuffer(g.indices, g.indexFormat);
        pass.drawIndexed(g.count);
      } else pass.draw(g.count);
      e.previous.copy(o.matrixWorld);
      e.previousGeometry = o.geometry;
      e.weights.fill(0);
      e.weights.set(weights.slice(0, 8));
      e.fresh = false;
    }
    pass.end();
  }
  clear() {
    for (const e of this.entries.values()) e.uniform.destroy();
    this.entries.clear();
    for (const g of this.geometry.values()) {
      g.vertices.destroy();
      g.indices?.destroy();
      g.morphs.destroy();
    }
    this.geometry.clear();
    this.lastScan = -Infinity;
  }
  dispose() {
    this.clear();
  }
}
