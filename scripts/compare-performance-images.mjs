// Paired, deterministic captures and GPU pass timings. These are secondary to
// the live input tests in profile-gameplay; a frozen view cannot prove latency.
import { openUpscalingHarness } from './upscaling-harness.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { PNG } from 'pngjs';
import assert from 'node:assert/strict';
const output=`${process.env.TEMP}/polyshade-performance/${process.env.POLYSHADE_COMPARE_LABEL??'paired-clean'}`;
await mkdir(output,{recursive:true});
const variants=(process.env.POLYSHADE_COMPARE_VARIANTS??'baseline,rays-quarter,hoisted-uniform,sky-depth,sgsr-unroll,ao-scalar,f16-tile,uniform-batch').split(',');
const resolutions=(process.env.POLYSHADE_RESOLUTIONS??'1280x720,1920x1080,2560x1440,3840x2160').split(',');
const scales=(process.env.POLYSHADE_SCALES??'1,.5').split(',').map(Number);
const report={date:new Date().toISOString(),method:'Frozen Summer 1, identical camera and car, frozen cloud time. Motion blur remains enabled with zero camera/car motion. Exactly 32 temporal samples per setting, diagnostics await completion between captured frames, outside ordinary gameplay. These captures do not establish live responsiveness.',cases:[]};
let state;
for(const variant of variants){
 process.env.POLYSHADE_BUNDLE=variant==='baseline'?'0.5.6/main.mod.js':`${process.env.TEMP}/polyshade-experiments/${variant}.js`;
 const {browser,page,errors}=await openUpscalingHarness();
 try{
  await page.keyboard.press('End');
  await page.addStyleTag({content:'*{visibility:hidden!important}#polyshade-webgpu{visibility:visible!important}'});
  state??=await page.evaluate(()=>{const c=window.__controller.camera;return{position:c.position.toArray(),quaternion:c.quaternion.toArray(),near:c.near,far:c.far};});
  await page.evaluate(state=>{
   window.__freezeGame=true;const c=window.__controller,cam=c.camera;
   cam.position.fromArray(state.position);cam.quaternion.fromArray(state.quaternion);cam.near=state.near;cam.far=state.far;cam.updateMatrixWorld(true);
   const g=c.backends.gpu,sky=g.scene.syncSky,write=g.device.queue.writeBuffer;
   for(const material of c.sceneState.originalMaterials.values())for(const m of [].concat(material))if(m?.name==='Main')m.color?.setRGB(0,.5,0);
   for(const [source,mirror]of g.scene.materials)if(source.name==='Main'){
    source.color.setRGB(0,.5,0);const secondary=mirror.userData.carColours?.secondary.value;
    if(secondary?.setRGB)secondary.setRGB(0,.5,0);else secondary?.set(0,.5,0);
   }
   g.scene.syncSky=function(...args){sky.apply(this,args);if(this.skyUniforms)this.skyUniforms.time.value=0;};
   g.device.queue.writeBuffer=function(buffer,offset,data,...rest){if(buffer===g.passes.uniform)data[161]=0;return write.call(this,buffer,offset,data,...rest);};
   g.profiler.sampleInterval=1;
  },state);
  for(const resolution of resolutions){
   const [width,height]=resolution.split('x').map(Number);await page.setViewportSize({width,height});
   for(const scale of scales){
    const name=`${resolution}-${scale===1?'native':'sgsr50'}`;
    console.log(`paired ${variant}: ${name}`);
    const result=await page.evaluate(async({scale,width,height})=>{
     const c=window.__controller,s=c.getSettings(),cam=c.camera,g=c.backends.gpu;
     // Resize is normally handled by the frozen game loop; update both native
     // backing resolution and projection explicitly for deterministic captures.
     c.activeRenderer.setSize(width,height,true);cam.aspect=width/height;cam.updateProjectionMatrix();
     s.preset='cinematic';s.overrides={upscaling:scale===1?'native':'sgsr2-compute',upscaleQuality:'custom',upscaleCustomScale:scale,debugProfile:true};c.notifySettingsChanged();
     g.temporal.invalidate('paired capture');g.profiler.samples.clear();
     for(let i=0;i<32;i++){
      c.activeRenderer.render(c.activeScene,cam);
      // Capture-only synchronization. No game simulation is running here.
      await g.device.queue.onSubmittedWorkDone();
     }
     const rect=g.canvas.getBoundingClientRect();
     return{gpu:g.report(),camera:cam.position.toArray(),canvasCSS:[rect.width,rect.height],heap:performance.memory?.usedJSHeapSize};
    },{scale,width,height});
    assert.deepEqual(result.gpu.output,[width,height]);
    assert.deepEqual(result.canvasCSS,[width,height],'capture must not downscale the canvas in CSS');
    const file=`${output}/${variant}-${name}.png`;await page.screenshot({path:file});
    let difference=null;
    if(variant!=='baseline'){
     const a=PNG.sync.read(await readFile(`${output}/baseline-${name}.png`)),b=PNG.sync.read(await readFile(file));
     assert.equal(a.width,b.width);assert.equal(a.height,b.height);
     let total=0,squared=0,changed8=0,max=0;const bins=new Uint32Array(256);
     for(let i=0;i<a.data.length;i+=4){let pixelMax=0;for(let k=0;k<3;k++){const d=Math.abs(a.data[i+k]-b.data[i+k]);total+=d;squared+=d*d;pixelMax=Math.max(pixelMax,d);max=Math.max(max,d);bins[d]++;}if(pixelMax>8)changed8++;}
     const count=a.width*a.height*3;let running=0,p99=0;for(let i=0;i<256;i++){running+=bins[i];if(running>=count*.99){p99=i;break;}}
     difference={meanAbsolute:total/count,rmse:Math.sqrt(squared/count),p99,max,pixelsOver8:changed8/(a.width*a.height)};
    }
    report.cases.push({variant,name,...result,difference});
    await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));
    console.log(JSON.stringify({variant,name,difference,total:result.gpu.profile.passes.total}));
   }
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
}
