import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

// Called by verify-live against either immutable 0.2.4 or the candidate build.
// Timing includes the controller's pre-render work and measures real RAF gaps,
// shader creation and target allocation, not just CPU draw submission time.
export async function runOptimizationBenchmark(page, shot, output, environment) {
  const report = { environment, scenarios: {} };
  await page.evaluate(() => {
    const c = window.__polyShadeController, g = c.activeRenderer.getContext();
    const before = c.onRender, after = c.onFrame, create = g.createProgram;
    window.__opt = { measuring: false, before: 0, cpu: [], update: [], intervals: [], programs: 0 };
    c.onRender = function (...args) {
      const start = performance.now();
      try { return before.apply(this, args); }
      finally {
        const d = performance.now() - start;
        window.__opt.before = d;
        if (window.__opt.measuring) window.__opt.update.push(d);
      }
    };
    c.onFrame = function (...args) {
      const start = performance.now();
      try { return after.apply(this, args); }
      finally {
        if (window.__opt.measuring)
          window.__opt.cpu.push(args[2] + window.__opt.before + performance.now() - start);
      }
    };
    g.createProgram = function (...args) {
      window.__opt.programs++;
      const program = create.apply(this, args);
      if (window.__opt.measuring) window.__opt.newPrograms.push(program);
      return program;
    };
    const tick = (now) => {
      const o = window.__opt;
      if (o.measuring && o.last !== undefined) o.intervals.push(now - o.last);
      o.last = now;
      if (o.transition) {
        const f = window.__optFixture;
        f.mesh.position.copy(f.centre).addScaledVector(f.up, 0.3 + 0.32 * Math.sin(now * 0.006));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const collect = async (name, action) => {
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      const o = window.__opt, c = window.__polyShadeController;
      o.cpu = []; o.update = []; o.intervals = []; o.last = undefined;
      o.programStart = o.programs;
      o.newPrograms = [];
      o.existingKeys = c.activeRenderer.info.programs.map((p) => p.cacheKey);
      o.resources = c.cinematic.report().resources;
      o.cache = c.cinematic.report().shadowCache;
      c.cinematic.timer.samples.length = 0;
      o.measuring = true;
    });
    if (action) await action();
    else await page.waitForTimeout(8000);
    const result = await page.evaluate(() => {
      const o = window.__opt, c = window.__polyShadeController;
      o.measuring = false;
      const stats = (values) => {
        const v = [...values].sort((a, b) => a - b), n = v.length;
        return { average: v.reduce((a, b) => a + b, 0) / n,
          p50: v[Math.ceil(n * 0.5) - 1], p95: v[Math.ceil(n * 0.95) - 1],
          p99: v[Math.ceil(n * 0.99) - 1], max: v[n - 1], samples: n };
      };
      const r = c.cinematic.report(), cache = r.shadowCache;
      const g = c.activeRenderer.getContext();
      const newShaderTypes = o.newPrograms.filter((p) => g.isProgram(p)).map((p) =>
        g.getAttachedShaders(p).map((s) => g.getShaderSource(s))
          .filter((source) => source.includes("gl_FragColor"))
          .map((source) => ({
            name:source.match(/#define SHADER_NAME (.*)/)?.[1],
            defines:source.match(/^#define .*$/gm),
          })));
      const keyChanges = c.activeRenderer.info.programs.filter((p) => o.newPrograms.includes(p.program)).map((p) => {
        const next = p.cacheKey.split(",");
        let closest, minimum = Infinity;
        for (const key of o.existingKeys) {
          const old = key.split(",");
          const changes = next.map((value, i) => ({ i, old:old[i], next:value })).filter((v) => v.old !== v.next);
          if (changes.length < minimum) { minimum = changes.length; closest = changes; }
        }
        return closest;
      });
      return { cpu: stats(o.cpu), update: stats(o.update), intervals: stats(o.intervals),
        framesOver25ms: o.intervals.filter((v) => v > 25).length,
        framesOver50ms: o.intervals.filter((v) => v > 50).length,
        gpu: c.cinematic.timer.metrics(), shadersCreated: o.programs - o.programStart, newShaderTypes, keyChanges,
        targetAllocations: r.resources.allocated - o.resources.allocated,
        targetDisposals: r.resources.disposed - o.resources.disposed,
        shadowUpdates: cache ? cache.updated - o.cache.updated : null,
        shadowReuses: cache ? cache.reused - o.cache.reused : null, shadowCache: cache,
        active: c.cinematic.post.active, warmup: r.shaderWarmup, failures: r.failures,
      };
    });
    assert.deepEqual(result.failures, {});
    report.scenarios[name] = result;
    console.log(name, JSON.stringify({cpu:result.cpu, gpu:result.gpu,
      framesOver50ms:result.framesOver50ms, allocations:result.targetAllocations, shaders:result.shadersCreated}));
    return result;
  };
  const preset = async (id) => {
    await page.locator("#polyshade-panel select").first().selectOption(id);
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press("r");
  };
  for (const id of ["cinematic-lite", "cinematic", "recording"]) {
    await preset(id);
    await collect(id + "-stationary");
    await shot("optimization-" + id);
  }
  await preset("recording");
  const driving = await collect("capture-driving", async () => {
    await page.keyboard.down("ArrowUp"); await page.waitForTimeout(8000); await page.keyboard.up("ArrowUp");
  });
  await page.keyboard.press("r");
  const braking = await collect("capture-braking", async () => {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.down("ArrowUp"); await page.waitForTimeout(500); await page.keyboard.up("ArrowUp");
      await page.keyboard.down("ArrowDown"); await page.waitForTimeout(150); await page.keyboard.up("ArrowDown");
    }
  });
  await page.keyboard.press("r");
  await page.evaluate(() => {
    const c = window.__polyShadeController, d = c.camera.getWorldDirection(c.camera.position.clone());
    Object.assign(c.getSettings().overrides, {
      sunAzimuth: ((Math.atan2(d.x, d.z) * 180) / Math.PI + 360) % 360,
      sunElevation: 12, volumetricEnabled: true,
    });
    c.notifySettingsChanged();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const c = window.__polyShadeController, t = c.three;
    const geometry = new t.PlaneGeometry(3, 0.6);
    const material = new t.MeshStandardMaterial({ color: 0xb7aa93, roughness: 0.9, side: t.DoubleSide });
    const mesh = new t.Mesh(geometry, material), q = c.camera.getWorldQuaternion(new t.Quaternion());
    const up = new t.Vector3(0, 1, 0).applyQuaternion(q);
    const centre = c.camera.position.clone().addScaledVector(c.cinematic.palette.direction, 10);
    mesh.quaternion.copy(q); mesh.position.copy(centre).addScaledVector(up, 0.3);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.polyShadeOwned = true; mesh.name = "Optimization occlusion fixture";
    c.activeScene.add(mesh);
    window.__optFixture = { mesh, geometry, material, up, centre };
  });
  await page.waitForTimeout(500);
  const partial = await collect("capture-partial-sun");
  assert.equal(partial.active.sunRays, true);
  assert.equal(partial.active.volumetric, true);
  await shot("optimization-partial-sun");
  await page.evaluate(() => { window.__opt.transition = true; });
  const transitions = await collect("capture-occlusion-transitions");
  await page.evaluate(() => { window.__opt.transition = false; });
  // The optimized release must not allocate targets or compile new shaders
  // during a warmed sequence of partial/full sun occlusion.
  if (environment.release !== "0.2.4") {
    for (const result of [driving, braking]) {
      assert.equal(result.targetAllocations, 0);
      assert.equal(result.targetDisposals, 0);
      if (result.warmup.supported) assert.equal(result.shadersCreated, 0);
    }
    assert.equal(transitions.targetAllocations, 0);
    assert.equal(transitions.targetDisposals, 0);
    assert.equal(transitions.shadersCreated, 0);
  }
  await page.evaluate(() => {
    const f = window.__optFixture;
    f.mesh.parent.remove(f.mesh); f.geometry.dispose(); f.material.dispose();
  });
  await writeFile(output + "/optimization.json", JSON.stringify(report, null, 2));
  return report;
}
