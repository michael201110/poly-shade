// GPU correctness verifier; shader compilation/readbacks are test-only.
import {chromium} from '@playwright/test';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const synthetic=await build({entryPoints:['scripts/fg/synthetic-entry.js'],bundle:true,write:false,format:'esm'});
const path='src/rendering/framegen/generated';
const shaders=Object.fromEntries(await Promise.all((await readdir(path)).filter(p=>p.endsWith('.wgsl'))
  .map(async p=>[p,await readFile(path+'/'+p,'utf8')])));
const browser=await chromium.launch({channel:'msedge',headless:process.env.POLYSHADE_HEADED!=='1',args:['--force_high_performance_gpu']});
let report;
try {
  const page=await browser.newPage();
  await page.route('https://polyshade.test/**',r=>r.fulfill(r.request().url().endsWith('synthetic.js')?
    {body:synthetic.outputFiles[0].text,contentType:'application/javascript'}:{body:'<!doctype html>',contentType:'text/html'}));
  await page.goto('https://polyshade.test/');
  report=await page.evaluate(async shaders=>{
    const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
    const features=['subgroups','float32-filterable','shader-f16','timestamp-query'].filter(f=>adapter.features.has(f));
    const device=await adapter.requestDevice({requiredFeatures:features,requiredLimits:{maxStorageTexturesPerShaderStage:6}});
    const errors=[],passes=[];
    device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
    try {
      for(const [name,code]of Object.entries(shaders)) {
        device.pushErrorScope('validation');
        const module=device.createShaderModule({code,label:name});
        const info=await module.getCompilationInfo();
        const messages=info.messages.filter(m=>m.type==='error').map(m=>`${m.lineNum}:${m.linePos} ${m.message}`);
        if(!messages.length)try{await device.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'CS'}});}catch(e){messages.push(e.message);}
        const scoped=await device.popErrorScope();if(scoped)messages.push(scoped.message);
        passes.push({name,messages});
      }
      return {features,adapter:{vendor:adapter.info.vendor,architecture:adapter.info.architecture},passes,errors};
    } finally {device.destroy();}
  },shaders);
  for(const p of report.passes)console.log(p.name,p.messages.length?p.messages:'PASS');
  assert.deepEqual(report.errors,[]);
  assert.ok(report.passes.every(p=>!p.messages.length),'All official AMD FG/OF passes must compile on the actual GPU');
  report.syntheticCases=[];
  for(const options of [{},{width:130,height:98,internalWidth:65,internalHeight:64},
    {internalWidth:86,internalHeight:86,speedX:-4,speedY:2}]) {
  const result=await page.evaluate(async options=>{const m=await import('/synthetic.js');return m.verifySynthetic(options);},options);
  report.syntheticCases.push(result);report.synthetic=result;
  console.log('Synthetic',JSON.stringify({options,errors:result.errors,ranges:result.ranges,midpoint:result.midpoint,resize:result.resize,flow:result.centerFlow.slice(0,3)}));
  assert.deepEqual(report.synthetic.errors,[]);
  assert.ok(report.synthetic.ranges.every(r=>!r.nonFinite));
  for(const [i,value]of [.25,.5,.75].entries()) {
    assert.ok(Math.abs(report.synthetic.ranges[i].min-value)<.002);
    assert.ok(Math.abs(report.synthetic.ranges[i].max-value)<.002);
  }
  assert.equal(report.synthetic.flatFlowNonzero,0);
  assert.ok(report.synthetic.midpoint.mae<.03,'Known translation must reconstruct the midpoint');
  assert.ok(report.synthetic.midpoint.currentFrameMAE>.1,'Generated image must not just duplicate the real image');
  assert.equal(report.synthetic.midpoint.nonFinite,0);
  assert.ok(Math.abs(report.synthetic.dilatedMotion[0]+(options.speedX??4)/(options.width??128))<.0001);
  assert.equal(report.synthetic.reset.valid,false);
  assert.equal(report.synthetic.restored.valid,false);
  assert.equal(report.synthetic.released.estimatedOwnedBytes,0);
  assert.equal(report.synthetic.cleanup.estimatedOwnedBytes,0);
  assert.equal(result.resize.valid,false);assert.equal(result.resize.frameIndex,0);assert.equal(result.resize.nonFinite,0);
  assert.deepEqual(result.resize.dimensions,[(options.width??128)+2,(options.height??128)+2]);
  }
  report.synthetic=report.syntheticCases[0];
}finally{
  await mkdir('docs/verification/framegen',{recursive:true});
  await writeFile('docs/verification/framegen/shader-compilation.json',JSON.stringify(report,null,2)+'\n');
  await browser.close();
}
