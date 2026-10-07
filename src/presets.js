export const PRESET_IDS = Object.freeze([
  "vanilla",
  "cinematic-lite",
  "cinematic",
  "recording",
]);

export const PRESET_LABELS = Object.freeze({
  vanilla: "Vanilla",
  "cinematic-lite": "Golden Hour Lite",
  cinematic: "Golden Hour",
  recording: "Golden Hour Capture",
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
    sunElevation: 30,
    sunAzimuth: 225,
    sunColor: "#ffe3ba",
    ambientIntensity: 1,
    ambientColor: "#b9d0eb",
    exposure: 1,
    fogEnabled: false,
    fogStrength: 0.2,
    shadowQuality: "off",
    renderScale: 1,
    surfaceWarmth: 0.65,
    shadowDistance: 85,
    shadowSoftness: 1.5,
  }),
  "cinematic-lite": Object.freeze({
    sunIntensity: 1.45,
    sunElevation: 30,
    sunAzimuth: 225,
    sunColor: "#ffe3ba",
    ambientIntensity: 0.65,
    ambientColor: "#b9d0eb",
    exposure: 1.08,
    fogEnabled: false,
    fogStrength: 0.12,
    shadowQuality: "low",
    renderScale: 1,
    surfaceWarmth: 0.65,
    shadowDistance: 85,
    shadowSoftness: 1.5,
  }),
  cinematic: Object.freeze({
    sunIntensity: 1.65,
    sunElevation: 26,
    sunAzimuth: 225,
    sunColor: "#ffe3ba",
    ambientIntensity: 0.55,
    ambientColor: "#b9d0eb",
    exposure: 1.1,
    fogEnabled: false,
    fogStrength: 0.2,
    shadowQuality: "medium",
    renderScale: 1,
    surfaceWarmth: 0.65,
    shadowDistance: 85,
    shadowSoftness: 1.5,
  }),
  recording: Object.freeze({
    sunIntensity: 1.65,
    sunElevation: 26,
    sunAzimuth: 225,
    sunColor: "#ffe3ba",
    ambientIntensity: 0.55,
    ambientColor: "#b9d0eb",
    exposure: 1.1,
    fogEnabled: false,
    fogStrength: 0.22,
    shadowQuality: "high",
    renderScale: 1,
    surfaceWarmth: 0.65,
    shadowDistance: 85,
    shadowSoftness: 1.5,
  }),
});

export const OVERRIDE_LIMITS = Object.freeze({
  sunIntensity: [0.5, 2],
  sunElevation: [10, 75],
  sunAzimuth: [0, 360],
  ambientIntensity: [0.1, 1.8],
  exposure: [0.7, 1.4],
  fogStrength: [0, 1],
  renderScale: [1, 1.5],
  surfaceWarmth: [0, 1],
  shadowDistance: [30, 200],
  shadowSoftness: [0, 4],
});

export function resolvePresetSettings(settings) {
  return {
    ...PRESETS[settings.preset],
    ...settings.overrides,
    enabled: settings.enabled && settings.preset !== "vanilla",
  };
}
