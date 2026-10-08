import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { ObjectMotion } from "../src/rendering/object-motion.js";
import { PostProcess } from "../src/rendering/postprocess.js";

function setup() {
  const scene = new THREE.Scene(), root = new THREE.Group();
  const brake = new THREE.MeshBasicMaterial(); brake.name = "BrakeLight";
  const body = new THREE.Mesh(new THREE.BoxGeometry(), brake);
  const wheel = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  root.add(body, wheel); scene.add(root);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  camera.position.set(0, 1, 6); camera.lookAt(0, 0, 0);
  scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  return {scene, root, body, wheel, camera, motion: new ObjectMotion(THREE)};
}
function vp(camera) {
  return new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
}
function displacement(entry, camera, local = new THREE.Vector3()) {
  const current = local.clone().applyMatrix4(entry.source.matrixWorld).project(camera);
  const previous = local.clone().applyMatrix4(entry.proxy.material.uniforms.previousObjectViewProjection.value);
  return current.distanceTo(previous);
}
test("follow camera cancels car translation while world scenery still moves", () => {
  const {scene, root, camera, motion} = setup();
  const old = vp(camera);
  motion.update(scene, old, false);
  root.position.x += 2; camera.position.x += 2;
  scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  motion.update(scene, old, true);
  assert.equal(motion.entries.length, 2);
  assert.ok(displacement(motion.entries[0], camera) < 1e-6);
  const currentRoad = new THREE.Vector3(0, -1, 0).project(camera);
  const previousRoad = new THREE.Vector3(0, -1, 0).applyMatrix4(old);
  assert.ok(currentRoad.distanceTo(previousRoad) > 0.1);
  motion.dispose();
});
test("fixed camera sees moving car velocity and rotating wheels use their own transforms", () => {
  const {scene, root, wheel, camera, motion} = setup();
  const old = vp(camera); motion.update(scene, old, false);
  root.position.x += 1; wheel.rotation.z += 0.5; scene.updateMatrixWorld(true);
  motion.update(scene, old, true);
  assert.ok(displacement(motion.entries[0], camera) > 0.1);
  const wheelEntry = motion.entries.find(e => e.source === wheel);
  assert.ok(displacement(wheelEntry, camera, new THREE.Vector3(0.5,0,0)) > 0.1);
  assert.equal(root.children.includes(wheel), true, "native hierarchy remains intact");
  motion.dispose();
});
test("camera cuts reset exposure and ghost geometry does not acquire car velocity", () => {
  const {scene, body, camera, motion} = setup();
  body.material.transparent = true;
  motion.update(scene, vp(camera), false);
  assert.equal(motion.entries.length, 0);
  const post = new PostProcess(THREE, { getContext: () => ({}) }, {}, {});
  assert.equal(post.prepareCameraMotion(scene, camera), false);
  camera.position.x += 0.1; camera.updateMatrixWorld(true);
  assert.equal(post.prepareCameraMotion(scene, camera), true);
  camera.position.x += 20; camera.updateMatrixWorld(true);
  assert.equal(post.prepareCameraMotion(scene, camera), false);
  assert.equal(post.prepareCameraMotion(new THREE.Scene(), camera), false, "new track resets reused cameras");
  post.dispose(); motion.dispose();
});
