import { BrakeLights } from "./brake-lights.js";
import { CarContactShadow } from "./car-contact-shadow.js";
import { inspectRenderer } from "./capabilities.js";
import { ProceduralSky, skyPalette } from "./sky.js";
import { SkyEnvironment } from "./environment.js";

// CPU scene preparation only: no legacy rendering, warmup or GL queries.
export class SceneEffects {
  constructor(three, renderer) {
    this.three = three; this.renderer = renderer;
    this.capabilities = inspectRenderer(three, renderer);
  }
  attachScene(scene) {
    this.detachScene();
    this.brakeLights = new BrakeLights(this.three, scene);
    if (this.three.PlaneGeometry && this.three.Raycaster && this.three.ShaderMaterial)
      this.carContactShadow = new CarContactShadow(this.three, scene);
    if (this.three.ShaderMaterial && this.three.SphereGeometry)
      this.sky = new ProceduralSky(this.three, scene);
    if (this.capabilities.features.environment)
      this.environment = new SkyEnvironment(this.three, scene, this.capabilities);
  }
  update(state, settings, now, camera) {
    this.sceneState = state;
    this.brakeLights?.scan(settings, camera, state); this.brakeLights?.update(settings);
    this.carContactShadow?.scan(camera, settings); this.carContactShadow?.update(settings, now, camera);
    this.palette = skyPalette(this.three, settings);
    this.sky?.update(settings, now); this.sky?.scan();
    this.environment?.update(settings); state.palette = this.palette;
  }
  frame(settings, now, camera) {
    if (this.brakeLights && camera) this.brakeLights.camera = camera;
    this.brakeLights?.update(settings); this.carContactShadow?.update(settings, now, camera);
    if (this.sky && settings.cloudsEnabled) this.sky.uniforms.time.value = now / 1000;
  }
  report() {
    return {renderer:"WebGPU only",brakeLights:this.brakeLights?.report(),contactShadow:this.carContactShadow?.report(),
      environment:this.environment?{generations:this.environment.generations,cubeSize:this.environment.resolution}:null};
  }
  detachScene() {
    this.sceneState = null;
    this.brakeLights?.dispose(); this.carContactShadow?.dispose(); this.sky?.dispose(); this.environment?.dispose();
    this.brakeLights=this.carContactShadow=this.sky=this.environment=null;
  }
  dispose() { this.detachScene(); }
}
