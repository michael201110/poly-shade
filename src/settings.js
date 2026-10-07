import { OVERRIDE_LIMITS, PRESET_IDS, PRESETS, SHADOW_MAP_SIZES } from "./presets.js";

export const SETTINGS_SCHEMA_VERSION = 1;
export const SETTINGS_STORAGE_KEY = "polyshade.settings";

const DEFAULTS = Object.freeze({
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  preset: "cinematic-lite",
  enabled: true,
  overrides: Object.freeze({}),
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeOverrides(overrides) {
  if (!isPlainObject(overrides)) return {};

  const normalized = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (key === "fogEnabled") {
      if (typeof value === "boolean") normalized[key] = value;
      continue;
    }
    if (key === "sunColor" || key === "ambientColor") {
      if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) {
        normalized[key] = value.toLowerCase();
      }
      continue;
    }
    if (key === "shadowQuality") {
      if (Object.hasOwn(SHADOW_MAP_SIZES, value)) normalized[key] = value;
      continue;
    }
    const limits = OVERRIDE_LIMITS[key];
    if (!limits || typeof value !== "number" || !Number.isFinite(value)) continue;
    normalized[key] = Math.min(limits[1], Math.max(limits[0], value));
  }
  return normalized;
}

export function createDefaultSettings() {
  return {
    ...DEFAULTS,
    overrides: {},
  };
}

export function normalizeSettings(value) {
  if (!isPlainObject(value)) return createDefaultSettings();

  const preset = PRESET_IDS.includes(value.preset) ? value.preset : DEFAULTS.preset;
  const enabled = typeof value.enabled === "boolean"
    ? value.enabled
    : preset !== "vanilla";

  if (value.schemaVersion === SETTINGS_SCHEMA_VERSION) {
    return {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      preset,
      enabled: preset === "vanilla" ? false : enabled,
      overrides: normalizeOverrides(value.overrides),
    };
  }

  if (value.schemaVersion === 0 || value.schemaVersion === undefined) {
    const legacyOverrides = isPlainObject(value.overrides) ? value.overrides : {};
    return {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      preset,
      enabled: preset === "vanilla" ? false : enabled,
      overrides: normalizeOverrides(legacyOverrides),
    };
  }

  return createDefaultSettings();
}

export function loadSettings(storage, warn = console.warn) {
  if (!storage) return createDefaultSettings();
  try {
    const serialized = storage.getItem(SETTINGS_STORAGE_KEY);
    return serialized === null
      ? createDefaultSettings()
      : normalizeSettings(JSON.parse(serialized));
  } catch (error) {
    warn("[PolyShade] Saved settings could not be read; defaults are active.", error);
    return createDefaultSettings();
  }
}

export function saveSettings(storage, settings, warn = console.warn) {
  if (!storage) {
    warn("[PolyShade] Settings were not persisted because localStorage is unavailable.");
    return false;
  }
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
    return true;
  } catch (error) {
    warn("[PolyShade] Settings could not be persisted.", error);
    return false;
  }
}

export function selectPreset(settings, preset) {
  if (!PRESET_IDS.includes(preset)) throw new RangeError(`Unknown PolyShade preset: ${preset}`);
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    preset,
    enabled: preset !== "vanilla",
    overrides: {},
  };
}

export function updateOverride(settings, key, value) {
  const next = normalizeSettings(settings);
  const limits = OVERRIDE_LIMITS[key];
  if (key === "fogEnabled") {
    if (typeof value !== "boolean") throw new TypeError("fogEnabled must be a boolean");
  } else if (key === "sunColor" || key === "ambientColor") {
    if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
      throw new TypeError(`${key} must be a six-digit hexadecimal color`);
    }
    value = value.toLowerCase();
  } else if (key === "shadowQuality") {
    if (!Object.hasOwn(SHADOW_MAP_SIZES, value)) {
      throw new RangeError(`Unknown shadow quality: ${value}`);
    }
  } else if (!limits || typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Invalid PolyShade setting: ${key}`);
  } else {
    value = Math.min(limits[1], Math.max(limits[0], value));
  }

  return {
    ...next,
    preset: next.preset === "vanilla" ? "cinematic-lite" : next.preset,
    enabled: true,
    overrides: { ...next.overrides, [key]: value },
  };
}

export function resetPreset(settings) {
  return selectPreset(settings, settings.preset);
}

export function getPresetDefaults(preset) {
  return PRESETS[preset];
}
