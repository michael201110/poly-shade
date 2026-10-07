import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { ProceduralSky, skyPalette } from "../src/rendering/sky.js";
import { SkyEnvironment } from "../src/rendering/environment.js";
import { TargetPool, RenderState } from "../src/rendering/render-targets.js";
import { classifyMaterialEvidence } from "../src/materials.js";
import { normalizeSettings, updateOverride } from "../src/settings.js";
import { PRESETS } from "../src/presets.js";
import { ShaderGuard } from "../src/rendering/shader-guard.js";
import { GpuTimer } from "../src/rendering/performance.js";
import { BrakeLights } from "../src/rendering/brake-lights.js";

test("brake lamps create real point lights, follow native emissive state, exclude ghosts and clean up", () => {
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera();
  const lamp = new THREE.MeshStandardMaterial({ emissive: 0x000000 });
  lamp.name = "BrakeLight";
  const car = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.15), lamp);
  car.name = "Body";
  car.position.y = 0.4;
  scene.add(car);
  const ghost = car.clone();
  ghost.name = "ReplayGhost";
  ghost.material = lamp.clone();
  ghost.material.name = "BrakeLight";
  scene.add(ghost);
  const manager = new BrakeLights(THREE, scene);
  manager.scan(PRESETS.cinematic, camera);
  manager.update(PRESETS.cinematic);
  assert.equal(manager.report().cars, 1);
  assert.equal(manager.report().lights, 2);
  assert.equal(manager.report().active, false);
  lamp.emissive.setRGB(1, 0.4, 0.3);
  manager.update(PRESETS.cinematic);
  assert.equal(manager.report().active, true);
  const lights = manager.cars.get(car).lights;
  assert.ok(
    lights.every(
      (l) =>
        l.isPointLight &&
        l.visible &&
        l.intensity > 0 &&
        l.distance === 2.5 &&
        !l.castShadow,
    ),
  );
  lamp.emissive.setRGB(0, 0, 0);
  manager.update(PRESETS.cinematic);
  assert.ok(lights.every((l) => l.intensity === 0));
  manager.dispose();
  assert.ok(lights.every((l) => l.parent === null));
  assert.equal(car.children.length, 0);
});

test("sky uses linear colours, hides only native sky and restores its exact visibility/background", () => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#123456");
  const background = scene.background;
  const native = new THREE.Mesh(
    new THREE.SphereGeometry(),
    new THREE.ShaderMaterial(),
  );
  scene.add(native);
  const sky = new ProceduralSky(THREE, scene);
  sky.update(PRESETS.cinematic, 0);
  sky.scan();
  assert.equal(native.visible, false);
  assert.equal(scene.background, null);
  assert.ok(Number.isFinite(sky.uniforms.horizon.value.r));
  assert.ok(Math.abs(sky.palette.direction.length() - 1) < 1e-6);
  sky.update({ ...PRESETS.cinematic, skyEnabled: false }, 100);
  assert.equal(native.visible, true);
  sky.dispose();
  assert.equal(scene.background, background);
  assert.equal(scene.children.length, 1);
  const low = skyPalette(THREE, { ...PRESETS.cinematic, sunElevation: 5 });
  const high = skyPalette(THREE, { ...PRESETS.cinematic, sunElevation: 70 });
  assert.ok(low.sun.b < high.sun.b);
});

test("environment reuses textures until sky settings change, disposes replacements and restores original", () => {
  const scene = new THREE.Scene();
  scene.environment = new THREE.Texture();
  const original = scene.environment;
  const env = new SkyEnvironment(THREE, scene);
  env.update(PRESETS.cinematic);
  const first = env.texture;
  let disposed = 0;
  first.addEventListener("dispose", () => disposed++);
  env.update({ ...PRESETS.cinematic, exposure: 1.2 });
  assert.equal(env.texture, first);
  assert.equal(env.generations, 1);
  env.update({ ...PRESETS.cinematic, sunAzimuth: 90 });
  assert.equal(disposed, 1);
  assert.equal(env.generations, 2);
  assert.equal(env.texture.mapping, THREE.EquirectangularReflectionMapping);
  // The generated equirectangular image must agree with the game's UV convention.
  const { width, height, data } = env.texture.image;
  const sun = skyPalette(THREE, {
    ...PRESETS.cinematic,
    sunAzimuth: 90,
  }).direction;
  const x = Math.floor(
    (Math.atan2(sun.z, sun.x) / (2 * Math.PI) + 0.5) * width,
  );
  const y = Math.floor((Math.asin(sun.y) / Math.PI + 0.5) * height);
  const sunBrightness =
    data[(y * width + x) * 4] +
    data[(y * width + x) * 4 + 1] +
    data[(y * width + x) * 4 + 2];
  const away =
    data[(y * width + ((x + width / 2) % width)) * 4] +
    data[(y * width + ((x + width / 2) % width)) * 4 + 1] +
    data[(y * width + ((x + width / 2) % width)) * 4 + 2];
  assert.ok(sunBrightness > away + 0.1);
  env.dispose();
  assert.equal(scene.environment, original);
});

test("render target pool clamps to GPU limits, resizes without growing the pool, releases disabled passes", () => {
  const pool = new TargetPool(THREE, {
    halfFloat: true,
    maxTextureSize: 1024,
    maxRenderbufferSize: 2048,
    maxSamples: 4,
    features: { depthTexture: true },
  });
  const a = pool.get("scene", 2000, 1000, { depth: true, samples: 8 });
  assert.deepEqual([a.width, a.height], [1024, 512]);
  assert.equal(a.samples, 4);
  assert.ok(a.depthTexture);
  assert.equal(pool.get("scene", 500, 250), a);
  assert.equal(pool.allocations, 1);
  pool.get("ao", 200, 100);
  pool.retain(new Set(["scene"]));
  assert.equal(pool.disposals, 1);
  pool.dispose();
  assert.equal(pool.targets.size, 0);
  assert.equal(pool.disposals, 2);
});

