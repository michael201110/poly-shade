import {SwarmMotion} from '../src/rendering/webgpu/swarm-motion.js';
import {SwarmMotion as BaselineMotion} from 'baseline-motion';

// Real WGSL test-only readback. Both implementations consume the same packets,
// depth and camera history, including changing morphs/counts and resets.
export async function verifySwarm(){
 const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'}),device=await adapter.requestDevice(),errors=[];
 device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
 const old=new BaselineMotion(device),current=new SwarmMotion(device);await old.init();await current.init();
 const size=32,depth=device.createTexture({size:[size,size],format:'depth32float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
 const targets=[0,1].map(()=>{const texture=device.createTexture({size:[size,size],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});return{texture,view:texture.createView()};});
 const identity=()=>({elements:new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])});
 const positions=new Float32Array([-.25,-.3,.5,.25,-.3,.5,0,.3,.5, -.25,-.3,.5,.25,-.3,.5,0,.3,.5]);
 const attribute=array=>({array,itemSize:3,count:array.length/3,getX(i){return this.array[i*3];},getY(i){return this.array[i*3+1];},getZ(i){return this.array[i*3+2];}});
 const morphs=Array.from({length:4},(_,m)=>attribute(Float32Array.from(positions,(_,i)=>i%3===0?(m+1)*.005:0)));
 const groups=[0,2].map(kind=>{const matrices=new Float32Array(48);for(let i=0;i<3;i++)matrices.set(identity().elements,i*16);return{kind,mesh:{visible:true,count:3,instanceMatrix:{array:matrices,count:3},geometry:{attributes:{position:attribute(positions),...Object.fromEntries(morphs.map((a,i)=>['swarmMorph'+i,a]))}}},parameters:{array:new Float32Array(12),version:0}};});
 const registry={sources:new Map([['test',{groups}]])},temporal={currentJitteredVP:identity(),previousJitteredVP:identity(),previousInverseProjection:identity(),jitterUV:{x:0,y:0,z:0,w:0},valid:false};
 const bytes=256*size,read=device.createBuffer({size:bytes*2,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),cases=[];
 for(let frame=0;frame<7;frame++){
  temporal.valid=frame!==0&&frame!==4;
  temporal.previousJitteredVP.elements[12]=frame*.002;
  for(const [g,row]of groups.entries()){
   row.mesh.count=frame===2?1:3;
   for(let i=0;i<3;i++){row.mesh.instanceMatrix.array[i*16+12]=(i-1)*.52+frame*.005;row.mesh.instanceMatrix.array[i*16+13]=g*.08;}
   if(frame!==3){row.parameters.array.fill(frame*.03);row.parameters.version++;}
  }
  const encoder=device.createCommandEncoder();encoder.beginRenderPass({colorAttachments:[],depthStencilAttachment:{view:depth.createView(),depthLoadOp:'clear',depthStoreOp:'store',depthClearValue:.5}}).end();
  for(const t of targets)encoder.beginRenderPass({colorAttachments:[{view:t.view,loadOp:'clear',storeOp:'store',clearValue:[0,0,0,0]}]}).end();
  old.render(encoder,targets[0],depth,registry,temporal);current.render(encoder,targets[1],depth,registry,temporal);
  targets.forEach((t,i)=>encoder.copyTextureToBuffer({texture:t.texture},{buffer:read,offset:i*bytes,bytesPerRow:256},[size,size]));
  device.queue.submit([encoder.finish()]);await read.mapAsync(GPUMapMode.READ);
  const data=new Uint8Array(read.getMappedRange());let changed=0,nonzero=0;
  for(let i=0;i<bytes;i++){if(data[i]!==data[bytes+i])changed++;if(data[i])nonzero++;}
  cases.push({frame,changedBytes:changed,nonzeroBytes:nonzero});read.unmap();
 }
 old.dispose();current.dispose();depth.destroy();for(const t of targets)t.texture.destroy();read.destroy();device.destroy();return{cases,errors};
}
