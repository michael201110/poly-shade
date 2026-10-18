// Real Three/WebGPU MRT blending: invisible transparency must not erase history.
import {openUpscalingHarness} from './upscaling-harness.mjs';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
process.env.POLYSHADE_BUNDLE??='experimental/0.6.0-fsr31.1/main.mod.js';
process.env.POLYSHADE_HEADED??='1';
const {browser,page,errors}=await openUpscalingHarness();
try {
  const result=await page.evaluate(async()=>{
    window.__freezeGame=true;
    const c=window.__controller,g=c.backends.gpu,T=c.three;
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(60,16/9,.1,100);
    const material=new T.MeshLambertMaterial({color:0xff0000,transparent:true,opacity:0,depthWrite:false});
    const mesh=new T.Mesh(new T.PlaneGeometry(8,6),material);mesh.position.z=-5;scene.add(mesh);scene.updateMatrixWorld(true);
    const s={...c.resolveSettings(),upscaling:'fsr31',upscaleQuality:'performance',frameGeneration:false,
      shadowQuality:'off',aoEnabled:false,bloomEnabled:false,sunRaysEnabled:false,volumetricEnabled:false,
      atmosphereEnabled:false,lensFlareEnabled:false,motionBlurEnabled:false};
    const frame=async()=>{
      const before=g.frames;
      for(let attempt=0;g.frames===before;attempt++){
        if(attempt>400)throw Error('No FSR source render');
        await new Promise(resolve=>window.__testRAF(()=>{g.render(scene,camera,s,{palette:c.cinematic.palette,sky:null});resolve();}));
        await g.device.queue.onSubmittedWorkDone();
      }
      if(g.fsrFailure)throw Error(g.fsrFailure);
    };
    for(let i=0;i<12||g.selection.backend!=='fsr31';i++)await frame();
    const device=g.device,output=device.createBuffer({size:16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});
    const read=device.createBuffer({size:16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    const code='@group(0)@binding(0)var mask:texture_2d<f32>;@group(0)@binding(1)var<storage,read_write> value:vec4f;@compute @workgroup_size(1)fn main(){value=textureLoad(mask,vec2i(textureDimensions(mask)/2u),0);}';
    const pipeline=await device.createComputePipelineAsync({layout:'auto',compute:{module:device.createShaderModule({code}),entryPoint:'main'}});
    const values=[];
    for(const opacity of [0,.5,1]) {
      material.opacity=opacity;await frame();await frame();
      const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:g.fsrMaskTexture.createView()},{binding:1,resource:{buffer:output}}]});
      const e=device.createCommandEncoder(),p=e.beginComputePass();p.setPipeline(pipeline);p.setBindGroup(0,group);p.dispatchWorkgroups(1);p.end();e.copyBufferToBuffer(output,0,read,0,16);device.queue.submit([e.finish()]);
      await read.mapAsync(GPUMapMode.READ);values.push({opacity,mask:Array.from(new Float32Array(read.getMappedRange()))});read.unmap();
    }
    output.destroy();read.destroy();return values;
  });
  assert.ok(result[0].mask[0]<1/255,'fully invisible fragments contribute zero reactivity');
  assert.ok(Math.abs(result[1].mask[0]-.25)<2/255,'partial transparency is blended using its actual coverage');
  assert.ok(result[2].mask[0]<1/255,'opaque unlit geometry is nonreactive');
  assert.deepEqual(errors,[]);
  await mkdir('docs/verification/jitter',{recursive:true});
  await writeFile('docs/verification/jitter/fsr-mask.json',JSON.stringify({result,errors},null,2)+'\n');
  console.log('PASS',JSON.stringify(result));
}finally{await browser.close();}
