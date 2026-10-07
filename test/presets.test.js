import test from "node:test";
import assert from "node:assert/strict";
import { PRESETS, resolvePresetSettings } from "../src/presets.js";
import { createDefaultSettings, selectPreset } from "../src/settings.js";

test("all requested presets have independent quality profiles", () => {
  assert.deepEqual(Object.keys(PRESETS), [
    "vanilla",
    "cinematic-lite",
    "cinematic",
    "recording",
  ]);
  assert.equal(PRESETS.vanilla.shadowQuality, "off");
  assert.equal(PRESETS["cinematic-lite"].shadowQuality, "low");
  assert.equal(PRESETS.cinematic.shadowQuality, "medium");
  assert.equal(PRESETS.recording.shadowQuality, "high");
  assert.equal(PRESETS.recording.renderScale, 1.25);
});

test("Vanilla disables effects and preset selection clears overrides", () => {
  const settings = {
    ...createDefaultSettings(),
    overrides: { exposure: 1.2 },
  };
  const vanilla = selectPreset(settings, "vanilla");
  assert.equal(resolvePresetSettings(vanilla).enabled, false);
  assert.deepEqual(vanilla.overrides, {});
});
