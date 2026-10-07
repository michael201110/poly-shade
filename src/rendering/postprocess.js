import { SUN_RAYS_FRAGMENT } from "../shaders/sun-rays.js";
import { FULLSCREEN_VERTEX } from "../shaders/fullscreen.js";
import { SSAO_FRAGMENT, AO_BLUR_FRAGMENT } from "../shaders/ssao.js";
import { BLOOM_FRAGMENT, BLOOM_BLUR_FRAGMENT } from "../shaders/bloom.js";
import { GRADE_FRAGMENT } from "../shaders/grade.js";
import { FINISH_FRAGMENT } from "../shaders/finish.js";
import { RenderState, TargetPool } from "./render-targets.js";

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
  pass(name, fragment, target, values, draw) {
    if (this.guard.failures.has(name)) return false;
    const m = this.material(name, fragment);
    for (const [key, value] of Object.entries(values))
      this.uniform(m, key, value);
    this.quad.material = m;
    this.guard.pass = name;
    this.renderer.setRenderTarget(target);
    this.renderer.setScissorTest(false);
    draw(this.scene, this.camera);
    this.passOrder.push(name);
    return !this.guard.failures.has(name);
  }
  render(scene, camera, s, draw, palette) {
    const r = this.renderer;
    this.passOrder.length = 0;
    if (this.disabled || !s.postEnabled || s.postQuality === "off") {
      this.pool.dispose();
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
          ? Math.min(4, this.capabilities.maxSamples)
          : 0,
      });
      w = sceneTarget.width;
      h = sceneTarget.height;
      const gradeTarget = this.pool.get("grade", w, h),
        retain = new Set(["scene", "grade"]);
      r.xr.enabled = false;
      r.autoClear = true;
      r.toneMapping = this.three.NoToneMapping;
      r.outputColorSpace = this.three.LinearSRGBColorSpace;
      r.setRenderTarget(sceneTarget);
      r.setScissorTest(false);
      this.guard.pass = "scene";
      draw(scene, camera);
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
      if (s.aoEnabled && depth && this.capabilities.features.ssao) {
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
          );
          step.set(0, 1 / ah);
          aoActive =
            this.pass(
              "ao-blur",
              AO_BLUR_FRAGMENT,
              a,
              { ...depthValues, tInput: b.texture, stepUv: step },
              draw,
            ) && aoActive;
          ao = a.texture;
        }
      }
      if (s.bloomEnabled && this.capabilities.features.bloom) {
        const scale = Math.min(0.25, 768 / w),
          bw = Math.round(w * scale),
          bh = Math.round(h * scale);
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
          );
          step.multiplyScalar(s.postQuality === "high" ? 2 : 1.5);
          bloomActive =
            this.pass(
              "bloom-blur",
              BLOOM_BLUR_FRAGMENT,
              a,
              { tInput: b.texture, stepUv: step },
              draw,
            ) && bloomActive;
          bloom = a.texture;
        }
      }
      let rays = sceneTarget.texture,
        raysActive = false;
      if (s.sunRaysEnabled && depth) {
        const direction = (this.sunView ??= new this.three.Vector3());
        direction
          .copy(palette.direction)
          .transformDirection(camera.matrixWorldInverse);
        const clip = (this.sunClip ??= new this.three.Vector4());
        clip
          .set(direction.x, direction.y, direction.z, 0)
          .applyMatrix4(camera.projectionMatrix);
        const sunUv = (this.sunUv ??= new this.three.Vector2());
        sunUv.set(
          (clip.x / Math.max(clip.w, 0.001)) * 0.5 + 0.5,
          (clip.y / Math.max(clip.w, 0.001)) * 0.5 + 0.5,
        );
        const visibility =
          clip.w > 0
            ? Math.max(
                0,
                Math.min(
                  1,
                  (1.2 -
                    Math.max(
                      Math.abs(sunUv.x - 0.5) * 2,
                      Math.abs(sunUv.y - 0.5) * 2,
                    )) *
                    5,
                ),
              )
            : 0;
        if (visibility > 0) {
          const scale = Math.min(0.25, 512 / w),
            target = this.pool.get(
              "sun-rays",
              Math.round(w * scale),
              Math.round(h * scale),
            );
          retain.add("sun-rays");
          raysActive = this.pass(
            "sun-rays",
            SUN_RAYS_FRAGMENT,
            target,
            {
              tDepth: depth,
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
        rayStrength: raysActive ? s.sunRayStrength : 0,
        aoActive: aoActive ? 1 : 0,
        bloomStrength: bloomActive ? s.bloomStrength : 0,
        cameraWorld: camera.matrixWorld,
        horizon: palette.horizon,
        sunDirection: palette.direction,
        sunColor: palette.sun,
        atmosphereActive: s.atmosphereEnabled && depth ? 1 : 0,
        gradeActive: s.gradeEnabled ? 1 : 0,
        debugView: ["final", "depth", "ao", "bloom"].indexOf(s.debugView),
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
      if (!this.pass("grade", GRADE_FRAGMENT, gradeTarget, values, draw))
        throw new Error("Colour grade failed");
      r.outputColorSpace = this.state.output;
      const texel = (this.texel ??= new this.three.Vector2());
      texel.set(1 / w, 1 / h);
      if (
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
      this.frames++;
      this.active = {
        post: true,
        depth: !!depth,
        ao: aoActive,
        bloom: bloomActive,
        sunRays: raysActive,
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
    this.pool.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
    this.geometry.dispose();
  }
}
