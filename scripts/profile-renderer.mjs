// Development-only fixed-view, full-quality comparison in a fresh headed Edge.
// Select an immutable release or candidate with POLYSHADE_BUNDLE.
import {openUpscalingHarness} from './upscaling-harness.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {freemem,totalmem} from 'node:os';
import assert from 'node:assert/strict';
const label=process.env.POLYSHADE_PROFILE_LABEL??'candidate';
const output=`${process.env.TEMP}/polyshade-performance/${label}`;
await mkdir(output,{recursive:true});
const release=JSON.parse(await readFile('manifest.json','utf8')).latest['0.6.3'];
const bundle=process.env.POLYSHADE_BUNDLE??`${release}/main.mod.js`;
const report={label,date:new Date().toISOString(),bundle,
 sha256:createHash('sha256').update(await readFile(bundle)).digest('hex'),
 outputResolution:process.env.POLYSHADE_VIEWPORT??'1280x720',
 method:'Fresh Edge; offline Summer 1 view; fixed green primary/white secondary paint; shared camera via POLYSHADE_CAMERA_FILE. Full Golden Hour settings, shadows and motion blur. Three seconds warmup, ten seconds sampling per case. Timestamp queries sampled asynchronously every rendered frame in diagnostic runs; normal runtime cadence remains 1 in 12 frames.',
 ram:{total:totalmem(),free:freemem()},cases:[]};
