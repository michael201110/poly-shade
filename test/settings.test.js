import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultSettings,
  loadSettings,
  normalizeSettings,
  saveSettings,
  selectPreset,
  updateOverride,
} from "../src/settings.js";

function memoryStorage(initial = null) {
  const values = new Map(initial ? [["polyshade.settings", initial]] : []);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("settings round-trip with bounded custom overrides", () => {
  const storage = memoryStorage();
  const settings = updateOverride(selectPreset(createDefaultSettings(), "cinematic"), "exposure", 1.2);
  assert.equal(saveSettings(storage, settings, () => {}), true);
  assert.deepEqual(loadSettings(storage), settings);
  assert.equal(updateOverride(settings, "exposure", 9).overrides.exposure, 1.4);
});

test("settings migrate schema zero and reject malformed records", () => {
  assert.deepEqual(
    normalizeSettings({ schemaVersion: 0, preset: "recording", enabled: true, overrides: { fogStrength: 0.6 } }),
    { schemaVersion: 1, preset: "recording", enabled: true, overrides: { fogStrength: 0.6 } },
  );
  assert.equal(normalizeSettings({ schemaVersion: 100 }).preset, "cinematic");
  assert.deepEqual(loadSettings(memoryStorage("{invalid"), () => {}), createDefaultSettings());
});

test("invalid values do not become persisted overrides", () => {
  const updated = updateOverride(createDefaultSettings(), "sunElevation", 100);
  assert.equal(updated.overrides.sunElevation, 75);
  assert.equal(updateOverride(updated, "sunColor", "#F1E2D3").overrides.sunColor, "#f1e2d3");
  assert.throws(() => updateOverride(updated, "ambientColor", "blue"), /six-digit hexadecimal color/);
  assert.throws(() => updateOverride(updated, "not-a-setting", 1), /Invalid PolyShade setting/);
});
