import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  applyMaterialTuning,
  syncMaterialColors,
  restoreMaterials,
} from "../src/materials.js";
import {
  applySceneEffects,
  createSceneState,
  restoreScene,
  updateShadowFocus,
} from "../src/effects.js";
import { PRESETS } from "../src/presets.js";
import { CarContactShadow } from "../src/rendering/car-contact-shadow.js";

const profile = PRESETS.cinematic;

test("car contact shadow remains on the road independently of sun shadowing", () => {
  const scene = new THREE.Scene();
  const roadMaterial = new THREE.MeshStandardMaterial();
  roadMaterial.name = "Road";
  const road = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), roadMaterial);
  road.rotation.x = -Math.PI / 2;
  scene.add(road);
  const brakeMaterial = new THREE.MeshStandardMaterial();
  brakeMaterial.name = "BrakeLight";
  const car = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1), brakeMaterial);
  car.position.y = 0.5;
  scene.add(car);
  scene.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 4, 5);
  camera.updateMatrixWorld(true);
  const contact = new CarContactShadow({ ...THREE, CircleGeometry: undefined }, scene);
  contact.scan(camera, { carContactShadowEnabled: true });
  contact.update({ carContactShadowEnabled: true }, 120, camera);
  assert.equal(contact.geometry.type, "PlaneGeometry");
  assert.equal(contact.mesh.visible, true);
  assert.ok(Math.abs(contact.mesh.position.y - 0.018) < 0.001);
  const groundedOpacity = contact.material.uniforms.opacity.value;
  assert.ok(groundedOpacity > 0.7, "landing remains darker than the airborne shadow");
  const broadQueries = contact.rayQueries;
  car.position.x = 0.25;
  scene.updateMatrixWorld(true);
  contact.update({ carContactShadowEnabled: true }, 130, camera);
  assert.ok(Math.abs(contact.mesh.position.x - 0.25) < 0.001, "footprint follows every moving frame");
  assert.equal(contact.rayQueries, broadQueries, "cached receiver avoids a whole-track raycast");
  car.position.y = 2;
  scene.updateMatrixWorld(true);
  contact.update({ carContactShadowEnabled: true }, 140, camera);
  assert.ok(contact.material.uniforms.opacity.value < groundedOpacity / 3,
    "grounding shadow fades as the car lifts away");
  contact.dispose();
  assert.equal(scene.children.includes(contact.mesh), false);
});

