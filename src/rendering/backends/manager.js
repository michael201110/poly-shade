import { WebGLBackend } from "./webgl.js";
import { WebGPUBackend } from "./webgpu.js";

export class RenderBackends {
  constructor(cinematic) {
    this.logical = cinematic;
    this.gl = new WebGLBackend(cinematic);
    this.active = "WebGL2";
  }
  wantsGPU(settings) {
    return (
      settings.renderBackend !== "webgl" &&
      settings.upscaling !== "sgsr2-fragment"
    );
  }
  render(scene, camera, settings, draw) {
    if (this.wantsGPU(settings) && !this.failure) {
      if (!this.gpu && !this.initializing) {
        this.gpu = new WebGPUBackend(
          this.logical.renderer.domElement,
          (message) => this.fail(message),
        );
        this.initializing = this.gpu.init().catch((e) => this.fail(e.message));
      }
      try {
        if (this.gpu?.render(scene, camera, settings, this.logical)) {
          // The reference path can rebuild its own targets on fallback. Do
          // not retain an unused second HDR/temporal pipeline in GPU memory.
          if (this.active !== "WebGPU") this.logical.post?.pool.dispose();
          this.active = "WebGPU";
          this.logical.useGPUProfiler = true;
          return;
        }
      } catch (e) {
        this.fail(e.message);
      }
    }
    this.active = "WebGL2";
    this.logical.useGPUProfiler = false;
    this.gpu?.hide();
    return this.gl.render(scene, camera, settings, draw);
  }
  fail(message) {
    if (this.failure || this.disposed) return;
    this.failure = message;
    this.gpu?.temporal.invalidate("WebGPU failure");
    this.gpu?.hide();
    this.active = "WebGL2";
    this.logical.useGPUProfiler = false;
    try {
      this.gpu?.dispose();
    } catch (error) {
      this.cleanupFailure = error.message;
    }
    console.warn("[PolyShade] WebGPU unavailable; restoring WebGL.", message);
  }
  report() {
    return {
      renderer: this.active,
      webgpuFailure: this.failure,
      cleanupFailure: this.cleanupFailure,
      webgpu: this.gpu?.report(),
      webgl: this.gl.report(),
    };
  }
  dispose() {
    this.disposed = true;
    this.gpu?.dispose();
  }
}
