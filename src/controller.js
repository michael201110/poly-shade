import { CinematicRenderer } from "./rendering/cinematic.js";
import {
  applyRendererEffects,
  applySceneEffects,
  createRendererState,
  createSceneState,
  restoreRenderer,
  restoreScene,
  refreshFrameEffects,
  usesNativeCSM,
} from "./effects.js";
import { syncMaterialColors, restoreMaterials } from "./materials.js";
import { resolvePresetSettings } from "./presets.js";

const MAX_SAMPLES = 240;

function countMeshes(scene) {
  let count = 0;
  scene.traverse((object) => {
    if (object?.isMesh && object.visible !== false) count += 1;
  });
  return count;
}

export class RenderController {
  constructor(three, getSettings, onMetrics = () => {}) {
    this.three = three;
    this.getSettings = getSettings;
    this.onMetrics = onMetrics;
    this.activeScene = null;
    this.activeRenderer = null;
    this.sceneState = null;
    this.rendererState = null;
    this.revision = 0;
    this.appliedRevision = -1;
    this.samples = new Float64Array(MAX_SAMPLES);
    this.sampleIndex = 0;
    this.sampleCount = 0;
    this.lastMetricsAt = performance.now();
    this.renderCount = 0;
    this.modifiedMaterials = 0;
  }

  notifySettingsChanged() {
    this.revision += 1;
    if (!this.getSettings().enabled) this.restore();
  }

  resolveSettings() {
    const source = this.getSettings();
    if (
      this.settingsRevision !== this.revision ||
      this.settingsSource !== source ||
      this.settingsPreset !== source.preset ||
      this.settingsEnabled !== source.enabled ||
      this.settingsOverrides !== source.overrides
    ) {
      this.resolvedSettings = resolvePresetSettings(source);
      this.settingsSource = source;
      this.settingsRevision = this.revision;
      this.settingsPreset = source.preset;
      this.settingsEnabled = source.enabled;
      this.settingsOverrides = source.overrides;
    }
    return this.resolvedSettings;
  }

  onRender(renderer, scene, camera) {
    const now = performance.now();
    this.camera = camera;
    if (!scene?.isScene) return;
    const settings = this.resolveSettings();
    if (!settings.enabled) {
      if (this.sceneState || this.rendererState) this.restore();
      return;
    }

    if (renderer !== this.activeRenderer) this.attachRenderer(renderer);
    if (
      settings.atmosphereEnabled &&
      !this.cinematic.capabilities.features.depthTexture
    )
      settings.fogEnabled = true;
    if (scene !== this.activeScene) {
      if (countMeshes(scene) < 3) return;
      this.attachScene(scene);
    }

    const csmChanged =
      usesNativeCSM(scene) !== Boolean(this.sceneState.nativeCSM);
    if (csmChanged) {
      restoreMaterials(this.sceneState);
      this.sceneState.lastScanAt = 0;
    }
    if (
      this.revision !== this.appliedRevision ||
      csmChanged ||
      now - this.sceneState.lastScanAt >= 1000
    ) {
      if (this.revision !== this.appliedRevision) {
        restoreMaterials(this.sceneState);
        this.sceneState.lastScanAt = 0;
      }
      applyRendererEffects(this.rendererState, this.three, settings);
      this.cinematic.update(this.sceneState, settings, now, camera);
      applySceneEffects(this.sceneState, this.three, settings, camera, now);
      this.cinematic.shadows.scan(scene);
      this.cinematic.warmup.schedule(scene, camera, settings, this.cinematic.post,
        this.cinematic.brakeLights, this.sceneState.processedMeshes.size, this.sceneState.nativeCSM);
      this.modifiedMaterials = this.sceneState.originalMaterials.size;
      this.appliedRevision = this.revision;
    }
    if (this.cinematic.guard.failures.has("material")) {
      restoreMaterials(this.sceneState);
      (this.sceneState.failedEffects ??= new Set()).add("material response");
    }
    this.cinematic.frame(settings, now, camera);
    this.updateCSM(settings);
    refreshFrameEffects(
      this.sceneState,
      this.rendererState,
      this.three,
      settings,
      camera,
    );
    syncMaterialColors(this.sceneState, settings);
  }

