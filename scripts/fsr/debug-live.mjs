import { openUpscalingHarness } from '../upscaling-harness.mjs';
import { writeFile, mkdir } from 'node:fs/promises';
process.env.POLYSHADE_BUNDLE ??= 'experimental/0.6.0-fsr31.0/main.mod.js';
const { browser, page, errors } = await openUpscalingHarness({ freezeSupport: false });
try {
  page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.log(m.type(), m.text().slice(0, 2500)); });
  await page.evaluate(() => {
    const c = window.__controller, g = c.backends.gpu;
    const p = g.renderer.backend.pipelineUtils;
    const create = p.createRenderPipeline;
    window.__pipelineLog = [];
    p.createRenderPipeline = function(renderObject, ...args) {
      window.__pipelineLog.push({ name: renderObject.material.name, id: renderObject.material.id,
        object: renderObject.object.name, textures: renderObject.context.textures?.map(t => [t.name,t.type,t.format]),
        cacheKey: this.backend.getRenderCacheKey(renderObject) });
      return create.call(this, renderObject, ...args);
    };
    const settings = c.getSettings(); settings.overrides = { upscaling: 'fsr31', upscaleQuality: 'performance', debugProfile: true };
    c.notifySettingsChanged();
  });
  await page.waitForTimeout(10000);
  const result = await page.evaluate(() => ({ errors: window.__controller.backends.report(), pipelines: window.__pipelineLog }));
  await mkdir('docs/verification/fsr31', { recursive:true });
  await writeFile('docs/verification/fsr31/live-debug.json', JSON.stringify(result, null, 2));
  await page.screenshot({ path:'docs/verification/fsr31/live-debug.png' });
  console.log(JSON.stringify(result, null, 2).slice(-16000));
} finally { await browser.close(); }
