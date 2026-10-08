import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { RenderController } from "../src/controller.js";
import { ShadowCache } from "../src/rendering/shadow-cache.js";
import { ShaderWarmup } from "../src/rendering/shader-warmup.js";
import { createSceneState, createRendererState, applySceneEffects, refreshFrameEffects, restoreScene } from "../src/effects.js";
import { applyMaterialTuning } from "../src/materials.js";
import { PRESETS } from "../src/presets.js";

test("resolved settings are reused within a revision and refresh on notifications or preset changes", () => {
  const settings = { enabled: true, preset: "cinematic", overrides: {} };
  const controller = new RenderController(THREE, () => settings);
  const initial = controller.resolveSettings();
  assert.equal(controller.resolveSettings(), initial);
  settings.overrides.exposure = 1.2;
  controller.notifySettingsChanged();
  assert.notEqual(controller.resolveSettings(), initial);
  assert.equal(controller.resolveSettings().exposure, 1.2);
  settings.preset = "cinematic-lite";
  assert.equal(controller.resolveSettings().aoEnabled, false);
  settings.overrides = { exposure: 0.9 };
  assert.equal(controller.resolveSettings().exposure, 0.9);
});

test("shadow reuse invalidates for casters, parents, lights, geometry uploads and alpha coverage", () => {
  const scene = new THREE.Scene(), group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  mesh.castShadow = true;
  group.add(mesh); scene.add(group);
  const sun = new THREE.DirectionalLight();
  sun.castShadow = true; sun.shadow.map = {};
  scene.add(sun, sun.target);
  const cache = new ShadowCache();
  cache.scan(scene);
  const frame = () => {
    const dirty = cache.prepare();
    sun.shadow.needsUpdate = false;
    cache.commit();
    return dirty;
  };
  assert.equal(frame(), true);
  assert.equal(frame(), false);
  cache.scan(scene);
  assert.equal(frame(), false, "unchanged scene scans do not invalidate shadows");
  group.position.x++;
  assert.equal(frame(), true);
  assert.equal(frame(), false);
  sun.target.position.z++;
  assert.equal(frame(), true);
  assert.equal(frame(), false);
  mesh.material.color.set("red");
  assert.equal(frame(), false, "diffuse colour changes do not affect depth maps");
  mesh.geometry.attributes.position.needsUpdate = true;
  assert.equal(frame(), true);
  mesh.material.alphaTest = 0.5;
  assert.equal(frame(), true);
  assert.equal(frame(), false);
  mesh.material.alphaTest = 0.7;
  assert.equal(frame(), true);
  mesh.material.opacity = 0.6;
  assert.equal(frame(), true);
  const extra = mesh.clone(); group.add(extra);
  assert.equal(frame(), true, "new scene nodes invalidate before the next scan");
  assert.equal(frame(), true, "unknown topology cannot be cached prematurely");
  cache.scan(scene);
  assert.equal(frame(), true);
  assert.equal(frame(), false);
  mesh.castShadow = false;
  assert.equal(frame(), true);
  cache.dispose();
  assert.equal(sun.shadow.autoUpdate, true);
  assert.equal(sun.shadow.needsUpdate, true);
});

test("morphing shadow casters invalidate when the pose changes and reuse constant poses", () => {
  const scene = new THREE.Scene(), mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  mesh.castShadow = true; mesh.morphTargetInfluences = [0];
  scene.add(mesh);
  const sun = new THREE.DirectionalLight(); sun.castShadow = true; sun.shadow.map = {};
  scene.add(sun, sun.target);
  const cache = new ShadowCache(); cache.scan(scene);
  cache.prepare(); sun.shadow.needsUpdate = false; cache.commit();
  assert.equal(cache.prepare(), false);
  mesh.morphTargetInfluences[0] = 0.1;
  assert.equal(cache.prepare(), true);
  cache.dispose();
});

test("native brake lamp materials keep the handle updated by PolyTrack", () => {
  const scene = new THREE.Scene(), lamp = new THREE.MeshLambertMaterial({ emissive: 0 });
  lamp.name = "BrakeLight";
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(), lamp); scene.add(mesh);
  applyMaterialTuning(createSceneState(scene), THREE, PRESETS.cinematic);
  assert.equal(mesh.material, lamp);
  lamp.emissive.setRGB(1, 0.1, 0.1);
  assert.equal(mesh.material.emissive.r, 1);
});

