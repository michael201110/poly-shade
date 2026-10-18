// Matched-scene reconstruction check; GPU waits and readbacks are test-only.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { openUpscalingHarness } from '../upscaling-harness.mjs';
const output = `${process.env.TEMP}/polyshade-fsr31-matched`;
await mkdir(output, {recursive:true});
const {browser,page,errors} = await openUpscalingHarness();
const report = {method:'Same frozen game scene/camera/materials, Golden Hour, clouds and motion blur disabled; 32 completed frames per mode.',cases:[]};
try {
  await page.evaluate(() => {
    window.__freezeGame = true;
    const c = window.__controller;
    window.__matchedScene = c.activeScene;
    window.__matchedCamera = c.camera;
    const loop = () => { c.activeRenderer.render(window.__matchedScene, window.__matchedCamera); window.__testRAF(loop); };
    window.__testRAF(loop);
    const style = document.createElement('style');
    style.textContent = '*{visibility:hidden!important}#polyshade-webgpu{visibility:visible!important}';
    document.head.append(style);
  });
  for (const [mode,scale] of [['native',1],['sgsr2-compute',.5],['fsr31',.5]]) {
    console.log('Matched scene',mode,scale);
    await page.evaluate(({mode,scale}) => {
      const c=window.__controller,s=c.getSettings();
      s.overrides = {upscaling:mode,upscaleQuality:'custom',upscaleCustomScale:scale,
        motionBlurEnabled:false,cloudsEnabled:false,fsrSharpness:0};
      c.notifySettingsChanged();
    },{mode,scale});
    await page.waitForFunction(mode => {
      const c=window.__controller,g=c.backends.gpu;
      if(c.backends.failure||g.fsrFailure)throw Error(c.backends.failure??g.fsrFailure);
      return g.ready && g.precompiled && g.selection?.backend===mode;
    // The freeze shim deliberately suppresses game RAF callbacks; poll on a
    // timer so Playwright's own RAF polling is not mistaken for simulation.
    },mode,{timeout:90000,polling:50});
    await page.evaluate(()=>{window.__matchedBefore=window.__controller.backends.gpu.frames;});
    await page.waitForFunction(()=>{
      const g=window.__controller.backends.gpu;
      return g.frames>=window.__matchedBefore+32 && g.temporal.sequence>=32;
    },undefined,{timeout:90000,polling:50});
    await page.evaluate(async()=>{await window.__controller.backends.gpu.device.queue.onSubmittedWorkDone();});
    await page.screenshot({path:`${output}/${mode}.png`});
    report.cases.push(await page.evaluate(()=>{
      const g=window.__controller.backends.gpu;
      return {mode:g.selection.backend,output:g.report().output,history:g.temporal.report()};
    }));
  }
  assert.deepEqual(errors,[]);
  const ref=PNG.sync.read(await readFile(`${output}/native.png`));
  report.pixels=[];
  for(const mode of ['native','sgsr2-compute','fsr31']) {
    const img=PNG.sync.read(await readFile(`${output}/${mode}.png`));
    const mean=[0,0,0],refMean=[0,0,0];let error=0;
    assert.equal(img.width,ref.width);assert.equal(img.height,ref.height);
    for(let i=0;i<img.data.length;i+=4)for(let c=0;c<3;c++) {
      mean[c]+=img.data[i+c];refMean[c]+=ref.data[i+c];error+=Math.abs(img.data[i+c]-ref.data[i+c]);
    }
    const n=img.width*img.height;
    report.pixels.push({mode,mean:mean.map(x=>x/n),referenceMean:refMean.map(x=>x/n),mae:error/(n*3)});
    assert.ok(error/(n*3)<5,`${mode}: settled frozen-scene reconstruction must retain scene colour`);
    assert.ok(mean.every((x,c)=>Math.abs(x-refMean[c])/n<5),`${mode}: no whole-image exposure shift`);
  }
  console.log(JSON.stringify(report,null,2));
} catch(error) {
  report.failure=String(error);
  report.diagnostic=await page.evaluate(()=>({before:window.__matchedBefore,settings:window.__controller.resolveSettings(),gpu:window.__controller.backends.gpu.report()}));
  console.error(JSON.stringify(report.diagnostic,null,2));
  throw error;
} finally {
  await writeFile(`${output}/report.json`,JSON.stringify({...report,errors},null,2)+'\n');
  await browser.close();
}
