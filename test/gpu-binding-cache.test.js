import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three/src/Three.WebGPU.js';
import {GPUPasses} from '../src/rendering/webgpu/passes.js';
import {SGSR2Compute} from '../src/rendering/sgsr2-compute.js';

function fixture(){
  globalThis.GPUBufferUsage={UNIFORM:1,COPY_DST:2};globalThis.GPUShaderStage={VERTEX:1,FRAGMENT:2,COMPUTE:4};
  let groups=0,views=0;const bound=[];
  const texture=()=>({createView(){views++;return {texture:this};}});
  const pass=()=>({setPipeline(){},setBindGroup(i,g){bound.push(g);},draw(){},dispatchWorkgroups(){},end(){}});
  const encoder={beginRenderPass:pass,beginComputePass:pass,finish(){return {};}};
  const device={createBuffer(){return {destroy(){}};},createSampler(){return {};},createBindGroupLayout(){return {};},createPipelineLayout(){return {};},
    createBindGroup(d){groups++;return d;},createCommandEncoder(){return encoder;},queue:{submit(){},writeBuffer(){}}};
  const targets=new Map(),resources={resizes:0,get(name,width,height){let r=targets.get(name);if(!r||r.width!==width||r.height!==height){r={texture:texture(),width,height};r.view=r.texture.createView();targets.set(name,r);}return r;}};
  return {device,resources,encoder,texture,bound,counts:()=>({groups,views})};
}

test('post bindings and sampled views reuse stable resources; edits, aliases and resize invalidate safely',()=>{
  const f=fixture(),p=new GPUPasses(f.device,f.resources);p.pipelines.set('grade',{});
  const target=f.resources.get('target',16,16),color=f.texture(),depth=f.texture(),inputs={color,depth};
  p.draw(f.encoder,'grade',target,inputs);const first=f.counts();
  for(let i=0;i<60;i++)p.draw(f.encoder,'grade',target,inputs);
  assert.deepEqual(f.counts(),first);
  inputs.color=target;p.draw(f.encoder,'grade',target,inputs);
  assert.equal(f.bound.at(-1).entries.find(e=>e.binding===1).resource,p.zero.view);
  inputs.color=color;inputs.depth=f.texture();p.draw(f.encoder,'grade',target,inputs);
  assert.equal(f.counts().groups,first.groups+2);
  f.resources.resizes++;p.draw(f.encoder,'grade',target,inputs);assert.equal(f.counts().groups,first.groups+3);
  assert.equal(p.groups.size,1);p.dispose();assert.equal(p.groups.size,0);
});

test('SGSR2 caches both ping-pong bindings and refreshes them on attachment identity or size changes',()=>{
  const f=fixture(),c=new SGSR2Compute(f.device,f.resources);
  c.convertLayout={};c.upscaleLayout={};c.convert={};c.upscale={};
  const temporal={width:32,height:24,outputWidth:64,outputHeight:48,jitter:new T.Vector2(),jitterUV:new T.Vector4(),projection:new T.Matrix4(),stillFrames:10,valid:true};
  let color=f.texture();const depth=f.texture(),velocity=f.resources.get('velocity',32,24);
  c.reconstruct(f.encoder,color,depth,velocity,temporal);const first=f.counts();assert.equal(first.groups,3);
  const readHistory=g=>g.entries.find(e=>e.binding===1).resource;
  const writeHistory=g=>g.entries.find(e=>e.binding===6).resource;
  assert.equal(readHistory(c.upscaleGroups[0]),writeHistory(c.upscaleGroups[1]));
  assert.notEqual(readHistory(c.upscaleGroups[0]),writeHistory(c.upscaleGroups[0]));
  for(let i=0;i<60;i++)c.reconstruct(f.encoder,color,depth,velocity,temporal);
  assert.deepEqual(f.counts(),first);
  color=f.texture();c.reconstruct(f.encoder,color,depth,velocity,temporal);assert.equal(f.counts().groups,6);
  temporal.width=31;c.reconstruct(f.encoder,color,depth,velocity,temporal);assert.equal(f.counts().groups,9);
  c.dispose();assert.equal(c.bindingTextures,null);
});
