import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { mkdir } from "node:fs/promises";
const output =
  process.env.TEMP + (process.env.POLYSHADE_OUTPUT ?? "/polyshade-0.2.4");
await mkdir(output, { recursive: true });
const report = { presets: {}, comparisons: {}, screenshots: [] };
function imageStats(buffer) {
  const p = PNG.sync.read(buffer),
    l = [];
  let squared = 0;
  for (let i = 0; i < p.data.length; i += 4) {
    const v =
      (0.2126 * p.data[i] + 0.7152 * p.data[i + 1] + 0.0722 * p.data[i + 2]) /
      255;
    l.push(v);
    squared += v * v;
  }
  l.sort((a, b) => a - b);
  const q = (p) => l[Math.floor((l.length - 1) * p)];
  return {
    mean: l.reduce((s, v) => s + v, 0) / l.length,
    rms: Math.sqrt(squared / l.length),
    p01: q(0.01),
    p10: q(0.1),
    p50: q(0.5),
    p90: q(0.9),
    p99: q(0.99),
    contrast: q(0.9) - q(0.1),
  };
}
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
report.environment = {
  browser: browser.version(),
  platform: process.platform,
  architecture: process.arch,
  viewport: [1280, 720],
  release: process.env.POLYSHADE_RELEASE ?? "0.2.4",
  date: new Date().toISOString(),
};
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
      /PolyShade|Shader Error|WebGLProgram|GL_INVALID|WebGL.*INVALID/.test(
        m.text(),
      )
    )
      renderingErrors.push(m.text());
  });
  await page.route("https://polyshade.test/**", async (route) => {
    const path = new URL(route.request().url()).pathname.slice(1);
    try {
      let body = await readFile(path, "utf8");
      if (path === "manifest.json" && process.env.POLYSHADE_RELEASE) {
        const manifest = JSON.parse(body);
        manifest.latest["0.6.3"] = process.env.POLYSHADE_RELEASE;
        body = JSON.stringify(manifest);
      }
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
            "(globalThis.__renderSamples ??= []).push(duration); controller.onFrame(renderer, scene, duration); if(globalThis.__captureFrame && (!globalThis.__captureBraking || controller.cinematic?.brakeLights.report().active)){globalThis.__canvasPng=renderer.domElement.toDataURL();globalThis.__capturedBrakeState=controller.cinematic?.brakeLights.report();globalThis.__captureFrame=false;}",
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
  const shot = async (name, braking = false) => {
    const path = output + "/" + name + ".png";
    report.screenshots.push(path);
    await page.evaluate((braking) => {
      window.__captureBraking = braking;
      window.__captureFrame = true;
    }, braking);
    await page.waitForFunction(() => window.__captureFrame === false);
    const data = await page.evaluate(() => window.__canvasPng);
    const png = Buffer.from(data.split(",")[1], "base64");
    await writeFile(path, png);
    (report.imageStats ??= {})[name] = imageStats(png);
    return png;
  };
  await page.waitForTimeout(1000);
  const baseline = await shot("vanilla-before");
  await page.evaluate(() => {
    const r = window.__polyShadeCapturedRenderer,
      g = r.getContext(),
      ext = g.getExtension("EXT_disjoint_timer_query_webgl2");
    if (!ext) return;
    const original = r.render,
      pending = [],
      samples = [];
    let frame = 0;
    window.__vanillaGpu = {
      samples,
      pending,
      stop() {
        r.render = original;
        for (const q of pending) g.deleteQuery(q);
        pending.length = 0;
      },
    };
    r.render = function (...args) {
      while (
        pending.length &&
        g.getQueryParameter(pending[0], g.QUERY_RESULT_AVAILABLE)
      ) {
        const q = pending.shift();
        if (!g.getParameter(ext.GPU_DISJOINT_EXT))
          samples.push(g.getQueryParameter(q, g.QUERY_RESULT) / 1e6);
        g.deleteQuery(q);
      }
      let q;
      if (
        frame++ % 12 === 0 &&
        pending.length < 8 &&
        !g.getQuery(ext.TIME_ELAPSED_EXT, g.CURRENT_QUERY)
      ) {
        q = g.createQuery();
        g.beginQuery(ext.TIME_ELAPSED_EXT, q);
      }
      try {
        return original.apply(this, args);
      } finally {
        if (q) {
          g.endQuery(ext.TIME_ELAPSED_EXT);
          pending.push(q);
        }
      }
    };
  });
  async function sample(name) {
    await page.waitForTimeout(process.env.POLYSHADE_BENCHMARK ? 2000 : 1200);
    await page.evaluate(() => {
      window.__renderSamples = [];
      if (window.__vanillaGpu) window.__vanillaGpu.samples.length = 0;
      const t = window.__polyShadeController.cinematic?.timer;
      if (t) {
        t.samples = [];
        for (const q of t.pending) t.gl.deleteQuery(q);
        t.pending = [];
      }
    });
    await page.waitForTimeout(process.env.POLYSHADE_BENCHMARK ? 6000 : 2500);
    return page.evaluate(() => {
      const a = window.__renderSamples.slice().sort((a, b) => a - b);
      const c = window.__polyShadeController;
      const v = window.__vanillaGpu?.samples?.slice().sort((a, b) => a - b);
      return {
        frames: a.length,
        shadowSizes: [...(c.sceneState?.ownedLights ?? [])]
          .filter((l) => l.isDirectionalLight)
          .map((l) => l.shadow.mapSize.x),
        cpuAverage: a.reduce((s, v) => s + v, 0) / a.length,
        cpuP95: a[Math.ceil(a.length * 0.95) - 1],
        gpu:
          c.cinematic?.timer.metrics() ??
          (v?.length
            ? {
                average: v.reduce((s, x) => s + x, 0) / v.length,
                p95: v[Math.ceil(v.length * 0.95) - 1],
                samples: v.length,
              }
            : null),
        capabilities: c.cinematic?.report(),
        materials: c.modifiedMaterials,
      };
    });
  }
  report.presets.vanilla = await sample("vanilla");
  await page.evaluate(() => {
    window.__vanillaGpu?.stop();
    delete window.__vanillaGpu;
  });
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
      assert.deepEqual(result.capabilities.active.sceneSize, [1280, 720]);
    const image = await shot(id);
    if (id === "cinematic")
      report.comparisons.enhanced = difference(baseline, image);
  }
  assert.ok(report.comparisons.enhanced.meanAbsolute > 3);
  report.shadowArtifactIsolation = {};
  report.shadowState = await page.evaluate(() => {
    const shadow = window.__polyShadeController.sceneState.sun.shadow;
    return { softness: shadow.radius, strength: shadow.intensity };
  });
  assert.deepEqual(report.shadowState, { softness: 3, strength: 0.68 });
  await page.evaluate(() => {
    const c = window.__polyShadeController;
    Object.assign(c.getSettings().overrides, { shadowQuality: "off" });
    c.notifySettingsChanged();
  });
  await page.waitForTimeout(300);
  report.shadowFilter = await page.evaluate(() => {
    const c = window.__polyShadeController;
    return {
      active: c.activeRenderer.shadowMap.type,
      softPCF: c.three.PCFSoftShadowMap,
    };
  });
  assert.equal(report.shadowFilter.active, report.shadowFilter.softPCF);
  await shot("static-shadow-off");
  await page.evaluate(() => {
    const c = window.__polyShadeController;
    Object.assign(c.getSettings().overrides, {
      shadowQuality: "high",
      shadowBias: 0.0005,
    });
    c.notifySettingsChanged();
  });
  await page.waitForTimeout(300);
  await shot("static-shadow-positive-bias");
  await page.evaluate(() => {
    const c = window.__polyShadeController;
    Object.assign(c.getSettings().overrides, {
      shadowBias: -0.0001,
      shadowSoftness: 4,
      shadowStrength: 0.68,
    });
    c.notifySettingsChanged();
  });
  await page.waitForTimeout(300);
  await shot("static-shadow-softened");
  await page.evaluate(() => {
    const c = window.__polyShadeController;
    Object.assign(c.getSettings().overrides, {
      shadowBias: -0.0001,
      postEnabled: false,
    });
    c.notifySettingsChanged();
  });
  await page.waitForTimeout(300);
  await shot("static-post-off");
  await page.evaluate(() => {
    const c = window.__polyShadeController;
    for (const key of [
      "shadowQuality",
      "shadowBias",
      "shadowSoftness",
      "shadowStrength",
      "postEnabled",
    ])
      delete c.getSettings().overrides[key];
    c.notifySettingsChanged();
  });
  await page.waitForTimeout(300);
  if (process.env.POLYSHADE_BENCHMARK) {
    report.opticsCost = {};
    if (
      !process.env.POLYSHADE_RELEASE ||
      process.env.POLYSHADE_RELEASE === "0.2.1"
    )
      for (const id of ["cinematic", "recording"]) {
        await page.locator("#polyshade-panel select").first().selectOption(id);
        await page.evaluate(() => {
          const c = window.__polyShadeController,
            d = c.camera.getWorldDirection(c.camera.position.clone());
          Object.assign(c.getSettings().overrides, {
            sunAzimuth: ((Math.atan2(d.x, d.z) * 180) / Math.PI + 360) % 360,
            sunElevation: 2,
          });
          c.notifySettingsChanged();
        });
        report.opticsCost[id + "-on"] = await sample(id + "-on");
        await shot(id + "-optics-on");
        await page.evaluate(() => {
          const c = window.__polyShadeController;
          Object.assign(c.getSettings().overrides, {
            lensFlareEnabled: false,
            sunRaysEnabled: false,
          });
          c.notifySettingsChanged();
        });
        report.opticsCost[id + "-off"] = await sample(id + "-off");
        await shot(id + "-optics-off");
      }
    if (process.env.POLYSHADE_RELEASE !== "0.2.0") {
      report.volumetricCost = {};
      for (const samples of [4, 8, 12]) {
        await page.evaluate((samples) => {
          const c = window.__polyShadeController;
          Object.assign(c.getSettings().overrides, {
            volumetricEnabled: true,
            volumetricSamples: samples,
            lensFlareEnabled: false,
            sunRaysEnabled: false,
          });
          c.notifySettingsChanged();
        }, samples);
        report.volumetricCost["samples-" + samples] = await sample(
          "volume-" + samples,
        );
        await shot("volume-" + samples);
      }
      await page.evaluate(() => {
        const c = window.__polyShadeController;
        c.getSettings().overrides.volumetricEnabled = false;
        c.notifySettingsChanged();
      });
      report.volumetricCost.off = await sample("volume-off");
      await shot("volume-off");
    }
    await writeFile(
      output + "/benchmark.json",
      JSON.stringify(report, null, 2),
    );
    console.log("PASS benchmark", output);
    await browser.close();
    process.exit(0);
  }
  if (process.env.POLYSHADE_EXPERIMENT) {
    report.experiments = {};
    const configurations = [
      ["golden-msaa4", "cinematic", { sceneSamples: "4" }],
      ["golden-msaa2", "cinematic", { sceneSamples: "2" }],
      ["golden-msaa0", "cinematic", { sceneSamples: "0" }],
      ["capture-msaa4", "recording", { sceneSamples: "4" }],
      ["capture-msaa2", "recording", { sceneSamples: "2" }],
      ["capture-msaa0", "recording", { sceneSamples: "0" }],
      [
        "lighting-only",
        "cinematic",
        {
          environmentEnabled: false,
          atmosphereEnabled: false,
          aoEnabled: false,
          bloomEnabled: false,
          sunRaysEnabled: false,
          gradeEnabled: false,
        },
      ],
      [
        "plus-environment",
        "cinematic",
        {
          atmosphereEnabled: false,
          aoEnabled: false,
          bloomEnabled: false,
          sunRaysEnabled: false,
          gradeEnabled: false,
        },
      ],
      [
        "plus-atmosphere",
        "cinematic",
        {
          aoEnabled: false,
          bloomEnabled: false,
          sunRaysEnabled: false,
          gradeEnabled: false,
        },
      ],
      [
        "plus-ao",
        "cinematic",
        { bloomEnabled: false, sunRaysEnabled: false, gradeEnabled: false },
      ],
      [
        "plus-bloom",
        "cinematic",
        { sunRaysEnabled: false, gradeEnabled: false },
      ],
      ["plus-rays", "cinematic", { gradeEnabled: false }],
      [
        "calibration-a",
        "cinematic",
        {
          exposure: 1.04,
          ambientIntensity: 0.8,
          contrast: 1.045,
          shadowLift: 0.004,
          blackLevel: 0.003,
          atmosphereStrength: 0.13,
          atmosphereStart: 80,
        },
      ],
      [
        "calibration-b",
        "cinematic",
        {
          exposure: 1.04,
          ambientIntensity: 0.82,
          contrast: 1.035,
          shadowLift: 0.006,
          blackLevel: 0.003,
          atmosphereStrength: 0.14,
          atmosphereStart: 75,
        },
      ],
    ];
    for (const [name, id, overrides] of configurations) {
      await page.locator("#polyshade-panel select").first().selectOption(id);
      await page.evaluate((overrides) => {
        const c = window.__polyShadeController;
        Object.assign(c.getSettings().overrides, overrides);
        c.notifySettingsChanged();
      }, overrides);
      report.experiments[name] = await sample(name);
      await shot(name);
    }
    await writeFile(
      output + "/experiments.json",
      JSON.stringify(report, null, 2),
    );
    await browser.close();
    process.exit(0);
  }
  if (process.env.POLYSHADE_PROFILE) {
    report.profiles = {};
    for (const id of ["cinematic-lite", "cinematic", "recording"]) {
      await page.locator("#polyshade-panel select").first().selectOption(id);
      await page.evaluate(() => {
        const c = window.__polyShadeController;
        c.getSettings().overrides.debugProfile = true;
        c.notifySettingsChanged();
      });
      await page.waitForTimeout(5500);
      report.profiles[id] = await page.evaluate(() =>
        window.__polyShadeController.cinematic.report(),
      );
    }
    await writeFile(output + "/profile.json", JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report.profiles, null, 2));
    process.exitCode = 0;
    await browser.close();
    // Keep the regular regression route independent of diagnostic timings.
    process.exit(0);
  }
  await page
    .locator("#polyshade-panel select")
    .first()
    .selectOption("cinematic");
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(500);
  await page.keyboard.up("ArrowUp");
  await shot("slow-brake-off");
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(200);
  assert.equal(
    await page.evaluate(
      () => window.__polyShadeController.cinematic.brakeLights.report().active,
    ),
    true,
  );
  await shot("slow-brake-on");
  await page.keyboard.up("ArrowDown");
  await page.keyboard.press("r");
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
      volumetricEnabled: true,
    };
    c.notifySettingsChanged();
  });
  await page.waitForTimeout(800);
  report.sunRays = await page.evaluate(() => {
    const c = window.__polyShadeController;
    return {
      active: c.cinematic.post.active.sunRays,
      pass: c.cinematic.post.passOrder.includes("sun-rays"),
      target: c.cinematic
        .report()
        .resources.targets.find((target) => target.name === "sun-rays"),
      failures: c.cinematic.report().failures,
    };
  });
  assert.deepEqual(report.sunRays.failures, {});
  await shot("stylized-sky-sun-rays");
  await page.evaluate(() => {
    const c = window.__polyShadeController;
    c.getSettings().overrides.debugView = "sun-rays";
    c.notifySettingsChanged();
  });
  await page.waitForTimeout(250);
  await shot("debug-sun-rays");
  report.sunRays.target = await page.evaluate(() =>
    window.__polyShadeController.cinematic
      .report()
      .resources.targets.find((target) => target.name === "sun-rays"),
  );
  assert.deepEqual(
    [report.sunRays.target.width, report.sunRays.target.height],
    [640, 360],
  );
  await page.evaluate(() => {
    const c = window.__polyShadeController;
    c.getSettings().overrides.debugView = "final";
    c.notifySettingsChanged();
  });
  report.optics = {};
  const frontAzimuth = await page.evaluate(
    () => window.__polyShadeController.getSettings().overrides.sunAzimuth,
  );
  for (const [name, elevation, offset] of [
    ["sun-visible", 12, 0],
    ["low-sun", 2, 0],
    ["open-sky", 35, 0],
    ["sun-edge", 12, 45],
    ["sun-behind", 20, 180],
  ]) {
    await page.evaluate(
      ({ elevation, azimuth }) => {
        const c = window.__polyShadeController;
        Object.assign(c.getSettings().overrides, {
          sunElevation: elevation,
          sunAzimuth: azimuth,
        });
        c.notifySettingsChanged();
      },
      { elevation, azimuth: (frontAzimuth + offset) % 360 },
    );
    await page.waitForTimeout(500);
    report.optics[name] = await page.evaluate(
      () => window.__polyShadeController.cinematic.post.active,
    );
    if (name === "sun-edge")
      assert.ok(
        Math.min(
          report.optics[name].sunUv[0],
          1 - report.optics[name].sunUv[0],
        ) < 0.15,
        "edge case projects close to a horizontal screen edge",
      );
    await shot(name);
  }
  assert.equal(report.optics["sun-behind"].sunRays, false);
  assert.equal(report.optics["sun-behind"].lensFlare, false);
  assert.equal(report.optics["sun-behind"].volumetric, false);
  // Keep the shipped cloud art intact while moving the sun through its
  // projected coverage. Capture a real cloud attenuation case for the report.
  for (const offset of [30, -30, 20, -20, 10, -10, 0, 40, -40, 25, -25]) {
    await page.evaluate(
      ({ azimuth }) => {
        const c = window.__polyShadeController;
        Object.assign(c.getSettings().overrides, {
          sunElevation: 12,
          sunAzimuth: azimuth,
          cloudsEnabled: true,
          cloudAmount: 0.4,
        });
        c.notifySettingsChanged();
      },
      { azimuth: (frontAzimuth + offset + 360) % 360 },
    );
    await page.waitForTimeout(300);
    const a = await page.evaluate(
      () => window.__polyShadeController.cinematic.post.active,
    );
    if (
      a.sunUv[0] > 0 &&
      a.sunUv[0] < 1 &&
      a.sunUv[1] > 0 &&
      a.sunUv[1] < 1 &&
      a.sunClear > 0.1 &&
      a.cloudTransmission < 0.8
    ) {
      report.optics["sun-through-clouds"] = a;
      await shot("sun-through-clouds");
      break;
    }
  }
  assert.ok(
    report.optics["sun-through-clouds"],
    "find a live cloud attenuating the on-screen sun",
  );
  // Find the actual track/mountain silhouette in this live camera. No depth
  // mock or synthetic occluder is used for these visibility cases.
  for (let elevation = 0; elevation <= 5; elevation += 0.25) {
    await page.evaluate(
      ({ elevation, azimuth }) => {
        const c = window.__polyShadeController;
        Object.assign(c.getSettings().overrides, {
          sunElevation: elevation,
          sunAzimuth: azimuth,
        });
        c.notifySettingsChanged();
      },
      { elevation, azimuth: frontAzimuth },
    );
    await page.waitForTimeout(220);
    const a = await page.evaluate(
      () => window.__polyShadeController.cinematic.post.active,
    );
    if (a.sunClear < 0.01 && !report.optics["sun-occluded"]) {
      report.optics["sun-occluded"] = a;
      await shot("sun-occluded");
    }
    if (
      a.sunPartial > 0.1 &&
      a.sunPartial < 0.99 &&
      !report.optics["sun-partial"]
    ) {
      report.optics["sun-partial"] = a;
      await shot("sun-partial");
    }
    if (report.optics["sun-occluded"] && report.optics["sun-partial"]) break;
  }
  assert.ok(
    report.optics["sun-occluded"] && report.optics["sun-partial"],
    "find real silhouette occlusion cases",
  );
  assert.equal(report.optics["sun-occluded"].volumetric, false);
  assert.equal(report.optics["sun-partial"].volumetric, true);
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
  await page
    .locator("#polyshade-panel select")
    .first()
    .selectOption("recording");
  await page.evaluate(() => {
    const c = window.__polyShadeController,
      d = c.camera.getWorldDirection(c.camera.position.clone());
    Object.assign(c.getSettings().overrides, {
      sunAzimuth: ((Math.atan2(d.x, d.z) * 180) / Math.PI + 360) % 360,
      sunElevation: 2,
    });
    c.notifySettingsChanged();
    document.activeElement?.blur();
  });
  await page.waitForTimeout(350);
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(1500);
  await page.keyboard.up("ArrowUp");
  await shot("driving");
  await page.keyboard.down("ArrowDown");
  await shot("brake-lights-on", true);
  report.brakeLights = await page.evaluate(() => window.__capturedBrakeState);
  if (!report.brakeLights.active)
    console.log(
      "BRAKE_DIAGNOSTIC",
      await page.evaluate(() => {
        const c = window.__polyShadeController;
        return {
          cars: [...c.cinematic.brakeLights.cars].map(([m, v]) => ({
            emissive: v.material.emissive.toArray(),
            position: m.getWorldPosition(c.camera.position.clone()).toArray(),
            lights: v.lights.map((l) => ({
              visible: l.visible,
              intensity: l.intensity,
            })),
          })),
          camera: c.camera.position.toArray(),
          hud: document.body.innerText.slice(-700),
        };
      }),
    );
  assert.equal(report.brakeLights.active, true);
  assert.ok(report.brakeLights.lights > 0);
  assert.equal(report.brakeLights.type, "SpotLight");
  report.brakeGeometry = await page.evaluate(() => {
    const c = window.__polyShadeController;
    return [...c.cinematic.brakeLights.cars].map(([mesh, car]) => ({
      name: mesh.name,
      lights: car.lights.map((l) => ({
        position: l.position.toArray(),
        target: l.target.position.toArray(),
        angle: l.angle,
        penumbra: l.penumbra,
        shadow: l.castShadow,
        localTarget: l.target.parent === mesh,
      })),
    }));
  });
  await page.keyboard.up("ArrowDown");
  await page.waitForTimeout(150);
  assert.equal(
    await page.evaluate(
      () => window.__polyShadeController.cinematic.brakeLights.report().active,
    ),
    false,
  );
  await shot("brake-lights-off");
  const beforeCamera = await page.evaluate(
    () => window.__polyShadeController.camera.uuid,
  );
  await page.keyboard.press("c");
  await page.waitForTimeout(250);
  report.cameraSwitch = await page.evaluate(
    () => window.__polyShadeController.camera.uuid,
  );
  assert.notEqual(report.cameraSwitch, beforeCamera);
  await shot("cockpit");
  await page.keyboard.press("c");
  await page.waitForTimeout(250);
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(3000);
  await page.keyboard.up("ArrowUp");
  await shot("high-speed");
  report.volumetricDriving = await page.evaluate(
    () => window.__polyShadeController.cinematic.post.active,
  );
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
  report.transitions = [];
  for (let cycle = 0; cycle < 3; cycle++)
    for (const id of [
      "cinematic-lite",
      "cinematic",
      "recording",
      "vanilla",
      "cinematic",
      "recording",
    ]) {
      await page.locator("#polyshade-panel select").first().selectOption(id);
      await page.waitForTimeout(180);
      report.transitions.push(
        await page.evaluate(() => {
          const c = window.__polyShadeController;
          let skies = 0,
            lights = 0,
            targets = 0;
          window.__nativeScene.traverse((o) => {
            if (o.name === "PolyShade sky") skies++;
            if (o.name === "PolyShade brake spill") lights++;
            if (o.name === "PolyShade brake target") targets++;
          });
          return {
            preset: c.getSettings().preset,
            resources: c.cinematic?.report().resources,
            skies,
            lights,
            brakeTargets: targets,
            materials: c.modifiedMaterials,
            memory: { ...window.__polyShadeCapturedRenderer.info.memory },
          };
        }),
      );
    }
  for (const row of report.transitions) {
    assert.ok(row.skies <= 1);
    assert.ok(row.lights <= 6);
    assert.equal(row.lights, row.brakeTargets);
    assert.ok((row.resources?.live ?? 0) <= 9);
    if (row.preset === "vanilla")
      assert.equal(row.skies + row.lights + row.brakeTargets, 0);
  }
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press("F7");
    await page.waitForTimeout(120);
    assert.equal(
      await page.evaluate(() => window.__polyShadeController.activeScene),
      null,
    );
    const count = await page.evaluate(() => {
      let n = 0;
      window.__nativeScene.traverse((o) => {
        if (
          o.name === "PolyShade brake spill" ||
          o.name === "PolyShade brake target"
        )
          n++;
      });
      return n;
    });
    assert.equal(count, 0);
    await page.keyboard.press("F7");
    await page.waitForTimeout(200);
  }
  await page
    .locator("#polyshade-panel select")
    .first()
    .selectOption("cinematic");
  await page.evaluate(() => document.activeElement?.blur());
  await page.getByText("Next Track", { exact: true }).click();
  await page.waitForTimeout(1500);
  report.additionalTrack = await page.evaluate(() => {
    const scene = window.__nativeScene;
    let vertices = 0,
      meshes = 0;
    scene.traverse((o) => {
      if (o.isMesh && !o.userData?.polyShadeOwned) {
        meshes++;
        vertices += o.geometry?.attributes?.position?.count ?? 0;
      }
    });
    return {
      labels: document.body.innerText.match(/Summer\s*\d+/g),
      meshes,
      vertices,
    };
  });
  await shot("additional-track");
  // Controlled graphics-only fixtures in the actual PML scene. These are not
  // shipped, do not touch track geometry/collision, and are removed afterwards.
  await page.evaluate(() => {
    const c = window.__polyShadeController,
      d = c.camera.getWorldDirection(c.camera.position.clone());
    Object.assign(c.getSettings().overrides, {
      sunElevation: 2,
      sunAzimuth: ((Math.atan2(d.x, d.z) * 180) / Math.PI + 360) % 360,
      volumetricEnabled: true,
    });
    c.notifySettingsChanged();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const c = window.__polyShadeController,
      t = c.three,
      camera = c.camera;
    const positions = [
      -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, 1, -1, -1, -1,
      -1, -1, -1, 1, -1, 1, -1, -1, -1, 1, -1, 1, 1, -1, -1, -1, -1, -1, -1, 1,
      -1, 1, 1, -1, -1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1,
      1, -1, 1, 1, 1, -1, 1, 1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, 1, 1, 1,
      -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, -1, 1, -1, 1, -1,
      -1, 1,
    ];
    const geometry = new t.BufferGeometry();
    geometry.setAttribute(
      "position",
      new t.BufferAttribute(new Float32Array(positions), 3),
    );
    geometry.computeVertexNormals();
    const material = new t.MeshStandardMaterial({
      color: 0xb7aa93,
      roughness: 0.9,
    });
    const q = camera.getWorldQuaternion(new t.Quaternion());
    const up = new t.Vector3(0, 1, 0).applyQuaternion(q),
      right = new t.Vector3(1, 0, 0).applyQuaternion(q);
    const sunCentre = camera.position
      .clone()
      .addScaledVector(c.cinematic.palette.direction, 10);
    const parts = [
      [-1.3, -1.5, 0.2, 1.5, 0.35],
      [1.3, -1.5, 0.2, 1.5, 0.35],
      [0, 0, 1.5, 0.3, 0.05],
    ];
    const meshes = parts.map(([x, y, sx, sy, sz]) => {
      const m = new t.Mesh(geometry, material);
      m.position
        .copy(sunCentre)
        .addScaledVector(right, x)
        .addScaledVector(up, y);
      m.scale.set(sx, sy, sz);
      m.quaternion.copy(q);
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.polyShadeOwned = true;
      m.name = "PolyShade test arch";
      c.activeScene.add(m);
      return m;
    });
    window.__volumeFixture = { geometry, material, meshes, up, sunCentre };
  });
  report.volumeStructures = {};
  for (const [name, shift] of [
    ["bridge-blocked", 0],
    ["arch-partial", 0.3],
    ["arch-gap", 1.2],
  ]) {
    await page.evaluate((shift) => {
      const f = window.__volumeFixture;
      f.meshes[2].position.copy(f.sunCentre).addScaledVector(f.up, shift);
    }, shift);
    await page.waitForTimeout(350);
    report.volumeStructures[name] = await page.evaluate(
      () => window.__polyShadeController.cinematic.post.active,
    );
    await shot(name + "-volume-on");
    if (name === "arch-partial") {
      report.volumetricTarget = await page.evaluate(() =>
        window.__polyShadeController.cinematic
          .report()
          .resources.targets.find((target) => target.name === "volumetric"),
      );
      assert.deepEqual(
        [report.volumetricTarget.width, report.volumetricTarget.height],
        [640, 360],
      );
      await page.evaluate(() => {
        const c = window.__polyShadeController;
        c.getSettings().overrides.debugView = "volumetric";
        c.notifySettingsChanged();
      });
      await page.waitForTimeout(200);
      await shot("debug-volumetric");
      await page.evaluate(() => {
        const c = window.__polyShadeController;
        c.getSettings().overrides.debugView = "final";
        c.notifySettingsChanged();
      });
    }
    await page.evaluate(() => {
      const c = window.__polyShadeController;
      c.getSettings().overrides.volumetricEnabled = false;
      c.notifySettingsChanged();
    });
    await page.waitForTimeout(150);
    await shot(name + "-volume-off");
    await page.evaluate(() => {
      const c = window.__polyShadeController;
      c.getSettings().overrides.volumetricEnabled = true;
      c.notifySettingsChanged();
    });
  }
  assert.equal(report.volumeStructures["bridge-blocked"].volumetric, false);
  assert.equal(report.volumeStructures["arch-partial"].volumetric, true);
  await page.evaluate(() => {
    const f = window.__volumeFixture;
    for (const m of f.meshes) m.parent.remove(m);
    f.geometry.dispose();
    f.material.dispose();
    delete window.__volumeFixture;
  });
  await page
    .locator("#polyshade-panel select")
    .first()
    .selectOption("cinematic");
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
  assert.deepEqual(report.nativeCSMCapture, [2048, 2048, 2048, 2048]);
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
  report.glError = await page.evaluate(() =>
    window.__polyShadeCapturedRenderer.getContext().getError(),
  );
  assert.equal(report.glError, 0);
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
