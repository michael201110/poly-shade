import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openUpscalingHarness} from './upscaling-harness.mjs';
process.env.POLYSHADE_BUNDLE??='experimental/0.6.0-fsr31.1/main.mod.js';
process.env.POLYSHADE_HEADED??='1';
const {browser,page,errors}=await openUpscalingHarness({freezeSupport:false});
const cases=[];
try {
  await page.evaluate(()=>{
    const g=window.__controller.backends.gpu,original=g.presentQueued;
    window.__fgTemporalPresentations={real:0,generated:0,violations:[]};
    g.presentQueued=function(...args){
      const before=[this.temporal.frameIndex,this.temporal.sequence];
      const result=original.apply(this,args),probe=window.__fgTemporalPresentations;
      if(result)probe[args[1]?'generated':'real']++;
      if(before[0]!==this.temporal.frameIndex||before[1]!==this.temporal.sequence)
        probe.violations.push({before,after:[this.temporal.frameIndex,this.temporal.sequence]});
      return result;
    };
  });
  for(const [mode,scale,width,height]of [['native',1,1280,720],['sgsr2-compute',.5,1280,720],['fsr31',.5,1280,720]]) {
    console.log('FG live',mode,scale,width,height);
    await page.setViewportSize({width,height});
    await page.evaluate(({mode,scale})=>{
      const c=window.__controller,s=c.getSettings();s.preset='cinematic';s.overrides={upscaling:mode,upscaleQuality:'custom',upscaleCustomScale:scale,frameGeneration:true,debugProfile:true};c.notifySettingsChanged();
    },{mode,scale});
    await page.waitForFunction(mode=>{
      const m=window.__controller.backends,g=m.gpu;
      if(m.failure||g.fgFailure||g.fsrFailure)throw Error(m.failure??g.fgFailure??g.fsrFailure);
      return g.fg?.ready&&g.selection?.backend===mode&&g.precompiled;
    },mode,{timeout:90000});
    const before=await page.evaluate(()=>window.__controller.backends.gpu.presenter.generatedFrames);
    await page.keyboard.press('t');
    await page.keyboard.down('w');await page.waitForTimeout(1500);
    await page.keyboard.down('d');await page.waitForTimeout(150);await page.keyboard.up('d');
    await page.waitForTimeout(1000);await page.keyboard.up('w');
    const report=await page.evaluate(()=>window.__controller.backends.gpu.report());cases.push({mode,scale,report});
    console.log(JSON.stringify({failure:report.frameGenerationFailure,ready:report.frameGeneration?.ready,presentation:report.presentation,
      fg:report.profile.passes['frame-generation'],total:report.profile.passes.total,owned:report.frameGeneration?.estimatedOwnedBytes}));
    assert.equal(report.frameGenerationFailure,undefined);assert.equal(report.fsr31Failure,undefined);
    assert.equal(report.frameGeneration?.ready,true);assert.ok(report.presentation.generatedFrames>before);
    assert.ok(report.presentation.pending<=1);assert.ok(report.frameQueue.peak<=2);
    assert.equal(report.temporal.frameIndex,report.frames,'only committed real renders advance temporal state');
    assert.deepEqual(report.output,[width,height]);
    await page.screenshot({path:`docs/verification/framegen/live-${mode}.png`});
  }
  const temporalPresentations=await page.evaluate(()=>window.__fgTemporalPresentations);
  assert.ok(temporalPresentations.real>0&&temporalPresentations.generated>0);
  assert.deepEqual(temporalPresentations.violations,[],'presentation-only calls must never advance jitter');
  cases.push({temporalPresentations});
  for(const view of ['real','generated','optical-flow','game-motion','disocclusion','inpainting']) {
    await page.evaluate(view=>{const c=window.__controller,s=c.getSettings();s.overrides={...s.overrides,frameGenerationDebug:view};c.notifySettingsChanged();},view);
    await page.waitForTimeout(400);
    const report=await page.evaluate(()=>window.__controller.backends.gpu.report());
    assert.equal(report.frameGenerationFailure,undefined);assert.ok(report.frameGeneration?.frameIndex>0);
    cases.push({debugView:view,frameIndex:report.frameGeneration.frameIndex});
  }
  // A 40 real-FPS floor deliberately rejects 30-real/60-display operation.
  // Check that fallback stays paused, frees FG images, and normal input renders.
  await page.evaluate(()=>{const c=window.__controller,s=c.getSettings();s.overrides={...s.overrides,frameGenerationDebug:'final',fgMinimumFPS:40};c.notifySettingsChanged();});
  await page.waitForFunction(()=>window.__controller.backends.gpu.presenter.paused,null,{timeout:15000});
  const beforePause=await page.evaluate(()=>window.__controller.backends.gpu.frames);
  await page.keyboard.down('w');await page.waitForTimeout(800);await page.keyboard.up('w');
  const guard=await page.evaluate(()=>window.__controller.backends.gpu.report());
  assert.equal(guard.presentation.active,false);assert.equal(guard.presentation.paused,true);
  assert.equal(guard.frameQueue.limit,2,'ordinary rendering must regain its normal admission depth');
  assert.equal(guard.frameGeneration.estimatedOwnedBytes,0);assert.ok(guard.frames>beforePause+5);
  cases.push({guard:{presentation:guard.presentation,ownedBytes:guard.frameGeneration.estimatedOwnedBytes}});
  await page.evaluate(()=>{const c=window.__controller,s=c.getSettings();s.overrides={...s.overrides,fgMinimumFPS:25};c.notifySettingsChanged();});
  await page.waitForFunction(()=>window.__controller.backends.gpu.fg.frameIndex>7,null,{timeout:15000});
  // A renderer-only FG exception must retain SR and the normal renderer.
  await page.evaluate(()=>{window.__controller.backends.gpu.fg.generate=()=>{throw Error('Deliberate FG test failure');};});
  await page.waitForFunction(()=>!!window.__controller.backends.gpu.fgFailure,null,{timeout:5000});
  const beforeFallback=await page.evaluate(()=>window.__controller.backends.gpu.frames);
  await page.waitForTimeout(500);
  const fallback=await page.evaluate(()=>window.__controller.backends.gpu.report());
  assert.equal(fallback.frameGenerationFailure,'Deliberate FG test failure');assert.equal(fallback.ready,true);
  assert.equal(fallback.fsr31Failure,undefined);assert.ok(fallback.frames>beforeFallback+5);
  cases.push({fallback:{failure:fallback.frameGenerationFailure,continuedFrames:fallback.frames-beforeFallback}});
  await page.keyboard.press('Home');await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>window.__controller.backends),null);
  await page.keyboard.press('Home');await page.waitForFunction(()=>window.__controller.backends?.gpu?.ready,null,{timeout:90000});
  assert.deepEqual(errors,[]);
}finally {
  await mkdir('docs/verification/framegen',{recursive:true});
  await writeFile('docs/verification/framegen/live.json',JSON.stringify({cases,errors},null,2)+'\n');
  await browser.close();
}
