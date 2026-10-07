import test from "node:test";
import assert from "node:assert/strict";
import { applySceneEffects, createSceneState, restoreScene } from "../src/effects.js";

class Color {
  constructor(value = 0) { this.value = value; this.isColor = true; }
  clone() { return new Color(this.value); }
  copy(other) { this.value = other.value; return this; }
  lerp() { return this; }
}

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { Object.assign(this, { x, y, z }); }
  set(x, y, z) { Object.assign(this, { x, y, z }); return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  copy(other) { Object.assign(this, { x: other.x, y: other.y, z: other.z }); return this; }
  addScaledVector(vector, scale) {
    this.x += vector.x * scale; this.y += vector.y * scale; this.z += vector.z * scale;
    return this;
  }
  distanceTo(other) {
    return Math.hypot(this.x - other.x, this.y - other.y, this.z - other.z);
  }
}

class Box3 {
  setFromObject() { return this; }
  isEmpty() { return false; }
  getCenter(target) { return target.set?.(0, 0, 0) ?? target.copy(new Vector3()); }
  getBoundingSphere(target) { target.radius = 12; return target; }
}

class Sphere {}

class Fog {
  constructor(color, near, far) { Object.assign(this, { color, near, far }); }
}

function makeLight(flag, color, intensity) {
  const light = {
    [flag]: true,
    name: "",
    userData: {},
    color: new Color(color),
    intensity,
    position: new Vector3(),
    target: { position: new Vector3() },
    castShadow: false,
    shadow: {
      mapSize: { x: 1, y: 1, clone() { return { ...this, set(x, y) { this.x = x; this.y = y; }, copy(other) { this.x = other.x; this.y = other.y; } }; }, set(x, y) { this.x = x; this.y = y; }, copy(other) { this.x = other.x; this.y = other.y; } },
      bias: 0,
      normalBias: 0,
      radius: 1,
      camera: { updateProjectionMatrix() {} },
    },
  };
  return light;
}

class DirectionalLight {
  constructor(color, intensity) { return makeLight("isDirectionalLight", color, intensity); }
}

class HemisphereLight {
  constructor(color, groundColor, intensity) {
    const light = makeLight("isHemisphereLight", color, intensity);
    light.groundColor = new Color(groundColor);
    return light;
  }
}

function makeScene() {
  const scene = {
    background: null,
    fog: null,
    children: [],
    traverse(callback) {
      for (const child of [...this.children]) callback(child);
    },
    add(object) {
      if (!this.children.includes(object)) this.children.push(object);
      object.parent = this;
    },
    remove(object) {
      this.children = this.children.filter((child) => child !== object);
      object.parent = null;
    },
  };
  return scene;
}

test("scene lifecycle applies one sun/fill pair and restores the vanilla state", () => {
  const scene = makeScene();
  const barrier = {
    isMesh: true,
    name: "Barrier_01",
    material: { name: "Concrete" },
    castShadow: false,
    receiveShadow: false,
  };
  const ghost = {
    isMesh: true,
    name: "ReplayGhost_Car",
    material: { name: "CarBody", transparent: true, opacity: 0.5 },
    castShadow: false,
    receiveShadow: false,
  };
  scene.add(barrier);
  scene.add(ghost);
  const originalBackground = scene.background;
  const originalFog = scene.fog;
  const three = {
    Color,
    Fog,
    Box3,
    Sphere,
    Vector3,
    DirectionalLight,
    HemisphereLight,
    ACESFilmicToneMapping: 4,
  };
  const settings = {
    sunIntensity: 1.2,
    sunElevation: 35,
    sunAzimuth: 225,
    ambientIntensity: 1.1,
    fogEnabled: true,
    fogStrength: 0.2,
    shadowQuality: "low",
  };
  const state = createSceneState(scene);

  applySceneEffects(state, three, settings, { far: 1000 }, 1000);
  applySceneEffects(state, three, settings, { far: 1000 }, 1001);
  assert.equal(scene.children.filter((child) => child.isDirectionalLight).length, 1);
  assert.equal(scene.children.filter((child) => child.isHemisphereLight).length, 1);
  assert.notEqual(scene.fog, originalFog);
  const sun = scene.children.find((child) => child.isDirectionalLight);
  assert.equal(sun.shadow.mapSize.x, 1024);
  assert.equal(barrier.castShadow, true);
  assert.equal(barrier.receiveShadow, true);
  assert.equal(ghost.castShadow, false);
  assert.equal(ghost.receiveShadow, false);

  applySceneEffects(state, three, { ...settings, shadowQuality: "off" }, { far: 1000 }, 1002);
  assert.equal(sun.shadow.mapSize.x, 1);
  assert.equal(barrier.castShadow, false);
  assert.equal(barrier.receiveShadow, false);

  restoreScene(state);
  assert.equal(scene.background, originalBackground);
  assert.equal(scene.fog, originalFog);
  assert.equal(barrier.castShadow, false);
  assert.equal(barrier.receiveShadow, false);
  assert.equal(scene.children.length, 2);
});
