import { OPTIONS, MATERIAL_KINDS } from "./options.js";
import { PRESET_IDS, PRESET_LABELS } from "./presets.js";
import { attachPolyCaptureUI } from "./capture-ui.js";

const STYLE_ID = "polyshade-styles";
const PANEL_ID = "polyshade-panel";

const CSS = `
/* PolyBot HUD glass tokens, scoped to this optional standalone panel. */
#${PANEL_ID} {
 --poly-tools-top:12px;--poly-glass-fg:#f1f7fc;--poly-glass-muted:#c9d6e1;
 position:fixed;z-index:2147483000;right:12px;top:var(--poly-tools-top);width:min(320px,calc(100vw - 24px));
 max-height:calc(100dvh - var(--poly-tools-top) - 12px);overflow:auto;overscroll-behavior:contain;padding:14px 16px;box-sizing:border-box;
 color:var(--poly-glass-fg);background:linear-gradient(135deg,rgba(230,247,255,.14),rgba(40,70,105,.08)),rgba(9,19,32,.26);
 border:1px solid rgba(235,248,255,.3);border-radius:20px;font:12px/1.35 ui-monospace,Consolas,monospace;
 backdrop-filter:blur(12px) saturate(150%);-webkit-backdrop-filter:blur(12px) saturate(150%);
 text-shadow:0 1px 3px rgba(0,0,0,.8);
 box-shadow:inset 0 1px 0 rgba(255,255,255,.34),inset 0 -1px 0 rgba(255,255,255,.07),0 12px 38px rgba(0,0,0,.18)
}
#${PANEL_ID},#${PANEL_ID} *{box-sizing:border-box;font-family:ui-monospace,Consolas,monospace!important;font-style:normal!important;scrollbar-width:thin;scrollbar-color:rgba(223,244,255,.48) transparent}
@supports selector(::-webkit-scrollbar){#${PANEL_ID},#${PANEL_ID} *{scrollbar-width:auto;scrollbar-color:auto}}
#${PANEL_ID}::-webkit-scrollbar,#${PANEL_ID} *::-webkit-scrollbar{width:7px;height:7px;background:transparent}
#${PANEL_ID}::-webkit-scrollbar-track,#${PANEL_ID} *::-webkit-scrollbar-track{background:transparent;margin:12px 0}
#${PANEL_ID}::-webkit-scrollbar-thumb,#${PANEL_ID} *::-webkit-scrollbar-thumb{border-radius:999px;background:linear-gradient(180deg,rgba(240,252,255,.55),rgba(170,217,241,.28));border:1px solid rgba(255,255,255,.25)}
#${PANEL_ID}::-webkit-scrollbar-button,#${PANEL_ID} *::-webkit-scrollbar-button{display:none;width:0;height:0}
#${PANEL_ID}::-webkit-scrollbar-corner,#${PANEL_ID} *::-webkit-scrollbar-corner{background:transparent}
#${PANEL_ID} details{border-top:1px solid rgba(156,190,216,.24);margin-top:8px;padding-top:7px}
#${PANEL_ID} summary{cursor:pointer;font-weight:700;padding:3px 0;color:#8ed7ff;border-radius:6px}
#${PANEL_ID} header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
#${PANEL_ID} h2{margin:0;font-size:14px;font-weight:700;white-space:nowrap}
#${PANEL_ID} button,#${PANEL_ID} select,#${PANEL_ID} input{
 color:inherit;background:rgba(15,28,44,.28);border:1px solid rgba(235,248,255,.38);border-radius:10px;padding:5px 7px;
 font:inherit;min-width:0;max-width:100%;box-shadow:inset 0 1px 0 rgba(255,255,255,.18);transition:background-color 140ms ease,border-color 140ms ease
}
#${PANEL_ID} button{cursor:pointer}
#${PANEL_ID} button:hover{background:rgba(125,175,215,.28);border-color:rgba(235,248,255,.6)}
#${PANEL_ID} :is(button,select,input,summary):focus-visible{outline:2px solid #8ed7ff;outline-offset:2px}
#${PANEL_ID} option{background:#16273a;color:#edf4fa}
#${PANEL_ID} input[type=checkbox]{appearance:none;flex-shrink:0;width:14px;height:14px;padding:0;border-radius:4px;accent-color:#8ed7ff;vertical-align:middle}
#${PANEL_ID} input[type=checkbox]:checked{background:#8ed7ff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m3.5 8 3 3 6-6' fill='none' stroke='%2316273a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/12px 12px no-repeat}
#${PANEL_ID} input[type=color]{height:30px;width:100%;padding:3px}
#${PANEL_ID} .polyshade-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,112px);gap:8px;align-items:center;margin:8px 0}
#${PANEL_ID} .polyshade-row>span{overflow-wrap:anywhere}
#${PANEL_ID} .polyshade-row>select{width:100%}
#${PANEL_ID} .polyshade-range{appearance:none;width:100%;height:5px;padding:0;margin:5px 0;background:rgba(211,232,250,.22);border:0;border-radius:999px;box-shadow:none}
#${PANEL_ID} .polyshade-range::-webkit-slider-thumb{appearance:none;width:13px;height:13px;border:1px solid rgba(235,248,255,.65);border-radius:50%;background:#8ed7ff;box-shadow:0 1px 5px rgba(0,0,0,.2)}
#${PANEL_ID} .polyshade-range::-moz-range-thumb{width:13px;height:13px;border:1px solid rgba(235,248,255,.65);border-radius:50%;background:#8ed7ff}
#${PANEL_ID} .polyshade-range::-webkit-slider-runnable-track{height:5px;border:0;border-radius:999px;background:rgba(211,232,250,.22);box-shadow:none}
#${PANEL_ID} .polyshade-range::-webkit-slider-thumb{box-sizing:border-box;margin-top:-4px}
#${PANEL_ID} .polyshade-range::-moz-range-track{height:5px;border:0;border-radius:999px;background:rgba(211,232,250,.22)}
#${PANEL_ID} output{display:block;color:var(--poly-glass-muted);text-align:right;font-variant-numeric:tabular-nums}
#${PANEL_ID} .polyshade-check{display:flex;align-items:center;gap:7px}
#${PANEL_ID} .polyshade-actions{display:flex;gap:7px;margin-top:11px}
#${PANEL_ID} .polyshade-actions button{flex:1}
#${PANEL_ID} .polyshade-status,#${PANEL_ID} .polyshade-metrics{color:var(--poly-glass-muted);margin-top:9px;overflow-wrap:anywhere}
#${PANEL_ID} .polyshade-metrics{white-space:pre-wrap;font:11px/1.5 ui-monospace,Consolas,monospace}
#${PANEL_ID} .polyshade-muted{color:var(--poly-glass-muted);font-size:11px}
#${PANEL_ID}[data-collapsed="true"] .polyshade-content{display:none}
#${PANEL_ID}[data-collapsed="true"] header{margin-bottom:0}
#${PANEL_ID}[hidden]{display:none!important}
:root[data-poly-capture-ui="hidden"] #${PANEL_ID}{display:none!important}
body:has(.polybot-ai-hud-toggle:not([hidden])) #${PANEL_ID}{--poly-tools-top:92px}
@media(max-width:679px){
 body:has(#poly-cam-panel:not(.panel-hidden)):not(.poly-cam-clean) #${PANEL_ID}{
  top:calc(var(--poly-tools-top) + (100dvh - var(--poly-tools-top) - 36px)/2 + 12px);
  max-height:calc((100dvh - var(--poly-tools-top) - 36px)/2)
 }
}
@media(prefers-reduced-motion:reduce){#${PANEL_ID} *{transition:none!important}}
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
  header.appendChild(createElement(document, "h2", "", initialSettings.version ? `PolyShade ${initialSettings.version}` : "PolyShade"));
  const collapse = createElement(document, "button", "", "Hide");
  collapse.type = "button";
  collapse.addEventListener("click", () => {
    panel.dataset.collapsed =
      panel.dataset.collapsed !== "true" ? "true" : "false";
    collapse.textContent = panel.dataset.collapsed === "true" ? "Show" : "Hide";
  });
  const dismiss = createElement(document, "button", "", "×");
  dismiss.type = "button";
  dismiss.setAttribute("aria-label", "Completely hide PolyShade panel");
  dismiss.title = "Completely hide panel (press End to show it again)";
  dismiss.addEventListener("click", () => {
    panel.hidden = true;
  });
  const headerActions = createElement(document, "div");
  headerActions.style.display = "flex";
  headerActions.style.gap = "6px";
  headerActions.append(collapse, dismiss);
  header.appendChild(headerActions);
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

  let captureUI;
  const captureCheck = makeCheck(document, "Hide windows for recording (F2)", false,
    hidden => captureUI.setHidden(hidden));
  content.appendChild(captureCheck);
  captureUI = attachPolyCaptureUI(document.defaultView || globalThis,
    hidden => { captureCheck.querySelector("input").checked = hidden; });

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
        const upscaleLabels = {
          native: key === "upscaling" ? "Native" : "Native / 100%", auto: "Auto",
          reduced: "Reduced resolution (bilinear benchmark)", "sgsr2-compute": "SGSR2 Compute", fsr31: "FSR 3.1 SR (experimental)",
          "ultra-quality": "Ultra Quality / 77%", quality: "Quality / 67%",
          balanced: "Balanced / 59%", performance: "Performance / 50%", custom: "Custom",
        };
        control = makeSelect(
          document,
          min.map((v) => [v, key === "upscaling" || key === "upscaleQuality" ? upscaleLabels[v] ?? v : v]),
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
  const upscaleStatus = createElement(document, "div", "polyshade-status");
  content.appendChild(upscaleStatus);
  const metrics = createElement(document, "div", "polyshade-metrics");
  metrics.hidden = true;
  content.appendChild(metrics);
  content.appendChild(
    createElement(
      document,
      "p",
      "polyshade-muted",
      "Home toggles PolyShade; End hides or restores this panel.",
    ),
  );

  panel.appendChild(content);
  document.body.appendChild(panel);

  return {
    setStatus(text) {
      status.textContent = text;
    },
    isHidden() {
      return panel.hidden;
    },
    show() {
      panel.hidden = false;
    },
    toggleVisibility() {
      panel.hidden = !panel.hidden;
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
      const backend=data.capabilities?.backend;
      if(backend?.renderer==='WebGPU') {
        const g=backend.webgpu;
        upscaleStatus.textContent=`WebGPU | requested ${g.selection?.requested} | active ${g.selection?.backend} | internal ${g.internal?.join(' × ')} → output ${g.output?.join(' × ')} | history ${g.temporal?.valid?'valid':'reset'}`;
        if(g.presentation?.enabled||g.frameGenerationFailure)upscaleStatus.textContent+=g.frameGenerationFailure?
          ` | FG unavailable: ${g.frameGenerationFailure}`:
          ` | FG ${g.presentation.active?'active':'paused: real FPS too low'} | real ${g.presentation.realFPS?.toFixed(1)??'—'} FPS | canvas ${g.presentation.submittedPresentationFPS?.toFixed(1)??'—'} FPS`;
        if(!metrics.hidden)metrics.textContent=[upscaleStatus.textContent,
          `Jitter: ${g.temporal?.jitterIndex}/${g.temporal?.phaseCount}; real frame ${g.temporal?.frameIndex}`,
          `Render pixels current / previous / delta: ${JSON.stringify([g.temporal?.jitter,g.temporal?.previousJitter,g.temporal?.jitterDelta])}`,
          `UV current / previous: ${JSON.stringify([g.temporal?.jitterUV,g.temporal?.previousJitterUV])}`,
          `NDC current / previous: ${JSON.stringify([g.temporal?.jitterNDC,g.temporal?.previousJitterNDC])}`,
          `CPU render submission avg / p95: ${data.averageFrameTime.toFixed(2)} / ${data.p95FrameTime.toFixed(2)} ms`,
          `History: ${JSON.stringify(g.temporal)}`,`Compute: ${JSON.stringify(g.compute)}`,
          `GPU timings (ms, median/p95): ${JSON.stringify(g.profile)}`,
          `Resources: ${JSON.stringify(g.resources)}`,g.computeFailure??''].join('\n');
        return;
      }
      upscaleStatus.textContent = backend?.webgpuFailure
        ? `WebGPU unavailable: ${backend.webgpuFailure}`
        : backend?.renderer ?? "Initializing WebGPU";
      if (!metrics.hidden) metrics.textContent = upscaleStatus.textContent;
    },
    dispose() {
      captureUI.dispose();
      document.removeEventListener("pointerdown", pickHandler);
      panel.remove();
      style.remove();
    },
  };
}

export function installHotkey(document, { toggleEnabled, togglePanel }) {
  const onKeyDown = (event) => {
    if (!["Home", "End"].includes(event.code) || event.repeat || event.target?.isContentEditable)
      return;
    const tagName = event.target?.tagName?.toLowerCase();
    if (tagName === "input" || tagName === "textarea" || tagName === "select")
      return;
    event.preventDefault();
    if (event.code === "Home") toggleEnabled();
    else togglePanel();
  };
  document.addEventListener("keydown", onKeyDown, true);
  return () => document.removeEventListener("keydown", onKeyDown, true);
}
