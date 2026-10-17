import * as T from "three/src/Three.WebGPU.js";
import Renderer from "three/src/renderers/common/Renderer.js";
import ThreeGPUBackend from "three/src/renderers/webgpu/WebGPUBackend.js";
import StandardNodeLibrary from "three/src/renderers/webgpu/nodes/StandardNodeLibrary.js";
import { TemporalState, selectUpscaling } from "../temporal-state.js";
import { GPUResources } from "../webgpu/resources.js";
import { GPUScene } from "../webgpu/scene.js";
import { GPUPasses } from "../webgpu/passes.js";
import { GPUProfiler } from "../webgpu/profiler.js";
import { SwarmMotion } from "../webgpu/swarm-motion.js";
import { GPUMotion } from "../webgpu/motion.js";
import { GPUShadowCache } from "../webgpu/shadows.js";
import {
  gpuTexture,
  gpuContext,
  sceneTimestamps,
} from "../webgpu/three-adapter.js";
import { SGSR2Compute } from "../sgsr2-compute.js";
import * as SH from "../../shaders/webgpu-post.wgsl.js";

export class WebGPUBackend {
  constructor(nativeCanvas, onFailure) {
    this.nativeCanvas = nativeCanvas;
    this.onFailure = onFailure;
    this.frames = 0;
    this.warmFrames = 0;
    this.temporal = new TemporalState({Matrix4:T.Matrix4,Vector2:T.Vector2,Vector4:T.Vector4});
    this.params = new Float32Array(184);
    this.disposed = false;
    this.capabilities = {
      webgpu: true,
      compute: true,
      features: { depthTexture: true },
    };
  }
  async init() {
    this.canvas = document.createElement("canvas");
    this.canvas.id = "polyshade-webgpu";
    this.canvas.hidden = true;
    Object.assign(this.canvas.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: "0",
    });
    this.nativeCanvas.after(this.canvas);
    const parameters = {
      canvas: this.canvas,
      antialias: false,
      powerPreference: "high-performance",
    };
    // The convenience WebGPURenderer installs a WebGL fallback. Use the
    // pinned common renderer and GPU backend directly to exclude that path.
    this.renderer = new Renderer(new ThreeGPUBackend(parameters), parameters);
    this.renderer.library = new StandardNodeLibrary();
    this.renderer.isWebGPURenderer = true;
    await this.renderer.init();
    if (this.disposed) {
      this.renderer.dispose();
      this.canvas.remove();
      return;
    }
    if (!this.renderer.backend.isWebGPUBackend || !this.renderer.backend.device)
      throw new Error("Real WebGPU renderer/device unavailable");
    this.renderer.highPrecision = true;
    this.renderer.toneMapping = T.NoToneMapping;
    this.renderer.outputColorSpace = T.LinearSRGBColorSpace;
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    // Adjacent, interpolated taps avoid the sparse PCF grid at large softness.
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.device = this.renderer.backend.device;
    this.device.addEventListener(
      "uncapturederror",
      (this.onError = (e) =>
        this.onFailure(`WebGPU validation: ${e.error.message}`)),
    );
    void this.device.lost.then((info) => {
      if (!this.disposed)
        this.onFailure(`WebGPU device lost: ${info.reason} ${info.message}`);
    });
    this.resources = new GPUResources(this.device);
    this.passes = new GPUPasses(this.device, this.resources);
    this.scene = new GPUScene();
    this.motion = new GPUMotion(this.device);
    this.profiler = new GPUProfiler(this.device);
    this.shadows = new GPUShadowCache();
    // This hook is isolated in the adapter boundary: timestamps enclose actual
    // Three render passes, excluding CPU submission gaps and without GPU fences.
    this.removeTimestamps = sceneTimestamps(this.renderer, this.profiler,
      target => this.scene.sun.shadow.shadowNode.lights.some(light => light.shadow.map === target));
    const shaders = {
      staticVelocity: SH.STATIC_VELOCITY,
      geometry: SH.GEOMETRY_HISTORY,
      sun: SH.SUN_VISIBILITY,
      sunMask: SH.SUN_MASK,
      ao: SH.AO,
      bloom: SH.BLOOM,
      aoHorizontal: SH.AO_BLUR_HORIZONTAL,
      aoVertical: SH.AO_BLUR_VERTICAL,
      bloomBlur: SH.BLOOM_BLUR,
      bloomBlurWide: SH.BLOOM_BLUR_WIDE,
      rays: SH.RAYS,
      volume: SH.VOLUME,
      grade: SH.GRADE,
      finish: SH.FINISH,
    };
    for (const [name, shader] of Object.entries(shaders)) {
      await this.passes.compile(
        name,
        shader,
        name === "finish"
          ? navigator.gpu.getPreferredCanvasFormat()
          : "rgba16float",
      );
      if (this.disposed) {
        this.dispose();
        return;
      }
    }
    await this.motion.init();
    this.swarmMotion = new SwarmMotion(this.device);
    await this.swarmMotion.init();
    this.compute = new SGSR2Compute(this.device, this.resources);
    try {
      await this.compute.init();
    } catch (e) {
      this.computeFailure = e.message;
      this.capabilities.compute = false;
      this.compute.dispose();
      this.compute = null;
    }
    if (this.disposed) {
      this.dispose();
      return;
    }
    this.target = new T.RenderTarget(1, 1, {
      type: T.HalfFloatType,
      depthBuffer: true,
      samples: 0,
    });
    this.target.texture.colorSpace = T.NoColorSpace;
    this.target.depthTexture = new T.DepthTexture(1, 1, T.FloatType);
    this.target.depthTexture.format = T.DepthFormat;
    this.ready = true;
  }
  render(source, sourceCamera, settings, logical) {
    if (!this.ready || this.disposed) return false;
    const requestedSettings = settings;
    if (settings.postEnabled === false) {
      if (this.noPostSource !== settings) {
        this.noPostSource = settings;
        this.noPostSettings = {
          ...settings,
          upscaling: "native",
          renderScale: 1,
          aoEnabled: false,
          bloomEnabled: false,
          sunRaysEnabled: false,
          volumetricEnabled: false,
          atmosphereEnabled: false,
          lensFlareEnabled: false,
          motionBlurEnabled: false,
          gradeEnabled: false,
          sharpenEnabled: false,
          fxaaEnabled: false,
        };
      }
      settings = this.noPostSettings;
    }
    const ow = this.nativeCanvas.width,
      oh = this.nativeCanvas.height;
    if (!ow || !oh) return false;
    if (this.canvas.parentElement !== this.nativeCanvas.parentElement)
      this.nativeCanvas.after(this.canvas);
    const rect = this.nativeCanvas.getBoundingClientRect();
    Object.assign(this.canvas.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
    if (this.canvas.width !== ow || this.canvas.height !== oh)
      this.renderer.setSize(ow, oh, false);
    const choice = selectUpscaling(
      settings,
      this.capabilities,
      !!this.computeFailure,
    );
    if (requestedSettings.postEnabled === false) {
      choice.requested = requestedSettings.upscaling ?? "native";
      choice.reason = "Post processing disabled; using native rendering.";
    }
    this.selection = choice;
    const compute = choice.backend === "sgsr2-compute";
    const nativeDebug = settings.upscaleDebugView === "native";
    const w = Math.max(1, Math.round(ow * (nativeDebug ? 1 : choice.scale))),
      h = Math.max(1, Math.round(oh * (nativeDebug ? 1 : choice.scale)));
    this.scene.sourceIndex.supported = logical.three?.discovery?.topologyEvents === true;
    const c = this.scene.sync(
      source,
      sourceCamera,
      settings,
      logical.palette,
      logical.sky,
      logical.sceneState?.shadowShaderSnapshots,
      this.motion.entries,
    );
    // CSM initialization may update the camera projection. Compile with the
    // unjittered camera BEFORE recording the first rendered temporal state.
    if (!this.precompiled) {
      if (!this.compiling)
        this.compiling = this.renderer
          .compileAsync(this.scene.scene, c)
          .then(() => {
            this.precompiled = true;
          })
          .catch((e) => this.onFailure(e.message));
      return false;
    }
    if (settings.shadowQuality !== "off") this.shadows.prepare(this.scene, c);
    this.profiler.begin(settings.debugProfile);
    const temporalSettings = {
      ...settings,
      debugView: undefined,
      debugProfile: undefined,
      debugEnabled: undefined,
      upscaleDebugView: undefined,
      backend: choice.backend,
      scale: choice.scale,
      upscaleJitter: compute && !nativeDebug && settings.upscaleJitter,
    };
    this.temporal.begin(source, c, w, h, ow, oh, temporalSettings);
    this.target.setSize(w, h);
    try {
      this.renderer.setRenderTarget(this.target);
      this.renderer.render(this.scene.scene, c);
      this.lastSceneDraws = this.renderer.info.render.drawCalls;
      this.lastSceneTriangles = this.renderer.info.render.triangles;
      this.renderer.setRenderTarget(null);
      const color = gpuTexture(this.renderer, this.target.texture),
        depth = gpuTexture(this.renderer, this.target.depthTexture);
      this.updateParameters(
        settings,
        logical.palette,
        c,
        w,
        h,
        ow,
        oh,
        compute && !nativeDebug,
      );
      const encoder = this.device.createCommandEncoder({
        label: "PolyShade frame",
      });
      const velocity = this.resources.get("velocity", w, h);
      const inputs = {
        color,
        depth,
        velocity,
        ao: this.passes.white,
        sun: this.passes.zero,
      };
      this.passes.draw(
        encoder,
        "staticVelocity",
        velocity,
        inputs,
        this.profiler,
      );
      this.motion.render(
        encoder,
        velocity,
        depth,
        source,
        c,
        this.temporal,
        this.profiler,
      );
      this.swarmMotion.render(encoder, velocity, depth, this.scene.swarms, this.temporal, this.profiler);
      let debugVelocity = velocity;
      if (settings.upscaleDebugView === "static-velocity") {
        debugVelocity = this.resources.get("static-debug", w, h);
        this.passes.draw(
          encoder,
          "staticVelocity",
          debugVelocity,
          inputs,
          this.profiler,
        );
      }
      if (
        settings.sunRaysEnabled ||
        settings.volumetricEnabled ||
        settings.lensFlareEnabled
      ) {
        inputs.sun = this.resources.get("sun-visibility", 1, 1);
        this.passes.draw(encoder, "sun", inputs.sun, inputs, this.profiler);
      }
      if (settings.aoEnabled) {
        const a = this.resources.get(
            "ao-raw",
            Math.ceil(w / 2),
            Math.ceil(h / 2),
          ),
          b = this.resources.get("ao", a.width, a.height);
        this.passes.draw(encoder, "ao", a, inputs, this.profiler);
        this.passes.draw(
          encoder,
          "aoHorizontal",
          b,
          { ...inputs, color: a },
          this.profiler,
        );
        this.passes.draw(encoder, "aoVertical", a, { ...inputs, color: b }, this.profiler);
        inputs.ao = a;
      }
      if (settings.bloomEnabled) {
        const a = this.resources.get(
            "bloom-raw",
            Math.ceil(w / 4),
            Math.ceil(h / 4),
          ),
          b = this.resources.get("bloom", a.width, a.height);
        this.passes.draw(encoder, "bloom", a, inputs, this.profiler);
        this.passes.draw(
          encoder,
          "bloomBlur",
          b,
          { ...inputs, color: a },
          this.profiler,
        );
        this.passes.draw(encoder, "bloomBlurWide", a, { ...inputs, color: b }, this.profiler);
        inputs.bloom = a;
      }
      if (settings.sunRaysEnabled && this.params[107] > 0) {
        const maskSize = Math.min(512, Math.max(128, Math.round(w * 0.4)));
        inputs.sunMask = this.resources.get("sun-mask", maskSize, maskSize);
        this.passes.draw(
          encoder,
          "sunMask",
          inputs.sunMask,
          inputs,
          this.profiler,
        );
        inputs.rays = this.resources.get("rays", w, h);
        this.passes.draw(encoder, "rays", inputs.rays, inputs, this.profiler);
      }
      if (settings.volumetricEnabled && this.params[107] > 0) {
        inputs.volume = this.resources.get("volume", w, h);
        this.passes.draw(
          encoder,
          "volume",
          inputs.volume,
          inputs,
          this.profiler,
        );
      }
      const grade = this.resources.get("graded", w, h);
      this.passes.draw(encoder, "grade", grade, inputs, this.profiler);
      let output = grade;
      if (compute && !nativeDebug) {
        output = this.compute.reconstruct(
          encoder,
          grade,
          depth,
          velocity,
          this.temporal,
          this.profiler,
        );
        this.passes.draw(
          encoder,
          "geometry",
          this.compute.geometry,
          inputs,
          this.profiler,
        );
      }
      if (settings.upscaleDebugView === "low-resolution") output = grade;
      if (
        settings.upscaleDebugView === "history" &&
        this.compute?.previousHistory
      )
        output = this.compute.previousHistory;
      const finalInputs = {
        ...inputs,
        color: output,
        velocity: debugVelocity,
        rejection: this.compute?.rejection,
      };
      this.passes.draw(
        encoder,
        "finish",
        gpuContext(this.renderer).getCurrentTexture(),
        finalInputs,
        this.profiler,
      );
      const slot = this.profiler.end(encoder);
      this.device.queue.submit([encoder.finish()]);
      this.profiler.submitted(slot);
      this.temporal.commit();
      if (settings.shadowQuality !== "off") this.shadows.commit();
      this.frames++;
      this.warmFrames++;
      if (this.warmFrames < 4) return false;
      this.canvas.hidden = false;
      if (this.originalOpacity === undefined)
        this.originalOpacity = this.nativeCanvas.style.opacity;
      this.nativeCanvas.style.opacity = "0";
      return true;
    } finally {
      this.temporal.restoreCamera();
    }
  }
  updateParameters(s, palette, c, w, h, ow, oh, compute) {
    const f = this.params,
      t = this.temporal;
    for (const [i, m] of [
      c.projectionMatrixInverse,
      c.matrixWorld,
      t.inverseJitteredVP,
      t.previousJitteredVP,
      t.previousInverseProjection,
      c.projectionMatrix,
    ].entries())
      f.set(m.elements, i * 16);
    f.set([w, h, ow, oh], 96);
    f.set(t.jitterUV.toArray(), 100);
    const sun = new T.Vector3()
      .copy(palette.direction)
      .multiplyScalar(10000)
      .add(c.position)
      .project(c);
    const forward = new T.Vector3()
      .copy(palette.direction)
      .transformDirection(c.matrixWorldInverse);
    const visibility =
      forward.z < 0 &&
      sun.x > -1.2 &&
      sun.x < 1.2 &&
      sun.y > -1.2 &&
      sun.y < 1.2
        ? 1
        : 0;
    f.set([sun.x * 0.5 + 0.5, 0.5 - sun.y * 0.5, ow / oh, visibility], 104);
    f.set([...palette.direction.toArray(), 0], 108);
    f.set([...palette.horizon.toArray(), 0], 112);
    f.set([...palette.sun.toArray(), 0], 116);
    const cfg = [
      [s.exposure, s.contrast, s.saturation, s.vibrance],
      [s.temperature, s.tint, s.shadowLift, s.highlightCompression],
      [s.blackLevel, s.whiteLevel, s.vignetteStrength, s.vignetteSoftness],
      [
        s.aoStrength,
        s.aoRadius,
        s.aoBias,
        { low: 8, medium: 12, high: 16 }[s.aoQuality],
      ],
      [
        s.bloomThreshold,
        s.bloomEnabled ? s.bloomStrength : 0,
        s.bloomRadius,
        s.aoEnabled ? 1 : 0,
      ],
      [
        s.sunRaysEnabled
          ? s.sunRayStrength * (s.volumetricEnabled ? 0.35 : 1)
          : 0,
        s.sunRayDecay,
        s.sunRayDensity,
        s.sunRayExposure,
      ],
      [
        s.volumetricEnabled ? s.volumetricStrength : 0,
        s.volumetricDensity,
        s.volumetricDecay,
        s.volumetricSamples,
      ],
      [
        s.volumetricMaxDistance,
        s.atmosphereEnabled
          ? s.atmosphereStrength * (s.volumetricEnabled ? 0.85 : 1)
          : 0,
        s.atmosphereStart,
        s.atmosphereSunWarmth,
      ],
      [
        s.lensFlareEnabled ? s.lensFlareStrength : 0,
        s.flareGhostStrength,
        s.flareIridescence,
        s.flareStreakStrength,
      ],
      [
        s.motionBlurEnabled ? s.motionBlurExposureMs : 0,
        s.motionBlurMaxPixels,
        t.deltaMs,
        t.valid ? 1 : 0,
      ],
      [
        s.cloudsEnabled ? s.cloudAmount : 0,
        performance.now() / 1000,
        visibility,
        compute ? 1 : 0,
      ],
      [
        s.gradeEnabled ? 1 : 0,
        [
          "final",
          "low-resolution",
          "depth",
          "static-velocity",
          "car-velocity",
          "combined-velocity",
          "jitter",
          "history-validity",
          "history-rejection",
          "history",
          "native",
        ].indexOf(s.upscaleDebugView),
        s.sharpenEnabled ? s.sharpenStrength : 0,
        !compute && s.fxaaEnabled ? 1 : 0,
      ],
      [
        Math.pow(s.sunRayDecay, 0.75),
        Math.max(1 - Math.pow(s.sunRayDecay, 48), 0.001),
        0,
        0,
      ],
    ];
    cfg.push([s.postQuality === "high" ? 2 : 1.5, 0, 0, 0]);
    cfg.forEach((v, i) =>
      f.set(
        v.map((x) => (Number.isFinite(x) ? x : 0)),
        120 + i * 4,
      ),
    );
    this.device.queue.writeBuffer(this.passes.uniform, 0, f);
  }
  hide() {
    if (this.canvas) this.canvas.hidden = true;
    if (this.originalOpacity !== undefined)
      this.nativeCanvas.style.opacity = this.originalOpacity;
  }
  report() {
    return {
      renderer: "WebGPU",
      threeRevision: T.REVISION,
      ready: this.ready,
      frames: this.frames,
      selection: this.selection,
      temporal: this.temporal.report(),
      compute: this.compute?.report(),
      computeFailure: this.computeFailure,
      output: [this.canvas?.width, this.canvas?.height],
      internal: [this.target?.width, this.target?.height],
      resources: this.resources?.report(),
      profile: this.profiler?.report(),
      shadowCache: this.shadows?.report(),
      adapter: Object.fromEntries(
        ["vendor", "architecture", "device", "description"].map((k) => [
          k,
          this.device?.adapterInfo?.[k] ?? null,
        ]),
      ),
      meshes: this.scene?.objects.size,
      cars: this.motion?.entries.size,
      swarm: this.scene?.swarms.report(),
      swarmVelocity: this.swarmMotion?.report(),
      sceneDrawCalls: this.lastSceneDraws,
      sceneTriangles: this.lastSceneTriangles,
      projectedShadowProxiesReplaced: this.scene?.skippedProjected,
    };
  }
  dispose() {
    if (this.cleaned) return;
    this.cleaned = true;
    this.disposed = true;
    this.ready = false;
    this.hide();
    this.device?.removeEventListener("uncapturederror", this.onError);
    this.removeTimestamps?.();
    this.compute?.dispose();
    this.motion?.dispose();
    this.swarmMotion?.dispose();
    this.passes?.dispose();
    this.profiler?.dispose();
    this.resources?.dispose();
    this.shadows?.dispose();
    this.scene?.dispose();
    this.target?.dispose();
    this.renderer?.dispose();
    this.canvas?.remove();
  }
}
