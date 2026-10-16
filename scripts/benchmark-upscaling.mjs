// GPU-only current-release benchmark. Historical results remain under docs/verification.
import {openUpscalingHarness} from './upscaling-harness.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const output=`${process.env.TEMP}/polyshade-sgsr2`;
await mkdir(output,{recursive:true});
const {browser,page,errors}=await openUpscalingHarness();
const report={date:new Date().toISOString(),browser:browser.version(),viewport:[1280,720],
 method:'Frozen offline Summer 1 start scene, same camera across all cases; motion blur off; 2 seconds warmup then 5 seconds asynchronous GPU timings. Native means WebGPU at native resolution. Not a gameplay FPS benchmark.',cases:[]};
try {
 await page.evaluate(()=>{
  window.__freezeGame=true;const c=window.__controller,scene=c.activeScene,camera=c.camera,r=c.activeRenderer;
  const loop=()=>{r.render(scene,camera);window.__testRAF(loop);};window.__testRAF(loop);
 });
 for(const mode of ['native','reduced','sgsr2-compute'])for(const scale of mode==='native'?[1]:[1,.77,.67,.59,.5]){
  const name=`${mode}-${Math.round(scale*100)}`;console.log(`Benchmark ${name}`);
  await page.evaluate(({mode,scale})=>{const c=window.__controller,s=c.getSettings();s.overrides={upscaling:mode,upscaleQuality:'custom',upscaleCustomScale:scale,motionBlurEnabled:false,debugProfile:true};c.notifySettingsChanged();},{mode,scale});
  await page.waitForTimeout(2000);
  await page.evaluate(()=>window.__controller.backends.gpu.profiler.samples.clear());
  await page.waitForTimeout(5000);
  const g=await page.evaluate(()=>window.__controller.backends.gpu.report());
  assert.equal(await page.evaluate(()=>window.__controller.backends.failure),undefined);
  assert.deepEqual(g.output,[1280,720]);
  if(mode==='sgsr2-compute')assert.equal(g.selection.backend,'sgsr2-compute');
  const pr=g.profile.passes;
  report.cases.push({name,mode,scale,sceneMedian:pr.scene?.median,reconstructionMedian:pr.reconstruction?.median??0,totalMedian:pr.total?.median,webgpu:g});
  await page.screenshot({path:`${output}/${name}.png`});
  await writeFile(`${output}/benchmark.json`,JSON.stringify({...report,errors},null,2));
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify(report,null,2));
}finally{await writeFile(`${output}/benchmark.json`,JSON.stringify({...report,errors},null,2));await browser.close();}
