export class RenderState {
  constructor(t) {
    this.viewport = new t.Vector4();
    this.scissor = new t.Vector4();
    this.clearColor = new t.Color();
  }
  capture(r) {
    this.target = r.getRenderTarget();
    this.face = r.getActiveCubeFace();
    this.mip = r.getActiveMipmapLevel();
    r.getViewport(this.viewport);
    r.getScissor(this.scissor);
    this.scissorTest = r.getScissorTest();
    r.getClearColor(this.clearColor);
    this.clearAlpha = r.getClearAlpha();
    this.autoClear = r.autoClear;
    this.toneMapping = r.toneMapping;
    this.exposure = r.toneMappingExposure;
    this.output = r.outputColorSpace;
    this.xr = r.xr.enabled;
  }
  restore(r) {
    r.setRenderTarget(this.target, this.face, this.mip);
    r.setViewport(this.viewport);
    r.setScissor(this.scissor);
    r.setScissorTest(this.scissorTest);
    r.setClearColor(this.clearColor, this.clearAlpha);
    r.autoClear = this.autoClear;
    r.toneMapping = this.toneMapping;
    r.toneMappingExposure = this.exposure;
    r.outputColorSpace = this.output;
    r.xr.enabled = this.xr;
  }
}
export class TargetPool {
  constructor(three, capabilities) {
    this.three = three;
    this.capabilities = capabilities;
    this.targets = new Map();
    this.allocations = 0;
    this.disposals = 0;
    this.resizes = 0;
  }
  get(name, w, h, { depth = false, samples = 0 } = {}) {
    const t = this.three,
      limit = Math.min(
        this.capabilities.maxTextureSize,
        this.capabilities.maxRenderbufferSize,
      );
    const factor = Math.min(1, limit / w, limit / h);
    w = Math.max(1, Math.floor(w * factor));
    h = Math.max(1, Math.floor(h * factor));
    let target = this.targets.get(name);
    samples = Math.min(samples, this.capabilities.maxSamples ?? 0);
    if (
      target &&
      (target.samples !== samples || target.depthBuffer !== depth)
    ) {
      this.remove(name);
      target = null;
    }
    if (!target) {
      target = new t.WebGLRenderTarget(w, h, {
        type:
          name === "grade" || name.startsWith("ao") || name === "sun-visibility"
            ? t.UnsignedByteType
            : this.capabilities.halfFloat
              ? t.HalfFloatType
              : t.UnsignedByteType,
        format: t.RGBAFormat,
        minFilter: t.LinearFilter,
        magFilter: t.LinearFilter,
        depthBuffer: depth,
      });
      target.texture.name = `PolyShade ${name}`;
      target.texture.colorSpace = t.LinearSRGBColorSpace;
      if (name === "sun-visibility") target.texture.colorSpace = t.NoColorSpace;
      target.samples = samples;
      if (depth && this.capabilities.features.depthTexture) {
        target.depthTexture = new t.DepthTexture(w, h, t.UnsignedIntType);
      }
      this.targets.set(name, target);
      this.allocations++;
    } else if (target.width !== w || target.height !== h) {
      target.setSize(w, h);
      this.resizes++;
    }
    return target;
  }
  remove(name) {
    const target = this.targets.get(name);
    if (target) {
      target.dispose();
      target.depthTexture?.dispose();
      this.targets.delete(name);
      this.disposals++;
    }
  }
  retain(names) {
    for (const name of this.targets.keys())
      if (!names.has(name)) this.remove(name);
  }
  dispose() {
    for (const name of this.targets.keys()) this.remove(name);
  }
  report() {
    return [...this.targets].map(([name, t]) => {
      const bytesPerPixel = t.texture.type === this.three.HalfFloatType ? 8 : 4;
      const pixels = t.width * t.height;
      return {
        name,
        width: t.width,
        height: t.height,
        pixels,
        samples: t.samples,
        estimatedBytes:
          pixels *
          (bytesPerPixel +
            (t.depthTexture ? 4 : 0) +
            (t.samples
              ? (bytesPerPixel + (t.depthBuffer ? 4 : 0)) * t.samples
              : 0)),
      };
    });
  }
}
