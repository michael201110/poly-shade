import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { GPUShadowCache } from "../src/rendering/webgpu/shadows.js";

test("WebGPU cascades reuse only unchanged unjittered views and casters", () => {
  const scene = new T.Scene(),
    sun = new T.DirectionalLight(),
    camera = new T.PerspectiveCamera();
  const caster = new T.Mesh(new T.BoxGeometry(), new T.MeshStandardMaterial());
  caster.castShadow = true;
  scene.add(sun, sun.target, caster);
  const cascades = Array.from({ length: 3 }, () => {
    const light = new T.DirectionalLight();
    light.shadow.map = {};
    return light;
  });
  sun.shadow.shadowNode = { lights: cascades };
  const mirror = { scene, sun, topologyVersion: 1 };
  const cache = new GPUShadowCache();
  const frame = () => {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const dirty = cache.prepare(mirror, camera);
    // A completed shadow draw clears this flag in the real renderer.
    for (const light of cascades) light.shadow.needsUpdate = false;
    cache.commit();
    return dirty;
  };
  assert.equal(frame(), true);
  assert.equal(frame(), false);
  caster.position.x = 1;
  assert.equal(frame(), true);
  frame();
  assert.equal(frame(), false);
  camera.rotation.y = 0.2;
  assert.equal(frame(), true);
  frame();
  assert.equal(frame(), false);
  caster.geometry.attributes.position.needsUpdate = true;
  assert.equal(frame(), true);
  frame();
  assert.equal(frame(), false);
  mirror.topologyVersion++;
  assert.equal(frame(), true);
  assert.ok(cascades.every((l) => l.shadow.autoUpdate === false));
  cache.dispose();
});
