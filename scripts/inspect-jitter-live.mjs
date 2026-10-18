// Test-only capture of the actual game's temporal state (no frozen simulation).
import {openUpscalingHarness} from './upscaling-harness.mjs';
import {writeFile} from 'node:fs/promises';
process.env.POLYSHADE_BUNDLE??='experimental/0.6.0-fsr31.1/main.mod.js';
process.env.POLYSHADE_HEADED??='1';
const {browser,page,errors}=await openUpscalingHarness({freezeSupport:false});
const rows=[];
try {
  await page.evaluate(()=>{
    const g=window.__controller.backends.gpu,t=g.temporal,begin=t.begin.bind(t);
    window.__temporalFrames=[];
    t.begin=(...args)=>{begin(...args);window.__temporalFrames.push({...t.report(),at:performance.now(),
      projection:t.projection.elements.slice(),world:t.camera.matrixWorld.elements.slice()});};
  });
  for(const mode of ['sgsr2-compute','fsr31']) {
    await page.evaluate(mode=>{const c=window.__controller;c.getSettings().overrides={upscaling:mode,upscaleQuality:'performance',upscaleDebugView:'final',frameGeneration:false};c.notifySettingsChanged();window.__temporalFrames=[];},mode);
    await page.waitForTimeout(5000);
    const still=await page.evaluate(()=>window.__temporalFrames.splice(0));
    await page.keyboard.down('w');await page.waitForTimeout(2000);await page.keyboard.up('w');
    const moving=await page.evaluate(()=>window.__temporalFrames.splice(0));
    rows.push({mode,still,moving});
    console.log(mode,JSON.stringify({still:still.length,resets:still.filter(f=>!f.valid).map(f=>({reason:f.lastReset,at:f.at})),moving:moving.length,movingResets:moving.filter(f=>!f.valid).map(f=>f.lastReset)}));
    await page.keyboard.press('t');
  }
}finally{await writeFile(`${process.env.TEMP}/polyshade-jitter-live.json`,JSON.stringify({rows,errors},null,2));await browser.close();}
