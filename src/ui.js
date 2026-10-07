import { PRESET_IDS, PRESET_LABELS, SHADOW_MAP_SIZES } from "./presets.js";

const STYLE_ID = "polyshade-styles";
const PANEL_ID = "polyshade-panel";

const CSS = `
#${PANEL_ID} {
  position: fixed; z-index: 2147483000; right: 14px; top: 14px; width: 282px;
  max-height: calc(100vh - 28px); overflow: auto; padding: 14px; box-sizing: border-box;
  color: #eef2f6; background: rgba(20, 27, 35, .94); border: 1px solid rgba(211, 226, 238, .24);
  border-radius: 9px; box-shadow: 0 8px 28px rgba(0, 0, 0, .38);
  font: 12px/1.4 system-ui, sans-serif; backdrop-filter: blur(10px);
}
#${PANEL_ID} * { box-sizing: border-box; }
#${PANEL_ID} header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
#${PANEL_ID} h2 { margin: 0; font-size: 15px; font-weight: 650; }
#${PANEL_ID} button, #${PANEL_ID} select {
  color: inherit; background: #2b3743; border: 1px solid #526171; border-radius: 5px; padding: 5px 7px;
  font: inherit;
}
#${PANEL_ID} button { cursor: pointer; }
#${PANEL_ID} button:hover { background: #394a59; }
#${PANEL_ID} .polyshade-row { display: grid; grid-template-columns: 1fr 112px; gap: 8px; align-items: center; margin: 8px 0; }
#${PANEL_ID} .polyshade-range {
  appearance: none; width: 100%; height: 5px; padding: 0; margin: 5px 0;
  background: #526171; border: 0; border-radius: 3px; box-shadow: none;
}
#${PANEL_ID} .polyshade-range::-webkit-slider-thumb {
  appearance: none; width: 12px; height: 12px; border: 0; border-radius: 50%;
  background: #d8b985; box-shadow: none;
}
#${PANEL_ID} .polyshade-range::-moz-range-thumb {
  width: 12px; height: 12px; border: 0; border-radius: 50%; background: #d8b985;
}
#${PANEL_ID} output { display: block; color: #bac7d2; text-align: right; }
#${PANEL_ID} .polyshade-check { display: flex; align-items: center; gap: 7px; }
#${PANEL_ID} .polyshade-actions { display: flex; gap: 7px; margin-top: 11px; }
#${PANEL_ID} .polyshade-actions button { flex: 1; }
#${PANEL_ID} .polyshade-status, #${PANEL_ID} .polyshade-metrics { color: #bac7d2; margin-top: 9px; }
#${PANEL_ID} .polyshade-metrics { white-space: pre-line; font: 11px/1.5 ui-monospace, monospace; }
#${PANEL_ID} .polyshade-muted { color: #9caab6; font-size: 11px; }
#${PANEL_ID}[data-collapsed="true"] .polyshade-content { display: none; }
`;

