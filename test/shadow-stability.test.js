import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { safeShadowChunk, applyShadowSafety, restoreShadowSafety } from '../src/rendering/shadow-safety.js';
import { ReceiverIndex } from '../src/rendering/receiver-index.js';
import { CarContactShadow } from '../src/rendering/car-contact-shadow.js';
import { usesNativeCSM, createSceneState, applySceneEffects } from '../src/effects.js';
import { PRESETS } from '../src/presets.js';
import { RenderController } from '../src/controller.js';
import { createRendererState } from '../src/effects.js';

test('uniform setting edits retain linked surface materials instead of disposing them', () => {
  const source = { enabled:true, preset:'cinematic', overrides:{} };
  const controller = new RenderController(THREE,()=>source);
  const scene = new THREE.Scene();
  const material = new THREE.MeshBasicMaterial(); material.name='Road';
  const road = new THREE.Mesh(new THREE.PlaneGeometry(),material);
  scene.add(road,road.clone(),road.clone());
  const renderer = { shadowMap:{enabled:true,type:1},toneMapping:0,toneMappingExposure:1,
    outputColorSpace:THREE.SRGBColorSpace,getPixelRatio:()=>1,getRenderTarget:()=>null,xr:{isPresenting:false} };
  controller.activeRenderer=renderer; controller.activeScene=scene;
  controller.sceneState=createSceneState(scene); controller.rendererState=createRendererState(renderer);
  controller.cinematic={capabilities:{features:{}},update(){},frame(){},
    shadows:{scan(){}},warmup:{schedule(){},run(){}},guard:{failures:new Map()}};
  const camera=new THREE.PerspectiveCamera();
  controller.onRender(renderer,scene,camera);
  const clone = road.material; let disposed=0;clone.addEventListener('dispose',()=>disposed++);
  const version=clone.version;
  for(let i=0;i<20;i++){
    source.overrides.exposure=1+i*.01;controller.notifySettingsChanged();controller.onRender(renderer,scene,camera);
    assert.equal(road.material,clone);
  }
  source.overrides.roadRoughness=.6;controller.notifySettingsChanged();controller.onRender(renderer,scene,camera);
  assert.equal(road.material,clone);assert.equal(clone.roughness,.6);
  assert.equal(clone.version,version,'uniform edits do not invalidate shader programs');
  assert.equal(disposed,0);
  source.overrides.materialDetail=false;controller.notifySettingsChanged();controller.onRender(renderer,scene,camera);
  assert.notEqual(road.material,clone,'a shader definition change still updates the material');
});

test('an auxiliary canvas or offscreen scene cannot dispose the active track renderer', () => {
  const controller = new RenderController(THREE,()=>({enabled:true,preset:'cinematic',overrides:{}}));
  const scene = new THREE.Scene(); scene.add(new THREE.Mesh());
  const activeRenderer={}, activeScene=new THREE.Scene(), state={};
  controller.activeRenderer=activeRenderer;controller.activeScene=activeScene;controller.sceneState=state;
  controller.attachRenderer=()=>{throw new Error('active renderer discarded');};
  controller.onRender({getRenderTarget:()=>null},scene,new THREE.PerspectiveCamera());
  controller.onRender({getRenderTarget:()=>({})},activeScene,new THREE.PerspectiveCamera());
  assert.equal(controller.activeRenderer,activeRenderer);assert.equal(controller.sceneState,state);
});

test('a single native cascade uses the same detection before and after scene application', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const material = new THREE.MeshLambertMaterial(); material.defines = { USE_CSM: 1, CSM_CASCADES: 1 };
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material); scene.add(mesh);
  const light = new THREE.DirectionalLight(); scene.add(light);
  assert.equal(usesNativeCSM(scene), true);
  const state = createSceneState(scene);
  applySceneEffects(state, THREE, PRESETS.cinematic, camera, 1000);
  assert.equal(state.nativeCSM, usesNativeCSM(scene));
  assert.equal(state.sun, null, 'no extra directional light corrupts cascade indexing');
  delete material.defines.USE_CSM;
  assert.equal(usesNativeCSM(scene), false, 'native removal is detected as well');
});

