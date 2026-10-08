import assert from 'node:assert/strict';

export async function verifyStability(page, release) {
  await page.evaluate(() => {
    const c = window.__controller, r = c.activeRenderer, g = r.getContext();
    const trace = window.__stability = { programs:0,textures:0,framebuffers:0,lost:0,restored:0,gaps:[],cpu:[] };
    trace.original = { createProgram:g.createProgram,createTexture:g.createTexture,createFramebuffer:g.createFramebuffer,after:c.onFrame };
    for(const [name,counter] of [['createProgram','programs'],['createTexture','textures'],['createFramebuffer','framebuffers']])
      g[name]=function(...args){trace[counter]++;return trace.original[name].apply(this,args);};
    c.onFrame=function(...args){
      const now=performance.now();
      if(trace.last!==undefined)trace.gaps.push(now-trace.last);
      trace.last=now;trace.cpu.push(args[2]);return trace.original.after.apply(this,args);
    };
    trace.onLost=()=>trace.lost++;trace.onRestored=()=>trace.restored++;
    r.domElement.addEventListener('webglcontextlost',trace.onLost);
    r.domElement.addEventListener('webglcontextrestored',trace.onRestored);
    trace.overrides={...c.getSettings().overrides};
    trace.resources=c.cinematic.report().resources;
  });
  try {
    // Exercise the same revision/notification path as the real settings panel.
    for(let i=0;i<20;i++) await page.evaluate(async i => {
      const c=window.__controller;
      c.getSettings().overrides={...window.__stability.overrides,exposure:1+(i%4)*.015,motionBlurExposureMs:22+i*.1};
      c.notifySettingsChanged();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    },i);
    const edits=await page.evaluate(()=>({programs:window.__stability.programs,textures:window.__stability.textures,framebuffers:window.__stability.framebuffers}));
    await page.evaluate(()=>{
      const c=window.__controller;c.getSettings().overrides=window.__stability.overrides;c.notifySettingsChanged();
    });
    await page.waitForTimeout(20000);
    const result=await page.evaluate(edits=>{
      const trace=window.__stability,c=window.__controller,r=c.activeRenderer,g=r.getContext();
      const stats=values=>{values=[...values].sort((a,b)=>a-b);return{samples:values.length,p95:values[Math.ceil(values.length*.95)-1],max:values.at(-1)}};
      const resources=c.cinematic.report().resources;
      return {edits,totalPrograms:trace.programs,totalTextures:trace.textures,totalFramebuffers:trace.framebuffers,
        gaps:stats(trace.gaps),cpu:stats(trace.cpu),lost:trace.lost,restored:trace.restored,
        allocations:resources.allocated-trace.resources.allocated,disposals:resources.disposed-trace.resources.disposed};
    },edits);
    if(release==='0.3.3') {
      assert.equal(result.edits.programs,0,'uniform edits create no shader programs');
      assert.equal(result.edits.textures,0,'uniform edits allocate no GPU textures');
      assert.equal(result.edits.framebuffers,0,'uniform edits allocate no framebuffers');
      assert.equal(result.allocations,0);assert.equal(result.disposals,0);
      assert.equal(result.lost,0);assert.equal(result.restored,0);
      assert.ok(result.gaps.max<1000,'no multi-second recovered freeze in the steady-state sample');
    }
    return result;
  } finally {
    await page.evaluate(()=>{
      const c=window.__controller,r=c.activeRenderer,g=r.getContext(),trace=window.__stability;
      for(const name of ['createProgram','createTexture','createFramebuffer'])g[name]=trace.original[name];
      c.onFrame=trace.original.after;
      r.domElement.removeEventListener('webglcontextlost',trace.onLost);r.domElement.removeEventListener('webglcontextrestored',trace.onRestored);
    });
  }
}
