import {
  openUpscalingHarness,
  resetHarnessGame,
} from "./upscaling-harness.mjs";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { browser, page, errors } = await openUpscalingHarness();
const output = `${process.env.TEMP}/polyshade-webgpu`;
await mkdir(output, { recursive: true });
const report = {
  browser: browser.version(),
  date: new Date().toISOString(),
  scales: [],
  views: [],
};
try {
  async function configure(o) {
    await page.evaluate((o) => {
      const c = window.__controller;
      const s = c.getSettings();
      s.overrides = {
        renderBackend: "webgpu",
        upscaling: "sgsr2-compute",
        upscaleQuality: "quality",
        ...o,
      };
      c.notifySettingsChanged();
    }, o);
  }
  await configure({});
  await page.waitForFunction(
    () =>
      window.__controller.backends.active === "WebGPU" ||
      window.__controller.backends.failure,
    undefined,
    { timeout: 60000 },
  );
  report.unsupportedCallback = await page.evaluate(
    () => window.__controller.backends.gpu.scene?.unsupportedCallback,
  );
  assert.equal(
    await page.evaluate(() => window.__controller.backends.failure),
    undefined,
    JSON.stringify(report.unsupportedCallback),
  );
  await page.waitForTimeout(1000);
  report.device = await page.evaluate(() => {
    const g = window.__controller.backends.gpu;
    return {
      realDevice: g.device.constructor.name,
      backend: g.renderer.backend.constructor.name,
      adapter: Object.fromEntries(
        ["vendor", "architecture", "device", "description"].map((k) => [
          k,
          g.device.adapterInfo?.[k] ?? null,
        ]),
      ),
      features: [...g.device.features],
    };
  });
  assert.equal(report.device.realDevice, "GPUDevice");
  assert.equal(report.device.backend, "WebGPUBackend");
  assert.equal(
    await page.evaluate(() => !!window.__controller.cinematic.post),
    false,
    "there is no legacy WebGL post pipeline",
  );
  const glFrames = await page.evaluate(
    () => window.__controller.activeRenderer.info.render.frame,
  );
  for (const scale of [1, 0.77, 0.67, 0.59, 0.5]) {
    await configure({
      upscaleQuality: "custom",
      upscaleCustomScale: scale,
      debugProfile: true,
    });
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() =>
      window.__controller.backends.gpu.report(),
    );
    report.scales.push(r);
    assert.equal(r.selection.backend, "sgsr2-compute");
    assert.deepEqual(r.internal, [
      Math.round(1280 * scale),
      Math.round(720 * scale),
    ]);
    assert.deepEqual(r.output, [1280, 720]);
    assert.ok(r.temporal.valid);
    assert.ok(r.compute.dispatches > 0);
    await page.screenshot({
      path: `${output}/compute-${Math.round(scale * 100)}.png`,
    });
  }
  assert.equal(
    await page.evaluate(
      () => window.__controller.activeRenderer.info.render.frame,
    ),
    glFrames,
    "Main WebGL renderer does not draw while WebGPU is active",
  );
  await configure({ upscaling:"native", upscaleDebugView:"final" });
  await page.waitForTimeout(400);
  report.nativeRetirement = await page.evaluate(() => {
    const g=window.__controller.backends.gpu;
    return {resources:g.resources.report(),history:g.compute.previousHistory,
      queue:g.frameQueue.report(),dispatches:g.compute.dispatches};
  });
  assert.ok(report.nativeRetirement.resources.every(r=>!r.name.startsWith('sgsr-')),
    'Native retires unused full-output reconstruction targets');
  assert.equal(report.nativeRetirement.history,null,'no destroyed history remains bound');
  assert.ok(report.nativeRetirement.queue.peak<=2,'GPU admission remains bounded');
  await configure({});
  await page.waitForFunction(previous=>{
    const g=window.__controller.backends.gpu;
    return g.compute.dispatches>previous&&g.temporal.valid;
  },report.nativeRetirement.dispatches);
  for (const view of [
    "static-velocity",
    "car-velocity",
    "combined-velocity",
    "depth",
    "jitter",
    "history-validity",
    "history-rejection",
    "history",
    "low-resolution",
    "native",
    "source-vs-final",
  ]) {
    await configure({ upscaleDebugView: view });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/debug-${view}.png` });
    report.views.push(view);
  }
  for (const preset of [
    "clear-day",
    "overcast",
    "cinematic-lite",
    "cinematic",
    "recording",
  ]) {
    await page.locator("#polyshade-panel select").first().selectOption(preset);
    await configure({});
    await page.waitForTimeout(800);
    assert.equal(
      await page.evaluate(() => window.__controller.backends.active),
      "WebGPU",
    );
    await page.screenshot({ path: `${output}/preset-${preset}.png` });
  }
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.waitForTimeout(500);
  report.resize = await page.evaluate(() =>
    window.__controller.backends.gpu.report(),
  );
  assert.deepEqual(report.resize.output, [1024, 640]);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(500);
  await configure({ upscaling: "auto" });
  await page.waitForTimeout(500);
  assert.equal(
    await page.evaluate(
      () => window.__controller.backends.gpu.selection.backend,
    ),
    "sgsr2-compute",
  );
  await configure({ postEnabled: false });
  await page.waitForTimeout(300);
  report.postDisabled = await page.evaluate(
    () => window.__controller.backends.gpu.selection,
  );
  assert.equal(report.postDisabled.backend, "native");
  assert.equal(report.postDisabled.requested, "sgsr2-compute");
  await configure({ upscaling: "auto" });
  await page.waitForTimeout(300);
  await configure({ debugProfile: false });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.__gpuMapCalls = 0;
    window.__originalGPUMap = GPUBuffer.prototype.mapAsync;
    GPUBuffer.prototype.mapAsync = function (...args) {
      window.__gpuMapCalls++;
      return window.__originalGPUMap.apply(this, args);
    };
  });
  await page.waitForTimeout(700);
  report.normalFrameReadbacks = await page.evaluate(() => {
    GPUBuffer.prototype.mapAsync = window.__originalGPUMap;
    return window.__gpuMapCalls;
  });
  assert.equal(
    report.normalFrameReadbacks,
    0,
    "profiling disabled performs no GPU readbacks",
  );
  await page
    .locator("#polyshade-panel button")
    .filter({ hasText: /^Hide$/ })
    .click();
  await page.getByText("Next Track", { exact: true }).click();
  await page.getByText("Exit", { exact: true }).click();
  await page.getByText("Summer 2", { exact: true }).click();
  let replayAvailable = true;
  try {
    await page
      .getByText("SpeedySebas", { exact: true })
      .waitFor({ timeout: 10000 });
  } catch {
    replayAvailable = false;
    report.replayUnavailable =
      "Public leaderboard did not supply SpeedySebas; verifying moving offline Summer 1 instead.";
  }
  if (replayAvailable)
    await page.getByText("SpeedySebas", { exact: true }).click();
  await page.evaluate(() => {
    const p = window.polyModLoader;
    p.settingClass.updateSettings([
      [p.getFromPolyTrack("P.A.ShadowQuality"), "3"],
    ]);
  });
  if (replayAvailable)
    await page.getByRole("button", { name: "Watch", exact: true }).click();
  else await resetHarnessGame(page);
  await page.waitForFunction(
    () => window.__controller.activeScene?.getObjectByName("Body"),
    undefined,
    { timeout: 60000 },
  );
  await configure({});
  await page.waitForFunction(
    () =>
      window.__controller.backends.active === "WebGPU" &&
      window.__controller.backends.gpu.motion.entries.size > 0,
    undefined,
    { timeout: 60000 },
  );
  await page.waitForTimeout(500);
  if (!replayAvailable) await page.keyboard.down("w");
  report.movingSource = replayAvailable ? "Summer 2 #1 SpeedySebas replay" : "offline Summer 1 live driving";
  report.replay = [];
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${output}/${replayAvailable ? "replay" : "offline-driving"}-compute-${i}.png` });
    report.replay.push(
      await page.evaluate(() => {
        const g = window.__controller.backends.gpu;
        return {
          active: window.__controller.backends.active,
          cars: g.motion.entries.size,
          history: g.temporal.report(),
          shadows: g.shadows.report(),
        };
      }),
    );
  }
  assert.ok(
    report.replay.every((r) => r.active === "WebGPU" && r.cars > 0),
    "real Summer 2 replay stays on WebGPU with car velocity",
  );
  if (!replayAvailable) await page.keyboard.up("w");
  await page.evaluate(() => {
    window.__freezeGame = true;
  });
  await page.waitForTimeout(100);
  await page.route("https://polyshade.test/temporal-gpu.js", async (r) =>
    r.fulfill({
      body: await readFile("scripts/webgpu-temporal-checks.js", "utf8"),
      contentType: "application/javascript",
    }),
  );
  report.temporal = await page.evaluate(async () => {
    const { verifyTemporalGPU } = await import(
      "https://polyshade.test/temporal-gpu.js"
    );
    return verifyTemporalGPU(window.__controller);
  });
  const t = report.temporal;
  assert.ok(
    Math.abs(t.minLerp - 0.5) < 1e-6,
    "stationary history strength is preserved",
  );
  assert.ok(
    t.markingAfter.variance <= t.markingBefore.variance * 1.2 + 0.00001,
    "local car rejection does not add static marking shimmer",
  );
  assert.equal(t.spawnHistoryValid, true);
  assert.equal(t.swarmEntries, 160);
  assert.ok(
    t.visibleMovingCars >= 120,
    "distant swarm cars provide visible independent motion",
  );
  assert.ok(
    t.stationary.every((v) => Math.hypot(v[0], v[1]) < 0.0002),
    "jitter-only motion cancels",
  );
  assert.ok(t.stationary[0][2] > 0.5, "car coverage");
  assert.equal(t.zoom.valid,true,'smooth FOV motion retains temporal history');
  assert.ok(Math.abs(t.zoom.expectedX)>.005,'zoom probe must have measurable reprojection');
  assert.ok(Math.abs(t.zoom.motion[0]-t.zoom.expectedX)<.0002,'FOV motion reprojects using the previous rendered focal length');
  assert.equal(t.rejectionValid, true);
  assert.equal(t.revealed[0][0], 1, "newly revealed road rejects car history");
  assert.equal(t.revealed[1][0], 0, "static road keeps temporal history");
  assert.ok(Math.abs(t.cameraMotion[0][0]) > 0.005);
  assert.ok(
    Math.hypot(...t.follow[0].slice(0, 2)) < 0.0002,
    "camera-followed car has zero relative motion",
  );
  assert.ok(Math.abs(t.follow[1][0]) > 0.005, "environment still moves");
  assert.equal(t.cut.valid, false);
  assert.ok(t.debug.valid);
  assert.equal(t.debug.phaseAfter, t.debug.phaseBefore + 1);
  report.profile = await page.evaluate(() =>
    window.__controller.backends.gpu.profiler.report(),
  );
  assert.deepEqual(errors, []);
  // Device loss stops enhancement, with an explicit notice and no GL fallback.
  await page.evaluate(() => {
    const c = window.__controller;
    const gpu = c.backends.gpu;
    gpu.device.destroy();
  });
  await page.waitForTimeout(100);
  report.deviceLoss = await page.evaluate(() => {
    const c = window.__controller;
    c.activeRenderer.render(c.activeScene, c.camera);
    return {
      failure: c.backends.failure,
      active: c.backends.active,
      opacity: c.activeRenderer.domElement.style.opacity,
      hidden: c.backends.gpu.canvas.hidden,
    };
  });
  assert.equal(report.deviceLoss.active, "WebGPU unavailable");
  assert.equal(report.deviceLoss.hidden, true);
  assert.notEqual(report.deviceLoss.opacity, "0");
  assert.ok(await page.locator('#polyshade-renderer-error').isVisible());
  const stoppedFrame = await page.evaluate(() => window.__controller.activeRenderer.info.render.frame);
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => window.__controller.activeRenderer.info.render.frame), stoppedFrame, 'failure never draws a WebGL fallback');
  await page.keyboard.press('Home');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#polyshade-renderer-error').count(), 0);
  assert.equal(await page.evaluate(()=>window.__controller.cinematic), null);
  report.expectedDeviceLossDiagnostics = errors.filter(
    (e) =>
      (e.includes("WebGPU Device Lost:") && e.includes("Device was destroyed.")) ||
      (e.includes("[PolyShade] WebGPU unavailable; enhanced rendering stopped.") &&
        e.includes("WebGPU device lost: destroyed")),
  );
  for (let i = errors.length - 1; i >= 0; i--)
    if (report.expectedDeviceLossDiagnostics.includes(errors[i]))
      errors.splice(i, 1);
  assert.deepEqual(errors, []);
  report.errors = errors;
  console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile(
    `${output}/verification.json`,
    JSON.stringify({ ...report, errors }, null, 2),
  );
  await browser.close();
}
