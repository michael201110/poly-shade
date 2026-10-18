// Renderer-only PolyBot replay benchmark in a fresh, local PML harness.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { openUpscalingHarness } from "./upscaling-harness.mjs";

const count = Number(process.env.POLYBOT_COUNT ?? 1);
const scale = Number(process.env.POLYSHADE_SCALE ?? 0.5);
const file = process.env.POLYBOT_SWARM_FILE ?? `${process.env.TEMP}/polyshade-perf/swarm-${count}.jsonl`;
const label = process.env.POLYSHADE_PROFILE_LABEL ?? `swarm-${count}-sgsr${Math.round(scale * 100)}`;
const output = `${process.env.TEMP}/polyshade-performance/${label}`;
assert.ok([1, 100, 500].includes(count), "count must be 1, 100, or 500");
assert.ok([0.5, 0.67].includes(scale), "scale must be 50% or 67%");
assert.ok(process.env.POLYBOT_ROOT, "POLYBOT_ROOT must point to the local PolyBot checkout");
await mkdir(output, { recursive: true });
const lines = (await readFile(file, "utf8")).trim().split(/\r?\n/);
const commands = lines.map((line) => JSON.parse(line));
const report = { label, date: new Date().toISOString(), count, scale, file, commands: commands.length };
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
  await page.evaluate((renderScale) => {
    const c = window.__controller;
    const s = c.getSettings();
    s.preset = "cinematic";
    s.overrides = { ...(s.overrides ?? {}), upscaling: "sgsr2-compute", upscaleQuality: "custom", upscaleCustomScale: renderScale, debugProfile: true };
    c.notifySettingsChanged();
  }, scale);
  await page.waitForTimeout(2500);
  const loaded = await page.evaluate(() => new Promise((resolve) =>
    window.__polybotVisualReplayDispatch({ op: "status", params: {} }, resolve)));
  assert.ok(loaded.ok, loaded.error);
  assert.equal(loaded.result.loaded_ghosts, count, "loaded replay count");
  assert.equal(loaded.result.playing, true, "swarm must be moving during benchmark");
  console.log(`${label}: ${count} replays loaded; sampling frames`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${output}/swarm.png` });
  const initial = await page.evaluate(() => window.__controller.backends.gpu.report());
  const frames = await page.evaluate(async () => {
    const values = []; let last = 0; const end = performance.now() + 12000;
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
  });
  const final = await page.evaluate(async () => ({
    gpu: window.__controller.backends.gpu.report(),
    status: await new Promise((resolve) => window.__polybotVisualReplayDispatch({ op: "status", params: {} }, resolve)),
    binds: window.__polybotBenchmarkBinds,
    cars: window.__controller.backends.gpu.report().swarm,
    draws: window.__controller.backends.gpu.report().sceneDrawCalls,
    triangles: window.__controller.backends.gpu.report().sceneTriangles,
    heap: performance.memory?.usedJSHeapSize ?? null,
    physics: window.__player?.getPosition?.()?.toArray?.() ?? null,
  }));
  report.initial = initial;
  report.status = loaded.result;
  report.frames = frames;
  report.final = final;
  report.hardwareAfter = hardware();
  report.errors = errors;
  assert.equal(final.gpu.selection.backend, "sgsr2-compute", "SGSR2 must be active");
  assert.equal(final.cars.sources, 1, "swarm must use one shared renderer source");
  assert.ok(final.cars.colourDraws <= 32, "swarm material groups must remain within the interop limit");
  assert.equal(errors.length, 0, "no browser or shader errors");
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ output, count, scale, frames, swarm: final.cars, gpu: final.gpu.profile, errors }, null, 2));
} finally {
  if (browser) await browser.close();
}
