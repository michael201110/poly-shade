import { SGSR2_CONVERT_FRAGMENT, SGSR2_UPSCALE_FRAGMENT } from "../../src/shaders/sgsr2.js";
import { TEMPORAL_GEOMETRY_FRAGMENT } from "../../src/shaders/temporal-inputs.js";

// Backend boundary: native-size linear output + backend-owned ping-pong history.
// This reference path owns only WebGL resources; no cross-API texture copying.
export class SGSR2Fragment {
  constructor(three) {
    this.three = three;
    this.renderSize = new three.Vector2();
    this.outputSize = new three.Vector2();
    this.renderSizeRcp = new three.Vector2();
    this.outputSizeRcp = new three.Vector2();
    this.scaleRatio = new three.Vector2();
    this.ping = 0;
    this.resources = new WeakMap();
  }
  reconstruct(post, input, depth, velocity, retain, draw, temporal, camera) {
    const t = this.three, r = post.renderer;
    const { width: w, height: h, outputWidth: ow, outputHeight: oh } = temporal;
    const names = ["sgsr-convert", "sgsr-history-a", "sgsr-history-b", "sgsr-geometry"];
    const targets = names.map((name, index) => {
      retain.add(name);
      const native = index === 1 || index === 2;
      const target = post.pool.get(name, native ? ow : w, native ? oh : h);
      target.texture.colorSpace = t.NoColorSpace;
      const key = `${target.width}:${target.height}`;
      if (this.resources.get(target) !== key) {
        r.initRenderTarget?.(target);
        r.setRenderTarget(target);
        const gl = r.getContext();
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
          throw new Error(`SGSR2 framebuffer ${name} is incomplete`);
        this.resources.set(target, key);
      }
      return target;
    });
    if (targets.some((target, i) => target.width !== (i === 1 || i === 2 ? ow : w) || target.height !== (i === 1 || i === 2 ? oh : h)))
      throw new Error("Native SGSR2 output exceeds this GPU's texture limits");
    const convert = targets[0], history = targets[this.ping + 1], output = targets[2 - this.ping];
    const values = {
      clipToPrevClip: temporal.clipToPrevious,
      renderSize: this.renderSize.set(w, h), outputSize: this.outputSize.set(ow, oh),
      renderSizeRcp: this.renderSizeRcp.set(1 / w, 1 / h),
      outputSizeRcp: this.outputSizeRcp.set(1 / ow, 1 / oh), jitterOffset: temporal.jitter,
      // Qualcomm GLES sample's exact kernel/variance scale parameters.
      scaleRatio: this.scaleRatio.set(ow / w, Math.min(20, ((ow / w) * (oh / h)) ** 3)),
      cameraFovAngleHor: 1 / Math.max(0.00001, temporal.projection.elements[0]),
      minLerpContribution: temporal.stillFrames > 5 ? 0.3 : 0,
      reset: temporal.valid ? 0 : 1, bSameCamera: temporal.stillFrames,
    };
    if (!temporal.valid) {
      // Even reset=1 cannot sanitize NaNs in undefined previous texture storage.
      r.setRenderTarget(history); r.setClearColor(0, 0); r.clear(true, false, false);
      r.setRenderTarget(targets[3]); r.clear(true, false, false);
    }
    const profiler = post.profiler;
    const execute = () => {
      // One grouped query includes both SGSR2 passes without nested GPU queries.
      post.profiler = null;
      try {
        if (!post.pass("sgsr2-convert", SGSR2_CONVERT_FRAGMENT, convert,
          { ...values, InputDepth: depth, InputVelocity: velocity,
            PreviousGeometry: targets[3].texture, historyJitterUV: temporal.jitterUV,
            temporalHistoryValid: temporal.valid ? 1 : 0 }, draw))
          throw new Error("SGSR2 Convert shader failed");
        if (!post.pass("sgsr2-upscale", SGSR2_UPSCALE_FRAGMENT, output,
          { ...values, InputColor: input, MotionDepthClipAlphaBuffer: convert.texture, PrevOutput: history.texture }, draw))
          throw new Error("SGSR2 Upscale shader failed");
      } finally { post.profiler = profiler; }
    };
    if (profiler) profiler.measure("sgsr2", execute);
    else execute();
    // All previous-geometry reads have finished before this target is updated.
    // A single reusable target suffices; there is no same-pass feedback loop.
    if (!post.pass("temporal-geometry", TEMPORAL_GEOMETRY_FRAGMENT, targets[3], {
      tDepth: depth, tVelocity: velocity, inverseProjection: camera.projectionMatrixInverse,
    }, draw)) throw new Error("SGSR2 geometry history failed");
    this.convertTexture = convert.texture;
    this.history = history.texture;
    this.output = output.texture;
    this.ping = 1 - this.ping;
    return output.texture;
  }
}
