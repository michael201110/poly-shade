import { openUpscalingHarness } from "./upscaling-harness.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const output = `${process.env.TEMP}/polyshade-sgsr2`;
await mkdir(output, { recursive: true });
const { browser, page, errors } = await openUpscalingHarness();
const report = { date: new Date().toISOString(), browser: browser.version(), viewport: [1280, 720], cases: [], screenshots: [] };
async function configure(overrides) {
  await page.evaluate(o => {
    const c = window.__controller, s = c.getSettings();
    s.overrides = { motionBlurEnabled: false, debugProfile: true, ...o };
    c.notifySettingsChanged();
  }, overrides);
}
try {
  await page.locator('#polyshade-panel button').filter({hasText:/^Hide$/}).click();
  await page.getByText('Next Track',{exact:true}).click();
  await page.getByText('Exit',{exact:true}).click();
  await page.getByText('Summer 2',{exact:true}).click();
  await page.getByText('SpeedySebas',{exact:true}).waitFor({timeout:60000});
  await page.getByText('SpeedySebas',{exact:true}).click();
  await page.getByRole('button',{name:'Watch',exact:true}).click();
  await page.waitForFunction(()=>window.__controller?.activeScene?.getObjectByName('Body'),undefined,{timeout:60000});
  await page.evaluate(() => {
    const p = window.polyModLoader;
    p.settingClass.updateSettings([[p.getFromPolyTrack('P.A.ShadowQuality'), '3']]);
  });
  await page.waitForTimeout(2000);
  await configure({upscaling:'sgsr2-fragment',upscaleQuality:'quality',debugProfile:false});
  // Capture motion at several points before freezing the same real scene for
  // comparable GPU timings. This never alters the shipped game or replay data.
  for(let i=0;i<4;i++){
    await page.waitForTimeout(900);
    await page.locator('canvas').first().screenshot({path:`${output}/moving-replay-${i}.png`});
  }
  await page.evaluate(() => {
    window.__freezeGame=true;
    window.__frozenScene=window.__controller.activeScene;
    window.__frozenCamera=window.__controller.camera;
    window.__frozenRenderer=window.__controller.activeRenderer;
    const loop=()=>{
      window.__frozenRenderer.render(window.__frozenScene,window.__frozenCamera);
      window.__testRAF(loop);
    };
    window.__testRAF(loop);
  });
  report.method='Fixed Summer 2 #1 replay scene and camera, after ~6s; test-only simulation freeze, real hooked renderer at browser RAF. Warmed shadows and shaders; no motion blur. GPU timings sampled asynchronously.';
  report.environment = await page.evaluate(() => {
    const c = window.__controller, r = c.activeRenderer, gl = r.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info');
    const sources = [];
    for (const key of ['i','n']) {
      let req; try { req = window.polyModLoader.getFromPolyTrack(key); } catch {}
      if (req?.m) for (const [id, f] of Object.entries(req.m)) {
        const text = String(f);
        const match = text.match(/(?:REVISION|revision:|__THREE__|THREE.WebGLRenderer)[\s\S]{0,80}/g);
        if (match) sources.push({id,match:match.slice(0,8)});
      }
    }
    return { gpu: e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown', threeRevision:window.__THREE__,
      capabilities: c.cinematic.report(), revisionSources:sources, dpr:devicePixelRatio,
      carParts: c.cinematic.post.objectMotion.entries.length, nativeWrapper:Object.keys(c.nativeWrapper??{}) };
  });
  for (const mode of ['native', 'reduced', 'sgsr2-fragment']) {
    for (const scale of mode === 'native' ? [1] : [1,0.77,0.67,0.59,0.5]) {
      const name = `${mode}-${Math.round(scale*100)}`;
      console.log(`Benchmark ${name}`);
      await configure({ upscaling:mode, upscaleQuality:'custom', upscaleCustomScale:scale, upscaleDebugView:'final' });
      await page.evaluate(()=>document.activeElement?.blur());
      await page.waitForTimeout(2000);
      // Discard shader/target warmup and previous-mode timing samples.
      await page.evaluate(() => {
        const c=window.__controller;
        c.cinematic.timer.samples.length=0;
        for(const timer of c.cinematic.profiler?.timers.values()??[]) timer.samples.length=0;
        for(const values of c.cinematic.profiler?.cpu.values()??[])values.length=0;
      });
      await page.waitForTimeout(5000);
      const result = await page.evaluate(() => {
        const c=window.__controller,p=c.cinematic.post;
        return {gpu:c.cinematic.timer.metrics(), profile:c.cinematic.profiler?.report(),
          active:p.active,passes:p.passOrder,resources:p.pool.report(),failed:p.upscaleFailed??false,
          carParts:p.objectMotion.entries.length, failures:Object.fromEntries(c.cinematic.guard.failures),
          cameraRestored:p.temporal.projection.equals(c.camera.projectionMatrix)};
      });
      const file = `${output}/${name}.png`;
      await page.locator('canvas').first().screenshot({path:file});
      report.screenshots.push(file); report.cases.push({name,scale,mode,...result});
      await writeFile(`${output}/benchmark.json`,JSON.stringify({...report,errors},null,2));
      assert.equal(result.failed,false);
      assert.deepEqual(result.active.outputSize,[1280,720]);
      if(mode==='sgsr2-fragment')assert.equal(result.active.upscaling.backend,'sgsr2-fragment');
      assert.deepEqual(result.failures,{});
      console.log(JSON.stringify({name,total:result.gpu?.average,scene:result.profile?.['scene-including-shadows']?.gpu?.average,
        sgsr:result.profile?.sgsr2?.gpu?.average,parts:result.carParts}));
    }
  }
  // Inspect each diagnostic in the actual moving replay.
  for(const view of ['static-velocity','car-velocity','combined-velocity','depth','jitter','history-validity','history-rejection','history','low-resolution','native']){
    await configure({upscaling:'sgsr2-fragment',upscaleQuality:'quality',upscaleDebugView:view});
    await page.waitForTimeout(500);
    await page.locator('canvas').first().screenshot({path:`${output}/debug-${view}.png`});
  }
  // Resize, unsupported backend, injected SGSR failure and native recovery.
  await configure({upscaling:'sgsr2-fragment',upscaleQuality:'quality'});
  await page.setViewportSize({width:1024,height:640}); await page.waitForTimeout(700);
  report.resize=await page.evaluate(()=>window.__controller.cinematic.post.active);
  await page.setViewportSize({width:1280,height:720});
  await configure({upscaling:'sgsr2-compute'}); await page.waitForTimeout(500);
  report.compute=await page.evaluate(()=>window.__controller.cinematic.post.active.upscaling);
  await configure({upscaling:'native'}); await page.waitForTimeout(500);
  report.nativeRestoration=await page.evaluate(()=>{
    const p=window.__controller.cinematic.post;
    return {active:p.active,temporalTargets:[...p.pool.targets.keys()].filter(k=>k.startsWith('sgsr'))};
  });
  await page.keyboard.press('Home'); await page.waitForTimeout(300);
  report.disabled=await page.evaluate(()=>window.__controller.cinematic===null);
  await page.keyboard.press('Home'); await page.waitForTimeout(1000);
  await page.keyboard.press('End');
  report.panelHidden=await page.locator('#polyshade-panel').isHidden();
  await page.keyboard.press('End');
  report.panelRestored=await page.locator('#polyshade-panel').isVisible();
  assert.equal(report.compute.backend,'native');
  assert.deepEqual(report.nativeRestoration.temporalTargets,[]);
  assert.equal(report.disabled,true);
  assert.equal(report.panelHidden,true);assert.equal(report.panelRestored,true);
  assert.deepEqual(errors,[]);
  console.log(`Benchmark and live lifecycle checks passed: ${output}/benchmark.json`);
} finally { await writeFile(`${output}/benchmark.json`,JSON.stringify({...report,errors},null,2)); await browser.close(); }