test('receiver guards preserve native callbacks, cache keys, uniforms and repeated-scan identity', () => {
  const scene = new THREE.Scene(), material = new THREE.MeshLambertMaterial();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(), material); scene.add(mesh);
  const state = createSceneState(scene);
  let calls = 0;
  const callback = function(shader) { calls++; assert.equal(this, material); shader.uniforms.native = { value: 42 }; };
  material.onBeforeCompile = callback;
  const key = material.customProgramCacheKey;
  const originalKey = key.call(material);
  applyShadowSafety(state, THREE);
  const wrapper = material.onBeforeCompile, cacheKey = material.customProgramCacheKey(), version = material.version;
  assert.equal(cacheKey, originalKey + '|PolyShade shadow bounds v1');
  for(let i=0;i<20;i++) applyShadowSafety(state, THREE);
  assert.equal(material.onBeforeCompile, wrapper);
  assert.equal(material.version, version, 'no per-frame shader invalidation');
  const shader = { fragmentShader: '#include <shadowmap_pars_fragment>\n#include <lights_fragment_begin>', uniforms: {} };
  material.onBeforeCompile(shader, {});
  assert.equal(calls, 1); assert.equal(shader.uniforms.native.value, 42);
  assert.match(shader.fragmentShader, /polyShadeShadowPosition/);
  restoreShadowSafety(state);
  assert.equal(material.onBeforeCompile, callback); assert.equal(material.customProgramCacheKey, key);
});

test('shadow projection checks precede division and enforce all six boundaries', () => {
  const chunk = safeShadowChunk(THREE.ShaderChunk.shadowmap_pars_fragment);
  assert.ok(chunk.indexOf('shadowCoord.w > 0.0') < chunk.indexOf('shadowCoord.xyz /= shadowCoord.w'));
  assert.match(chunk, /greaterThanEqual\(polyShadeShadowPosition, vec3\(0.0\)\)/);
  assert.match(chunk, /lessThanEqual\(polyShadeShadowPosition, vec3\(1.0\)\)/);
  assert.match(chunk, /shadowCoord.z >= 0.0/);
});

test('large track indexing is incremental and queries return local instances', () => {
  const scene = new THREE.Scene();
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(4, 1, 4), new THREE.MeshLambertMaterial(), 10000);
  for(let i=0;i<mesh.count;i++) mesh.setMatrixAt(i,new THREE.Matrix4().makeTranslation(i*8,0,0));
  scene.add(mesh); scene.updateMatrixWorld(true);
  const index = new ReceiverIndex(THREE); index.scan([mesh]);
  index.build(); assert.ok(index.built > 0 && index.built <= 256);
  for(let i=0;i<1000 && index.built<mesh.count;i++) index.build();
  assert.equal(index.built, 10000);
  const ray = new THREE.Ray(new THREE.Vector3(79992,2,0), new THREE.Vector3(0,-1,0));
  assert.equal(index.query(ray,3).length, 1);
  assert.equal(index.candidates[0].entry.instanceId, 9999);
  const built = index.built; index.scan([mesh]); index.build(); assert.equal(index.built,built);
  mesh.setMatrixAt(9999,new THREE.Matrix4().makeTranslation(90000,0,0)); mesh.instanceMatrix.needsUpdate = true;
  index.scan([mesh]); assert.equal(index.query(ray,3).length,0, 'invalidated instances cannot leave stale grounding');
  assert.equal(index.built,0);index.build();assert.ok(index.built>0 && index.built<=256);
  index.dispose();
});

test('contact queries never invoke a whole-track instanced triangle search', () => {
  const scene = new THREE.Scene();
  const road = new THREE.InstancedMesh(new THREE.PlaneGeometry(10,10),new THREE.MeshLambertMaterial(),1000);
  for(let i=0;i<1000;i++) road.setMatrixAt(i,new THREE.Matrix4().makeRotationX(-Math.PI/2).setPosition(i*20,0,0));
  road.raycast = () => { throw new Error('whole-track query'); }; scene.add(road);
  const lamp = new THREE.MeshStandardMaterial(); lamp.name='BrakeLight';
  const car = new THREE.Mesh(new THREE.BoxGeometry(),lamp); car.position.y=.5; scene.add(car);
  scene.updateMatrixWorld(true);
  const contact = new CarContactShadow(THREE,scene), camera = new THREE.PerspectiveCamera();
  const settings = {carContactShadowEnabled:true}; contact.scan(camera, settings);
  contact.update(settings,120,camera);
  assert.equal(contact.mesh.visible,true); assert.equal(contact.narrowQueries,1);
  car.position.y=10; scene.updateMatrixWorld(true);
  contact.update(settings,200,camera); assert.equal(contact.mesh.visible,false);
  assert.equal(contact.narrowQueries,1, 'empty air skips narrow-phase geometry entirely');
  contact.dispose();
});