test("render state restores target, viewport, scissor, clear, XR and colour controls after a failed pass", () => {
  const renderer = {
    target: { name: "native" },
    face: 2,
    mip: 1,
    viewport: new THREE.Vector4(2, 3, 640, 360),
    scissor: new THREE.Vector4(5, 6, 300, 200),
    scissorTest: true,
    color: new THREE.Color("#123456"),
    alpha: 0.4,
    autoClear: false,
    toneMapping: 4,
    toneMappingExposure: 1.2,
    outputColorSpace: "srgb",
    xr: { enabled: true },
    getRenderTarget() {
      return this.target;
    },
    getActiveCubeFace() {
      return this.face;
    },
    getActiveMipmapLevel() {
      return this.mip;
    },
    getViewport(v) {
      return v.copy(this.viewport);
    },
    getScissor(v) {
      return v.copy(this.scissor);
    },
    getScissorTest() {
      return this.scissorTest;
    },
    getClearColor(c) {
      return c.copy(this.color);
    },
    getClearAlpha() {
      return this.alpha;
    },
    setRenderTarget(t, f, m) {
      this.target = t;
      this.face = f;
      this.mip = m;
    },
    setViewport(v) {
      this.viewport.copy(v);
    },
    setScissor(v) {
      this.scissor.copy(v);
    },
    setScissorTest(v) {
      this.scissorTest = v;
    },
    setClearColor(c, a) {
      this.color.copy(c);
      this.alpha = a;
    },
  };
  const state = new RenderState(THREE);
  state.capture(renderer);
  const target = renderer.target;
  renderer.target = null;
  renderer.viewport.set(0, 0, 1, 1);
  renderer.xr.enabled = false;
  renderer.toneMapping = 0;
  renderer.outputColorSpace = "srgb-linear";
  state.restore(renderer);
  assert.equal(renderer.target, target);
  assert.deepEqual(renderer.viewport.toArray(), [2, 3, 640, 360]);
  assert.equal(renderer.xr.enabled, true);
  assert.equal(renderer.outputColorSpace, "srgb");
  assert.equal(renderer.alpha, 0.4);
});

test("classification reports confidence, protects green cars and accepts escaped persistent patterns", () => {
  const paint = new THREE.MeshBasicMaterial({ color: "#20dd20" });
  paint.name = "Paint";
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), paint);
  mesh.name = "CarBody";
  const result = classifyMaterialEvidence(mesh, paint);
  assert.equal(result.kind, "car");
  assert.ok(result.confidence >= 0.9);
  assert.equal(
    classifyMaterialEvidence(mesh, paint, { "mesh:Car*": "ignore" }).kind,
    "ignore",
  );
  mesh.name = "weird[1]";
  assert.equal(
    classifyMaterialEvidence(mesh, paint, { "mesh:weird[1]": "metal" }).kind,
    "metal",
  );
  const migrated = normalizeSettings({
    schemaVersion: 1,
    preset: "cinematic",
    enabled: false,
    overrides: { exposure: 1.2 },
  });
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.enabled, false);
  assert.deepEqual(
    updateOverride(migrated, "materialOverrides", {
      "mesh:Car*": "car",
      "uuid:123": "road",
    }).overrides.materialOverrides,
    { "mesh:Car*": "car" },
  );
});

test("shader failure isolation retains unrelated passes and restores debug callbacks", () => {
  const renderer = { debug: { checkShaderErrors: false, onShaderError: null } };
  const guard = new ShaderGuard(renderer),
    original = console.error;
  console.error = () => {};
  try {
    guard.pass = "ao";
    guard.callback(
      {
        getShaderSource: () => "// PolyShade ao",
        getProgramInfoLog: () => "link error",
        getShaderInfoLog: () => "",
      },
      {},
      {},
      {},
    );
    assert.equal(guard.failures.has("ao"), true);
    assert.equal(guard.failures.has("bloom"), false);
    guard.dispose();
    assert.equal(renderer.debug.checkShaderErrors, false);
    assert.equal(renderer.debug.onShaderError, null);
  } finally {
    console.error = original;
  }
});

test("GPU timings are asynchronous and discard disjoint samples and outstanding queries", () => {
  let available = false,
    disjoint = false,
    deleted = 0;
  const gl = {
    CURRENT_QUERY: 1,
    QUERY_RESULT_AVAILABLE: 2,
    QUERY_RESULT: 3,
    getQuery: () => null,
    createQuery: () => ({}),
    beginQuery() {},
    endQuery() {},
    getParameter: () => disjoint,
    getQueryParameter: (q, key) => (key === 2 ? available : 2000000),
    deleteQuery() {
      deleted++;
    },
  };
  const timer = new GpuTimer(
    { getContext: () => gl },
    { timerExtension: { TIME_ELAPSED_EXT: 4, GPU_DISJOINT_EXT: 5 } },
  );
  timer.begin();
  timer.end();
  assert.equal(timer.metrics(), null);
  assert.equal(timer.pending.length, 1);
  available = true;
  timer.collect();
  assert.equal(timer.metrics().average, 2);
  timer.frame = 0;
  available = false;
  timer.begin();
  timer.end();
  disjoint = true;
  timer.collect();
  assert.equal(timer.pending.length, 0);
  assert.equal(deleted, 2);
  timer.dispose();
});
