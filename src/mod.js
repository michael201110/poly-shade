import { describeMaterial, classifyMaterialEvidence } from "./materials.js";
import { PolyMod } from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/PolyTypes.js";
import { RenderController } from "./controller.js";
import {
  findThreeNamespace,
  installRenderHook,
  installGameRendererHook,
} from "./renderer.js";
import { mountPanel, installHotkey } from "./ui.js";
import {
  loadSettings,
  saveSettings,
  selectPreset,
  updateOverride,
} from "./settings.js";
import { resolvePresetSettings } from "./presets.js";

let pml;
let settings;
let controller;
let panel;
let removeRenderHook;
let removeGameHook;
let removeHotkey;
let unloadListener;
let confirmedScene;

function getStorage() {
  try {
    return globalThis.localStorage;
  } catch (error) {
    console.warn(
      "[PolyShade] Browser storage is unavailable; settings will reset on reload.",
      error,
    );
    return undefined;
  }
}

function persistAndApply(nextSettings) {
  settings = nextSettings;
  saveSettings(getStorage(), settings);
  if (controller) controller.notifySettingsChanged();
  updatePanel();
}

function updatePanel() {
  if (!panel || !settings) return;
  panel.setSettings({
    preset: settings.preset,
    enabled: settings.enabled && settings.preset !== "vanilla",
    values: resolvePresetSettings(settings),
  });
}

function toggleEnabled(enabled) {
  const next =
    settings.preset === "vanilla" && enabled
      ? { ...selectPreset(settings, "cinematic"), enabled: true }
      : { ...settings, enabled: enabled && settings.preset !== "vanilla" };
  persistAndApply(next);
  panel?.setStatus(
    enabled ? "PolyShade enabled." : "Restored the original rendering state.",
  );
}

function attachRenderer() {
  controller?.restore();
  removeRenderHook?.();
  try {
    const three = findThreeNamespace(pml);
    controller = new RenderController(
      three,
      () => settings,
      (metrics) => panel?.setMetrics(metrics),
    );
    removeGameHook?.();
    removeGameHook = installGameRendererHook(three, (wrapper) => {
      controller.nativeWrapper = wrapper;
    });
    removeRenderHook = installRenderHook(three, {
      before(renderer, scene, camera) {
        try {
          controller.onRender(renderer, scene, camera);
          if (controller.activeScene === scene && confirmedScene !== scene) {
            confirmedScene = scene;
            panel?.setStatus(
              `Enhancing the live scene; ${controller.modifiedMaterials} mesh materials tuned.`,
            );
          }
        } catch (error) {
          console.error(
            "[PolyShade] Scene enhancement failed; rendering continues unchanged.",
            error,
          );
        }
      },
      around(renderer, scene, camera, draw) {
        return controller.aroundRender(renderer, scene, camera, draw);
      },
      after(renderer, scene, _camera, duration) {
        try {
          controller.onFrame(renderer, scene, duration);
        } catch (error) {
          console.error("[PolyShade] Performance diagnostics failed.", error);
        }
      },
    });
    panel?.setStatus("Attached to the live Three.js scene.");
    controller.notifySettingsChanged();
  } catch (error) {
    console.error(
      "[PolyShade] Could not attach to the live PolyTrack renderer.",
      error,
    );
    panel?.setStatus(`Renderer unavailable: ${error.message}`);
  }
}

function makePanel() {
  if (!globalThis.document?.body || panel) return;
  panel = mountPanel(
    document,
    {
      onInspect() {
        return controller?.sceneState?.materialInspector ?? [];
      },
      onPick(event) {
        if (!controller?.activeRenderer || !controller.three.Raycaster)
          return [];
        const c = controller,
          rect = c.activeRenderer.domElement.getBoundingClientRect();
        const mouse = new c.three.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        const ray = new c.three.Raycaster();
        ray.setFromCamera(mouse, c.camera);
        const mesh = ray
          .intersectObjects(c.activeScene.children, true)
          .find((hit) => !hit.object.userData.polyShadeOwned)?.object;
        if (!mesh) return [];
        return (
          Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        ).map((material) => ({
          ...describeMaterial(mesh, material),
          ...classifyMaterialEvidence(
            mesh,
            material,
            resolvePresetSettings(settings).materialOverrides,
          ),
          type: material.type,
        }));
      },
      onPreset(preset) {
        persistAndApply(selectPreset(settings, preset));
        panel?.setStatus(
          preset === "vanilla"
            ? "Vanilla rendering restored."
            : `${preset} preset loaded.`,
        );
      },
      onEnabled: toggleEnabled,
      onValue(key, value) {
        persistAndApply(updateOverride(settings, key, value));
      },
      onReset() {
        persistAndApply(selectPreset(settings, settings.preset));
        panel?.setStatus(`${settings.preset} preset restored.`);
      },
    },
    {
      preset: settings.preset,
      enabled: settings.enabled && settings.preset !== "vanilla",
      values: resolvePresetSettings(settings),
    },
  );
}

function restoreAndDispose() {
  controller?.restore();
  removeRenderHook?.();
  removeHotkey?.();
  removeGameHook?.();
  if (unloadListener)
    globalThis.removeEventListener?.("pagehide", unloadListener);
  panel?.dispose();
  controller = null;
  confirmedScene = null;
  panel = null;
  removeRenderHook = undefined;
  removeHotkey = undefined;
}

class PolyShadeMod extends PolyMod {}

export const polyMod = Object.assign(new PolyShadeMod(), {
  modName: "PolyShade",
  modID: "polyshade",
  modVersion: "0.2.7",
  modAuthor: "PolyShade",
  modDescription:
    "<p>Lighting, shadows, material response, and atmosphere for PolyTrack's live Three.js scene. Rendering only; no physics or simulation changes.</p>",
  touchingPhysics: false,
  preInit(pmlInstance) {
    pml = pmlInstance;
  },
  init(pmlInstance) {
    pml ??= pmlInstance;
    settings = loadSettings(getStorage());
    attachRenderer();
  },
  postInit() {
    if (!settings) settings = loadSettings(getStorage());
    makePanel();
    if (controller)
      panel?.setStatus(
        controller.activeScene
          ? `Enhancing the live scene; ${controller.modifiedMaterials} mesh materials tuned.`
          : "Renderer hook installed; waiting for a rendered scene.",
      );
    removeHotkey ??= installHotkey(document, () =>
      toggleEnabled(!settings.enabled),
    );
  },
  onGameLoad() {
    if (!settings) settings = loadSettings(getStorage());
    makePanel();
    if (!removeHotkey)
      removeHotkey = installHotkey(document, () =>
        toggleEnabled(!settings.enabled),
      );
    if (!controller) attachRenderer();
    unloadListener ??= restoreAndDispose;
    globalThis.addEventListener?.("pagehide", unloadListener, { once: true });
  },
  dispose: restoreAndDispose,
});
