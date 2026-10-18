// Renderer-only PolyBot replay benchmark in a fresh, local PML harness.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { openUpscalingHarness } from "./upscaling-harness.mjs";

const count = Number(process.env.POLYBOT_COUNT ?? 1);
const scale = Number(process.env.POLYSHADE_SCALE ?? 0.5);
const frameGeneration=process.env.POLYSHADE_FRAME_GENERATION==='1';
const mode=process.env.POLYSHADE_TEMPORAL_MODE??'sgsr2-compute';
const sampleMs = Number(process.env.POLYSHADE_PROFILE_MS ?? 12000);
const captureSeconds = Number(process.env.POLYSHADE_CAPTURE_REPLAY_SECONDS ?? 2);
const file = process.env.POLYBOT_SWARM_FILE ?? `${process.env.TEMP}/polyshade-perf/swarm-${count}.jsonl`;
const label = process.env.POLYSHADE_PROFILE_LABEL ?? `swarm-${count}-sgsr${Math.round(scale * 100)}`;
const output = `${process.env.TEMP}/polyshade-performance/${label}`;
assert.ok([1, 100, 500].includes(count), "count must be 1, 100, or 500");
assert.ok([0.5, 0.59, 0.67, 0.77, 1].includes(scale), "scale must be Native, 77%, 67%, 59%, or 50%");
assert.ok(process.env.POLYBOT_ROOT, "POLYBOT_ROOT must point to the local PolyBot checkout");
await mkdir(output, { recursive: true });
const lines = (await readFile(file, "utf8")).trim().split(/\r?\n/);
const commands = lines.map((line) => JSON.parse(line));
const report = { label, date: new Date().toISOString(), count, scale, mode, frameGeneration, file, commands: commands.length };
const hardware = () => {
  try {
    return execFileSync("nvidia-smi", ["--query-gpu=name,driver_version,temperature.gpu,utilization.gpu,memory.used,clocks.gr", "--format=csv"], { encoding: "utf8" }).trim();
  } catch { return "unavailable"; }
};
report.hardwareBefore = hardware();
let browser;
let page;
const errors = [];
try {
  const harness = await openUpscalingHarness();
  browser = harness.browser;
  page = harness.page;
  errors.push(...harness.errors);
  page.on("pageerror", (error) => errors.push(error.message));
  console.log(`${label}: PolyBot and PolyShade loaded`);
  await page.waitForFunction(() => typeof window.__polybotVisualReplayDispatch === "function", undefined, { timeout: 30000 });
  await page.evaluate(() => {
    const bind = window.__polybotBindVisualReplayRenderer;
    if (typeof bind !== "function") throw new Error("PolyBot replay renderer was not installed");
    window.__polybotBenchmarkBinds = 0;
    window.__polybotBindVisualReplayRenderer = (...args) => {
      window.__polybotBenchmarkBinds++;
      return bind(...args);
    };
  });
  // Start a local, unconnected race so PolyBot can obtain the normal replay
  // render context. No trainer or bridge is present in this harness.
  await page.keyboard.press("w");
  await page.waitForFunction(() => window.__polybotBenchmarkBinds > 2, undefined, { timeout: 30000 });
  console.log(`${label}: live renderer context ready; loading ${count} replays`);
  for (let start = 0; start < commands.length; start += 24) {
    const batch = commands.slice(start, start + 24);
    const replies = await page.evaluate(async (items) => {
      const result = [];
      for (const command of items) {
        result.push(await new Promise((resolve) => {
          window.__polybotVisualReplayDispatch(command, resolve);
        }));
      }
      return result;
    }, batch);
    const failed = replies.find((reply) => !reply.ok);
    if (failed) throw new Error(failed.error);
  }
  await page.evaluate(({renderScale,frameGeneration,mode}) => {
    const c = window.__controller;
    const s = c.getSettings();
    s.preset = "cinematic";
    s.overrides = { ...(s.overrides ?? {}), upscaling: renderScale === 1 ? "native" : mode, upscaleQuality: "custom", upscaleCustomScale: renderScale, debugProfile: true,frameGeneration };
    c.notifySettingsChanged();
  }, {renderScale:scale,frameGeneration,mode});
  if(frameGeneration)await page.waitForFunction(()=>{const g=window.__controller.backends.gpu;if(g.fgFailure)throw Error(g.fgFailure);return g.fg?.ready;},null,{timeout:90000});
  await page.waitForTimeout(2500);
  const loaded = await page.evaluate(() => new Promise((resolve) =>
    window.__polybotVisualReplayDispatch({ op: "status", params: {} }, resolve)));
  assert.ok(loaded.ok, loaded.error);
  assert.equal(loaded.result.loaded_ghosts, count, "loaded replay count");
  assert.equal(loaded.result.playing, true, "swarm must be moving during benchmark");
  // Count actual shadow-cascade submissions from Three's renderer internals.
  // This is benchmark-only instrumentation; it does not change scene objects,
  // draw parameters, timing, or the shadow cache.
  await page.evaluate(() => {
    const g = window.__controller.backends.gpu;
    // Dedicated investigation only: collect one timestamp sample per frame.
    // The shipped/default profiler cadence is not changed by this harness.
    g.profiler.sampleInterval = 1;
    const lights = g.scene.sun.shadow.shadowNode.lights;
    const nodes = g.scene.sun.shadow.shadowNode._shadowNodes;
    const rows = lights.map((_, cascade) => ({
      cascade, updates: 0, updateCpuMs: 0, frames: 0,
      staticDraws: 0, dynamicDraws: 0, swarmDraws: 0,
      staticTriangles: 0, dynamicTriangles: 0, swarmTriangles: 0,
      swarmInstances: 0,
    }));
    const originals = [];
    const profilerDescriptor = g.profiler.descriptor;
    originals.push([g.profiler, "descriptor", profilerDescriptor]);
    g.profiler.descriptor = function (name) {
      if (name === "shadows") {
        const at = lights.findIndex((light) => light.shadow.map === g.renderer.getRenderTarget());
        if (at >= 0) name = `shadow-cascade-${at}`;
      }
      return profilerDescriptor.call(this, name);
    };
    const info = g.renderer.info;
    const infoUpdate = info.update;
    originals.push([info, "update", infoUpdate]);
    info.update = function (object, count, instanceCount) {
      const at = lights.findIndex((light) => light.shadow.map === g.renderer.getRenderTarget());
      if (at >= 0) {
        const row = rows[at];
        const triangles = instanceCount * count / 3;
        if (object.userData?.swarmInstances) {
          row.swarmDraws++;
          row.swarmTriangles += triangles;
          row.swarmInstances += instanceCount;
        } else if (g.motion.entries.has(object.userData?.source)) {
          row.dynamicDraws++;
          row.dynamicTriangles += triangles;
        } else {
          row.staticDraws++;
          row.staticTriangles += triangles;
        }
      }
      return infoUpdate.call(this, object, count, instanceCount);
    };
    nodes.forEach((node, cascade) => {
      const original = node.updateShadow;
      originals.push([node, "updateShadow", original]);
      node.updateShadow = function (...args) {
        const row = rows[cascade];
        row.updates++;
        const start = performance.now();
        try { return original.apply(this, args); }
        finally { row.updateCpuMs += performance.now() - start; }
      };
    });
    window.__polyshadeShadowDetail = { rows, originals };
  });
  console.log(`${label}: ${count} replays loaded; sampling frames`);
  await page.waitForTimeout(1000);
  await page.evaluate(async (seconds) => {
    const dispatch=(op,params={})=>new Promise(resolve=>window.__polybotVisualReplayDispatch({op,params},resolve));
    await dispatch("pause");
    await dispatch("seek",{seconds});
  },captureSeconds);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${output}/swarm.png` });
  await page.evaluate(() => window.__polybotVisualReplayDispatch({op:"play",params:{}},()=>{}));
  const initial = await page.evaluate(() => window.__controller.backends.gpu.report());
  const frames = await page.evaluate(async (duration) => {
    const values = []; let last = 0; const end = performance.now() + duration;
    await new Promise((resolve) => {
      const tick = (now) => {
        if (last) values.push(now - last);
        last = now;
        if (now >= end) resolve(); else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const sorted = values.slice().sort((a,b) => a-b);
    const stat = (i) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * i))];
    return { samples: values.length, median: stat(.5), p95: stat(.95), p99: stat(.99) };
  }, sampleMs);
  const final = await page.evaluate(async () => ({
    gpu: window.__controller.backends.gpu.report(),
    status: await new Promise((resolve) => window.__polybotVisualReplayDispatch({ op: "status", params: {} }, resolve)),
    binds: window.__polybotBenchmarkBinds,
    cars: window.__controller.backends.gpu.report().swarm,
    draws: window.__controller.backends.gpu.report().sceneDrawCalls,
    triangles: window.__controller.backends.gpu.report().sceneTriangles,
    shadows: (() => {
      const detail = window.__polyshadeShadowDetail;
      const rows = detail.rows.map((row) => {
        const updates = Math.max(row.updates, 1);
        return {
          cascade: row.cascade,
          updates: row.updates,
          staticDrawsPerUpdate: row.staticDraws / updates,
          dynamicDrawsPerUpdate: row.dynamicDraws / updates,
          swarmDrawsPerUpdate: row.swarmDraws / updates,
          staticTrianglesPerUpdate: row.staticTriangles / updates,
          dynamicTrianglesPerUpdate: row.dynamicTriangles / updates,
          swarmTrianglesPerUpdate: row.swarmTriangles / updates,
          swarmInstancesPerUpdate: row.swarmInstances / updates,
          updateCpuMsMedian: row.updateCpuMs / updates,
          gpu: window.__controller.backends.gpu.profiler.report().passes[`shadow-cascade-${row.cascade}`] ?? null,
        };
      });
      for (const [object, key, original] of detail.originals.reverse()) object[key] = original;
      delete window.__polyshadeShadowDetail;
      return rows;
    })(),
    heap: performance.memory?.usedJSHeapSize ?? null,
    physics: window.__player?.getPosition?.()?.toArray?.() ?? null,
  }));
  report.initial = initial;
  report.status = loaded.result;
  report.frames = frames;
  report.final = final;
  report.shadowCascades = final.shadows;
  report.hardwareAfter = hardware();
  errors.push(...harness.errors.filter(e=>!errors.includes(e)));
  report.errors = errors;
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  assert.equal(final.gpu.selection.backend, scale === 1 ? "native" : mode, "requested reconstruction mode must be active");
  assert.equal(final.gpu.frameGenerationFailure,undefined);
  assert.equal(final.gpu.temporal.frameIndex,final.gpu.frames,'swarm/FG presentation must not consume extra temporal samples');
  assert.ok(final.gpu.presentation.pending<=1);
  assert.equal(final.cars.sources, 1, "swarm must use one shared renderer source");
  assert.ok(final.cars.colourDraws>0&&final.cars.triangles>0,'swarm geometry must actually be submitted');
  assert.ok(final.cars.colourDraws <= 32, "swarm material groups must remain within the interop limit");
  assert.equal(errors.length, 0, "no browser or shader errors");
  console.log(JSON.stringify({ output, count, scale, frames, swarm: final.cars, gpu: final.gpu.profile, errors }, null, 2));
} finally {
  if (browser) await browser.close();
}
