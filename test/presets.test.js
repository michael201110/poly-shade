import test from "node:test";
import assert from "node:assert/strict";
import { PRESETS, resolvePresetSettings } from "../src/presets.js";
import { createDefaultSettings, selectPreset } from "../src/settings.js";

test("all requested presets have independent quality profiles", () => {
  assert.deepEqual(Object.keys(PRESETS), [
    "vanilla",
    "clear-day",
    "overcast",
    "cinematic-lite",
    "cinematic",
    "recording",
  ]);
  assert.equal(PRESETS.vanilla.shadowQuality, "off");
  assert.equal(PRESETS["cinematic-lite"].shadowQuality, "low");
  assert.equal(PRESETS.cinematic.shadowQuality, "medium");
  assert.equal(PRESETS.recording.shadowQuality, "medium");
  assert.equal(PRESETS.recording.renderScale, 1);
  assert.equal(PRESETS.recording.fxaaEnabled, true);
  assert.equal(PRESETS["clear-day"].sunElevation > PRESETS.cinematic.sunElevation, true);
  assert.equal(PRESETS.overcast.sunRaysEnabled, false);
  assert.equal(PRESETS.overcast.volumetricEnabled, false);
  assert.equal(PRESETS.overcast.lensFlareEnabled, false);
  assert.equal(PRESETS.overcast.cloudAmount > PRESETS["clear-day"].cloudAmount, true);
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
