import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { TemporalState, selectUpscaling } from "../src/rendering/temporal-state.js";

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

test("Auto uses real Fragment support; missing capabilities, failure and Compute fall back to native 100%", () => {
  const capabilities={webgl2:true,halfFloat:true,features:{depthTexture:true}};
  const s={upscaling:"auto",upscaleQuality:"quality",renderScale:1.25};
  assert.equal(selectUpscaling(s,capabilities).backend,"sgsr2-fragment");
  assert.equal(selectUpscaling(s,capabilities).scale,0.67);
  for(const c of [{...capabilities,webgl2:false},{...capabilities,halfFloat:false}]) {
    const selected=selectUpscaling(s,c);
    assert.equal(selected.backend,"native"); assert.equal(selected.scale,1);
  }
  assert.equal(selectUpscaling(s,capabilities,true).backend,"native");
  assert.equal(selectUpscaling({...s,upscaling:"sgsr2-compute"},capabilities).backend,"native");
  assert.equal(selectUpscaling({...s,upscaling:"native"},capabilities).scale,1.25);
});
