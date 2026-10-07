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

  onRender(renderer, scene, camera) {
    const now = performance.now();
    if (!scene?.isScene) return;
    const settings = resolvePresetSettings(this.getSettings());
    if (!settings.enabled) {
      if (this.sceneState || this.rendererState) this.restore();
      return;
    }

    if (renderer !== this.activeRenderer) this.attachRenderer(renderer);
    if (scene !== this.activeScene) {
      if (countMeshes(scene) < 3) return;
      this.attachScene(scene);
    }

    const csmChanged = usesNativeCSM(scene) !== Boolean(this.sceneState.nativeCSM);
    if (csmChanged) {
      restoreMaterials(this.sceneState);
      this.sceneState.lastScanAt = 0;
    }
    if (
      this.revision !== this.appliedRevision
      || csmChanged
      || now - this.sceneState.lastScanAt >= 1000
    ) {
      applyRendererEffects(this.rendererState, this.three, settings);
      applySceneEffects(this.sceneState, this.three, settings, camera, now);
      this.modifiedMaterials = this.sceneState.originalMaterials.size;
      this.appliedRevision = this.revision;
    }
    refreshFrameEffects(this.sceneState, this.rendererState, this.three, settings, camera);
    syncMaterialColors(this.sceneState, settings);
  }

  onFrame(renderer, scene, duration) {
    if (scene !== this.activeScene || renderer !== this.activeRenderer) return;
    const settings = resolvePresetSettings(this.getSettings());
    if (settings.enabled) {
      this.renderCount += 1;
      this.recordFrame(duration, performance.now(), settings);
    }
  }

  attachScene(scene) {
    if (this.sceneState) restoreScene(this.sceneState);
    this.activeScene = scene;
    this.sceneState = createSceneState(scene);
    this.appliedRevision = -1;
  }

  attachRenderer(renderer) {
    if (this.rendererState) restoreRenderer(this.rendererState);
    this.activeRenderer = renderer;
    this.rendererState = createRendererState(renderer);
    this.appliedRevision = -1;
  }

  restore() {
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

    const ordered = Array.from(this.samples.slice(0, this.sampleCount)).sort((a, b) => a - b);
    const average = ordered.reduce((sum, value) => sum + value, 0) / Math.max(1, ordered.length);
    const p95 = ordered[Math.max(0, Math.ceil(ordered.length * 0.95) - 1)] ?? 0;
    this.onMetrics({
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
