import { SUN_MASK_FRAGMENT, SUN_RAYS_FRAGMENT } from "../shaders/sun-rays.js";
import { SUN_VISIBILITY_FRAGMENT } from "../shaders/sun-optics.js";
import { SunVisibility, sunScreenVisibility } from "./sun-visibility.js";
import { VOLUMETRIC_FRAGMENT } from "../shaders/volumetric.js";
import { FULLSCREEN_VERTEX } from "../shaders/fullscreen.js";
import { SSAO_FRAGMENT, AO_BLUR_FRAGMENT } from "../shaders/ssao.js";
import { BLOOM_FRAGMENT, BLOOM_BLUR_FRAGMENT } from "../shaders/bloom.js";
import { GRADE_FRAGMENT } from "../shaders/grade.js";
import { FINISH_FRAGMENT } from "../shaders/finish.js";
import { RenderState, TargetPool } from "./render-targets.js";
import { ObjectMotion } from "./object-motion.js";
import { TemporalState, selectUpscaling } from "./temporal-state.js";
import { STATIC_VELOCITY_FRAGMENT, TEMPORAL_DEBUG_FRAGMENT } from "../shaders/temporal-inputs.js";
import { SGSR2Fragment } from "./sgsr2-fragment.js";
import { SGSR2_VERTEX, SGSR2_CONVERT_FRAGMENT, SGSR2_UPSCALE_FRAGMENT } from "../shaders/sgsr2.js";
const DEBUG_VIEWS = [
  "final",
  "depth",
  "ao",
  "bloom",
  "sun-position",
  "sun-visibility",
  "sun-rays",
  "volumetric",
];
const GRADE_OUTPUT_FRAGMENT = GRADE_FRAGMENT.replace(
  "gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);",
  "gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);\n#include <colorspace_fragment>",
);

