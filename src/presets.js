export const PRESET_IDS = Object.freeze([
  "vanilla",
  "cinematic-lite",
  "cinematic",
  "recording",
]);

export const PRESET_LABELS = Object.freeze({
  vanilla: "Vanilla",
  "cinematic-lite": "Cinematic Lite",
  cinematic: "Cinematic",
  recording: "Recording",
});

export const SHADOW_MAP_SIZES = Object.freeze({
  off: 0,
  low: 1024,
  medium: 2048,
  high: 4096,
});

export const PRESETS = Object.freeze({
  vanilla: Object.freeze({
    sunIntensity: 1,
    sunElevation: 38,
    sunAzimuth: 225,
    sunColor: "#fff2df",
    ambientIntensity: 1,
    ambientColor: "#d6e3f1",
    exposure: 1,
    fogEnabled: false,
    fogStrength: 0.2,
    shadowQuality: "off",
    renderScale: 1,
  }),
  "cinematic-lite": Object.freeze({
    sunIntensity: 1.12,
    sunElevation: 38,
    sunAzimuth: 225,
    sunColor: "#fff2df",
    ambientIntensity: 1.08,
    ambientColor: "#d6e3f1",
    exposure: 1.02,
    fogEnabled: true,
    fogStrength: 0.12,
    shadowQuality: "low",
    renderScale: 1,
  }),
  cinematic: Object.freeze({
    sunIntensity: 1.28,
    sunElevation: 34,
    sunAzimuth: 225,
    sunColor: "#fff1df",
    ambientIntensity: 1.12,
    ambientColor: "#d4e2f0",
    exposure: 1.04,
    fogEnabled: true,
    fogStrength: 0.2,
    shadowQuality: "medium",
    renderScale: 1,
  }),
  recording: Object.freeze({
    sunIntensity: 1.32,
    sunElevation: 34,
    sunAzimuth: 225,
    sunColor: "#fff1df",
    ambientIntensity: 1.14,
    ambientColor: "#d4e2f0",
    exposure: 1.04,
    fogEnabled: true,
    fogStrength: 0.22,
    shadowQuality: "high",
    renderScale: 1,
  }),
});

export const OVERRIDE_LIMITS = Object.freeze({
  sunIntensity: [0.5, 2],
  sunElevation: [10, 75],
  sunAzimuth: [0, 360],
  ambientIntensity: [0.5, 1.8],
  exposure: [0.7, 1.4],
  fogStrength: [0, 1],
  renderScale: [1, 1.5],
});

export function resolvePresetSettings(settings) {
  return {
    ...PRESETS[settings.preset],
    ...settings.overrides,
    enabled: settings.enabled && settings.preset !== "vanilla",
  };
}