test("opaque unnamed Basic surfaces become lit while preserving textures and vertex colors", () => {
  const scene = new THREE.Scene();
  const map = new THREE.Texture();
  const material = new THREE.MeshBasicMaterial({
    map,
    vertexColors: true,
    side: THREE.DoubleSide,
    alphaTest: 0.4,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
  scene.add(mesh);
  const state = createSceneState(scene);
  applyMaterialTuning(state, THREE, profile);
  assert.equal(mesh.material.isMeshStandardMaterial, true);
  assert.equal(mesh.material.map, map);
  assert.equal(mesh.material.vertexColors, true);
  assert.equal(mesh.material.side, THREE.DoubleSide);
  assert.equal(mesh.material.alphaTest, 0.4);
  assert.equal(mesh.material.flatShading, false);
  restoreMaterials(state);
  assert.equal(mesh.material, material);
});

test("shared car paint stays saturated and follows live source changes; replacement becomes new baseline", () => {
  const scene = new THREE.Scene();
  const body = new THREE.Group();
  body.name = "vehicle";
  const paint = new THREE.MeshBasicMaterial({ color: "#e93420" });
  const a = new THREE.Mesh(new THREE.BoxGeometry(), paint);
  const b = new THREE.Mesh(new THREE.BoxGeometry(), paint);
  body.add(a, b);
  scene.add(body);
  const state = createSceneState(scene);
  applyMaterialTuning(state, THREE, profile);
  assert.equal(a.material, b.material);
  assert.equal(a.material.roughness, 0.28);
  paint.color.set("#31b6cd");
  syncMaterialColors(state, profile);
  assert.equal(a.material.color.equals(paint.color), true);
  paint.opacity = 0.5;
  paint.transparent = true;
  syncMaterialColors(state, profile);
  assert.equal(a.material.opacity, 0.5);
  assert.equal(a.material.transparent, true);
  const replacement = new THREE.MeshBasicMaterial({ color: "#f5c242" });
  a.material = replacement;
  applyMaterialTuning(state, THREE, profile);
  restoreMaterials(state);
  assert.equal(a.material, replacement);
  assert.equal(b.material, paint);
});

test("neutral warmth updates immediately without accumulating; ancestor ghosts and custom shaders remain intact", () => {
  const scene = new THREE.Scene();
  const material = new THREE.MeshPhongMaterial({ color: "#cccccc" });
  material.name = "concrete";
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
  const ghostRoot = new THREE.Group();
  ghostRoot.name = "ReplayGhost";
  const ghost = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial(),
  );
  const custom = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial(),
  );
  custom.material.onBeforeCompile = () => {};
  const originalCustom = custom.material;
  ghostRoot.add(ghost);
  scene.add(mesh, ghostRoot, custom);
  const state = createSceneState(scene);
  applyMaterialTuning(state, THREE, profile);
  const warm = mesh.material.color.clone();
  syncMaterialColors(state, profile);
  assert.equal(mesh.material.color.equals(warm), true);
  syncMaterialColors(state, { surfaceWarmth: 0 });
  assert.equal(mesh.material.color.equals(material.color), true);
  assert.equal(ghost.material.isMeshBasicMaterial, true);
  assert.equal(custom.material, originalCustom);
  restoreScene(state);
});

test("camera-focused shadows stay bounded on huge tracks and restore all scene/light flags", () => {
  const scene = new THREE.Scene();
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(10000, 1, 10000),
    new THREE.MeshBasicMaterial(),
  );
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(floor, sun, ambient);
  const state = createSceneState(scene);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(1500, 10, 1800);
  camera.updateMatrixWorld();
  applySceneEffects(state, THREE, profile, camera, 1000);
  assert.ok(
    state.sun.shadow.camera.right >= profile.shadowDistance &&
      state.sun.shadow.camera.right <= profile.shadowDistance * 1.6,
  );
  assert.ok(
    state.sun.target.position.distanceTo(camera.position) <
      profile.shadowDistance,
  );
  assert.equal(floor.castShadow, true);
  assert.equal(floor.receiveShadow, true);
  assert.equal(ambient.intensity, 0);
  const previous = state.sun.target.position.clone();
  camera.position.x += 500;
  camera.updateMatrixWorld();
  updateShadowFocus(state, profile, camera);
  assert.ok(state.sun.target.position.distanceTo(previous) > 40);
  assert.ok(
    Math.abs(
      state.sun.position.distanceTo(state.sun.target.position) -
        state.sun.shadow.camera.right * 2,
    ) < 0.01,
  );
  restoreScene(state);
  assert.equal(sun.intensity, 2);
  assert.equal(ambient.intensity, 0.6);
  assert.equal(floor.castShadow, false);
  assert.equal(floor.receiveShadow, false);
  assert.equal(scene.children.length, 3);
});

test("disable respects a material assigned by the game before the next scan", () => {
  const scene = new THREE.Scene();
  const original = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), original);
  scene.add(mesh);
  const state = createSceneState(scene);
  applyMaterialTuning(state, THREE, profile);
  const replacement = new THREE.MeshBasicMaterial({ color: "#abcdef" });
  mesh.material = replacement;
  restoreMaterials(state);
  assert.equal(mesh.material, replacement);
});

test("a source turning translucent is released on the next material scan", () => {
  const scene = new THREE.Scene();
  const original = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), original);
  scene.add(mesh);
  const state = createSceneState(scene);
  applyMaterialTuning(state, THREE, profile);
  assert.notEqual(mesh.material, original);
  original.transparent = true;
  original.opacity = 0.5;
  applyMaterialTuning(state, THREE, profile);
  assert.equal(mesh.material, original);
  assert.equal(state.originalMaterials.size, 0);
  assert.equal(state.materialClones.size, 0);
});