export class PostProcess {
  constructor(three, renderer, capabilities, guard) {
    this.three = three;
    this.renderer = renderer;
    this.capabilities = capabilities;
    this.guard = guard;
    this.pool = new TargetPool(three, capabilities);
    this.state = new RenderState(three);
    this.scene = new three.Scene();
    this.camera = new three.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.geometry = new three.BufferGeometry();
    this.geometry.setAttribute("position", new three.BufferAttribute(
      new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.geometry.setAttribute("uv", new three.BufferAttribute(
      new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    this.quad = new three.Mesh(this.geometry);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    this.materials = new Map();
    this.passOrder = [];
    this.disabled = false;
    this.frames = 0;
    this.active = {};
    this.sunVisibility = new SunVisibility(renderer);
    this.motionCurrentViewProjection = new three.Matrix4();
    this.motionLastViewProjection = new three.Matrix4();
    this.motionBlurViewProjection = new three.Matrix4();
    this.motionPreviousWorld = new three.Matrix4();
    this.motionPreviousProjection = new three.Matrix4();
    this.motionPreviousCamera = null;
    this.motionScene = null;
    this.motionPreviousAt = 0;
    this.motionFrameValid = false;
    this.objectMotion = new ObjectMotion(three);
    this.motionExposureScale = 1;
    this.temporal = new TemporalState(three);
    this.upscaler = new SGSR2Fragment(three);
  }
  prepareCameraMotion(scene, camera) {
    camera.updateMatrixWorld?.();
    if (this.motionScene !== scene) {
      this.motionScene = scene;
      this.motionPreviousCamera = null;
      this.temporal.invalidate("post processing disabled");
    }
    const current = this.motionCurrentViewProjection.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    const now = performance.now();
    let valid = !!this.motionPreviousCamera &&
      this.motionPreviousCamera === camera &&
      now - this.motionPreviousAt < 120;
    const world = camera.matrixWorld.elements;
    const oldWorld = this.motionPreviousWorld.elements;
    if (valid) {
      const dx = world[12] - oldWorld[12];
      const dy = world[13] - oldWorld[13];
      const dz = world[14] - oldWorld[14];
      const forwardDot = world[8] * oldWorld[8] +
        world[9] * oldWorld[9] + world[10] * oldWorld[10];
      const travelLimit = Math.max(8, (now - this.motionPreviousAt) * 0.8);
      valid = dx * dx + dy * dy + dz * dz < travelLimit * travelLimit && forwardDot > 0.5;
      const projection = camera.projectionMatrix.elements;
      const oldProjection = this.motionPreviousProjection.elements;
      for (let i = 0; valid && i < 16; i++)
        if (Math.abs(projection[i] - oldProjection[i]) > 0.001) valid = false;
    }
    this.motionExposureScale = (1000 / 60) / Math.max(0.25, now - this.motionPreviousAt);
    this.motionFrameValid = valid;
    this.motionBlurViewProjection.copy(valid ? this.motionLastViewProjection : current);
    this.motionLastViewProjection.copy(current);
    this.motionPreviousWorld.copy(camera.matrixWorld);
    this.motionPreviousProjection.copy(camera.projectionMatrix);
    this.motionPreviousCamera = camera;
    this.motionPreviousAt = now;
    return valid;
  }
  material(name, fragment) {
    if (!this.materials.has(name))
      this.materials.set(
        name,
        new this.three.ShaderMaterial({
          name: `PolyShade_${name}`,
          vertexShader: name.startsWith("sgsr2-") ? SGSR2_VERTEX : FULLSCREEN_VERTEX,
          ...(name.startsWith("sgsr2-") ? { glslVersion: "300 es" } : {}),
          fragmentShader: `// PolyShade ${name}\n${fragment}`,
          uniforms: {},
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
          blending: this.three.NoBlending,
        }),
      );
    return this.materials.get(name);
  }
  uniform(material, key, value) {
    const entry = material.uniforms[key];
    if (entry) entry.value = value;
    else material.uniforms[key] = { value };
  }
  warmupMaterials(s) {
    const passes = [];
    const add = (name, fragment, linear = true) => passes.push({ material: this.material(name, fragment), linear });
    if (s.aoEnabled && s.aoStrength > 0) {
      add("ao", SSAO_FRAGMENT); add("ao-blur", AO_BLUR_FRAGMENT);
    }
    if (s.bloomEnabled && s.bloomStrength > 0) {
      add("bloom", BLOOM_FRAGMENT); add("bloom-blur", BLOOM_BLUR_FRAGMENT);
    }
    if (s.sunRaysEnabled || s.lensFlareEnabled || s.volumetricEnabled)
      add("sun-visibility", SUN_VISIBILITY_FRAGMENT);
    if (s.sunRaysEnabled) { add("sun-mask", SUN_MASK_FRAGMENT); add("sun-rays", SUN_RAYS_FRAGMENT); }
    if (s.volumetricEnabled) add("volumetric", VOLUMETRIC_FRAGMENT);
    if (["auto", "sgsr2-fragment"].includes(s.upscaling) || s.fxaaEnabled || (s.sharpenEnabled && s.sharpenStrength > 0)) {
      add("grade", GRADE_FRAGMENT); add("finish", FINISH_FRAGMENT, false);
    } else add("grade-output", GRADE_OUTPUT_FRAGMENT, false);
    if (["auto", "sgsr2-fragment"].includes(s.upscaling) && selectUpscaling(s, this.capabilities).supported) {
      add("static-velocity", STATIC_VELOCITY_FRAGMENT);
      add("sgsr2-convert", SGSR2_CONVERT_FRAGMENT);
      add("sgsr2-upscale", SGSR2_UPSCALE_FRAGMENT);
    }
    return passes;
  }
  prepareTarget(retain, name, width, height) {
    retain.add(name);
    const existing = this.pool.targets.get(name);
    const changed = !existing || existing.width !== width || existing.height !== height;
    const target = this.pool.get(name, width, height);
    // Reserve GPU attachments at configuration/resize time, rather than
    // during the first brief glimpse of sunlight while driving.
    if (changed) this.renderer.initRenderTarget?.(target);
  }
  pass(name, fragment, target, values, draw, profileName = name) {
    if (this.guard.failures.has(name)) return false;
    const m = this.material(name, fragment);
    for (const key in values) this.uniform(m, key, values[key]);
    this.quad.material = m;
    this.guard.pass = name;
    this.renderer.setRenderTarget(target);
    this.renderer.setScissorTest(false);
    if (this.profiler)
      this.profiler.measure(profileName, () => draw(this.scene, this.camera));
    else draw(this.scene, this.camera);
    this.passOrder.push(name);
    return !this.guard.failures.has(name);
  }
  render(scene, camera, s, draw, palette) {
    const r = this.renderer;
    this.passOrder.length = 0;
    if (this.disabled || !s.postEnabled || s.postQuality === "off") {
      this.pool.dispose();
      this.objectMotion.dispose();
      this.sunVisibility.dispose();
      this.motionPreviousCamera = null;
      this.active = { post: false };
      return draw(scene, camera);
    }
    if (r.getRenderTarget() !== null || r.xr.isPresenting) {
      this.motionPreviousCamera = null;
      return draw(scene, camera);
    }
    const motionFrameValid = this.prepareCameraMotion(scene, camera);
    this.state.capture(r);
    this.passOrder.length = 0;
    let temporalActive = false;
    try {
      const gl = r.getContext();
      const upscaleView = s.upscaleDebugView ?? "final";
      const selectedUpscaling = selectUpscaling(s, this.capabilities, this.upscaleFailed);
      const upscaling = upscaleView === "native" ?
        { ...selectedUpscaling, backend: "native", scale: 1, reason: "Native comparison view." } : selectedUpscaling;
      temporalActive = upscaling.backend === "sgsr2-fragment" && upscaleView !== "native";
      const internalScale = upscaleView === "native" ? 1 : upscaling.scale;
      let w = Math.round(gl.drawingBufferWidth * internalScale),
        h = Math.round(gl.drawingBufferHeight * internalScale);
      const sceneTarget = this.pool.get("scene", w, h, {
        depth: true,
        samples: !temporalActive && this.capabilities.antialias
          ? Math.min(
              s.sceneSamples === "auto" || s.sceneSamples === undefined
                ? 0
                : Number(s.sceneSamples),
              this.capabilities.maxSamples,
            )
          : 0,
      });
      w = sceneTarget.width;
      h = sceneTarget.height;
      if (temporalActive) this.temporal.begin(scene, camera, w, h,
        gl.drawingBufferWidth, gl.drawingBufferHeight, s);
      else this.temporal.invalidate("temporal reconstruction inactive");
      const finishNeeded = temporalActive ||
        s.fxaaEnabled || (s.sharpenEnabled && s.sharpenStrength > 0);
      const gradeName = temporalActive ? "sgsr-input" : "grade";
      const gradeTarget = finishNeeded
          ? this.pool.get(
              gradeName,
              temporalActive ? w : gl.drawingBufferWidth,
              temporalActive ? h : gl.drawingBufferHeight,
            )
          : this.state.target,
        retain = new Set(finishNeeded ? ["scene", gradeName] : ["scene"]);
      r.xr.enabled = false;
      r.autoClear = true;
      r.toneMapping = this.three.NoToneMapping;
      r.outputColorSpace = this.three.LinearSRGBColorSpace;
      r.setRenderTarget(sceneTarget);
      r.setScissorTest(false);
      this.guard.pass = "scene";
      if (this.profiler) this.profiler.scene(() => draw(scene, camera));
      else draw(scene, camera);
      // Every fullscreen pass overwrites every pixel; clearing it first only
      // repeats memory writes and driver submissions.
      r.autoClear = false;
      if (this.profiler && sceneTarget.samples)
        this.profiler.measure("scene-msaa-resolve", () =>
          r.setRenderTarget(null),
        );
      this.passOrder.push("scene");
      const depth = sceneTarget.depthTexture;
      const motionTexel = (this.motionTexel ??= new this.three.Vector2()).set(1 / w, 1 / h);
      const motionExposureMs = s.motionBlurExposureMs ?? 0;
      const motionRequested = s.motionBlurEnabled && motionExposureMs > 0;
      const motionBlurActive = motionRequested &&
        depth && motionFrameValid;
      // Scene rendering has updated the cars' world matrices. Record them even
      // on reset frames so a camera switch cannot invent object velocity.
      if (motionRequested || temporalActive) this.objectMotion.update(scene,
        temporalActive ? this.temporal.previousJitteredVP : this.motionBlurViewProjection,
        temporalActive ? this.temporal.valid : motionFrameValid,
        { temporal: temporalActive, maxTravel: temporalActive ? Math.max(8, this.temporal.deltaMs * 0.8) : Infinity });
      else if (this.objectMotion.entries.length) this.objectMotion.dispose();
      let objectVelocity = sceneTarget.texture;
      if (motionRequested && depth && this.objectMotion.entries.length) {
        const target = this.pool.get("object-motion", w, h);
        retain.add("object-motion");
        target.texture.minFilter = this.three.NearestFilter;
        target.texture.magFilter = this.three.NearestFilter;
        if (motionBlurActive) {
          const renderMotion = () => this.objectMotion.render(r, camera, target, depth, draw,
            { jitterUV: temporalActive ? this.temporal.jitterUV : null });
          this.guard.pass = "object-motion";
          if (this.profiler) this.profiler.measure("object-motion", renderMotion);
          else renderMotion();
        }
        objectVelocity = target.texture;
        this.passOrder.push("object-motion");
      }
      const depthValues = {
        tDepth: depth,
        inverseProjection: camera.projectionMatrixInverse,
        nearFar: { x: camera.near, y: camera.far },
      };
      let temporalVelocity = null;
      if (temporalActive && depth) {
        const target = this.pool.get("sgsr-velocity", w, h);
        retain.add("sgsr-velocity");
        target.texture.colorSpace = this.three.NoColorSpace;
        target.texture.minFilter = this.three.NearestFilter;
        target.texture.magFilter = this.three.NearestFilter;
        if (!this.pass("static-velocity", STATIC_VELOCITY_FRAGMENT, target, {
          tDepth: depth, inverseCurrentVP: this.temporal.inverseJitteredVP,
          previousVP: this.temporal.previousJitteredVP, jitterUV: this.temporal.jitterUV,
          previousInverseProjection: this.temporal.previousInverseProjection,
          historyValid: this.temporal.valid ? 1 : 0,
        }, draw)) throw new Error("Static velocity failed");
        if (upscaleView !== "static-velocity") {
          this.guard.pass = "car-velocity";
          const cars = () => this.objectMotion.render(r, camera, target, depth, draw, {
            temporal: true, clear: upscaleView === "car-velocity", jitterUV: this.temporal.jitterUV,
            previousInverseProjection: this.temporal.previousInverseProjection,
          });
          if (this.profiler) this.profiler.measure("car-velocity", cars);
          else cars();
          if (this.guard.failures.has("car-velocity")) throw new Error("Car velocity failed");
          this.passOrder.push("car-velocity");
        }
        temporalVelocity = target.texture;
      }
      let ao = sceneTarget.texture,
        aoActive = false,
        bloom = sceneTarget.texture,
        bloomActive = false;
      if (
        s.aoEnabled &&
        s.aoStrength > 0 &&
        depth &&
        this.capabilities.features.ssao
      ) {
        const scale = s.aoQuality === "high" ? 0.5 : 0.4,
          baseWidth = w / s.renderScale,
          baseHeight = h / s.renderScale;
        const ratio = Math.min(scale, 960 / baseWidth);
        const aw = Math.round(baseWidth * ratio),
          ah = Math.round(baseHeight * ratio);
        const a = this.pool.get("ao", aw, ah),
          b = this.pool.get("ao-blur", aw, ah);
        retain.add("ao");
        retain.add("ao-blur");
        aoActive = this.pass(
          "ao",
          SSAO_FRAGMENT,
          a,
          {
            ...depthValues,
            radius: s.aoRadius,
            strength: s.aoStrength,
            bias: s.aoBias,
            samples: { low: 8, medium: 12, high: 16 }[s.aoQuality],
            projectionScale: camera.projectionMatrix.elements[5] * 0.5,
          },
          draw,
        );
        if (aoActive) {
          const step = (this.aoStep ??= new this.three.Vector2());
          step.set(1 / aw, 0);
          aoActive = this.pass(
            "ao-blur",
            AO_BLUR_FRAGMENT,
            b,
            { ...depthValues, tInput: a.texture, stepUv: step },
            draw,
            "ao-blur-horizontal",
          );
          step.set(0, 1 / ah);
          aoActive =
            this.pass(
              "ao-blur",
              AO_BLUR_FRAGMENT,
              a,
              { ...depthValues, tInput: b.texture, stepUv: step },
              draw,
              "ao-blur-vertical",
            ) && aoActive;
          ao = a.texture;
        }
      }
      if (
        s.bloomEnabled &&
        s.bloomStrength > 0 &&
        this.capabilities.features.bloom
      ) {
        const scale = Math.min(0.25, 768 / gl.drawingBufferWidth),
          bw = Math.round(gl.drawingBufferWidth * scale),
          bh = Math.round(gl.drawingBufferHeight * scale);
        const a = this.pool.get("bloom", bw, bh),
          b = this.pool.get("bloom-blur", bw, bh);
        retain.add("bloom");
        retain.add("bloom-blur");
        bloomActive = this.pass(
          "bloom",
          BLOOM_FRAGMENT,
          a,
          { tInput: sceneTarget.texture, threshold: s.bloomThreshold },
          draw,
        );
        if (bloomActive) {
          const step = (this.bloomStep ??= new this.three.Vector2());
          step.set(s.bloomRadius / bw, s.bloomRadius / bh);
          bloomActive = this.pass(
            "bloom-blur",
            BLOOM_BLUR_FRAGMENT,
            b,
            { tInput: a.texture, stepUv: step },
            draw,
            "bloom-blur-1",
          );
          step.multiplyScalar(s.postQuality === "high" ? 2 : 1.5);
          bloomActive =
            this.pass(
              "bloom-blur",
              BLOOM_BLUR_FRAGMENT,
              a,
              { tInput: b.texture, stepUv: step },
              draw,
              "bloom-blur-2",
            ) && bloomActive;
          bloom = a.texture;
        }
      }
      let rays = sceneTarget.texture,
        raysActive = false,
        opticsActive = false,
        visibility = 0;
      const rayTexel = (this.rayTexel ??= new this.three.Vector2(1, 1));
      const debugSun =
        s.debugView === "sun-position" ||
        s.debugView === "sun-visibility" ||
        s.debugView === "sun-rays" ||
        s.debugView === "volumetric";
      const debugRays = s.debugView === "sun-rays";
      const debugVolume = s.debugView === "volumetric";
      const raysRequested =
        ((s.sunRaysEnabled && s.sunRayStrength > 0 && s.sunRayExposure > 0) || debugRays) &&
        !this.guard.failures.has("sun-rays") && !this.guard.failures.has("sun-mask");
      const volumeRequested =
        ((s.volumetricEnabled &&
          s.volumetricStrength > 0 &&
          s.volumetricDensity > 0) ||
          debugVolume) &&
        !this.guard.failures.has("volumetric");
      const sunUv = (this.sunUv ??= new this.three.Vector2());
      const sunRequested = raysRequested ||
        (s.lensFlareEnabled && s.lensFlareStrength > 0) || volumeRequested || debugSun;
      // Keep configured effect buffers resident across occlusion transitions.
      // Disabling the feature still releases them immediately.
      if (raysRequested) {
        const scale = 1;
        this.prepareTarget(retain, "sun-rays", Math.round(gl.drawingBufferWidth * scale), Math.round(gl.drawingBufferHeight * scale));
        const maskSize = Math.min(512, Math.max(128,
          2 ** Math.ceil(Math.log2(gl.drawingBufferHeight * 0.24))));
        this.prepareTarget(retain, "sun-mask", maskSize, maskSize);
      }
      if (volumeRequested) {
        this.prepareTarget(retain, "volumetric", w, h);
      }
      if (sunRequested) this.prepareTarget(retain, "sun-visibility", 1, 1);
      let visibilityTexture = sceneTarget.texture;
      if (
        sunRequested &&
        depth
      ) {
        const direction = (this.sunView ??= new this.three.Vector3());
        direction
          .copy(palette.direction)
          .transformDirection(camera.matrixWorldInverse);
        const clip = (this.sunClip ??= new this.three.Vector4());
        clip
          .set(direction.x, direction.y, direction.z, 0)
          .applyMatrix4(camera.projectionMatrix);
        sunUv.set(
          (clip.x / Math.max(clip.w, 0.001)) * 0.5 + 0.5,
          (clip.y / Math.max(clip.w, 0.001)) * 0.5 + 0.5,
        );
        visibility = sunScreenVisibility(clip.w, sunUv);
        if (visibility > 0 || debugSun) {
          const probe = this.pool.get("sun-visibility", 1, 1);
          retain.add("sun-visibility");
          this.pass(
            "sun-visibility",
            SUN_VISIBILITY_FRAGMENT,
            probe,
            {
              tDepth: depth,
              sunUv,
              aspect: w / h,
              sunDirection: palette.direction,
              cloudAmount: s.skyEnabled && s.cloudsEnabled ? s.cloudAmount : 0,
              cloudTime: performance.now() / 1000,
            },
            draw,
          );
          visibilityTexture = probe.texture;
          if (this.profiler)
            this.profiler.measure(
              "sun-visibility-transfer",
              () => this.sunVisibility.capture(sunUv),
              false,
            );
          else this.sunVisibility.capture(sunUv);
          opticsActive =
            s.lensFlareEnabled &&
            s.lensFlareStrength > 0 &&
            this.sunVisibility.clear > 0.01;
          if (
            raysRequested &&
            (debugRays ||
              this.sunVisibility.partial > 0.01)
          ) {
            const scale = 1,
              target = this.pool.get(
                "sun-rays",
                Math.round(gl.drawingBufferWidth * scale),
                Math.round(gl.drawingBufferHeight * scale),
              );
            const maskSize = Math.min(512, Math.max(128,
              2 ** Math.ceil(Math.log2(gl.drawingBufferHeight * 0.24))));
            const mask = this.pool.get("sun-mask", maskSize, maskSize);
            const extent = (this.sunMaskExtent ??= new this.three.Vector2());
            extent.set(0.24 / (w / h), 0.24);
            const maskScale = (this.sunMaskScale ??= new this.three.Vector2());
            maskScale.set(1 / extent.x, 1 / extent.y);
            const depthTexel = (this.depthTexel ??= new this.three.Vector2());
            depthTexel.set(1 / w, 1 / h);
            const maskActive = this.pass("sun-mask", SUN_MASK_FRAGMENT, mask, {
              tDepth: depth, sunUv, sunMaskExtent: extent, depthTexel, aspect: w / h,
            }, draw);
            rayTexel.set(1 / target.width, 1 / target.height);
            retain.add("sun-rays");
            raysActive = maskActive && this.pass(
              "sun-rays",
              SUN_RAYS_FRAGMENT,
              target,
              {
                tSunMask: mask.texture,
                sunMaskScale: maskScale,
                tSunVisibility: visibilityTexture,
                sunUv,
                sunColor: palette.sun,
                decay: s.sunRayDecay,
                density: s.sunRayDensity,
                exposure: s.sunRayExposure,
                aspect: w / h,
                visibility,
              },
              draw,
            );
            rays = target.texture;
          }
        }
      }
      let volume = sceneTarget.texture,
        volumeActive = false;
      const volumeTexel = (this.volumeTexel ??= new this.three.Vector2());
      if (
        volumeRequested &&
        depth &&
        (visibility > 0 || debugVolume) &&
        (this.sunVisibility.partial > 0.01 || debugVolume)
      ) {
        const vw = w, vh = h;
        const target = this.pool.get("volumetric", vw, vh);
        volumeTexel.set(1 / vw, 1 / vh);
        volumeActive = this.pass(
          "volumetric",
          VOLUMETRIC_FRAGMENT,
          target,
          {
            ...depthValues,
            tSunVisibility: visibilityTexture,
            cameraProjection: camera.projectionMatrix,
            depthTexel: (this.volumeDepthTexel ??= new this.three.Vector2()).set(1 / w, 1 / h),
            sunViewDirection: this.sunView,
            sunColor: palette.sun,
            volumeDensity: s.volumetricDensity,
            volumeDecay: s.volumetricDecay,
            volumeSamples: Math.min(
              16,
              Math.max(4, Math.round(s.volumetricSamples)),
            ),
            volumeMaxDistance: s.volumetricMaxDistance,
          },
          draw,
        );
        if (volumeActive) {
          retain.add("volumetric");
          volume = target.texture;
        }
      }
      if (!aoActive) {
        retain.delete("ao");
        retain.delete("ao-blur");
      }
      if (!bloomActive) {
        retain.delete("bloom");
        retain.delete("bloom-blur");
      }
      const values = {
        ...depthValues,
        tInput: sceneTarget.texture,
        tAO: ao,
        tBloom: bloom,
        tRays: rays,
        rayTexel,
        motionTexel,
        motionJitter: temporalActive ? this.temporal.jitterUV : { x: 0, y: 0 },
        tObjectMotion: objectVelocity,
        objectMotionActive: motionBlurActive && this.objectMotion.entries.length ? 1 : 0,
        motionExposureScale: this.motionExposureScale,
        motionVelocityRange: this.objectMotion.velocityRange,
        previousViewProjection: this.motionBlurViewProjection,
        motionBlurStrength: motionBlurActive ? motionExposureMs / (1000 / 60) : 0,
        motionBlurMaxPixels: s.motionBlurMaxPixels,
        tVolume: volume,
        volumeTexel,
        volumeMaxDistance: s.volumetricMaxDistance,
        volumeStrength:
          volumeActive && s.volumetricEnabled ? s.volumetricStrength : 0,
        tSunVisibility: visibilityTexture,
        sunUv,
        aspect: w / h,
        sunVisibility: visibility,
        flareStrength: opticsActive ? s.lensFlareStrength : 0,
        ghostStrength: s.flareGhostStrength,
        iridescence: s.flareIridescence,
        streakStrength: s.flareStreakStrength,
        rayStrength: raysActive
          ? s.sunRayStrength * (volumeActive ? 0.2 : 1)
          : 0,
        aoActive: aoActive ? 1 : 0,
        bloomStrength: bloomActive ? s.bloomStrength : 0,
        cameraWorld: camera.matrixWorld,
        horizon: palette.horizon,
        sunDirection: palette.direction,
        sunColor: palette.sun,
        atmosphereActive:
          s.atmosphereEnabled && s.atmosphereStrength > 0 && depth ? 1 : 0,
        gradeActive: s.gradeEnabled ? 1 : 0,
        debugView: DEBUG_VIEWS.indexOf(s.debugView),
      };
      for (const key of [
        "exposure",
        "contrast",
        "saturation",
        "vibrance",
        "temperature",
        "tint",
        "shadowLift",
        "highlightCompression",
        "blackLevel",
        "whiteLevel",
        "vignetteStrength",
        "vignetteSoftness",
        "atmosphereStrength",
        "atmosphereStart",
        "atmosphereSunWarmth",
      ])
        values[key] = s[key];
      values.exposure *= this.state.exposure / s.exposure;
      if (volumeActive) values.atmosphereStrength *= 0.8;
      if (!finishNeeded) r.outputColorSpace = this.state.output;
      const gradeFragment = finishNeeded
        ? GRADE_FRAGMENT
        : GRADE_OUTPUT_FRAGMENT;
      if (
        !this.pass(
          finishNeeded ? "grade" : "grade-output",
          gradeFragment,
          gradeTarget,
          values,
          draw,
        )
      )
        throw new Error("Colour grade failed");
      let presentationInput = gradeTarget?.texture;
      if (temporalActive) {
        presentationInput = this.upscaler.reconstruct(this, gradeTarget.texture, depth,
          temporalVelocity, retain, draw, this.temporal, camera);
        if (upscaleView === "low-resolution") presentationInput = gradeTarget.texture;
        else if (upscaleView === "history") presentationInput = this.upscaler.history;
      }
      r.outputColorSpace = this.state.output;
      const texel = (this.texel ??= new this.three.Vector2());
      texel.set(1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight);
      if (
        finishNeeded &&
        !this.pass(
          "finish",
          FINISH_FRAGMENT,
          this.state.target,
          {
            tInput: presentationInput,
            texel,
            fxaa: !temporalActive && s.fxaaEnabled ? 1 : 0,
            sharpen: s.sharpenEnabled ? s.sharpenStrength : 0,
          },
          draw,
        )
      )
        throw new Error("Final colour output failed");
      if (temporalActive && !["final", "history", "low-resolution"].includes(upscaleView)) {
        const view = upscaleView.includes("velocity") ? 1 :
          upscaleView === "depth" ? 2 : upscaleView === "jitter" ? 3 : upscaleView === "history-rejection" ? 5 : 4;
        if (!this.pass("temporal-debug", TEMPORAL_DEBUG_FRAGMENT, this.state.target, {
          tInput: view === 5 ? this.upscaler.convertTexture : temporalVelocity, tDepth: depth, view,
          jitter: this.temporal.jitter, historyValid: this.temporal.valid ? 1 : 0,
          nearFar: depthValues.nearFar,
        }, draw)) throw new Error("Temporal debug failed");
      }
      if (temporalActive) this.temporal.commit();
      this.pool.retain(retain);
      if (!retain.has("sun-visibility")) this.sunVisibility.dispose();
      this.frames++;
      this.active = {
        post: true,
        depth: !!depth,
        ao: aoActive,
        bloom: bloomActive,
        sunRays: raysActive,
        volumetric: volumeActive,
        motionBlur: !!motionBlurActive,
        lensFlare: opticsActive,
        sunUv: [sunUv.x, sunUv.y],
        sunScreenVisibility: visibility,
        sunClear: this.sunVisibility.clear,
        sunPartial: this.sunVisibility.partial,
        cloudTransmission: this.sunVisibility.transmission,
        samples: sceneTarget.samples,
        fxaa: !temporalActive && s.fxaaEnabled,
        sceneSize: [w, h],
        outputSize: [gl.drawingBufferWidth, gl.drawingBufferHeight],
        upscaling: { ...upscaling, temporal: temporalActive ? this.temporal.report() : null },
        targets: this.pool.targets.size,
      };
    } catch (error) {
      if (temporalActive) {
        this.upscaleFailed = true;
        this.temporal.restoreCamera();
        this.temporal.invalidate("SGSR2 failure");
        this.state.restore(r);
        console.error("[PolyShade] SGSR2 failed; falling back to native resolution.", error);
        return this.render(scene, camera, s, draw, palette);
      }
      this.disabled = true;
      console.error(
        "[PolyShade] Post processing disabled; using direct rendering.",
        error,
      );
      this.state.restore(r);
      if (temporalActive) this.temporal.restoreCamera();
      draw(scene, camera);
    } finally {
      if (temporalActive) this.temporal.restoreCamera();
      this.guard.pass = "scene";
      this.state.restore(r);
    }
  }
  dispose() {
    this.sunVisibility.dispose();
    this.objectMotion.dispose();
    this.pool.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
    this.geometry.dispose();
  }
}