function createElement(document, tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function addRow(container, labelText, control) {
  const row = createElement(container.ownerDocument, "label", "polyshade-row");
  row.append(createElement(container.ownerDocument, "span", "", labelText), control);
  container.appendChild(row);
  return row;
}

function makeRange(document, { min, max, step, value, format, onChange }) {
  const wrap = document.createElement("div");
  const input = document.createElement("input");
  input.type = "range";
  input.className = "polyshade-range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  const output = createElement(document, "output");
  const update = () => { output.textContent = format(Number(input.value)); };
  input.addEventListener("input", () => {
    update();
    onChange(Number(input.value));
  });
  update();
  wrap.append(input, output);
  return {
    element: wrap,
    input,
    setValue(value) {
      input.value = String(value);
      update();
    },
  };
}

function makeSelect(document, values, selected, onChange) {
  const select = document.createElement("select");
  for (const [value, label] of values) {
    const option = createElement(document, "option", "", label);
    option.value = value;
    select.appendChild(option);
  }
  select.value = selected;
  select.addEventListener("change", () => onChange(select.value));
  return select;
}

function makeCheck(document, text, checked, onChange) {
  const label = createElement(document, "label", "polyshade-check");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  label.append(input, createElement(document, "span", "", text));
  return label;
}

function makeColor(document, value, onChange) {
  const input = document.createElement("input");
  input.type = "color";
  input.value = value;
  input.addEventListener("input", () => onChange(input.value));
  return input;
}

export function mountPanel(document, callbacks, initialSettings) {
  document.getElementById(STYLE_ID)?.remove();
  document.getElementById(PANEL_ID)?.remove();

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);

  const panel = document.createElement("section");
  panel.id = PANEL_ID;
  panel.setAttribute("aria-label", "PolyShade rendering controls");
  panel.dataset.collapsed = "false";

  const header = document.createElement("header");
  header.appendChild(createElement(document, "h2", "", "PolyShade"));
  const collapse = createElement(document, "button", "", "Hide");
  collapse.type = "button";
  collapse.addEventListener("click", () => {
    panel.dataset.collapsed = panel.dataset.collapsed !== "true" ? "true" : "false";
    collapse.textContent = panel.dataset.collapsed === "true" ? "Show" : "Hide";
  });
  header.appendChild(collapse);
  panel.appendChild(header);

  const content = createElement(document, "div", "polyshade-content");
  const presetSelect = makeSelect(
    document,
    PRESET_IDS.map((id) => [id, PRESET_LABELS[id]]),
    initialSettings.preset,
    callbacks.onPreset,
  );
  addRow(content, "Preset", presetSelect);

  const enabled = makeCheck(document, "PolyShade enabled", initialSettings.enabled, callbacks.onEnabled);
  content.appendChild(enabled);

  const ranges = {};
  const rangeDefinitions = [
    ["sunIntensity", "Sun intensity", 0.5, 2, 0.01, (v) => v.toFixed(2) + "x"],
    ["sunElevation", "Sun elevation", 10, 75, 1, (v) => `${Math.round(v)} deg`],
    ["sunAzimuth", "Sun azimuth", 0, 360, 1, (v) => `${Math.round(v)} deg`],
    ["ambientIntensity", "Ambient fill", 0.1, 1.8, 0.01, (v) => v.toFixed(2) + "x"],
    ["surfaceWarmth", "Cream surfaces", 0, 1, 0.01, (v) => `${Math.round(v * 100)}%`],
    ["shadowDistance", "Shadow coverage", 30, 200, 1, (v) => `${Math.round(v)} units`],
    ["shadowSoftness", "Shadow softness", 0, 4, 0.1, (v) => v.toFixed(1)],
    ["fogStrength", "Haze strength", 0, 1, 0.01, (v) => v.toFixed(2)],
    ["exposure", "Exposure", 0.7, 1.4, 0.01, (v) => v.toFixed(2)],
  ];
  for (const [key, label, min, max, step, format] of rangeDefinitions) {
    const range = makeRange(document, {
      min,
      max,
      step,
      value: initialSettings.values[key],
      format,
      onChange: (value) => callbacks.onValue(key, value),
    });
    ranges[key] = range;
    addRow(content, label, range.element);
  }

  const sunColor = makeColor(document, initialSettings.values.sunColor,
    (value) => callbacks.onValue("sunColor", value));
  addRow(content, "Sun color", sunColor);
  const ambientColor = makeColor(document, initialSettings.values.ambientColor,
    (value) => callbacks.onValue("ambientColor", value));
  addRow(content, "Ambient color", ambientColor);

  const shadow = makeSelect(
    document,
    [["off", "Off"], ["low", "1024"], ["medium", "2048"], ["high", "4096"]],
    initialSettings.values.shadowQuality,
    (value) => callbacks.onValue("shadowQuality", value),
  );
  addRow(content, "Shadow map", shadow);

  const scale = makeSelect(
    document,
    [["1", "1.00x"], ["1.25", "1.25x"], ["1.5", "1.50x"]],
    String(initialSettings.values.renderScale),
    (value) => callbacks.onValue("renderScale", Number(value)),
  );
  addRow(content, "Render scale", scale);

  const fog = makeCheck(document, "Atmospheric haze", initialSettings.values.fogEnabled,
    (value) => callbacks.onValue("fogEnabled", value));
  content.appendChild(fog);

  const actions = createElement(document, "div", "polyshade-actions");
  const reset = createElement(document, "button", "", "Reset preset");
  reset.type = "button";
  reset.addEventListener("click", callbacks.onReset);
  const disable = createElement(document, "button", "", "Disable");
  disable.type = "button";
  disable.addEventListener("click", () => callbacks.onEnabled(false));
  actions.append(reset, disable);
  content.appendChild(actions);

  const status = createElement(document, "div", "polyshade-status", "Waiting for the live PolyTrack scene.");
  status.setAttribute("role", "status");
  content.appendChild(status);
  const metricsToggle = makeCheck(document, "Show render diagnostics", false, (visible) => {
    metrics.hidden = !visible;
  });
  content.appendChild(metricsToggle);
  const metrics = createElement(document, "div", "polyshade-metrics");
  metrics.hidden = true;
  content.appendChild(metrics);
  content.appendChild(createElement(document, "p", "polyshade-muted", "F7 toggles PolyShade. UI remains outside the game canvas."));

  panel.appendChild(content);
  document.body.appendChild(panel);

  return {
    setStatus(text) {
      status.textContent = text;
    },
    setSettings(settings) {
      presetSelect.value = settings.preset;
      enabled.querySelector("input").checked = settings.enabled;
      for (const [key, range] of Object.entries(ranges)) {
        range.setValue(settings.values[key]);
      }
      sunColor.value = settings.values.sunColor;
      ambientColor.value = settings.values.ambientColor;
      shadow.value = settings.values.shadowQuality;
      scale.value = String(settings.values.renderScale);
      fog.querySelector("input").checked = settings.values.fogEnabled;
    },
    setMetrics(data) {
      const shadowSize = SHADOW_MAP_SIZES[data.shadowQuality] || "off";
      metrics.textContent = [
        `FPS (render calls): ${data.fps.toFixed(0)}`,
        `Frame time avg / p95: ${data.averageFrameTime.toFixed(2)} / ${data.p95FrameTime.toFixed(2)} ms`,
        `Preset: ${PRESET_LABELS[data.preset]} | scale: ${data.renderScale.toFixed(2)}x`,
        `Shadow map: ${shadowSize} | tuned materials: ${data.modifiedMaterials}`,
      ].join("\n");
    },
    dispose() {
      panel.remove();
      style.remove();
    },
  };
}

export function installHotkey(document, toggle) {
  const onKeyDown = (event) => {
    if (event.code !== "F7" || event.repeat || event.target?.isContentEditable) return;
    const tagName = event.target?.tagName?.toLowerCase();
    if (tagName === "input" || tagName === "textarea" || tagName === "select") return;
    event.preventDefault();
    toggle();
  };
  document.addEventListener("keydown", onKeyDown, true);
  return () => document.removeEventListener("keydown", onKeyDown, true);
}