  updateCSM(settings) {
    const csm = this.nativeWrapper?.csm;
    if (!csm || !this.sceneState.nativeCSM) return;
    if (!this.csmSnapshot || this.csmSnapshot.csm !== csm)
      this.csmSnapshot = {
        csm,
        direction: csm.lightDirection.clone(),
        sizes: csm.lights.map((l) => l.shadow.mapSize.clone()),
      };
    if (!settings.nativeCSMTuning) {
      csm.lights.forEach((light, index) => {
        const size = this.csmSnapshot.sizes[index];
        if (size && light.shadow.mapSize.x !== size.x) {
          light.shadow.map?.dispose();
          light.shadow.map = null;
          light.shadow.mapSize.copy(size);
        }
        const original = this.sceneState.lightSnapshots.get(light)?.shadow;
        if (original) {
          light.shadow.bias = original.bias;
          light.shadow.normalBias = original.normalBias;
          light.shadow.radius = original.radius;
          if (typeof original.intensity === "number")
            light.shadow.intensity = original.intensity;
        }
      });
      csm.lightDirection.copy(this.cinematic.palette.direction).negate();
      csm.update();
      return;
    }
    csm.lightDirection.copy(this.cinematic.palette.direction).negate();
    const limit = this.cinematic.capabilities.maxTextureSize;
    csm.lights.forEach((light, index) => {
      const requested = { off: 0, low: 1024, medium: 2048, high: 4096 }[
        settings.shadowQuality
      ];
      const size = Math.min(
        limit,
        index < 2 ? requested : Math.min(requested, 2048),
      );
      if (size && light.shadow.mapSize.x !== size) {
        light.shadow.map?.dispose();
        light.shadow.map = null;
        light.shadow.mapSize.set(size, size);
      }
      light.shadow.bias = settings.shadowBias * (1 + index * 0.3);
      light.shadow.normalBias =
        index < 2
          ? settings.shadowNormalBias * (1 + index)
          : Math.max(
              settings.shadowNormalBias,
              this.sceneState.lightSnapshots.get(light)?.shadow?.normalBias ??
                0.1,
            );
      light.shadow.radius = settings.shadowSoftness;
      if (typeof light.shadow.intensity === "number")
        light.shadow.intensity = settings.shadowStrength;
      light.color.copy(this.cinematic.palette.sun);
    });
    csm.update();
  }

  aroundRender(renderer, scene, camera, draw) {
    if (scene !== this.activeScene || !this.cinematic) return draw();
    return this.cinematic.render(
      scene,
      camera,
      this.resolveSettings(),
      draw,
    );
  }

  onFrame(renderer, scene, duration) {
    if (scene !== this.activeScene || renderer !== this.activeRenderer) return;
    const settings = this.resolveSettings();
    if (settings.enabled) {
      this.renderCount += 1;
      this.recordFrame(duration, performance.now(), settings);
    }
  }

  attachScene(scene) {
    if (this.sceneState) restoreScene(this.sceneState);
    this.cinematic?.detachScene();
    this.cinematic?.post?.pool.dispose();
    this.activeScene = scene;
    this.sceneState = createSceneState(scene);
    this.sceneState.maxShadowSize = this.cinematic?.capabilities.maxTextureSize;
    this.cinematic?.attachScene(scene);
    this.appliedRevision = -1;
  }

  attachRenderer(renderer) {
    this.settingsRevision = -1;
    if (this.sceneState) restoreScene(this.sceneState);
    this.sceneState = null;
    this.activeScene = null;
    if (this.rendererState) restoreRenderer(this.rendererState);
    this.cinematic?.dispose();
    this.cinematic = new CinematicRenderer(this.three, renderer);
    this.removeContextListener?.();
    const onRestored = () => this.restore();
    renderer.domElement?.addEventListener("webglcontextrestored", onRestored);
    this.removeContextListener = () =>
      renderer.domElement?.removeEventListener(
        "webglcontextrestored",
        onRestored,
      );
    this.activeRenderer = renderer;
    this.rendererState = createRendererState(renderer);
    this.rendererState.postScale = !!this.cinematic.post;
    this.appliedRevision = -1;
  }

  restore() {
    this.removeContextListener?.();
    this.removeContextListener = null;
    if (this.csmSnapshot) {
      const { csm, direction, sizes } = this.csmSnapshot;
      csm.lightDirection.copy(direction);
      csm.lights.forEach((l, i) => {
        if (sizes[i]) l.shadow.mapSize.copy(sizes[i]);
      });
      this.csmSnapshot = null;
    }
    this.cinematic?.dispose();
    this.cinematic = null;
    if (this.sceneState) restoreScene(this.sceneState);
    if (this.rendererState) restoreRenderer(this.rendererState);
    this.sceneState = null;
    this.rendererState = null;
    this.activeScene = null;
    this.activeRenderer = null;
    this.appliedRevision = -1;
    this.modifiedMaterials = 0;
  }

  recordFrame(duration, now, settings) {
    this.samples[this.sampleIndex] = duration;
    this.sampleIndex = (this.sampleIndex + 1) % MAX_SAMPLES;
    this.sampleCount = Math.min(this.sampleCount + 1, MAX_SAMPLES);
    if (now - this.lastMetricsAt < 1000) return;

    const ordered = Array.from(this.samples.slice(0, this.sampleCount)).sort(
      (a, b) => a - b,
    );
    const average =
      ordered.reduce((sum, value) => sum + value, 0) /
      Math.max(1, ordered.length);
    const p95 = ordered[Math.max(0, Math.ceil(ordered.length * 0.95) - 1)] ?? 0;
    this.onMetrics({
      capabilities: this.cinematic?.report(),
      gpu: this.cinematic?.timer.metrics(),
      fps: this.renderCount / Math.max((now - this.lastMetricsAt) / 1000, 1),
      averageFrameTime: average,
      p95FrameTime: p95,
      preset: this.getSettings().preset,
      renderScale: settings.renderScale,
      shadowQuality: settings.shadowQuality,
      modifiedMaterials: this.modifiedMaterials,
    });
    this.lastMetricsAt = now;
    this.renderCount = 0;
  }
}
