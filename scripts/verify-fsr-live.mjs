// Real-game regression for the acceleration/reset material replacement failure.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openUpscalingHarness } from './upscaling-harness.mjs';
process.env.POLYSHADE_HEADED ??= '1';
const { browser, page, errors } = await openUpscalingHarness({ freezeSupport:false });
const cases = [];
try {
  for (const [mode, scale, sharpness, width, height] of [
    ['sgsr2-compute', .67, 0, 1280,720], ['sgsr2-compute', .5, 0, 1920,1080],
    ['fsr31', .67, 0, 1280,720], ['fsr31', .5, 0, 1920,1080],
    ['fsr31', .5, .5, 1280,720], ['fsr31', .67, 0, 1920,1080],
    ['native', 1, 0, 1280,720], ['sgsr2-compute', .5, 0, 1920,1080],
    ['fsr31', .5, 0, 1280,720],
  ]) {
    console.log('live movement/reset', mode, scale, sharpness, width, height);
    await page.setViewportSize({ width, height });
    await page.evaluate(({mode,scale,sharpness}) => {
      const c = window.__controller, s = c.getSettings();
      s.overrides = { upscaling:mode, upscaleQuality:'custom', upscaleCustomScale:scale,
        fsrSharpness:sharpness, debugProfile:true }; c.notifySettingsChanged();
    }, { mode, scale, sharpness });
    await page.waitForFunction(mode => {
      const manager = window.__controller.backends, g = manager.gpu;
      if (manager.failure || g.fsrFailure) throw Error(manager.failure ?? g.fsrFailure);
      return g.ready && g.selection?.backend === mode && g.precompiled;
    }, mode, {timeout:90000});
    await page.waitForTimeout(500);
    const before = await page.evaluate(() => window.__controller.backends.gpu.frames);
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('t');
      await page.keyboard.down('w'); await page.waitForTimeout(500);
      await page.keyboard.down(i % 2 ? 'a' : 'd'); await page.waitForTimeout(120);
      await page.keyboard.up('a'); await page.keyboard.up('d');
      await page.keyboard.up('w'); await page.keyboard.down('s'); await page.waitForTimeout(200);
      await page.keyboard.up('s'); await page.waitForTimeout(200);
    }
    const result = await page.evaluate(() => {
      const m = window.__controller.backends, g = m.gpu;
      return { failure:m.failure ?? null, report:g.report(), visibleError:!!document.querySelector('#polyshade-renderer-error') };
    });
    assert.equal(result.failure, null); assert.equal(result.visibleError, false);
    assert.equal(result.report.ready, true); assert.equal(result.report.selection.backend, mode);
    assert.ok(result.report.frames - before > 15, 'real enhanced frames must continue through every acceleration');
    assert.deepEqual(result.report.output, [width,height]);
    assert.deepEqual(result.report.internal, [Math.round(width*scale),Math.round(height*scale)]);
    assert.ok(result.report.frameQueue.peak <= 2);
    assert.equal(result.report.fsr31Failure, undefined);
    cases.push({mode,scale,sharpness,width,height,frames:result.report.frames-before,
      resets:result.report.temporal.resets,queue:result.report.frameQueue});
  }
  assert.deepEqual(errors, []);
  await page.screenshot({path:'docs/verification/fsr31/live-movement.png'});
  console.log('PASS', JSON.stringify(cases));
} finally {
  await mkdir('docs/verification/fsr31', {recursive:true});
  await writeFile('docs/verification/fsr31/live-movement.json', JSON.stringify({cases,errors},null,2)+'\n');
  await browser.close();
}
