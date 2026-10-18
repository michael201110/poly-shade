import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { TemporalState, selectUpscaling } from "../src/rendering/temporal-state.js";

test('WebGPU uses top-down jitter and the actual previous rendered projection',()=>{
  const state=new TemporalState(THREE),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,16/9,.1,1000);
  camera.coordinateSystem=THREE.WebGPUCoordinateSystem;camera.updateProjectionMatrix();
  const settings={upscaleJitter:true};state.begin(scene,camera,640,360,1280,720,settings,100);
  const old=state.currentJitteredVP.clone(),oldJitter=state.jitter.clone();state.commit();state.restoreCamera();
  state.begin(scene,camera,640,360,1280,720,settings,116);
  const point=new THREE.Vector4(1,2,-10,1),a=point.clone().applyMatrix4(state.currentJitteredVP),b=point.clone().applyMatrix4(old);
  const x=a.x/a.w-b.x/b.w-2*(state.jitter.x-oldJitter.x)/640;
  const y=a.y/a.w-b.y/b.w+2*(state.jitter.y-oldJitter.y)/360;
  assert.ok(Math.abs(x)<1e-10&&Math.abs(y)<1e-10);assert.ok(state.previousJitteredVP.equals(old));assert.ok(state.stillFrames>0);
  state.restoreCamera();
});

test('Auto and Compute require a real compatible WebGPU backend; Fragment is never mislabelled',()=>{
  const gpu={webgpu:true,compute:true,features:{depthTexture:true}};
  for(const requested of ['auto','sgsr2-compute']){const s=selectUpscaling({upscaling:requested,upscaleQuality:'quality'},gpu);assert.equal(s.backend,'sgsr2-compute');assert.equal(s.scale,.67);assert.equal(s.compute,true);}
  assert.equal(selectUpscaling({upscaling:'sgsr2-fragment'},gpu).backend,'native');
  assert.equal(selectUpscaling({upscaling:'auto'},gpu,true).backend,'native');
  assert.equal(selectUpscaling({upscaling:'auto'},{...gpu,compute:false}).backend,'native');
  assert.equal(selectUpscaling({upscaling:'reduced',upscaleQuality:'performance'},gpu).scale,.5);
});

test("depth reprojection uses the actual previous rendered jitter state and cancels jitter-only motion", () => {
  const state = new TemporalState(THREE), camera = new THREE.PerspectiveCamera(60, 16/9, 0.1, 1000), scene = new THREE.Scene();
  const projection = camera.projectionMatrix.clone(), inverse = camera.projectionMatrixInverse.clone();
  const settings = { upscaleJitter: true };
  state.begin(scene, camera, 858, 482, 1280, 720, settings, 100);
  const renderedVP = state.currentJitteredVP.clone(), renderedJitter = state.jitter.clone();
  state.commit(); state.restoreCamera();
  assert.ok(camera.projectionMatrix.equals(projection));
  assert.ok(camera.projectionMatrixInverse.equals(inverse));
  state.begin(scene, camera, 858, 482, 1280, 720, settings, 116);
  assert.equal(state.valid, true);
  assert.ok(state.previousJitteredVP.equals(renderedVP));
  assert.ok(state.renderedPreviousJitter.equals(renderedJitter));
  const point = new THREE.Vector4(1,2,-10,1);
  const current = point.clone().applyMatrix4(state.currentJitteredVP);
  const old = point.clone().applyMatrix4(state.previousJitteredVP);
  const dx = current.x/current.w-old.x/old.w-2*(state.jitter.x-renderedJitter.x)/858;
  const dy = current.y/current.w-old.y/old.w-2*(state.jitter.y-renderedJitter.y)/482;
  assert.ok(Math.abs(dx)<1e-10 && Math.abs(dy)<1e-10);
  state.restoreCamera();
});

test("camera cuts, resize, projection, scene, mode, frame gaps and explicit run resets invalidate history", () => {
  const state = new TemporalState(THREE), camera = new THREE.PerspectiveCamera(), scene = new THREE.Scene();
  let settings = { upscaleJitter: true }, width = 640, now = 100;
  const frame = (targetScene=scene, targetCamera=camera) => {
    state.begin(targetScene,targetCamera,width,360,1280,720,settings,now);
    now+=16; const valid=state.valid; state.commit(); state.restoreCamera(); return valid;
  };
  assert.equal(frame(),false); assert.equal(frame(),true);
  width=800; assert.equal(frame(),false); assert.equal(frame(),true);
  settings={...settings,upscaling:"native"}; assert.equal(frame(),false); frame();
  camera.position.x=100; assert.equal(frame(),false); frame();
  camera.fov=40; camera.updateProjectionMatrix(); assert.equal(frame(),false); frame();
  now+=500; assert.equal(frame(),false); frame();
  state.invalidate("restart"); assert.equal(frame(),false);
  assert.equal(frame(new THREE.Scene()),false);
  assert.equal(frame(scene,new THREE.PerspectiveCamera()),false);
});

test('smooth acceleration/braking FOV changes retain history and actual previous projection', () => {
  const state = new TemporalState(THREE), camera = new THREE.PerspectiveCamera(70, 16/9, .5, 10000), scene = new THREE.Scene();
  let now = 100;
  const frame = () => {
    state.begin(scene,camera,640,360,1280,720,{upscaleJitter:true},now);
    now += 16; const valid=state.valid; state.commit(); state.restoreCamera(); return valid;
  };
  assert.equal(frame(), false);
  for (const direction of [1,-1]) for (let i=0;i<30;i++) {
    const previous=state.previousProjection.clone();
    camera.fov += direction*.5; camera.updateProjectionMatrix();
    state.begin(scene,camera,640,360,1280,720,{upscaleJitter:true},now); now+=16;
    assert.equal(state.valid,true,'continuous perspective zoom must remain reprojectable');
    assert.ok(state.previousProjection.equals(previous));
    assert.ok(state.previousInverseProjection.equals(previous.clone().invert()));
    state.commit();state.restoreCamera();
  }
  assert.equal(state.resets,1);assert.equal(state.sequence,61);
  camera.fov=40;camera.updateProjectionMatrix();assert.equal(frame(),false,'abrupt projection cut resets');
  camera.near=1;camera.updateProjectionMatrix();assert.equal(frame(),false,'depth convention changes reset');
  camera.aspect=2;camera.updateProjectionMatrix();assert.equal(frame(),false,'aspect changes reset');
});

test("a WebGL-only device cannot select an enhanced rendering backend", () => {
  const capabilities={webgl2:true,halfFloat:true,features:{depthTexture:true}};
  const s={upscaling:"auto",upscaleQuality:"quality",renderScale:1.25};
  assert.equal(selectUpscaling(s,capabilities).backend,"unavailable");
  assert.equal(selectUpscaling(s,capabilities).scale,1);
  for(const c of [{...capabilities,webgl2:false},{...capabilities,halfFloat:false}]) {
    const selected=selectUpscaling(s,c);
    assert.equal(selected.backend,"unavailable"); assert.equal(selected.scale,1);
  }
  assert.equal(selectUpscaling(s,capabilities,true).backend,"unavailable");
  assert.equal(selectUpscaling({...s,upscaling:"sgsr2-compute"},capabilities).backend,"unavailable");
  assert.equal(selectUpscaling({...s,upscaling:"native"},capabilities).scale,1);
});
