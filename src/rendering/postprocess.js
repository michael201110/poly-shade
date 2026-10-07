import { SUN_RAYS_FRAGMENT } from "../shaders/sun-rays.js";
import { SUN_VISIBILITY_FRAGMENT } from "../shaders/sun-optics.js";
import { SunVisibility, sunScreenVisibility } from "./sun-visibility.js";
import { VOLUMETRIC_FRAGMENT } from "../shaders/volumetric.js";
import { FULLSCREEN_VERTEX } from "../shaders/fullscreen.js";
import { SSAO_FRAGMENT, AO_BLUR_FRAGMENT } from "../shaders/ssao.js";
import { BLOOM_FRAGMENT, BLOOM_BLUR_FRAGMENT } from "../shaders/bloom.js";
import { GRADE_FRAGMENT } from "../shaders/grade.js";
import { FINISH_FRAGMENT } from "../shaders/finish.js";
import { RenderState, TargetPool } from "./render-targets.js";
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
    this.geometry = new three.PlaneGeometry(2, 2);
    this.quad = new three.Mesh(this.geometry);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    this.materials = new Map();
    this.passOrder = [];
    this.disabled = false;
    this.frames = 0;
    this.active = {};
    this.sunVisibility = new SunVisibility(renderer);
  }
  material(name, fragment) {
    if (!this.materials.has(name))
      this.materials.set(
        name,
        new this.three.ShaderMaterial({
          name: `PolyShade_${name}`,
          vertexShader: FULLSCREEN_VERTEX,
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
  pass(name, fragment, target, values, draw, profileName = name) {
    if (this.guard.failures.has(name)) return false;
    const m = this.material(name, fragment);
    for (const [key, value] of Object.entries(values))
      this.uniform(m, key, value);
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
      this.sunVisibility.dispose();
      this.active = { post: false };
      return draw(scene, camera);
    }
    if (r.getRenderTarget() !== null || r.xr.isPresenting)
      return draw(scene, camera);
    this.state.capture(r);
    this.passOrder.length = 0;
    try {
      const gl = r.getContext();
      let w = Math.round(gl.drawingBufferWidth * s.renderScale),
        h = Math.round(gl.drawingBufferHeight * s.renderScale);
      const sceneTarget = this.pool.get("scene", w, h, {
        depth: true,
        samples: this.capabilities.antialias
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
      const finishNeeded =
        s.fxaaEnabled || (s.sharpenEnabled && s.sharpenStrength > 0);
      const gradeTarget = finishNeeded
          ? this.pool.get(
              "grade",
              gl.drawingBufferWidth,
              gl.drawingBufferHeight,
            )
          : this.state.target,
        retain = new Set(finishNeeded ? ["scene", "grade"] : ["scene"]);
      r.xr.enabled = false;
      r.autoClear = true;
      r.toneMapping = this.three.NoToneMapping;
      r.outputColorSpace = this.three.LinearSRGBColorSpace;
      r.setRenderTarget(sceneTarget);
      r.setScissorTest(false);
      this.guard.pass = "scene";
      if (this.profiler) this.profiler.scene(() => draw(scene, camera));
      else draw(scene, camera);
      if (this.profiler && sceneTarget.samples)
        this.profiler.measure("scene-msaa-resolve", () =>
          r.setRenderTarget(null),
        );
      this.passOrder.push("scene");
      const depth = sceneTarget.depthTexture;
      const depthValues = {
        tDepth: depth,
        inverseProjection: camera.projectionMatrixInverse,
        nearFar: { x: camera.near, y: camera.far },
      };
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
      const volumeRequested =
        ((s.volumetricEnabled &&
          s.volumetricStrength > 0 &&
          s.volumetricDensity > 0) ||
          debugVolume) &&
        !this.guard.failures.has("volumetric");
      const sunUv = (this.sunUv ??= new this.three.Vector2());
      let visibilityTexture = sceneTarget.texture;
      if (
        ((s.sunRaysEnabled && s.sunRayStrength > 0 && s.sunRayExposure > 0) ||
          (s.lensFlareEnabled && s.lensFlareStrength > 0) ||
          volumeRequested ||
          debugSun) &&
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
            ((s.sunRaysEnabled &&
              s.sunRayStrength > 0 &&
              s.sunRayExposure > 0) ||
              debugRays) &&
            (debugRays ||
              this.sunVisibility.partial > 0.01)
          ) {
            const scale = Math.min(0.5, 1024 / gl.drawingBufferWidth),
              target = this.pool.get(
                "sun-rays",
                Math.round(gl.drawingBufferWidth * scale),
                Math.round(gl.drawingBufferHeight * scale),
              );
            rayTexel.set(1 / target.width, 1 / target.height);
            retain.add("sun-rays");
            raysActive = this.pass(
              "sun-rays",
              SUN_RAYS_FRAGMENT,
              target,
              {
                tDepth: depth,
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
        const scale = Math.min(0.5, 1024 / w),
          vw = Math.round(w * scale),
          vh = Math.round(h * scale);
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
      if (!raysActive) retain.delete("sun-rays");
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
            tInput: gradeTarget.texture,
            texel,
            fxaa: s.fxaaEnabled ? 1 : 0,
            sharpen: s.sharpenEnabled ? s.sharpenStrength : 0,
          },
          draw,
        )
      )
        throw new Error("Final colour output failed");
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
        lensFlare: opticsActive,
        sunUv: [sunUv.x, sunUv.y],
        sunScreenVisibility: visibility,
        sunClear: this.sunVisibility.clear,
        sunPartial: this.sunVisibility.partial,
        cloudTransmission: this.sunVisibility.transmission,
        samples: sceneTarget.samples,
        fxaa: s.fxaaEnabled,
        sceneSize: [w, h],
        targets: this.pool.targets.size,
      };
    } catch (error) {
      this.disabled = true;
      console.error(
        "[PolyShade] Post processing disabled; using direct rendering.",
        error,
      );
      this.state.restore(r);
      draw(scene, camera);
    } finally {
      this.guard.pass = "scene";
      this.state.restore(r);
    }
  }
  dispose() {
    this.sunVisibility.dispose();
    this.pool.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
    this.geometry.dispose();
  }
}
