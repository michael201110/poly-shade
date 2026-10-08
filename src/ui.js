import { OPTIONS, MATERIAL_KINDS } from "./options.js";
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
#${PANEL_ID} details { border-top:1px solid #465260;margin-top:8px;padding-top:7px; }
#${PANEL_ID} summary { cursor:pointer; font-weight:600; padding:3px 0; }
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
  row.append(
    createElement(container.ownerDocument, "span", "", labelText),
    control,
  );
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
  const update = () => {
    output.textContent = format(Number(input.value));
  };
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
    panel.dataset.collapsed =
      panel.dataset.collapsed !== "true" ? "true" : "false";
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

  const enabled = makeCheck(
    document,
    "PolyShade enabled",
    initialSettings.enabled,
    callbacks.onEnabled,
  );
  content.appendChild(enabled);

  const controls = {};
  for (const [group, definitions] of Object.entries(OPTIONS)) {
    const details = createElement(document, "details");
    details.append(createElement(document, "summary", "", group));
    if (group === "Sky") details.open = true;
    for (const [key, definition] of Object.entries(definitions)) {
      const [label, value, min, max] = definition;
      if (key === "materialOverrides") continue;
      let control;
      if (typeof value === "number") {
        const range = makeRange(document, {
          min,
          max,
          step: max - min > 10 ? 1 : max - min < 0.01 ? 0.00001 : 0.01,
          value: initialSettings.values[key],
          format: (v) => String(Number(v.toFixed(5))),
          onChange: (v) => callbacks.onValue(key, v),
        });
        control = range.element;
        controls[key] = (v) => range.setValue(v);
      } else if (typeof value === "boolean") {
        control = makeCheck(document, label, initialSettings.values[key], (v) =>
          callbacks.onValue(key, v),
        );
        controls[key] = (v) => {
          control.querySelector("input").checked = v;
        };
        details.append(control);
        continue;
      } else if (value.startsWith("#")) {
        control = makeColor(document, initialSettings.values[key], (v) =>
          callbacks.onValue(key, v),
        );
        controls[key] = (v) => {
          control.value = v;
        };
      } else {
        control = makeSelect(
          document,
          min.map((v) => [v, v]),
          initialSettings.values[key],
          (v) => callbacks.onValue(key, v),
        );
        controls[key] = (v) => {
          control.value = v;
        };
      }
      control.dataset.option = key;
      addRow(details, label, control);
    }
    content.append(details);
  }
  const inspector = createElement(document, "details");
  inspector.append(
    createElement(document, "summary", "", "Material inspector / overrides"),
  );
  const filter = document.createElement("input");
  filter.placeholder = "Filter names or category";
  filter.style.width = "100%";
  inspector.append(filter);
  const listing = createElement(document, "pre", "polyshade-metrics");
  listing.style.maxHeight = "190px";
  listing.style.overflow = "auto";
  inspector.append(listing);
  const refresh = createElement(document, "button", "", "Refresh inspector");
  refresh.onclick = () => {
    const records = callbacks.onInspect?.() ?? [];
    const needle = filter.value.toLowerCase();
    listing.textContent =
      records
        .filter((r) => JSON.stringify(r).toLowerCase().includes(needle))
        .map(
          (r) =>
            `${r.kind} (${Math.round(r.confidence * 100)}%) ${r.type}\nmaterial:${r.material} mesh:${r.mesh} parent:${r.parent}\n${r.evidence.join(", ")}`,
        )
        .join("\n\n") || "No matching materials.";
  };
  inspector.append(refresh);
  let picking = false;
  const pick = createElement(document, "button", "", "Pick from canvas");
  pick.onclick = () => {
    picking = !picking;
    pick.textContent = picking ? "Alt-click a surface" : "Pick from canvas";
  };
  inspector.append(pick);
  const pickHandler = (event) => {
    if (!picking || !event.altKey || panel.contains(event.target)) return;
    const records = callbacks.onPick?.(event) ?? [];
    listing.textContent = records
      .map(
        (r) =>
          `${r.kind} (${Math.round(r.confidence * 100)}%) ${r.type}\nmaterial:${r.material} mesh:${r.mesh} parent:${r.parent}\n${r.evidence.join(", ")}`,
      )
      .join("\n\n");
    picking = false;
    pick.textContent = "Pick from canvas";
  };
  document.addEventListener("pointerdown", pickHandler);
  const pattern = document.createElement("input");
  pattern.placeholder = "mesh:Car* or material:Paint";
  pattern.style.width = "100%";
  inspector.append(pattern);
  const kind = makeSelect(
    document,
    MATERIAL_KINDS.map((v) => [v, v]),
    "car",
    () => {},
  );
  inspector.append(kind);
  const apply = createElement(document, "button", "", "Save override");
  let overrideValues = initialSettings.values.materialOverrides;
  apply.onclick = () => {
    if (!/^(material|mesh|parent):.+/.test(pattern.value)) return;
    callbacks.onValue("materialOverrides", {
      ...overrideValues,
      [pattern.value]: kind.value,
    });
  };
  const remove = createElement(document, "button", "", "Remove pattern");
  remove.onclick = () => {
    const next = { ...overrideValues };
    delete next[pattern.value];
    callbacks.onValue("materialOverrides", next);
  };
  inspector.append(apply, remove);
  content.append(inspector);
  const actions = createElement(document, "div", "polyshade-actions");
  const reset = createElement(document, "button", "", "Reset preset");
  reset.type = "button";
  reset.addEventListener("click", callbacks.onReset);
  const disable = createElement(document, "button", "", "Disable");
  disable.type = "button";
  disable.addEventListener("click", () => callbacks.onEnabled(false));
  actions.append(reset, disable);
  content.appendChild(actions);

  const status = createElement(
    document,
    "div",
    "polyshade-status",
    "Waiting for the live PolyTrack scene.",
  );
  status.setAttribute("role", "status");
  content.appendChild(status);
  const metrics = createElement(document, "div", "polyshade-metrics");
  metrics.hidden = true;
  content.appendChild(metrics);
  content.appendChild(
    createElement(
      document,
      "p",
      "polyshade-muted",
      "F7 toggles PolyShade. UI remains outside the game canvas.",
    ),
  );

  panel.appendChild(content);
  document.body.appendChild(panel);

  return {
    setStatus(text) {
      status.textContent = text;
    },
    setSettings(settings) {
      presetSelect.value = settings.preset;
      enabled.querySelector("input").checked = settings.enabled;
      for (const [key, set] of Object.entries(controls))
        set(settings.values[key]);
      overrideValues = settings.values.materialOverrides;
      metrics.hidden = !settings.values.debugEnabled;
    },
    setMetrics(data) {
      if (metrics.hidden) return;
      const shadowSize = SHADOW_MAP_SIZES[data.shadowQuality] || "off";
      metrics.textContent = [
        `FPS (render calls): ${data.fps.toFixed(0)}`,
        `CPU render submission avg / p95: ${data.averageFrameTime.toFixed(2)} / ${data.p95FrameTime.toFixed(2)} ms`,
        `Preset: ${PRESET_LABELS[data.preset]} | scale: ${data.renderScale.toFixed(2)}x`,
        `Shadow map: ${shadowSize} | tuned materials: ${data.modifiedMaterials}`,
        data.gpu
          ? `GPU render avg / p95: ${data.gpu.average.toFixed(2)} / ${data.gpu.p95.toFixed(2)} ms (${data.gpu.samples} samples)`
          : "GPU timer unavailable / no completed queries",
        ...(data.capabilities
          ? [
              `WebGL ${data.capabilities.webgl2 ? 2 : 1} | HDR ${data.capabilities.halfFloat} | depth ${data.capabilities.features.depthTexture}`,
              `Passes: ${data.capabilities.passes?.join(" ? ")}`,
              `Targets: ${JSON.stringify(data.capabilities.resources)}`,
              `Environment: ${JSON.stringify(data.capabilities.environment)}`,
              `Failures: ${JSON.stringify(data.capabilities.failures)}`,
              ...(data.capabilities.profile
                ? Object.entries(data.capabilities.profile).map(
                    ([name, p]) =>
                      `${name}: CPU ${p.cpu.average.toFixed(2)} / ${p.cpu.p95.toFixed(2)} ms; GPU ${p.gpu ? p.gpu.average.toFixed(2) + " / " + p.gpu.p95.toFixed(2) + " ms" : "unavailable"}`,
                  )
                : []),
            ]
          : []),
      ].join("\n");
    },
    dispose() {
      document.removeEventListener("pointerdown", pickHandler);
      panel.remove();
      style.remove();
    },
  };
}

export function installHotkey(document, toggle) {
  const onKeyDown = (event) => {
    if (event.code !== "F7" || event.repeat || event.target?.isContentEditable)
      return;
    const tagName = event.target?.tagName?.toLowerCase();
    if (tagName === "input" || tagName === "textarea" || tagName === "select")
      return;
    event.preventDefault();
    toggle();
  };
  document.addEventListener("keydown", onKeyDown, true);
  return () => document.removeEventListener("keydown", onKeyDown, true);
}
