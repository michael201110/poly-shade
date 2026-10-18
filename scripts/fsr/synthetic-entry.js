import { FSR31SuperResolution } from '../../src/rendering/fsr31/super-resolution.js';

function half(value) {
  const sign = (value & 0x8000) ? -1 : 1, exponent = value >> 10 & 31, mantissa = value & 1023;
  return exponent === 31 ? (mantissa ? NaN : sign * Infinity) :
    sign * (exponent ? 2 ** (exponent - 15) * (1 + mantissa / 1024) : 2 ** -14 * mantissa / 1024);
}
export async function verifySynthetic() {
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  const device = await adapter.requestDevice({ requiredFeatures: ['float32-filterable'],
    requiredLimits: { maxStorageTexturesPerShaderStage: 6 } });
  const errors = []; device.addEventListener('uncapturederror', e => errors.push(e.error.message));
  const fsr = new FSR31SuperResolution(device), owned = [];
  try {
    await fsr.init();
    const w = 64, h = 64, ow = 128, oh = 128;
    const texture = (format, usage) => {
      const value = device.createTexture({ size: [w, h], format, usage }); owned.push(value); return value;
    };
    const color = texture('rgba32float', GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING);
    const velocity = texture('rgba32float', GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING);
    const depth = texture('depth32float', GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING);
    const pixels = new Float32Array(w * h * 4);
    for (let i = 0; i < pixels.length; i += 4) pixels.set([.25, .5, .75, 1], i);
    device.queue.writeTexture({ texture: color }, pixels, { bytesPerRow: w * 16 }, [w, h]);
    device.queue.writeTexture({ texture: velocity }, new Float32Array(pixels.length), { bytesPerRow: w * 16 }, [w, h]);
    const temporal = { width: w, height: h, outputWidth: ow, outputHeight: oh, valid: false,
      jitter: { x: 0, y: 0 }, previousJitter: { x: 0, y: 0 }, phaseCount: 32, deltaMs: 1000 / 60,
      camera: { near: .1, far: 1000 }, projection: { elements: [1, 0, 0, 0, 0, 1] } };
    let output;
    for (let i = 0; i < 4; i++) {
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({ colorAttachments: [], depthStencilAttachment: {
        view: depth.createView(), depthLoadOp: 'clear', depthClearValue: .9, depthStoreOp: 'store',
      } }); pass.end();
      output = fsr.reconstruct(encoder, color, depth, velocity, temporal);
      device.queue.submit([encoder.finish()]);
      await device.queue.onSubmittedWorkDone(); // Test-only numerical readback.
      temporal.valid = true;
    }
    const bytesPerRow = ow * 8;
    const buffer = device.createBuffer({ size: bytesPerRow * oh, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    owned.push(buffer);
    const encoder = device.createCommandEncoder();
    encoder.copyTextureToBuffer({ texture: output.texture }, { buffer, bytesPerRow }, [ow, oh]);
    device.queue.submit([encoder.finish()]); await buffer.mapAsync(GPUMapMode.READ);
    const data = new Uint16Array(buffer.getMappedRange());
    const ranges = Array.from({ length: 4 }, () => ({ min: Infinity, max: -Infinity, nonFinite: 0 }));
    for (let i = 0; i < data.length; i++) {
      const value = half(data[i]), range = ranges[i % 4];
      if (!Number.isFinite(value)) range.nonFinite++;
      else { range.min = Math.min(range.min, value); range.max = Math.max(range.max, value); }
    }
    buffer.unmap();
    async function readPixel(item, format, x = 32, y = 32) {
      const read = device.createBuffer({ size: 256, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }); owned.push(read);
      const encoder = device.createCommandEncoder();
      encoder.copyTextureToBuffer({ texture: item.texture, origin: [x, y] }, { buffer: read, bytesPerRow: 256 }, [1, 1]);
      device.queue.submit([encoder.finish()]); await read.mapAsync(GPUMapMode.READ);
      const bytes = read.getMappedRange();
      const value = format === 'f16' ? [...new Uint16Array(bytes).slice(0, 4)].map(half) :
        format === 'unorm8' ? [...new Uint8Array(bytes).slice(0, 4)].map(x => x / 255) : [...new Float32Array(bytes).slice(0, 1)];
      read.unmap(); return value;
    }
    async function frame(masks) {
      const encoder = device.createCommandEncoder();
      fsr.reconstruct(encoder, color, depth, velocity, temporal, undefined, masks);
      device.queue.submit([encoder.finish()]); await device.queue.onSubmittedWorkDone();
    }
    // Known game-vector field: +8 input pixels X, +4 input pixels up in NDC.
    // AMD must receive previous-current UV (-8/64, +4/64), jitter excluded.
    const moving = new Float32Array(w * h * 4);
    for (let i = 0; i < moving.length; i += 4) moving.set([.25, .125, 1, 1], i);
    device.queue.writeTexture({ texture: velocity }, moving, { bytesPerRow: w * 16 }, [w, h]);
    temporal.jitter = { x: .25, y: -.25 }; temporal.previousJitter = { x: -.25, y: .25 };
    await frame();
    const motion = await readPixel(fsr.textures.get('dilated-motion'), 'f16');
    const dilatedDepth = await readPixel(fsr.textures.get('dilated-depth'), 'f32');
    const depthRead = device.createBuffer({ size: w * h * 4, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }); owned.push(depthRead);
    const copy = device.createCommandEncoder();
    copy.copyBufferToBuffer(fsr.buffers.get('reconstructed-depth').buffer, 0, depthRead, 0, w * h * 4);
    device.queue.submit([copy.finish()]); await depthRead.mapAsync(GPUMapMode.READ);
    const field = new Float32Array(depthRead.getMappedRange());
    const reconstructed = { reprojected: field[32 * w + 32], unreachedRightEdge: field[32 * w + 63] };
    depthRead.unmap();
    const maskTexture = texture('rgba8unorm', GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING);
    device.queue.writeTexture({ texture: maskTexture }, new Uint8Array(w * h * 4).fill(255), { bytesPerRow: w * 4 }, [w, h]);
    const mask = { view: maskTexture.createView() };
    await frame({ reactive: mask, transparency: mask });
    const reactive = await readPixel(fsr.textures.get('dilated-reactive'), 'unorm8');
    temporal.valid = false; await frame();
    const reset = { frameIndex: fsr.frameIndex, dimensions: [fsr.output.width, fsr.output.height] };
    const report = fsr.report();
    fsr.releaseImages();
    const released = fsr.report();
    await frame();
    const restored = { frameIndex: fsr.frameIndex, dimensions: [fsr.output.width, fsr.output.height] };
    fsr.dispose();
    return { errors, ranges, motion, dilatedDepth, reconstructed, reactive, reset, restored,
      report, released, cleanup: fsr.report() };
  } finally { fsr.dispose(); for (const value of owned) value.destroy(); device.destroy(); }
}
