// Real admitted-render cadence, distinct from deterministic readback clocks.
import {openUpscalingHarness} from './upscaling-harness.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
process.env.POLYSHADE_HEADED='1';process.env.POLYSHADE_UNCAPPED='1';process.env.POLYSHADE_VIEWPORT='1280x720';
const {browser,page,errors}=await openUpscalingHarness({freezeSupport:false});
const rows=[];
try {
  await page.evaluate(()=>{
    const g=window.__controller.backends.gpu,render=g.render;
    const state=window.__cadence={limit:0,due:0,records:[],active:false};
    g.render=function(...args){
      const now=performance.now();if(state.limit&&now<state.due-.2)return this.warmFrames>=4;
      const before=this.frames,result=render.apply(this,args);
      if(this.frames>before){if(state.limit)state.due=Math.max(state.due+1000/state.limit,now);
        if(state.active)state.records.push({at:now,frame:this.frames,deltaMs:this.temporal.deltaMs,
        temporalFrame:this.temporal.frameIndex,jitterIndex:this.temporal.jitterIndex,valid:this.temporal.valid,lastReset:this.temporal.lastReset});}
      return result;
    };
  });
  for(const mode of ['sgsr2-compute','fsr31']) {
    const startFrame=await page.evaluate(mode=>{const c=window.__controller;c.getSettings().overrides={upscaling:mode,upscaleQuality:'performance',upscaleDebugView:'final',frameGeneration:false};c.notifySettingsChanged();window.__cadence.limit=0;return c.backends.gpu.frames;},mode);
    await page.waitForFunction(({mode,startFrame})=>{const g=window.__controller.backends.gpu;
      return g.selection?.backend===mode&&g.precompiled&&g.temporal.valid&&g.frames>startFrame+60;
    },{mode,startFrame},{timeout:90000});
    for(const limit of [15,30,60,0]) {
      await page.evaluate(limit=>{const s=window.__cadence;s.limit=limit;s.due=performance.now();s.records=[];s.active=true;},limit);
      await page.waitForTimeout(2500);
      const records=await page.evaluate(()=>{window.__cadence.active=false;return window.__cadence.records;});
      const realFPS=(records.length-1)*1000/(records.at(-1).at-records[0].at);
      for(let i=1;i<records.length;i++)assert.equal(records[i].temporalFrame,records[i-1].temporalFrame+1,'only admitted real renders consume temporal frames');
      const row={mode,requestedFPS:limit||'uncapped',realFPS,above60Exercised:realFPS>65,records};rows.push(row);
      assert.ok(records.length>20);
      assert.ok(records.every(r=>r.valid||(r.lastReset==='frame gap'&&r.deltaMs>=200)),
        'idle history stays valid except for a measured long-frame reset');
      if(!limit)assert.ok(realFPS>65,'exercise actual rendering above 60 Hz, not only a logical test clock');
      console.log('CADENCE',mode,limit||'uncapped',realFPS.toFixed(2));
    }
  }
  assert.deepEqual(errors,[]);
}finally{
  await mkdir('docs/verification/jitter',{recursive:true});
  await writeFile('docs/verification/jitter/render-cadence.json',JSON.stringify({rows,errors,
    note:'Headed Edge with test-only uncapped browser flags and renderer admission limits. Counts actual real renders; not monitor scan-out. No extra RAF or simulation loop; no product setting changed.'},null,2)+'\n');
  await browser.close();
}
