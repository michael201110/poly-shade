import { BrakeLights } from "./brake-lights.js";
import { inspectRenderer } from "./capabilities.js";
import { ProceduralSky, skyPalette } from "./sky.js";
import { SkyEnvironment } from "./environment.js";
import { ShaderGuard } from "./shader-guard.js";
import { PostProcess } from "./postprocess.js";
import { GpuTimer } from "./performance.js";

export class CinematicRenderer {
  constructor(three, renderer) {
    this.three = three;
    this.capabilities = inspectRenderer(three, renderer);
    this.guard = new ShaderGuard(renderer);
    this.timer = new GpuTimer(renderer, this.capabilities);
    if (this.capabilities.features.postprocess)
      this.post = new PostProcess(
        three,
        renderer,
        this.capabilities,
        this.guard,
      );
  }
  attachScene(scene) {
    this.detachScene();
    this.brakeLights = new BrakeLights(this.three, scene);
    if (this.three.ShaderMaterial && this.three.SphereGeometry)
      this.sky = new ProceduralSky(this.three, scene);
    if (this.capabilities.features.environment)
      this.environment = new SkyEnvironment(
        this.three,
        scene,
        this.capabilities,
      );
  }
  update(state, settings, now, camera) {
    this.brakeLights?.scan(settings, camera);
    this.brakeLights?.update(settings);
    this.palette = skyPalette(this.three, settings);
    this.sky?.update(settings, now);
    this.sky?.scan();
    try {
      this.environment?.update(settings);
    } catch (error) {
      console.warn("[PolyShade] Environment unavailable.", error);
      this.environment?.dispose();
      this.environment = null;
    }
    state.palette = this.palette;
  }
  frame(settings, now) {
    this.brakeLights?.update(settings);
    if (this.sky && this.guard.failures.has("sky")) {
      this.sky.dispose();
      this.sky = null;
    }
    if (this.sky && settings.cloudsEnabled)
      this.sky.uniforms.time.value = now / 1000;
  }
  render(scene, camera, settings, draw) {
    this.timer.begin();
    try {
      return this.post
        ? this.post.render(scene, camera, settings, draw, this.palette)
        : draw();
    } finally {
      this.timer.end();
    }
  }
  report() {
    const { timerExtension, ...capabilities } = this.capabilities;
    return {
      ...capabilities,
      passes: this.post?.passOrder,
      active: this.post?.active,
      resources: this.post
        ? {
            allocated: this.post.pool.allocations,
            disposed: this.post.pool.disposals,
            live: this.post.pool.targets.size,
          }
        : null,
      failures: Object.fromEntries(this.guard.failures),
      brakeLights: this.brakeLights?.report(),
      environment: this.environment
        ? {
            generations: this.environment.generations,
            cubeSize: this.environment.resolution,
          }
        : null,
    };
  }
  detachScene() {
    this.brakeLights?.dispose();
    this.brakeLights = null;
    this.sky?.dispose();
    this.environment?.dispose();
    this.sky = null;
    this.environment = null;
  }
  dispose() {
    this.detachScene();
    this.post?.dispose();
    this.timer.dispose();
    this.guard.dispose();
  }
}
