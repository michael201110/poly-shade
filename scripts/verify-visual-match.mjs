// Compare current WebGPU with the immutable 0.4.0 WebGL reference.
import {openUpscalingHarness} from './upscaling-harness.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
import assert from 'node:assert/strict';
const output=`${process.env.TEMP}/polyshade-visual-match`;
await mkdir(output,{recursive:true});
const report={date:new Date().toISOString(),method:'Frozen offline Summer 1 scene; shared camera, cloud animation and motion blur disabled; native resolution, same presets.',cases:[]};
let cameraState;
for(const reference of [true,false]){
 const backend=reference?'webgl':'webgpu';
 const {browser,page,errors}=await openUpscalingHarness({backend,reference});
 try {
  await page.evaluate(state=>{
   window.__freezeGame=true;
   const c=window.__controller,scene=c.activeScene,camera=c.camera,renderer=c.activeRenderer;
   if(state){camera.position.fromArray(state.position);camera.quaternion.fromArray(state.quaternion);camera.projectionMatrix.fromArray(state.projection);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();camera.near=state.near;camera.far=state.far;camera.updateMatrixWorld(true);}
   const loop=()=>{renderer.render(scene,camera);window.__testRAF(loop);};window.__testRAF(loop);
  },cameraState);
  cameraState??=await page.evaluate(()=>{const c=window.__controller.camera;return {position:c.position.toArray(),quaternion:c.quaternion.toArray(),projection:c.projectionMatrix.toArray(),near:c.near,far:c.far};});
  await page.locator('#polyshade-panel button').filter({hasText:/^Hide$/}).click();
  for(const preset of ['cinematic','clear-day','overcast','recording']){
   await page.evaluate(({preset,backend})=>{const c=window.__controller,s=c.getSettings();s.preset=preset;s.overrides={renderBackend:backend,upscaling:'native',motionBlurEnabled:false,cloudsEnabled:false};c.notifySettingsChanged();},{preset,backend});
   await page.waitForTimeout(2000);
   const diagnostic=await page.evaluate(()=>({backend:window.__controller.backends.active,failure:window.__controller.backends.failure}));
   assert.equal(diagnostic.failure,undefined);
   await page.screenshot({path:`${output}/${preset}-${backend}.png`});report.cases.push({preset,...diagnostic});
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
}
report.skyComparison=[];
for(const preset of ['cinematic','clear-day','overcast','recording']){
 const a=PNG.sync.read(await readFile(`${output}/${preset}-webgl.png`)),b=PNG.sync.read(await readFile(`${output}/${preset}-webgpu.png`));
 let total=0,count=0;const meansA=[0,0,0],meansB=[0,0,0];
 // Below the native first-run tutorial, above mountains: compare 3D sky only.
 for(let y=280;y<320;y++)for(let x=100;x<800;x++){const i=(y*a.width+x)*4;for(let c=0;c<3;c++){total+=Math.abs(a.data[i+c]-b.data[i+c]);meansA[c]+=a.data[i+c];meansB[c]+=b.data[i+c];}count++;}
 report.skyComparison.push({preset,meanAbsoluteChannelError:total/(count*3),referenceRGB:meansA.map(x=>x/count),webgpuRGB:meansB.map(x=>x/count)});
 assert.ok(total/(count*3)<5, `${preset} sky matches the reference within five display-code values`);
}
await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
console.log(`Matched-scene captures: ${output}`);