test("zero-contribution native lights stop rendering shadows and restore for CSM and disable", () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const nativeSun = new THREE.DirectionalLight(0xffffff, 3);
  nativeSun.castShadow = true;
  const nativeFill = new THREE.HemisphereLight(0xffffff, 0xffffff, 2);
  scene.add(nativeSun, nativeSun.target, nativeFill);
  const state = createSceneState(scene);
  applySceneEffects(state, THREE, PRESETS.cinematic, camera, 1000);
  assert.equal(nativeSun.intensity, 0);
  assert.equal(nativeSun.visible, false);
  assert.equal(nativeSun.castShadow, false);
  assert.equal(nativeFill.visible, false);
  nativeSun.visible = true; nativeSun.castShadow = true;
  const renderer = { shadowMap: { enabled: true }, toneMapping: 0, toneMappingExposure: 1, outputColorSpace: THREE.SRGBColorSpace };
  refreshFrameEffects(state, createRendererState(renderer), THREE, PRESETS.cinematic, camera);
  assert.equal(nativeSun.visible, false);
  assert.equal(nativeSun.castShadow, false);
  const cascade = new THREE.DirectionalLight(); cascade.castShadow = true;
  scene.add(cascade, cascade.target);
  applySceneEffects(state, THREE, PRESETS.cinematic, camera, 2000);
  assert.equal(state.nativeCSM, true);
  assert.equal(nativeSun.visible, true);
  assert.equal(nativeSun.castShadow, true);
  assert.equal(cascade.visible, true);
  restoreScene(state);
  assert.equal(nativeSun.intensity, 3);
  assert.equal(nativeSun.visible, true);
  assert.equal(nativeFill.visible, true);
  assert.equal(nativeFill.intensity, 2);
});

test("shader warming restores light visibility and renderer state, including on failure", () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const lights = [new THREE.SpotLight(), new THREE.SpotLight()];
  const lamp = new THREE.Group(); lamp.visible = false; scene.add(lamp);
  lights.forEach((light) => { light.visible = false; lamp.add(light); });
  const target = {}, observations = [];
  const renderer = {
    target, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace,
    getContext: () => ({ getExtension: () => ({}) }),
    getRenderTarget() { return this.target; },
    getActiveCubeFace: () => 0, getActiveMipmapLevel: () => 0,
    setRenderTarget(value) { this.target = value; },
    compile() { observations.push([lights.filter((l) => l.visible && lamp.visible).length, this.toneMapping, this.outputColorSpace]); },
  };
  const warmup = new ShaderWarmup(THREE, renderer);
  const brakes = { cars: new Map([[{}, { lights }]]) };
  const settings = { postEnabled: true, postQuality: "medium" };
  warmup.schedule(scene, camera, settings, { warmupMaterials: () => [] }, brakes, 1);
  warmup.run();
  warmup.run();
  assert.deepEqual(observations, [[2, THREE.NoToneMapping, THREE.LinearSRGBColorSpace]]);
  assert.equal(renderer.target, target);
  assert.equal(renderer.toneMapping, THREE.ACESFilmicToneMapping);
  assert.equal(renderer.outputColorSpace, THREE.SRGBColorSpace);
  assert.ok(lights.every((light) => light.visible === false));
  assert.equal(lamp.visible, false);
  warmup.schedule(scene, camera, settings, { warmupMaterials: () => [] }, brakes, 1);
  assert.equal(warmup.jobs.length, 0, "unchanged scans do not rewarm shaders");
  const replacementLights = lights.map(() => new THREE.SpotLight());
  brakes.cars = new Map([[{}, { lights: replacementLights }]]);
  warmup.schedule(scene, camera, settings, { warmupMaterials: () => [] }, brakes, 1);
  assert.equal(warmup.jobs.length, 1, "replaced cars rewarm even with the same mesh and light counts");
  warmup.schedule(scene, camera, settings, { warmupMaterials: () => [] }, brakes, 1, true);
  assert.equal(warmup.jobs.length, 0, "native CSM owns its scene shader compilation state");
  warmup.clear();
  warmup.schedule(scene, camera, settings, { warmupMaterials: () => [] }, brakes, 1);
  renderer.compile = () => { throw new Error("unavailable"); };
  const originalWarn = console.warn;
  try { console.warn = () => {}; warmup.run(); } finally { console.warn = originalWarn; }
  assert.equal(renderer.target, target);
  assert.ok(lights.every((light) => light.visible === false));
  assert.equal(warmup.supported, false);
});


test("CSM preserves world-scale native normal bias on every cascade", () => {
  const controller = new RenderController(THREE, () => ({ enabled: true, preset: "cinematic", overrides: {} }));
  const lights = [0.08, 0.21, 0.6, 1.9].map(bias => {
    const light = new THREE.DirectionalLight(); light.shadow.normalBias = bias;
    light.shadow.bias = 0.000001; light.shadow.camera.near = 10; light.shadow.camera.far = 15000;
    light.shadow.mapSize.set(2048, 2048); return light;
  });
  controller.sceneState = { nativeCSM: true, lightSnapshots: new Map(lights.map(light => [light, { shadow: { normalBias: light.shadow.normalBias, bias: light.shadow.bias } }])) };
  controller.nativeWrapper = { csm: { lightDirection: new THREE.Vector3(), lights, update() {} } };
  controller.cinematic = { palette: { direction: new THREE.Vector3(1, 1, 1).normalize(), sun: new THREE.Color() }, capabilities: { maxTextureSize: 4096 } };
  controller.updateCSM(PRESETS.cinematic);
  assert.deepEqual(lights.map(l => l.shadow.normalBias), [0.08, 0.21, 0.6, 1.9]);
  assert.ok(lights.every(l => l.shadow.bias > 0 && l.shadow.bias < 0.000001), "cascade depth bias stays positive and within its native scale");
  controller.updateCSM({...PRESETS.cinematic, shadowQuality: "low"});
  assert.deepEqual(lights.map(l => l.shadow.normalBias), [0.16, 0.42, 1.2, 3.8]);
});
