/*! AMD FidelityFX Super Resolution 3.1.5 WebGPU experimental port.
Copyright (C) 2026 Advanced Micro Devices, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */
import prepareInputs from './generated/prepare_inputs.wgsl.js';
import lumaPyramid from './generated/luma_pyramid.wgsl.js';
import lumaTail from './generated/luma_pyramid_tail.wgsl.js';
import shadingPyramid from './generated/shading_change_pyramid.wgsl.js';
import shadingChange from './generated/shading_change.wgsl.js';
import prepareReactivity from './generated/prepare_reactivity.wgsl.js';
import lumaInstability from './generated/luma_instability.wgsl.js';
import accumulate from './generated/accumulate.wgsl.js';
import accumulateSharpen from './generated/accumulate_sharpen.wgsl.js';
import rcas from './generated/rcas.wgsl.js';
import reactive from './generated/autogen_reactive.wgsl.js';
import { checkedModule } from '../webgpu/passes.js';

export const SR_SHADERS = Object.freeze({ prepareInputs, lumaPyramid, lumaTail,
  shadingPyramid, shadingChange, prepareReactivity, lumaInstability, accumulate, accumulateSharpen, rcas, reactive });
const CLEAR_DEPTH = `@group(0) @binding(0) var<storage,read_write> depth: array<atomic<u32>>;
@compute @workgroup_size(256) fn main(@builtin(global_invocation_id) p: vec3u) {
 if(p.x < arrayLength(&depth)) { atomicStore(&depth[p.x], 0x3f800000u); }
}`;

// Reflection is performed once on generated, checked WGSL, never per frame.
export function shaderBindings(code) {
  return [...code.matchAll(/@group\(0\) @binding\((\d+)\)\s+var(?:<([^>]+)>)?\s+(\w+):\s*([^;]+);/g)]
    .map(([, binding, address, name, type]) => ({ binding: Number(binding),
      name: name.replace(/_$/, ''), address, type }));
}

