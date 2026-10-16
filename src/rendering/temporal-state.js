// Temporal state is independent of the backend and of motion-blur exposure.
export function halton(index, base) {
  let value = 0, fraction = 1;
  while (index > 0) {
    fraction /= base;
    value += fraction * (index % base);
    index = Math.floor(index / base);
  }
  return value;
}

export const UPSCALE_SCALES = Object.freeze({
  native: 1, "ultra-quality": 0.77, quality: 0.67, balanced: 0.59, performance: 0.5,
});

export function selectUpscaling(settings, capabilities, failed = false) {
  const requested = settings.upscaling ?? "native";
  const gpu = capabilities.webgpu === true;
  if (gpu) {
    const available = capabilities.compute === true && !failed;
    const backend = requested === 'reduced' ? 'reduced' : available &&
      (requested === 'auto' || requested === 'sgsr2-compute') ? 'sgsr2-compute' : 'native';
    const scale = backend === 'native' ? (requested === 'native' ? settings.renderScale ?? 1 : 1) :
      UPSCALE_SCALES[settings.upscaleQuality ?? 'quality'] ?? settings.upscaleCustomScale ?? .67;
    return { requested, backend, scale, supported: available, compute: backend === 'sgsr2-compute',
      reason: backend === 'native' && requested !== 'native' ? 'Requested temporal path unavailable on WebGPU; using Native.' : null };
  }
  return {requested,backend:'unavailable',scale:1,supported:false,compute:false,
    reason:'PolyShade requires WebGPU; no WebGL rendering backend is included.'};
}

export class TemporalState {
  constructor(t) {
    this.projection = new t.Matrix4();
    this.inverseProjection = new t.Matrix4();
    this.currentVP = new t.Matrix4();
    this.currentJitteredVP = new t.Matrix4();
    this.inverseJitteredVP = new t.Matrix4();
    this.previousJitteredVP = new t.Matrix4();
    this.previousVP = new t.Matrix4();
    this.previousWorld = new t.Matrix4();
    this.previousProjection = new t.Matrix4();
    this.previousInverseProjection = new t.Matrix4();
    this.clipToPrevious = new t.Matrix4();
    this.jitter = new t.Vector2();
    this.previousJitter = new t.Vector2();
    this.renderedPreviousJitter = new t.Vector2();
    this.jitterUV = new t.Vector4();
    this.valid = false;
    this.ready = false;
    this.sequence = 0;
    this.resets = 0;
    this.pending = "first frame";
    this.lastReset = "first frame";
  }
  invalidate(reason = "explicit reset") {
    this.valid = false;
    this.pending = reason;
    this.ready = false;
  }
  begin(scene, camera, width, height, outputWidth, outputHeight, settings, now = performance.now()) {
    camera.updateMatrixWorld();
    this.camera = camera;
    this.projection.copy(camera.projectionMatrix);
    this.inverseProjection.copy(camera.projectionMatrixInverse);
    this.currentVP.multiplyMatrices(this.projection, camera.matrixWorldInverse);
    const key = JSON.stringify([width, height, outputWidth, outputHeight, settings]);
    let reason = this.pending;
    if (scene !== this.scene) reason = "scene changed";
    else if (camera !== this.previousCamera) reason = "camera changed";
    else if (key !== this.key) reason = "resolution or settings changed";
    else if (!(now > this.at && now - this.at < 200)) reason = "frame gap";
    if (!reason && this.ready) {
      const a = camera.matrixWorld.elements, b = this.previousWorld.elements;
      const travel = Math.hypot(a[12] - b[12], a[13] - b[13], a[14] - b[14]);
      if (travel > Math.max(8, (now - this.at) * 0.8) ||
          a[8] * b[8] + a[9] * b[9] + a[10] * b[10] < 0.5) reason = "camera cut or teleport";
      if (this.projection.elements.some((v, i) => Math.abs(v - this.previousProjection.elements[i]) > 0.001))
        reason = "projection changed";
    }
    this.valid = this.ready && !reason;
    if (!this.valid) {
      this.sequence = 0;
      this.resets++;
      this.lastReset = reason ?? "history unavailable";
    }
    this.pending = null;
    this.scene = scene;
    this.previousCamera = camera;
    this.key = key;
    this.deltaMs = this.at ? now - this.at : 0;
    this.at = now;
    this.width = width; this.height = height;
    this.outputWidth = outputWidth; this.outputHeight = outputHeight;
    // FSR/SGSR-style phase count grows with the area reconstruction ratio.
    this.phaseCount = Math.ceil(8 * (outputWidth / width) ** 2);
    const index = this.sequence % this.phaseCount + 1;
    this.jitter.set(settings.upscaleJitter === false ? 0 : halton(index, 2) - 0.5,
      settings.upscaleJitter === false ? 0 : halton(index, 3) - 0.5);
    // Geometry moves +jitter pixels. The reference samples colour at UV+jitter/size.
    if (camera.isPerspectiveCamera) {
      camera.projectionMatrix.elements[8] -= 2 * this.jitter.x / width;
      camera.projectionMatrix.elements[9] += (camera.coordinateSystem === 2001 ? 2 : -2) * this.jitter.y / height;
    } else {
      camera.projectionMatrix.elements[12] += 2 * this.jitter.x / width;
      camera.projectionMatrix.elements[13] += (camera.coordinateSystem === 2001 ? -2 : 2) * this.jitter.y / height;
    }
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    this.currentJitteredVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.inverseJitteredVP.copy(this.currentJitteredVP).invert();
    if (!this.valid) {
      this.previousJitteredVP.copy(this.currentJitteredVP);
      this.previousVP.copy(this.currentVP);
      this.previousJitter.copy(this.jitter);
    }
    this.jitterUV.set(this.jitter.x / width, this.jitter.y / height,
      this.previousJitter.x / width, this.previousJitter.y / height);
    this.renderedPreviousJitter.copy(this.previousJitter);
    this.clipToPrevious.multiplyMatrices(this.previousJitteredVP, this.inverseJitteredVP);
    this.previousInverseProjection.copy(this.valid ? this.previousProjection : this.projection).invert();
    // Jitter is sampling motion, not camera motion. A stationary camera must
    // retain upstream's still-camera kernel/history behaviour while jittering.
    const difference = this.currentVP.elements.reduce((sum, v, i) => sum + Math.abs(v - this.previousVP.elements[i]), 0);
    this.stillFrames = difference < 1e-5 ? (this.stillFrames ?? 0) + 1 : 0;
  }
  restoreCamera() {
    if (!this.camera) return;
    this.camera.projectionMatrix.copy(this.projection);
    this.camera.projectionMatrixInverse.copy(this.inverseProjection);
  }
  commit() {
    this.previousJitteredVP.copy(this.currentJitteredVP);
    this.previousVP.copy(this.currentVP);
    this.previousJitter.copy(this.jitter);
    this.previousWorld.copy(this.camera.matrixWorld);
    this.previousProjection.copy(this.projection);
    this.ready = true;
    this.sequence++;
  }
  report() {
    return { valid: this.valid, resets: this.resets, lastReset: this.lastReset,
      phase: this.sequence, phaseCount: this.phaseCount,
      jitter: this.jitter.toArray(), previousJitter: this.renderedPreviousJitter.toArray(), deltaMs: this.deltaMs };
  }
}
