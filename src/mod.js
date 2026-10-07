import { RenderController } from "./controller.js";
import { findThreeNamespace, installRenderHook } from "./renderer.js";
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
let removeHotkey;
let unloadListener;

function getStorage() {
  try {
    return globalThis.localStorage;
  } catch (error) {
    console.warn("[PolyShade] Browser storage is unavailable; settings will reset on reload.", error);
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
  const next = settings.preset === "vanilla" && enabled
    ? { ...selectPreset(settings, "cinematic"), enabled: true }
    : { ...settings, enabled: enabled && settings.preset !== "vanilla" };
  persistAndApply(next);
  panel?.setStatus(enabled ? "PolyShade enabled." : "Restored the original rendering state.");
}

function attachRenderer() {
  controller?.restore();
  removeRenderHook?.();
  try {
    const three = findThreeNamespace(pml);
    controller = new RenderController(three, () => settings, (metrics) => panel?.setMetrics(metrics));
    removeRenderHook = installRenderHook(three, {
      before(renderer, scene, camera) {
        try {
          controller.onRender(renderer, scene, camera);
        } catch (error) {
          console.error("[PolyShade] Scene enhancement failed; rendering continues unchanged.", error);
        }
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
    console.error("[PolyShade] Could not attach to the live PolyTrack renderer.", error);
    panel?.setStatus(`Renderer unavailable: ${error.message}`);
  }
}

function makePanel() {
  if (!globalThis.document?.body || panel) return;
  panel = mountPanel(document, {
    onPreset(preset) {
      persistAndApply(selectPreset(settings, preset));
      panel?.setStatus(preset === "vanilla" ? "Vanilla rendering restored." : `${preset} preset loaded.`);
    },
    onEnabled: toggleEnabled,
    onValue(key, value) {
      persistAndApply(updateOverride(settings, key, value));
    },
    onReset() {
      persistAndApply(selectPreset(settings, settings.preset));
      panel?.setStatus(`${settings.preset} preset restored.`);
    },
  }, {
    preset: settings.preset,
    enabled: settings.enabled && settings.preset !== "vanilla",
    values: resolvePresetSettings(settings),
  });
}

function restoreAndDispose() {
  controller?.restore();
  removeRenderHook?.();
  removeHotkey?.();
  if (unloadListener) globalThis.removeEventListener?.("pagehide", unloadListener);
  panel?.dispose();
  controller = null;
  panel = null;
  removeRenderHook = undefined;
  removeHotkey = undefined;
}

export const polyMod = {
  modName: "PolyShade",
  modID: "polyshade",
  modVersion: "0.1.0",
  modAuthor: "PolyShade",
  modDescription: "<p>Lighting, shadows, material response, and atmosphere for PolyTrack's live Three.js scene. Rendering only; no physics or simulation changes.</p>",
  touchingPhysics: false,
  preInit(pmlInstance) {
    pml = pmlInstance;
  },
  init(pmlInstance) {
    pml ??= pmlInstance;
    settings = loadSettings(getStorage());
  },
  postInit() {
    if (!settings) settings = loadSettings(getStorage());
    makePanel();
    removeHotkey ??= installHotkey(document, () => toggleEnabled(!settings.enabled));
  },
  onGameLoad() {
    if (!settings) settings = loadSettings(getStorage());
    makePanel();
    if (!removeHotkey) removeHotkey = installHotkey(document, () => toggleEnabled(!settings.enabled));
    attachRenderer();
    unloadListener ??= restoreAndDispose;
    globalThis.addEventListener?.("pagehide", unloadListener, { once: true });
  },
  dispose: restoreAndDispose,
};
