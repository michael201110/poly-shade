import test from "node:test";
import assert from "node:assert/strict";
import {
  applyMaterialTuning,
  classifyMaterial,
  restoreMaterials,
} from "../src/materials.js";
import { createSceneState } from "../src/effects.js";

test("material classification prioritizes stable names and preserves unknowns", () => {
  assert.equal(
    classifyMaterial({ name: "Barrier_04" }, { name: "Track" }),
    "barrier",
  );
  assert.equal(classifyMaterial({ name: "CarBody" }, { name: "Paint" }), "car");
  assert.equal(
    classifyMaterial({ name: "ReplayGhost_Car" }, { name: "CarBody" }),
    "other",
  );
  assert.equal(
    classifyMaterial({ name: "Mesh_1" }, { name: "Material_1" }),
    "other",
  );
  assert.equal(
    classifyMaterial({}, { color: { r: 0.15, g: 0.7, b: 0.12 } }),
    "other",
  );
});

test("material tuning clones and restores source material and color", () => {
  const color = { r: 0.1, g: 0.1, b: 0.1 };
  let disposed = false;
  const material = {
    name: "asphalt",
    color,
    roughness: 0.3,
    metalness: 0.25,
    clone() {
      return {
        ...this,
        color: { ...this.color },
        dispose() {
          disposed = true;
        },
      };
    },
  };
  const mesh = { isMesh: true, name: "Road", material };
  const scene = {
    background: null,
    fog: null,
    traverse(callback) {
      callback(mesh);
    },
  };
  const state = createSceneState(scene);

  assert.equal(applyMaterialTuning(state), 1);
  assert.notEqual(mesh.material, material);
  assert.equal(mesh.material.roughness, 0.85);
  assert.equal(mesh.material.metalness, 0.01);
  assert.deepEqual(mesh.material.color, color);

  restoreMaterials(state);
  assert.equal(mesh.material, material);
  assert.equal(disposed, true);
});

test("translucent and explicitly replay materials stay unchanged", () => {
  const material = {
    name: "Car Paint",
    transparent: true,
    opacity: 0.4,
    roughness: 0.2,
    metalness: 0.5,
    clone() {
      throw new Error("ghost material should not be cloned");
    },
  };
  const mesh = { isMesh: true, name: "ReplayGhost", material };
  const scene = {
    background: null,
    fog: null,
    traverse(callback) {
      callback(mesh);
    },
  };
  const state = createSceneState(scene);

  assert.equal(applyMaterialTuning(state), 0);
  assert.equal(mesh.material, material);
});
