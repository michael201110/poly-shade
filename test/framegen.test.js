import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FramePresenter} from '../src/rendering/framegen/presenter.js';
import {bufferImages} from '../scripts/fg/adapt-resources.mjs';
import {FG_SHADERS} from '../src/rendering/framegen/shaders.js';
import {FSR31FrameGeneration} from '../src/rendering/framegen/frame-generation.js';
import {validateOption} from '../src/settings.js';

test('FG presentation alternates a midpoint and its endpoint without simulation ticks',()=>{
  const p=new FramePresenter(),key={},result={valid:true,frameIndex:10,real:{id:2},generated:{id:1}},inputs={color:{id:0},depth:{id:3}};
  assert.equal(p.tick(100,true,key),'render');
  assert.equal(p.generated(result,inputs,100).kind,'generated');p.presented('generated',100);
  assert.equal(p.report().pending,1);
  assert.equal(p.tick(100+1000/60,true,key),'present-real');
  const endpoint=p.takeReal(100+1000/60);assert.equal(endpoint.inputs.color,result.real);assert.equal(endpoint.inputs.depth,inputs.depth);
  p.presented('real',100+1000/60);assert.equal(p.report().pending,0);
  assert.equal(p.tick(100+2000/60,true,key),'render');
  assert.equal(inputs.color.id,0);assert.equal(p.report().generatedFrames,1);assert.equal(p.report().presentations,2);
});
test('FG cuts and stale frames discard pending presentation, never build a backlog',()=>{
  const p=new FramePresenter(),key={},r={valid:true,real:{},generated:{}};
  p.tick(100,true,key);p.generated(r,{},100);
  p.tick(120,true,{});assert.equal(p.pending,null);
  p.generated(r,{},120);assert.equal(p.takeReal(250),null);assert.equal(p.report().dropped,2);
  p.generated(r,{},260);p.tick(270,false,key);assert.equal(p.pending,null);
  assert.equal(p.tick(271,false,key),'render');
});
test('smooth FG presents the prior endpoint before new GPU work and the midpoint on the next RAF',()=>{
  const p=new FramePresenter(),key={},result={valid:true,real:{id:2},generated:{id:1}};
  p.tick(100,true,key,25,'smooth');assert.equal(p.generated(result,{},100).kind,'hold');
  assert.equal(p.tick(100+1000/60,true,key,25,'smooth'),'present-generated');
  assert.equal(p.takeGenerated(100+1000/60).inputs.color.id,1);
  assert.equal(p.tick(100+2000/60,true,key,25,'smooth'),'render');
  assert.equal(p.takeReal(100+2000/60).inputs.color.id,2);
  assert.equal(p.pending,null);assert.ok(Math.abs(p.report().nominalAddedLatencyMs-2000/60)<.1);
});
test('FG warmup/reset uses the real image and low real rates pause without periodic retry stalls',()=>{
  const p=new FramePresenter(),key={},r={valid:false,real:{},generated:{}};
  p.tick(100,true,key);assert.equal(p.generated(r,{},100).kind,'real');assert.equal(p.pending,null);
  for(let t=150;t<3000;t+=50){p.tick(t,true,key);p.realRendered(t);}
  assert.equal(p.active,false);assert.equal(p.report().suspensions,1);assert.equal(p.paused,true);
  for(let t=3000;t<30000;t+=16)p.tick(t,true,key);
  assert.equal(p.active,false);p.tick(30001,true,{});assert.equal(p.active,true);
});
test('FG fixed presentation history stays bounded and options validate',()=>{
  const p=new FramePresenter();for(let i=0;i<500;i++)p.presented('real',i*1000/60);
  assert.equal(p.sampleCount,120);assert.ok(Math.abs(p.report().submittedPresentationFPS-60)<.001);
  assert.equal(validateOption('frameGeneration',false),false);assert.equal(validateOption('fgMinimumFPS',1),25);
  assert.equal(validateOption('frameGenerationDebug','optical-flow'),'optical-flow');
});
test('FG unsupported hardware rejects initialization without allocating frame resources',async()=>{
  const fg=new FSR31FrameGeneration({features:new Set(),limits:{maxStorageTexturesPerShaderStage:6},createSampler(){return{};}});
  await assert.rejects(fg.init(),/requires WebGPU subgroups/);
  assert.equal(fg.report().estimatedOwnedBytes,0);fg.dispose();assert.equal(fg.ready,false);
});
test('FG atomic buffer adaptation preserves two-dimensional bounds and signed flow precision',()=>{
  const scalar=`#if defined(FFX_GPU)\nRWTexture2D<FfxUInt32> rw_game_motion_vector_field_x : register(u0);\nvoid X(int2 p,uint v){InterlockedMax(rw_game_motion_vector_field_x[p],v);uint a=rw_game_motion_vector_field_x[p];}`;
  const adapted=bufferImages(scalar,'frameinterpolation');
  assert.match(adapted,/RWStructuredBuffer<FfxUInt32>/);assert.match(adapted,/p\) < GetMaxRenderSize\(\)/);
  assert.match(adapted,/\.y \* GetMaxRenderSize\(\).x/);assert.match(adapted,/PolyLoad_rw_game_motion_vector_field_x/);
  const flow=bufferImages(`#if defined(FFX_GPU)\nRWTexture2D<FfxInt32x2> rw_optical_flow : register(u0);\nvoid X(int2 p,int2 v){rw_optical_flow[p] = v;}`,'opticalflow');
  assert.match(flow,/clamp\(v,-32768,32767\)/);assert.match(flow,/polyFlowSize/);
});
test('FG ships the full official AMD stage set and introduces no physics hooks or GPU waits',async()=>{
  assert.equal(Object.keys(FG_SHADERS).length,20);
  for(const code of Object.values(FG_SHADERS))assert.match(code,/@compute/);
  const generated=await readFile(new URL('../src/rendering/framegen/generated/frameinterpolation_pass.wgsl.js',import.meta.url),'utf8');
  assert.match(generated,/AMD FidelityFX SDK v2.3.0/);
  const runtime=await readFile(new URL('../src/rendering/framegen/frame-generation.js',import.meta.url),'utf8');
  const scheduler=await readFile(new URL('../src/rendering/framegen/presenter.js',import.meta.url),'utf8');
  assert.doesNotMatch(runtime,/mapAsync|onSubmittedWorkDone|readPixels|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(scheduler,/requestAnimationFrame|setInterval|setTimeout|window\.|document\.|physics\./);
});