export class FSR31SuperResolution {
  constructor(device) {
    this.device = device;
    this.textures = new Map(); this.buffers = new Map(); this.pipelines = new Map();
    this.groups = new Map(); this.ping = 0; this.frameIndex = 0; this.dispatches = 0;
    this.constants = new ArrayBuffer(160);
    this.ints = new Int32Array(this.constants); this.floats = new Float32Array(this.constants);
    this.spd = new Uint32Array(8);
    this.linear = device.createSampler({ minFilter: 'linear', magFilter: 'linear', mipmapFilter: 'linear' });
    this.point = device.createSampler();
    this.uniform = this.buffer('constants', 160, GPUBufferUsage.UNIFORM);
    this.spdUniform = this.buffer('spd-constants', 32, GPUBufferUsage.UNIFORM);
    this.secondary = this.buffer('secondary', 16, GPUBufferUsage.UNIFORM);
  }
  async init() {
    if (this.device.limits.maxStorageTexturesPerShaderStage < 6)
      throw new Error('FSR requires six storage textures per compute stage');
    if (!this.device.features.has('float32-filterable'))
      throw new Error('FSR reference depth filtering requires float32-filterable');
    for (const [name, code] of Object.entries({ ...SR_SHADERS, clearDepth: CLEAR_DEPTH })) {
      const module = await checkedModule(this.device, code, `FSR 3.1 ${name}`);
      const pipeline = await this.device.createComputePipelineAsync({
        label: `FSR 3.1 ${name}`, layout: 'auto', compute: { module, entryPoint: name === 'clearDepth' ? 'main' : 'CS' },
      });
      if (this.disposed) return;
      this.pipelines.set(name, { pipeline, bindings: shaderBindings(code) });
    }
    this.ready = true;
  }
  buffer(name, size, usage = GPUBufferUsage.STORAGE) {
    let item = this.buffers.get(name);
    if (item?.size !== size) {
      item?.buffer.destroy();
      item = { buffer: this.device.createBuffer({ label: `FSR ${name}`, size,
        usage: usage | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC }), size };
      this.buffers.set(name, item);
    }
    return item.buffer;
  }
  texture(name, width, height, format = 'rgba16float', mipLevelCount = 1) {
    let item = this.textures.get(name);
    if (!item) {
      const texture = this.device.createTexture({ label: `FSR ${name}`, size: [width, height],
        mipLevelCount, format, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING |
          GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      item = { name, texture, view: texture.createView(), width, height, format, mipLevelCount };
      this.textures.set(name, item);
    }
    return item;
  }
  releaseImages() {
    this.groups.clear();
    for (const item of this.textures.values()) item.texture.destroy();
    this.textures.clear();
    for (const [name, item] of this.buffers) if (!['constants', 'spd-constants', 'secondary'].includes(name)) {
      item.buffer.destroy(); this.buffers.delete(name);
    }
    this.inputViews = null; this.frameIndex = 0; this.key = null;
    this.pyramidViews = null;
  }
  dispatch(encoder, name, resources, x, y = 1, profiler) {
    const { pipeline, bindings } = this.pipelines.get(name);
    const cacheKey = name + ':' + this.ping;
    let group = this.groups.get(cacheKey);
    if (!group) {
      const entries = bindings.map(({ binding, name, address, type }) => {
        const value = resources[name];
        if (!value) throw new Error(`FSR ${name}: missing ${type}`);
        return { binding, resource: address ? { buffer: value } : value.view ?? value };
      });
      group = this.device.createBindGroup({ label: `FSR ${name}/${this.ping}`, layout: pipeline.getBindGroupLayout(0), entries });
      this.groups.set(cacheKey, group);
    }
    const pass = encoder.beginComputePass({ label: `FSR ${name}`,
      ...profiler?.descriptor(`fsr-${name}`) });
    pass.setPipeline(pipeline); pass.setBindGroup(0, group); pass.dispatchWorkgroups(x, y); pass.end();
    this.dispatches++;
  }
  reconstruct(encoder, color, depth, velocity, temporal, profiler, masks = {}) {
    if (!this.ready || this.disposed) throw new Error('FSR is not ready');
    const { width: w, height: h, outputWidth: ow, outputHeight: oh } = temporal;
    const key = `${w}x${h}:${ow}x${oh}`;
    if (key !== this.key) { this.releaseImages(); this.key = key; }
    if (!temporal.valid) { this.frameIndex = 0; this.groups.clear(); }
    const t = (name, width = w, height = h, format) => this.texture(name, width, height, format);
    const previous = this.ping, current = 1 - previous;
    const sourceColor = color.texture ?? color;
    const sourceDepth = depth.texture ?? depth;
    const sourceVelocity = velocity.texture ?? velocity;
    // Inputs and explicit masks are usually stable pooled textures. Cache views
    // and invalidate bind groups if the renderer replaces any input allocation.
    const identities = [sourceColor, sourceDepth, sourceVelocity, masks.reactive, masks.transparency];
    if (!this.inputViews || identities.some((value, i) => value !== this.inputViews.identities[i])) {
      this.groups.clear();
      this.inputViews = { identities, color: sourceColor.createView(), depth: sourceDepth.createView(), velocity: sourceVelocity.createView() };
    }
    const input = this.inputViews;
    const mips = Math.min(12, Math.floor(Math.log2(Math.max(w, h))));
    const chain = this.texture('shading-chain', Math.max(1, w >> 1), Math.max(1, h >> 1), 'rgba16float', 6);
    const pyramids = this.pyramidViews ??= Array.from({ length: 6 }, (_, i) => ({
      texture: chain.texture, view: chain.texture.createView({ baseMipLevel: i, mipLevelCount: 1 }),
    }));
    // Luma reads mip 5 before shading-change overwrites it. These lifetimes do
    // not overlap, so use the same half-float subresource as the AMD SDK does.
    const lumaMip5 = pyramids[5];
    const reconstructed = this.buffer('reconstructed-depth', w * h * 4);
    const frameInfo = this.buffer('frame-info', 16);
    const scratch = t('depth-then-luma-instability'); // Disjoint AMD lifetimes.
    const currentLuma = t(`luma-${current}`), previousLuma = t(`luma-${previous}`);
    const exposure = t('unit-exposure', 1, 1, 'rgba32float');
    const zero = t('zero-mask', 1, 1, 'rgba8unorm');
    const accumulated = t(`accumulation-${current}`, w, h, 'rgba8unorm');
    const history = t(`history-${current}`, ow, oh), oldHistory = t(`history-${previous}`, ow, oh);
    const output = t('output', ow, oh);
    if (this.frameIndex === 0) {
      this.device.queue.writeTexture({ texture: exposure.texture }, new Float32Array([1, 1, 1, 1]), {}, [1, 1]);
      this.device.queue.writeBuffer(frameInfo, 0, new Float32Array([-1, 1, 0, 0]));
      // Reference reset clears previous accumulation; histories are ignored at frame index zero.
      const clear = encoder.beginRenderPass({ colorAttachments: [{ view: t(`accumulation-${previous}`, w, h, 'rgba8unorm').view,
        loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }] }); clear.end();
    }
    this.ints.set([w, h, w, h, ow, oh, ow, oh, w, h, ow, oh]);
    const near = temporal.camera?.near ?? .1, far = temporal.camera?.far ?? 1000;
    const q = far / (near - far), projection = temporal.projection.elements;
    this.floats.set([-q, q * near, 1 / projection[0], 1 / projection[5],
      temporal.jitter.x, temporal.jitter.y, temporal.previousJitter.x, temporal.previousJitter.y,
      -.5, .5, w / ow, h / oh, 0, 0, 1 / projection[0], temporal.phaseCount,
      Math.min(1, Math.max(0, temporal.deltaMs / 1000)), 1, 1, this.frameIndex,
      1, 1, 1, 1 / 3, -1 / 3], 12);
    this.spd.set([mips, Math.ceil(w / 64) * Math.ceil(h / 64), 0, 0, w, h]);
    this.device.queue.writeBuffer(this.uniform, 0, this.constants);
    this.device.queue.writeBuffer(this.spdUniform, 0, this.spd);
    const resources = {
      cbFSR3Upscaler: this.uniform, cbSPD: this.spdUniform,
      s_LinearClamp: this.linear, s_PointClamp: this.point,
      r_input_color_jittered: input.color, r_input_depth: input.depth, r_input_motion_vectors: input.velocity,
      r_reconstructed_previous_nearest_depth: reconstructed, rw_reconstructed_previous_nearest_depth: reconstructed,
      rw_frame_info: frameInfo, r_frame_info: frameInfo,
      r_input_exposure: exposure, r_reactive_mask: masks.reactive ?? zero,
      r_transparency_and_composition_mask: masks.transparency ?? zero,
      rw_farthest_depth: scratch, r_farthest_depth: scratch, rw_luma_instability: scratch, r_luma_instability: scratch,
      rw_current_luma: currentLuma, r_current_luma: currentLuma, r_previous_luma: previousLuma,
      rw_dilated_motion_vectors: t('dilated-motion'), r_dilated_motion_vectors: t('dilated-motion'),
      rw_dilated_depth: t('dilated-depth', w, h, 'r32float'), r_dilated_depth: t('dilated-depth', w, h, 'r32float'),
      rw_farthest_depth_mip1: t('farthest-depth-mip1', Math.max(1, w >> 1), Math.max(1, h >> 1)),
      r_farthest_depth_mip1: t('farthest-depth-mip1', Math.max(1, w >> 1), Math.max(1, h >> 1)),
      rw_shading_change: t('shading-change', Math.max(1, w >> 1), Math.max(1, h >> 1), 'rgba8unorm'),
      r_shading_change: t('shading-change', Math.max(1, w >> 1), Math.max(1, h >> 1), 'rgba8unorm'),
      rw_accumulation: accumulated, r_accumulation: t(`accumulation-${previous}`, w, h, 'rgba8unorm'),
      rw_new_locks: t('new-locks', ow, oh, 'r32float'),
      rw_dilated_reactive_masks: t('dilated-reactive', w, h, 'rgba8unorm'), r_dilated_reactive_masks: t('dilated-reactive', w, h, 'rgba8unorm'),
      rw_luma_history: t(`luma-history-${current}`), r_luma_history: t(`luma-history-${previous}`),
      r_internal_upscaled_color: oldHistory, rw_internal_upscaled_color: history, rw_upscaled_output: output,
      r_rcas_input: history, cbRCAS: this.secondary,
    };
    this.dispatch(encoder, 'clearDepth', { depth: reconstructed }, Math.ceil(w * h / 256), 1, profiler);
    this.dispatch(encoder, 'prepareInputs', resources, Math.ceil(w / 8), Math.ceil(h / 8), profiler);
    resources.rw_spd_mip5 = lumaMip5;
    this.dispatch(encoder, 'lumaPyramid', resources, Math.ceil(w / 64), Math.ceil(h / 64), profiler);
    if (mips > 6) this.dispatch(encoder, 'lumaTail', resources, 1, 1, profiler);
    for (let i = 0; i < 6; i++) resources[`rw_spd_mip${i}`] = pyramids[i];
    this.dispatch(encoder, 'shadingPyramid', resources, Math.ceil(w / 64), Math.ceil(h / 64), profiler);
    // Sample a full mip chain, populated through separate non-overlapping views.
    resources.r_spd_mips = chain;
    this.dispatch(encoder, 'shadingChange', resources, Math.ceil((w >> 1) / 8), Math.ceil((h >> 1) / 8), profiler);
    this.dispatch(encoder, 'prepareReactivity', resources, Math.ceil(w / 8), Math.ceil(h / 8), profiler);
    this.dispatch(encoder, 'lumaInstability', resources, Math.ceil(w / 8), Math.ceil(h / 8), profiler);
    const sharpness = masks.sharpness ?? 0;
    this.dispatch(encoder, sharpness > 0 ? 'accumulateSharpen' : 'accumulate', resources, Math.ceil(ow / 8), Math.ceil(oh / 8), profiler);
    if (sharpness > 0) {
      if (sharpness !== this.lastSharpness) {
        const data = new Float32Array(4); data[0] = 2 ** (2 * Math.min(1, Math.max(0, sharpness)) - 2);
        this.device.queue.writeBuffer(this.secondary, 0, data); this.lastSharpness = sharpness;
      }
      this.dispatch(encoder, 'rcas', resources, Math.ceil(ow / 16), Math.ceil(oh / 16), profiler);
    }
    this.frameIndex++; this.ping = current; this.output = output; this.previousHistory = oldHistory;
    return output;
  }
  report() {
    const resources = [...this.textures.values()].map(({ name, width, height, format, mipLevelCount }) => ({ name, width, height, format, mipLevelCount }));
    return { ready: this.ready, frameIndex: this.frameIndex, dispatches: this.dispatches, resources,
      buffers: [...this.buffers].map(([name, { size }]) => ({ name, bytes: size })) };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.ready = false; this.releaseImages();
    for (const { buffer } of this.buffers.values()) buffer.destroy();
    this.buffers.clear(); this.pipelines.clear();
  }
}
