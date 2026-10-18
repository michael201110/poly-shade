// Diagnostic-only sweep: identical per-pixel SGSR2 code, different dispatch tiles.
import {openUpscalingHarness} from './upscaling-harness.mjs';
import {SGSR2_CONVERT_WGSL,SGSR2_UPSCALE_WGSL} from '../src/shaders/sgsr2-compute.wgsl.js';
import {writeFile} from 'node:fs/promises';
const scale=Number(process.env.POLYSHADE_SCALE??.67);
const {browser,page,errors}=await openUpscalingHarness();const cases=[];
try {
 await page.evaluate(async({convert,upscale,scale})=>{
  const c=window.__controller,s=c.getSettings();s.overrides={upscaling:'sgsr2-compute',upscaleQuality:'custom',upscaleCustomScale:scale,debugProfile:true};c.notifySettingsChanged();
  window.__freezeGame=true;const r=c.activeRenderer,scene=c.activeScene,camera=c.camera;
  const loop=()=>{r.render(scene,camera);window.__testRAF(loop);};window.__testRAF(loop);
  const gpu=c.backends.gpu,compute=gpu.compute;gpu.profiler.sampleInterval=1;compute.variants={};
  for(const [x,y]of [[8,8],[16,8],[8,16],[16,16]]) {
   const pair=[];
   for(const [code,layout]of [[convert,compute.convertLayout],[upscale,compute.upscaleLayout]]) {
    const module=gpu.device.createShaderModule({code:code.replace(/@workgroup_size\(8,8,1\)/g,`@workgroup_size(${x},${y},1)`)});
    const info=await module.getCompilationInfo();if(info.messages.some(m=>m.type==='error'))throw Error(JSON.stringify(info.messages));
    pair.push(await gpu.device.createComputePipelineAsync({layout:gpu.device.createPipelineLayout({bindGroupLayouts:[layout]}),compute:{module,entryPoint:'main'}}));
   }
   compute.variants[`${x}x${y}`]=pair;
  }
  const reconstruct=compute.reconstruct;
  compute.reconstruct=function(encoder,color,depth,velocity,temporal,profiler){
   const begin=encoder.beginComputePass,shape=this.shape??[8,8];
   encoder.beginComputePass=function(descriptor){const pass=begin.call(this,descriptor),dispatch=pass.dispatchWorkgroups;pass.dispatchWorkgroups=function(x,y,z){const output=descriptor.label==='SGSR2 upscale';return dispatch.call(this,Math.ceil((output?temporal.outputWidth:temporal.width)/shape[0]),Math.ceil((output?temporal.outputHeight:temporal.height)/shape[1]),z);};return pass;};
   try{return reconstruct.call(this,encoder,color,depth,velocity,temporal,profiler);}finally{encoder.beginComputePass=begin;}
  };
 },{convert:SGSR2_CONVERT_WGSL,upscale:SGSR2_UPSCALE_WGSL,scale});
 for(const [x,y]of [[8,8],[16,8],[8,16],[16,16],[8,8]]) {
  console.log(`SGSR2 ${x}x${y}`);
  await page.evaluate(([x,y])=>{const s=window.__controller.backends.gpu.compute;s.shape=[x,y];[s.convert,s.upscale]=s.variants[`${x}x${y}`];},[x,y]);
  await page.waitForTimeout(2000);await page.evaluate(()=>window.__controller.backends.gpu.profiler.samples.clear());await page.waitForTimeout(5000);
  cases.push({workgroup:[x,y],profile:await page.evaluate(()=>window.__controller.backends.gpu.profiler.report())});
 }
}finally{await writeFile(`${process.env.TEMP}/polyshade-workgroups.json`,JSON.stringify({date:new Date().toISOString(),viewport:process.env.POLYSHADE_VIEWPORT??'1280x720',scale,cases,errors},null,2));await browser.close();}
console.log(JSON.stringify({cases,errors},null,2));
