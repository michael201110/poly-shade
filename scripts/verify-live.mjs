import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { mkdir } from "node:fs/promises";
const output = process.env.TEMP + "/polyshade-0.2.0";
await mkdir(output, { recursive: true });
const report = { presets: {}, comparisons: {}, screenshots: [] };
function difference(a, b, staticRoad = false) {
  a = PNG.sync.read(a);
  b = PNG.sync.read(b);
  assert.equal(a.width, b.width);
  let sum = 0,
    squared = 0,
    changed = 0,
    brightness = 0,
    n = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const x = (i / 4) % a.width,
      y = Math.floor(i / 4 / a.width);
    if (staticRoad && (y < 360 || (x > 490 && x < 800 && y > 420))) continue;
    n += 3;
    let pixel = 0;
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(a.data[i + c] - b.data[i + c]);
      sum += d;
      squared += d * d;
      pixel += d;
      brightness += b.data[i + c];
    }
    if (pixel > 24) changed++;
  }
  return {
    meanAbsolute: sum / n,
    rmse: Math.sqrt(squared / n),
    changedFraction: changed / (n / 3),
    meanBrightness: brightness / n,
  };
}
const browser = await chromium.launch({ channel: "msedge", headless: true });
const renderingErrors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  page.on("console", (m) => {
    if (/PolyShade|Shader Error|WebGLProgram/.test(m.text()))
      console.log(m.type(), m.text());
  });
  page.on("pageerror", (e) => {
    renderingErrors.push(e.message);
    console.log("PAGE ERROR", e.message);
  });
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      /PolyShade|Shader Error|WebGLProgram/.test(m.text())
    )
      renderingErrors.push(m.text());
  });
  await page.route("https://polyshade.test/**", async (route) => {
    const path = new URL(route.request().url()).pathname.slice(1);
    try {
      let body = await readFile(path, "utf8");
      if (path.endsWith(".js"))
        body = body
          .replace(
            "controller = new RenderController",
            "controller = globalThis.__polyShadeController = new RenderController",
          )
          .replace(
            "controller.onRender(renderer, scene, camera);",
            "globalThis.__nativeScene=scene; controller.onRender(renderer, scene, camera);",
          )
          .replace(
            "controller.onFrame(renderer, scene, duration);",
            "(globalThis.__renderSamples ??= []).push(duration); controller.onFrame(renderer, scene, duration); if(globalThis.__captureFrame){globalThis.__canvasPng=renderer.domElement.toDataURL();globalThis.__captureFrame=false;}",
          )
          .replace(
            "instances.set(renderer, { original, wrapper });",
            "globalThis.__polyShadeCapturedRenderer = renderer; instances.set(renderer, { original, wrapper });",
          );
      await route.fulfill({
        body,
        headers: { "access-control-allow-origin": "*" },
        contentType: path.endsWith(".json")
          ? "application/json"
          : "application/javascript",
      });
    } catch {
      await route.fulfill({ status: 404, body: "" });
    }
  });
  await page.addInitScript(() => {
    window.pmlversion = "web";
    localStorage.setItem(
      "polyshade.settings",
      JSON.stringify({
        schemaVersion: 2,
        preset: "cinematic",
        enabled: false,
        overrides: {},
      }),
    );
    localStorage.setItem(
      "polyMods",
      JSON.stringify([
        { base: "https://polyshade.test", version: "latest", loaded: true },
      ]),
    );
  });
  await page.goto(
    "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/index.html",
  );
  await page.waitForFunction(
    () => window.__polyShadeCapturedRenderer?.info.render.frame > 3,
    undefined,
    { timeout: 60000 },
  );
  await page
    .locator("#polyshade-panel button")
    .filter({ hasText: /^Hide$/ })
    .click();
  await page.waitForFunction(
    () =>
      window.__nativeScene?.getObjectByName("Body")?.isMesh &&
      document.body.innerText.includes("Summer 1"),
    undefined,
    { timeout: 60000 },
  );
  const shot = async (name) => {
    const path = output + "/" + name + ".png";
    report.screenshots.push(path);
    await page.evaluate(() => {
      window.__captureFrame = true;
    });
    await page.waitForFunction(() => window.__captureFrame === false);
    const data = await page.evaluate(() => window.__canvasPng);
    const png = Buffer.from(data.split(",")[1], "base64");
    await writeFile(path, png);
    return png;
  };
  await page.waitForTimeout(1000);
  const baseline = await shot("vanilla-before");
  async function sample(name) {
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      window.__renderSamples = [];
      const t = window.__polyShadeController.cinematic?.timer;
      if (t) {
        t.samples = [];
        for (const q of t.pending) t.gl.deleteQuery(q);
        t.pending = [];
      }
    });
    await page.waitForTimeout(2500);
    return page.evaluate(() => {
      const a = window.__renderSamples.slice().sort((a, b) => a - b);
      const c = window.__polyShadeController;
      return {
        frames: a.length,
        cpuAverage: a.reduce((s, v) => s + v, 0) / a.length,
        cpuP95: a[Math.ceil(a.length * 0.95) - 1],
        gpu: c.cinematic?.timer.metrics(),
        capabilities: c.cinematic?.report(),
        materials: c.modifiedMaterials,
      };
    });
  }
  report.presets.vanilla = await sample("vanilla");
  await page
    .locator("#polyshade-panel button")
    .filter({ hasText: /^Show$/ })
    .click();
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press("F7");
  await page.waitForFunction(
    () => window.__polyShadeController?.cinematic?.post?.frames > 3,
  );
  for (const id of ["cinematic-lite", "cinematic", "recording"]) {
    await page.locator("#polyshade-panel select").first().selectOption(id);
    await page.waitForFunction(
      (id) => window.__polyShadeController.getSettings().preset === id,
      id,
    );
    report.presets[id] = await sample(id);
    const result = report.presets[id];
    assert.equal(result.capabilities.active.post, true);
    assert.deepEqual(result.capabilities.failures, {});
    assert.ok(result.materials > 0);
    assert.equal(result.capabilities.active.ao, id !== "cinematic-lite");
    assert.equal(result.capabilities.active.bloom, id !== "cinematic-lite");
    if (id === "recording")
      assert.deepEqual(result.capabilities.active.sceneSize, [1600, 900]);
    const image = await shot(id);
    if (id === "cinematic")
      report.comparisons.enhanced = difference(baseline, image);
  }
  assert.ok(report.comparisons.enhanced.meanAbsolute > 3);
  await page
    .locator("#polyshade-panel select")
    .first()
    .selectOption("cinematic");
  await page.waitForTimeout(1000);
  report.runtime = await page.evaluate(() => {
    const c = window.__polyShadeController;
    window.__oldCinematic = c.cinematic;
    window.__restoreProbe = {
      scene: c.activeScene,
      background: c.sceneState.originalBackground,
      fog: c.sceneState.originalFog,
      environment: c.cinematic.environment.original,
      materials: [...c.sceneState.originalMaterials],
      renderer: c.activeRenderer,
      tone: c.rendererState.originalToneMapping,
      output: c.rendererState.originalOutputColorSpace,
      ratio: c.rendererState.originalPixelRatio,
    };
    return {
      capabilities: c.cinematic.report(),
      inspector: c.sceneState.materialInspector,
      car: (() => {
        const out = [];
        c.activeScene.traverse((o) => {
          if (o.name === "Body" || /Wheel/.test(o.name))
            out.push({
              name: o.name,
              materials: (Array.isArray(o.material)
                ? o.material
                : [o.material]
              ).map((m) => ({
                name: m.name,
                type: m.type,
                roughness: m.roughness,
                metalness: m.metalness,
                envIntensity: m.envMapIntensity,
                defines: m.defines,
              })),
            });
        });
        return out;
      })(),
    };
  });
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press("F7");
  await page.waitForTimeout(500);
  assert.equal(
    await page.evaluate(() => {
      const p = window.__restoreProbe;
      return (
        p.scene.background === p.background &&
        p.scene.fog === p.fog &&
        p.scene.environment === p.environment &&
        p.materials.every(([mesh, m]) => mesh.material === m) &&
        p.renderer.toneMapping === p.tone &&
        p.renderer.outputColorSpace === p.output &&
        p.renderer.getPixelRatio() === p.ratio &&
        window.__oldCinematic.post.pool.targets.size === 0
      );
    }),
    true,
  );
  const restored = await shot("vanilla-restored");
  report.comparisons.restorationFull = difference(baseline, restored);
  report.comparisons.restoration = difference(baseline, restored, true);
  assert.ok(report.comparisons.restoration.meanAbsolute < 0.5);
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press("F7");
  await page.waitForFunction(
    () => window.__polyShadeController.activeScene != null,
  );
  await page.evaluate(() => {
    const c = window.__polyShadeController;
    const direction = c.camera.getWorldDirection(c.camera.position.clone());
    const azimuth =
      ((Math.atan2(direction.x, direction.z) * 180) / Math.PI + 360) % 360;
    c.getSettings().overrides = {
      sunAzimuth: azimuth,
      sunElevation: 3,
      cloudsEnabled: true,
      cloudAmount: 0.4,
      sunRaysEnabled: true,
    };
    c.notifySettingsChanged();
  });
  await page.waitForTimeout(800);
  report.sunRays = await page.evaluate(() => {
    const c = window.__polyShadeController;
    return {
      active: c.cinematic.post.active.sunRays,
      pass: c.cinematic.post.passOrder.includes("sun-rays"),
      failures: c.cinematic.report().failures,
    };
  });
  assert.equal(report.sunRays.pass, true);
  await shot("stylized-sky-sun-rays");
  await page
    .locator("#polyshade-panel select")
    .first()
    .selectOption("cinematic");
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(500);
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.waitForTimeout(500);
  assert.deepEqual(
    await page.evaluate(
      () => window.__polyShadeController.cinematic.post.active.sceneSize,
    ),
    [1024, 640],
  );
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(500);
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(1500);
  await page.keyboard.up("ArrowUp");
  await shot("driving");
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(350);
  report.brakeLights = await page.evaluate(() =>
    window.__polyShadeController.cinematic.brakeLights.report(),
  );
  assert.equal(report.brakeLights.active, true);
  assert.ok(report.brakeLights.lights > 0);
  await shot("brake-lights-on");
  await page.keyboard.up("ArrowDown");
  await page.waitForTimeout(150);
  assert.equal(
    await page.evaluate(
      () => window.__polyShadeController.cinematic.brakeLights.report().active,
    ),
    false,
  );
  await shot("brake-lights-off");
  await page.keyboard.press("r");
  await page.waitForTimeout(500);
  await page.getByText("Next Track", { exact: true }).click();
  await page.waitForTimeout(1500);
  report.trackReload = await page.evaluate(() => {
    const c = window.__polyShadeController;
    return {
      skyCount: c.activeScene.children.filter((o) => o.name === "PolyShade sky")
        .length,
      ownedLights: c.sceneState.ownedLights.size,
      materials: c.modifiedMaterials,
      labels: document.body.innerText.match(/Summer\s*\d+/g),
    };
  });
  assert.equal(report.trackReload.skyCount, 1);
  assert.equal(report.trackReload.ownedLights, 2);
  await shot("summer-2");
  await page.evaluate(() => {
    const pml = window.polyModLoader;
    const key = pml.getFromPolyTrack("P.A.ShadowQuality");
    pml.settingClass.updateSettings([[key, "3"]]);
    window.__polyShadeCapturedRenderer.debug.checkShaderErrors = true;
  });
  await page.waitForFunction(
    () => window.__polyShadeController?.sceneState?.nativeCSM === true,
  );
  await page.waitForTimeout(1500);
  assert.ok(
    await page.evaluate(
      () =>
        window.__polyShadeController.activeScene.children.filter(
          (o) => o.isDirectionalLight && o.intensity > 0,
        ).length > 1,
    ),
  );
  assert.deepEqual(renderingErrors, []);
  report.nativeCSM = await page.evaluate(() => {
    const c = window.__polyShadeController;
    return {
      lightCount: c.nativeWrapper.csm?.lights.length,
      sizes: c.nativeWrapper.csm?.lights.map((l) => l.shadow.mapSize.x),
      failures: c.cinematic.report().failures,
    };
  });
  await shot("native-csm");
  await page
    .locator("#polyshade-panel select")
    .first()
    .selectOption("recording");
  await page.waitForTimeout(1000);
  report.nativeCSMCapture = await page.evaluate(() =>
    window.__polyShadeController.nativeWrapper.csm.lights.map(
      (l) => l.shadow.mapSize.x,
    ),
  );
  assert.deepEqual(report.nativeCSMCapture, [4096, 4096, 2048, 2048]);
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press("F7");
  await page.waitForTimeout(300);
  assert.equal(
    await page.evaluate(() => window.__polyShadeController.activeScene),
    null,
  );
  await page.keyboard.press("F7");
  await page.waitForTimeout(500);
  assert.deepEqual(renderingErrors, []);
  await writeFile(output + "/report.json", JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        presets: Object.fromEntries(
          Object.entries(report.presets).map(([id, r]) => [
            id,
            {
              cpuAverage: r.cpuAverage,
              cpuP95: r.cpuP95,
              gpu: r.gpu,
              active: r.capabilities?.active,
            },
          ]),
        ),
        comparisons: report.comparisons,
        nativeCSM: report.nativeCSM,
        sunRays: report.sunRays,
        brakeLights: report.brakeLights,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: native cascaded shadow mode preserved without shader errors.",
  );
  console.log(
    "PASS: actual PML renderer captured; enhanced frames, materials, shadows, disable and re-enable verified.",
  );
} finally {
  await browser.close();
}