test("paint updates made directly through a replacement material persist and restore", () => {
  const scene = new THREE.Scene();
  const original = new THREE.MeshBasicMaterial({ color: "#333333" });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), original);
  mesh.name = "vehicle";
  scene.add(mesh);
  const state = createSceneState(scene);
  applyMaterialTuning(state, THREE, profile);
  mesh.material.color.set("#00cfff");
  const paint = mesh.material.color.clone();
  syncMaterialColors(state, profile);
  assert.ok(mesh.material.color.equals(paint));
  assert.ok(original.color.equals(paint));
  syncMaterialColors(state, profile);
  assert.ok(mesh.material.color.equals(paint));
  restoreMaterials(state);
  assert.equal(mesh.material, original);
  assert.ok(mesh.material.color.equals(paint));
});


test("instanced track receivers retain shadows regardless of their origin", () => {
  const scene = new THREE.Scene();
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(10, 1, 10), new THREE.MeshLambertMaterial(), 1);
  mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(500, 0, 500));
  scene.add(mesh);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(500, 2, 500);
  scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  const state = createSceneState(scene);
  applySceneEffects(state, THREE, profile, camera, 2000);
  assert.equal(mesh.receiveShadow, true);
  assert.equal(mesh.castShadow, true);
  restoreScene(state);
  assert.equal(mesh.castShadow, false);
});

test("contact footprint follows banked instanced surfaces and disappears over gaps", () => {
  const scene = new THREE.Scene();
  const road = new THREE.InstancedMesh(new THREE.PlaneGeometry(10, 20), new THREE.MeshLambertMaterial(), 1);
  const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.4));
  const origin = new THREE.Vector3(40, 3, 60);
  road.setMatrixAt(0, new THREE.Matrix4().compose(origin, tilt, new THREE.Vector3(1, 1, 1)));
  scene.add(road);
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(tilt);
  const brake = new THREE.MeshStandardMaterial(); brake.name = "BrakeLight";
  const car = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 1), brake);
  car.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  car.position.copy(origin).addScaledVector(normal, 0.5);
  scene.add(car); scene.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(); camera.position.copy(car.position); camera.updateMatrixWorld(true);
  const contact = new CarContactShadow(THREE, scene);
  contact.scan(camera, profile); contact.update(profile, 120, camera);
  assert.equal(contact.mesh.visible, true);
  assert.ok(contact.groundNormal.dot(normal) > 0.999);
  assert.ok(contact.mesh.position.distanceTo(origin.clone().addScaledVector(normal, 0.018)) < 0.001);
  car.position.x += 100; scene.updateMatrixWorld(true);
  contact.update(profile, 200, camera);
  assert.equal(contact.mesh.visible, false);
  contact.dispose();
});


test("native paint and CSM shader handles retain their identity while surface uniforms improve", () => {
  const scene = new THREE.Scene();
  const material = new THREE.MeshStandardMaterial({roughness: 0.8, metalness: 0});
  material.name = "Main"; material.defines.USE_CSM = 1;
  const callback = () => {}; material.onBeforeCompile = callback;
  const car = new THREE.Mesh(new THREE.BoxGeometry(), material); car.name = "Body";
  scene.add(car);
  const state = createSceneState(scene);
  applyMaterialTuning(state, THREE, profile);
  assert.equal(car.material, material);
  assert.equal(material.onBeforeCompile, callback);
  assert.equal(material.defines.USE_CSM, 1);
  assert.equal(material.roughness, 0.22);
  assert.equal(material.envMapIntensity, profile.environmentIntensity * profile.carReflection);
  restoreMaterials(state);
  assert.equal(material.roughness, 0.8);
  assert.equal(material.metalness, 0);
});
