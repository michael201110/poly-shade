// Full-frame 0.5.0/candidate comparison. Diagnostic-only frozen simulation,
// shared native transforms/paint/camera/cloud time; all preset effects retained.
import {openUpscalingHarness} from './upscaling-harness.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
import assert from 'node:assert/strict';
const output=`${process.env.TEMP}/polyshade-051-visual`;
await mkdir(output,{recursive:true});
const candidate=process.env.POLYSHADE_BUNDLE;
assert.ok(candidate,'POLYSHADE_BUNDLE must identify the candidate bundle');
let state;
const report={method:'Full-frame frozen 0.5.0 versus candidate, shared native transforms, paint, camera, cloud time; full preset effects.',cases:[]};
for(const label of ['baseline','candidate']){
 process.env.POLYSHADE_BUNDLE=label==='baseline'?'0.5.0/main.mod.js':candidate;
 const {browser,page,errors}=await openUpscalingHarness();
 try{
  state=await page.evaluate(state=>{
   const c=window.__controller,g=c.backends.gpu,scene=c.activeScene,camera=c.camera;
   window.__freezeGame=true;
   const nodes=[];scene.traverse(o=>nodes.push(o));
   if(state){
    if(nodes.length!==state.nodes.length)throw Error('Native scene topology differs');
    nodes.forEach((o,i)=>{const s=state.nodes[i];if(o.type!==s.type||o.name!==s.name)throw Error('Native node mismatch '+i);o.position.fromArray(s.p);o.quaternion.fromArray(s.q);o.scale.fromArray(s.s);o.visible=s.v;if(s.m)o.morphTargetInfluences.splice(0,s.m.length,...s.m);o.matrix.fromArray(s.matrix);o.matrixAutoUpdate=s.auto;});
    camera.position.fromArray(state.camera.p);camera.quaternion.fromArray(state.camera.q);camera.projectionMatrix.fromArray(state.camera.projection);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();camera.near=state.camera.near;camera.far=state.camera.far;camera.updateMatrixWorld(true);
   }
   for(const [source,mirror]of g.scene.materials)if(source.name==='Main'){
    source.color.setRGB(0,.5,0);const secondary=mirror.userData.carColours?.secondary.value;
    if(secondary?.setRGB)secondary.setRGB(1,1,1);else secondary?.set(1,1,1);
   }
   const sky=g.scene.syncSky,write=g.device.queue.writeBuffer;
   g.scene.syncSky=function(...a){sky.apply(this,a);if(this.skyUniforms)this.skyUniforms.time.value=0;};
   g.device.queue.writeBuffer=function(buffer,offset,data,...rest){if(buffer===g.passes.uniform)data[161]=0;return write.call(this,buffer,offset,data,...rest);};
   const loop=()=>{c.activeRenderer.render(scene,camera);window.__testRAF(loop);};window.__testRAF(loop);
   return state??{nodes:nodes.map(o=>({type:o.type,name:o.name,p:o.position.toArray(),q:o.quaternion.toArray(),s:o.scale.toArray(),matrix:o.matrix.toArray(),auto:o.matrixAutoUpdate,v:o.visible,m:o.morphTargetInfluences?.slice()})),camera:{p:camera.position.toArray(),q:camera.quaternion.toArray(),projection:camera.projectionMatrix.toArray(),near:camera.near,far:camera.far}};
  },state);
  await page.locator('#polyshade-panel button').filter({hasText:/^Hide$/}).click();
  for(const preset of ['cinematic','clear-day','overcast','recording'])for(const upscaling of ['native','sgsr2-compute']){
   const name=`${preset}-${upscaling}`;
   await page.evaluate(({preset,upscaling})=>{const c=window.__controller,s=c.getSettings();s.preset=preset;s.overrides={upscaling,upscaleQuality:'performance'};c.notifySettingsChanged();},{preset,upscaling});
   await page.waitForTimeout(1500);
   await page.screenshot({path:`${output}/${name}-${label}.png`});
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
}
for(const preset of ['cinematic','clear-day','overcast','recording'])for(const mode of ['native','sgsr2-compute']){
 const name=`${preset}-${mode}`,a=PNG.sync.read(await readFile(`${output}/${name}-baseline.png`)),b=PNG.sync.read(await readFile(`${output}/${name}-candidate.png`));
 let sum=0,max=0,changed=0,over8=0;
 for(let i=0;i<a.data.length;i+=4){let pixel=0;for(let c=0;c<3;c++){const d=Math.abs(a.data[i+c]-b.data[i+c]);sum+=d;max=Math.max(max,d);pixel=Math.max(pixel,d);}if(pixel)changed++;if(pixel>8)over8++;}
 report.cases.push({name,meanAbsoluteChannelError:sum/(a.width*a.height*3),max,changedPixels:changed,pixelsOver8:over8,totalPixels:a.width*a.height});
}
await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
// Tiny raster rounding may differ across fresh WebGPU contexts; a visible
// full-frame change must fail, rather than being hidden by a regional metric.
for(const c of report.cases)assert.ok(c.meanAbsoluteChannelError<1,`${c.name}: full-frame mean difference < one display code value`);
