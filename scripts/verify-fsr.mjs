// Phase-one shader/synthetic verifier. Never installs an experimental build in
// the user's profile and never updates PML latest. Readbacks are test-only.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
const bundle = await build({ entryPoints: ['scripts/fsr/synthetic-entry.js'], bundle: true, format: 'esm', write: false });
const dir = 'src/rendering/fsr31/generated';
const shaders = Object.fromEntries(await Promise.all((await readdir(dir)).filter(f => f.endsWith('.wgsl'))
  .map(async f => [f.replace('.wgsl', ''), await readFile(`${dir}/${f}`, 'utf8')])));
const browser = await chromium.launch({ channel: 'msedge', headless: process.env.POLYSHADE_HEADED !== '1',
  args: ['--force_high_performance_gpu'] });
try {
  const page = await browser.newPage();
  await page.route('https://polyshade.test/**', r => r.fulfill({
    body: r.request().url().endsWith('.js') ? bundle.outputFiles[0].text : '<!doctype html>',
    contentType: r.request().url().endsWith('.js') ? 'application/javascript' : 'text/html' }));
  await page.goto('https://polyshade.test/');
  const result = await page.evaluate(async shaders => {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    const features = ['float32-filterable', 'shader-f16', 'timestamp-query'].filter(f => adapter.features.has(f));
    const device = await adapter.requestDevice({ requiredFeatures: features,
      requiredLimits: { maxStorageTexturesPerShaderStage: 6 } });
    const errors = [], passes = [];
    device.addEventListener('uncapturederror', e => errors.push(e.error.message));
    try {
      for (const [name, code] of Object.entries(shaders)) {
        device.pushErrorScope('validation');
        const module = device.createShaderModule({ code, label: `FSR ${name}` });
        const info = await module.getCompilationInfo();
        const messages = info.messages.filter(m => m.type === 'error').map(m => `${m.lineNum}:${m.linePos} ${m.message}`);
        try {
          if (!messages.length) await device.createComputePipelineAsync({ layout: 'auto', compute: { module, entryPoint: 'CS' } });
        } catch (error) { messages.push(error.message); }
        const scoped = await device.popErrorScope();
        if (scoped) messages.push(scoped.message);
        passes.push({ name, messages });
      }
      return { adapter: { ...adapter.info.toJSON?.(), description: adapter.info.description }, features, passes, errors };
    } finally { device.destroy(); }
  }, shaders);
  await mkdir('docs/verification/fsr31', { recursive: true });
  await writeFile('docs/verification/fsr31/shader-compilation.json', JSON.stringify(result, null, 2) + '\n');
  for (const pass of result.passes) console.log(pass.name, pass.messages.length ? pass.messages : 'PASS');
  assert.deepEqual(result.errors, []);
  assert.ok(result.passes.every(p => !p.messages.length), 'Every AMD SR pass must compile on the actual adapter');
  const synthetic = await page.evaluate(async () => (await import('/synthetic.js')).verifySynthetic());
  console.log(JSON.stringify(synthetic, null, 2));
  await writeFile('docs/verification/fsr31/synthetic.json', JSON.stringify(synthetic, null, 2) + '\n');
  assert.deepEqual(synthetic.errors, []);
  assert.ok(synthetic.ranges.every(r => r.nonFinite === 0));
  for (let i = 0; i < 3; i++) {
    assert.ok(synthetic.ranges[i].max - synthetic.ranges[i].min < .01, 'Constant input must stay constant');
    assert.ok(Math.abs(synthetic.ranges[i].min - [.25, .5, .75][i]) < .02, 'Constant colour fidelity');
  }
  assert.equal(synthetic.cleanup.resources.length, 0);
  assert.equal(synthetic.cleanup.buffers.length, 0);
  assert.deepEqual(synthetic.motion.slice(0, 2), [-.125, .0625], 'NDC to AMD previous-current UV conversion');
  assert.ok(Math.abs(synthetic.dilatedDepth[0] - .9) < 1e-6);
  assert.ok(Math.abs(synthetic.reconstructed.reprojected - .9) < 1e-6);
  assert.equal(synthetic.reconstructed.unreachedRightEdge, 1, 'atomic reconstruction leaves unreached depth at far clear');
  assert.equal(synthetic.reactive[0], 1, 'provided reactive content reaches AMD dilation');
  assert.equal(synthetic.reset.frameIndex, 1);
  assert.equal(synthetic.released.resources.length, 0);
  assert.equal(synthetic.restored.frameIndex, 1);
} finally { await browser.close(); }
