import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { applyMaterialTuning, syncMaterialColors, restoreMaterials } from '../src/materials.js';
import { applySceneEffects, createSceneState, restoreScene, updateShadowFocus } from '../src/effects.js';
import { PRESETS } from '../src/presets.js';

const profile = PRESETS.cinematic;

test('opaque unnamed Basic surfaces become lit while preserving textures and vertex colors', () => {
  const scene = new THREE.Scene();
  const map = new THREE.Texture();
  const material = new THREE.MeshBasicMaterial({ map, vertexColors: true, side: THREE.DoubleSide, alphaTest: 0.4 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
  scene.add(mesh);
  const state = createSceneState(scene);
  applyMaterialTuning(state, THREE, profile);
  assert.equal(mesh.material.isMeshPhongMaterial, true);
  assert.equal(mesh.material.map, map);
  assert.equal(mesh.material.vertexColors, true);
  assert.equal(mesh.material.side, THREE.DoubleSide);
  assert.equal(mesh.material.alphaTest, 0.4);
  assert.equal(mesh.material.flatShading, true);
  restoreMaterials(state);
  assert.equal(mesh.material, material);
});

test('shared car paint stays saturated and follows live source changes; replacement becomes new baseline', () => {
  const scene = new THREE.Scene();
  const body = new THREE.Group(); body.name = 'vehicle';
  const paint = new THREE.MeshBasicMaterial({ color: '#e93420' });
  const a = new THREE.Mesh(new THREE.BoxGeometry(), paint);
  const b = new THREE.Mesh(new THREE.BoxGeometry(), paint);
  body.add(a, b); scene.add(body);
  const state = createSceneState(scene);
  applyMaterialTuning(state, THREE, profile);
  assert.equal(a.material, b.material);
  assert.equal(a.material.shininess, 65);
  paint.color.set('#31b6cd');
  syncMaterialColors(state, profile);
  assert.equal(a.material.color.equals(paint.color), true);
  paint.opacity = 0.5; paint.transparent = true;
  syncMaterialColors(state, profile);
  assert.equal(a.material.opacity, 0.5);
  assert.equal(a.material.transparent, true);
  const replacement = new THREE.MeshBasicMaterial({ color: '#f5c242' });
  a.material = replacement;
  applyMaterialTuning(state, THREE, profile);
  restoreMaterials(state);
  assert.equal(a.material, replacement);
  assert.equal(b.material, paint);
});

test('neutral warmth updates immediately without accumulating; ancestor ghosts and custom shaders remain intact', () => {
  const scene = new THREE.Scene();
  const material = new THREE.MeshPhongMaterial({ color: '#cccccc' });
  material.name = 'concrete';
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
  const ghostRoot = new THREE.Group(); ghostRoot.name = 'ReplayGhost';
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  const custom = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  custom.material.onBeforeCompile = () => {};
  const originalCustom = custom.material;
  ghostRoot.add(ghost); scene.add(mesh, ghostRoot, custom);
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

test('camera-focused shadows stay bounded on huge tracks and restore all scene/light flags', () => {
  const scene = new THREE.Scene();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(10000, 1, 10000), new THREE.MeshBasicMaterial());
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(floor, sun, ambient);
  const state = createSceneState(scene);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(1500, 10, 1800); camera.updateMatrixWorld();
  applySceneEffects(state, THREE, profile, camera, 1000);
  assert.equal(sun.shadow.camera.right, profile.shadowDistance);
  assert.ok(sun.target.position.distanceTo(camera.position) < profile.shadowDistance);
  assert.equal(floor.castShadow, true);
  assert.equal(floor.receiveShadow, true);
  assert.equal(ambient.intensity, 0);
  const previous = sun.target.position.clone();
  camera.position.x += 500; camera.updateMatrixWorld();
  updateShadowFocus(state, profile, camera);
  assert.ok(sun.target.position.distanceTo(previous) > 490);
  assert.ok(sun.position.distanceTo(sun.target.position) - profile.shadowDistance * 2 < 0.01);
  restoreScene(state);
  assert.equal(sun.intensity, 2);
  assert.equal(ambient.intensity, 0.6);
  assert.equal(floor.castShadow, false);
  assert.equal(floor.receiveShadow, false);
  assert.equal(scene.children.length, 3);
});

test('disable respects a material assigned by the game before the next scan', () => {
  const scene = new THREE.Scene();
  const original = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), original);
  scene.add(mesh);
  const state = createSceneState(scene);
  applyMaterialTuning(state, THREE, profile);
  const replacement = new THREE.MeshBasicMaterial({ color: '#abcdef' });
  mesh.material = replacement;
  restoreMaterials(state);
  assert.equal(mesh.material, replacement);
});

test('a source turning translucent is released on the next material scan', () => {
  const scene = new THREE.Scene();
  const original = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), original);
  scene.add(mesh);
  const state = createSceneState(scene);
  applyMaterialTuning(state, THREE, profile);
  assert.notEqual(mesh.material, original);
  original.transparent = true; original.opacity = 0.5;
  applyMaterialTuning(state, THREE, profile);
  assert.equal(mesh.material, original);
  assert.equal(state.originalMaterials.size, 0);
  assert.equal(state.materialClones.size, 0);
});
