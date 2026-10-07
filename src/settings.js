import { OPTION_DEFINITIONS, MATERIAL_KINDS } from "./options.js";
import { PRESET_IDS } from "./presets.js";

export const SETTINGS_SCHEMA_VERSION = 2;
export const SETTINGS_STORAGE_KEY = "polyshade.settings";

const DEFAULTS = Object.freeze({
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  preset: "cinematic",
  enabled: true,
  overrides: Object.freeze({}),
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateOption(key, value) {
  const definition = OPTION_DEFINITIONS[key];
  if (!definition) throw new TypeError(`Invalid PolyShade setting: ${key}`);
  const sample = definition[1];
  if (key === "materialOverrides") {
    if (!isPlainObject(value))
      throw new TypeError("Material overrides must be an object");
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([pattern, kind]) =>
            pattern.length <= 160 &&
            /^(material|mesh|parent):.+/.test(pattern) &&
            MATERIAL_KINDS.includes(kind),
        )
        .slice(0, 100),
    );
  }
  if (typeof sample === "boolean") {
    if (typeof value !== "boolean")
      throw new TypeError(`${key} must be a boolean`);
    return value;
  }
  if (typeof sample === "string") {
    if (sample.startsWith("#")) {
      if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value))
        throw new TypeError(`${key} must be a six-digit hexadecimal color`);
      return value.toLowerCase();
    }
    if (!definition[2].includes(value))
      throw new RangeError(`Unknown ${key}: ${value}`);
    return value;
  }
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new TypeError(`Invalid PolyShade setting: ${key}`);
  return Math.min(definition[3], Math.max(definition[2], value));
}
function normalizeOverrides(overrides) {
  const normalized = {};
  if (!isPlainObject(overrides)) return normalized;
  for (const [key, value] of Object.entries(overrides)) {
    try {
      normalized[key] = validateOption(key, value);
    } catch {
      /* Ignore unknown or invalid saved keys. */
    }
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

  const preset = PRESET_IDS.includes(value.preset)
    ? value.preset
    : DEFAULTS.preset;
  const enabled =
    typeof value.enabled === "boolean" ? value.enabled : preset !== "vanilla";

  if (value.schemaVersion === SETTINGS_SCHEMA_VERSION) {
    return {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      preset,
      enabled: preset === "vanilla" ? false : enabled,
      overrides: normalizeOverrides(value.overrides),
    };
  }

  if (
    value.schemaVersion === 1 ||
    value.schemaVersion === 0 ||
    value.schemaVersion === undefined
  ) {
    const legacyOverrides = isPlainObject(value.overrides)
      ? value.overrides
      : {};
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
    warn(
      "[PolyShade] Saved settings could not be read; defaults are active.",
      error,
    );
    return createDefaultSettings();
  }
}

export function saveSettings(storage, settings, warn = console.warn) {
  if (!storage) {
    warn(
      "[PolyShade] Settings were not persisted because localStorage is unavailable.",
    );
    return false;
  }
  try {
    storage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(normalizeSettings(settings)),
    );
    return true;
  } catch (error) {
    warn("[PolyShade] Settings could not be persisted.", error);
    return false;
  }
}

export function selectPreset(settings, preset) {
  if (!PRESET_IDS.includes(preset))
    throw new RangeError(`Unknown PolyShade preset: ${preset}`);
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    preset,
    enabled: preset !== "vanilla",
    overrides: {},
  };
}

export function updateOverride(settings, key, value) {
  const next = normalizeSettings(settings);
  value = validateOption(key, value);

  return {
    ...next,
    preset: next.preset === "vanilla" ? "cinematic" : next.preset,
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