function hardware(){try{return execFileSync('nvidia-smi',['--query-gpu=name,driver_version,temperature.gpu,utilization.gpu,memory.used,clocks.gr,clocks.mem','--format=csv'],{encoding:'utf8'}).trim();}catch{return 'unavailable';}}
report.hardware=hardware();
const {browser,page,errors}=await openUpscalingHarness();report.browser=browser.version();
try{
 const cameraInput=process.env.POLYSHADE_CAMERA_FILE?JSON.parse(await readFile(process.env.POLYSHADE_CAMERA_FILE,'utf8')).cases[0].camera:null;
 await page.evaluate(state=>{
  const c=window.__controller,r=c.activeRenderer,scene=c.activeScene,camera=c.camera;
  for(const [source,mirror]of c.backends.gpu.scene.materials)if(source.name==='Main'){
   source.color.setRGB(0,.5,0);
   const secondary=mirror.userData.carColours?.secondary.value;
   if(secondary?.setRGB)secondary.setRGB(1,1,1);else secondary?.set(1,1,1);
  }
  if(state){camera.position.fromArray(state.position);camera.quaternion.fromArray(state.quaternion);camera.projectionMatrix.fromArray(state.projection);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();camera.near=state.near;camera.far=state.far;camera.updateMatrixWorld(true);}
  window.__freezeGame=true;
  const loop=()=>{r.render(scene,camera);window.__testRAF(loop);};window.__testRAF(loop);
  const g=c.backends.gpu,originals=[],metrics={times:{},frames:[],last:0};
  const wrap=(o,key,name,frame=false)=>{if(!o||typeof o[key]!=='function')return;const f=o[key];let depth=0;originals.push([o,key,f]);o[key]=function(...args){const start=performance.now(),outer=depth++===0;try{return f.apply(this,args);}finally{depth--;const end=performance.now(),t=metrics.times[name]??={calls:0,ms:0};t.calls++;if(outer)t.ms+=end-start;if(name==='uploads'){const element=args[2]?.BYTES_PER_ELEMENT??1;t.bytes=(t.bytes??0)+(args[4]===undefined?args[2].byteLength-(args[3]??0)*element:args[4]*element);}if(frame){metrics.frames.push({cpu:end-start,gap:metrics.last?end-metrics.last:0});metrics.last=end;}}};};
  for(const [o,k,n]of [[g.scene,'sync','sync'],[g.scene,'material','materials'],[g.scene,'geometry','geometry'],[g.scene.sourceIndex,'get','discovery'],[g.shadows,'prepare','shadowCPU'],[g.renderer,'render','three'],[g.renderer,'_projectObject','renderListAndCulling'],[g.renderer,'_renderObjects','drawEncoding'],[g.scene.scene,'updateMatrixWorld','mirrorMatrices'],[g.passes,'draw','postEncoding'],[g.compute,'reconstruct','computeEncoding'],[g.motion,'render','velocityCPU'],[g.swarmMotion,'render','swarmVelocityCPU'],[g.device,'createBindGroup','bindGroups'],[g.device,'createRenderPipelineAsync','renderPipelines'],[g.device,'createComputePipelineAsync','computePipelines'],[g.device,'createTexture','textures'],[g.device,'createBuffer','buffers'],[g.device,'createCommandEncoder','encoders'],[g.device.queue,'submit','submissions'],[g.device.queue,'writeBuffer','uploads'],[GPUTexture.prototype,'createView','textureViews'],[GPURenderPassEncoder.prototype,'setPipeline','pipelineBinds']])wrap(o,k,n);
  g.profiler.sampleInterval=1;
  const descriptor=g.profiler.descriptor;originals.push([g.profiler,'descriptor',descriptor]);
  g.profiler.descriptor=function(name){if(name==='scene'&&g.scene.sun.shadow.shadowNode.lights.some(l=>l.shadow.map===g.renderer.getRenderTarget()))name='shadows';return descriptor.call(this,name);};
  wrap(g,'render','rendererCPU',true);c.__performance={metrics,originals};
 },cameraInput);
 for(const [name,preset,mode,scale]of [
  ['golden-native','cinematic','native',1],['golden-sgsr77','cinematic','sgsr2-compute',.77],
  ['golden-sgsr67','cinematic','sgsr2-compute',.67],['golden-sgsr59','cinematic','sgsr2-compute',.59],['golden-sgsr50','cinematic','sgsr2-compute',.5],
  ['capture-native','recording','native',1],['capture-sgsr67','recording','sgsr2-compute',.67]]){
  if(process.env.POLYSHADE_CASES&&!process.env.POLYSHADE_CASES.split(',').includes(name))continue;
  console.log(`${label}: ${name}`);
  await page.evaluate(({preset,mode,scale})=>{const c=window.__controller,s=c.getSettings();s.preset=preset;s.overrides={upscaling:mode,upscaleQuality:'custom',upscaleCustomScale:scale,debugProfile:true};c.notifySettingsChanged();},{preset,mode,scale});
  await page.waitForTimeout(3000);
  await page.evaluate(()=>{const c=window.__controller,p=c.__performance.metrics;p.times={};p.frames=[];p.last=0;c.backends.gpu.profiler.samples.clear();});
  const hwBefore=hardware();await page.waitForTimeout(10000);
 const result=await page.evaluate(()=>{
   const c=window.__controller,g=c.backends.gpu,p=c.__performance.metrics;
   const stats=a=>{a.sort((a,b)=>a-b);return {samples:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)]};};
   const gpu=g.report(),bytesPerPixel={rgba16float:8,r32uint:4,r32float:4,depth32float:4,rgba8unorm:4,bgra8unorm:4};
   const inventory=gpu.resources.map(r=>({...r,bytesPerPixel:bytesPerPixel[r.format]??null,estimatedBytes:bytesPerPixel[r.format]==null?null:r.width*r.height*bytesPerPixel[r.format]}));
   const shadowMaps=g.scene.sun.shadow.shadowNode.lights.flatMap(light=>{const map=light.shadow?.map;if(!map)return[];const texture=map.texture,bpp=texture.type===1016?8:4,depthBytes=map.depthBuffer?4:0;return[{width:map.width,height:map.height,type:texture.type,bytesPerPixel:bpp,depthBytesPerPixel:depthBytes,samples:map.samples??0,estimatedBytes:map.width*map.height*(bpp+depthBytes)}];});
   const scenePixels=g.target.width*g.target.height,displayPixels=g.canvas.width*g.canvas.height;
   const logicalBytes=inventory.reduce((sum,r)=>sum+(r.estimatedBytes??0),0)+scenePixels*(8+4)+displayPixels*4+shadowMaps.reduce((sum,r)=>sum+r.estimatedBytes,0);
   return {outputCanvas:[g.canvas.width,g.canvas.height],internalScene:[g.target.width,g.target.height],adapter:Object.fromEntries(['vendor','architecture','device','description'].map(k=>[k,g.device.adapterInfo?.[k]??null])),features:[...g.device.features],settings:structuredClone(c.resolveSettings()),frame:stats(p.frames.filter(f=>f.gap>0).map(f=>f.gap)),cpu:stats(p.frames.map(f=>f.cpu)),timings:p.times,heap:performance.memory?.usedJSHeapSize,gpu,resourceInventory:inventory,sceneAttachments:{colour:{width:g.target.width,height:g.target.height,format:'rgba16float',bytesPerPixel:8,estimatedBytes:scenePixels*8},depth:{width:g.target.width,height:g.target.height,format:'depth32float',bytesPerPixel:4,estimatedBytes:scenePixels*4},samples:0},shadowMaps,logicalOwnedTextureBytes:logicalBytes,swapchainFormat:navigator.gpu.getPreferredCanvasFormat(),indexEvents:g.scene.sourceIndex?.events,allocations:g.resources.allocations,resizes:g.resources.resizes,
    camera:{position:c.camera.position.toArray(),quaternion:c.camera.quaternion.toArray(),projection:c.camera.projectionMatrix.toArray(),near:c.camera.near,far:c.camera.far},
    paint:[...g.scene.materials].filter(([s])=>s.name==='Main').map(([s,m])=>({source:s.color.toArray(),mirror:m.color.toArray(),secondary:m.userData.carColours?.colour.value.toArray()}))};
  });
  const outputSize=process.env.POLYSHADE_VIEWPORT?.match(/^(\d+)x(\d+)$/)?.slice(1).map(Number);
  if(outputSize){
   assert.deepEqual(result.outputCanvas,outputSize,'benchmark output must match the requested browser canvas resolution');
   const factor={'golden-native':1,'golden-sgsr77':.77,'golden-sgsr67':.67,'golden-sgsr59':.59,'golden-sgsr50':.5}[name];
   if(factor!==undefined)assert.deepEqual(result.internalScene,outputSize.map(size=>Math.round(size*factor)),`${name} internal dimensions`);
  }
  report.cases.push({name,...result,hardwareBefore:hwBefore,hardwareAfter:hardware(),freeRAM:freemem()});
  // Freeze only cloud time for deterministic full-quality image comparisons.
  await page.evaluate(()=>{const g=window.__controller.backends.gpu;const sky=g.scene.syncSky,write=g.device.queue.writeBuffer;g.scene.syncSky=function(...a){sky.apply(this,a);if(this.skyUniforms)this.skyUniforms.time.value=0;};g.device.queue.writeBuffer=function(buffer,offset,data,...rest){if(buffer===g.passes.uniform)data[161]=0;return write.call(this,buffer,offset,data,...rest);};g.__captureRestore=()=>{g.scene.syncSky=sky;g.device.queue.writeBuffer=write;};});
  await page.waitForTimeout(250);await page.screenshot({path:`${output}/${name}.png`});
  await page.evaluate(()=>window.__controller.backends.gpu.__captureRestore());
  await writeFile(`${output}/report.json`,JSON.stringify({...report,errors},null,2));
 }
 await page.evaluate(()=>{const c=window.__controller;for(const[o,k,f]of c.__performance.originals.reverse())o[k]=f;c.getSettings().enabled=false;c.notifySettingsChanged();});
 await page.waitForTimeout(1000);
 report.disabled=await page.evaluate(async()=>{const r=window.__renderer,f=r.render,frames=[];let last=0;r.render=function(...a){const t=performance.now();try{return f.apply(this,a);}finally{const now=performance.now();frames.push({cpu:now-t,gap:last?now-last:0});last=now;}};await new Promise(r=>setTimeout(r,10000));r.render=f;const stats=a=>{a.sort((a,b)=>a-b);return{samples:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)]};};return{frame:stats(frames.filter(f=>f.gap>0).map(f=>f.gap)),cpu:stats(frames.map(f=>f.cpu)),canvases:document.querySelectorAll('#polyshade-webgpu').length};});
 assert.deepEqual(errors,[],'benchmark requires every game asset and renderer pass to succeed');
 console.log(JSON.stringify({output,cases:report.cases.map(c=>({name:c.name,cpu:c.cpu,frame:c.frame,gpu:c.gpu.profile.passes.total})),errors},null,2));
}finally{await writeFile(`${output}/report.json`,JSON.stringify({...report,errors},null,2));await browser.close();}
