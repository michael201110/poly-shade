import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { TargetPool } from "../src/rendering/render-targets.js";
import { PostProcess } from "../src/rendering/postprocess.js";
import {
  SunVisibility,
  sunScreenVisibility,
} from "../src/rendering/sun-visibility.js";
import { BrakeLights } from "../src/rendering/brake-lights.js";
import { PRESETS } from "../src/presets.js";
import { normalizeSettings } from "../src/settings.js";

const caps = {
  halfFloat: true,
  maxTextureSize: 4096,
  maxRenderbufferSize: 4096,
  maxSamples: 4,
  antialias: true,
  features: { depthTexture: true, ssao: true, bloom: true },
};
test("sample changes release GPU attachments; size-only changes reuse targets", () => {
  const pool = new TargetPool(THREE, caps);
  const first = pool.get("scene", 1280, 720, { depth: true, samples: 4 });
  let disposed = 0;
  first.addEventListener("dispose", () => disposed++);
  const second = pool.get("scene", 1280, 720, { depth: true, samples: 0 });
  assert.notEqual(second, first);
  assert.equal(disposed, 1);
  assert.equal(
    pool.get("scene", 1600, 900, { depth: true, samples: 0 }),
    second,
  );
  assert.equal(pool.allocations - pool.disposals, 1);
  assert.equal(pool.get("ao", 512, 288).texture.type, THREE.UnsignedByteType);
  pool.dispose();
  assert.equal(pool.allocations, pool.disposals);
});
test("zero-strength passes release targets and grade writes output directly without neighbourhood effects", () => {
  const renderer = {
    xr: { enabled: false, isPresenting: false },
    toneMapping: 0,
    toneMappingExposure: 1,
    outputColorSpace: THREE.SRGBColorSpace,
    autoClear: true,
    initialized: [],
    initRenderTarget(target) { this.initialized.push(target); },
    getContext: () => ({ drawingBufferWidth: 1280, drawingBufferHeight: 720 }),
    getRenderTarget() {
      return this.target ?? null;
    },
    getActiveCubeFace: () => 0,
    getActiveMipmapLevel: () => 0,
    getViewport: (v) => v.set(0, 0, 1280, 720),
    getScissor: (v) => v.set(0, 0, 1280, 720),
    getScissorTest: () => false,
    getClearColor: (c) => c.setRGB(0, 0, 0),
    getClearAlpha: () => 1,
    setRenderTarget(t) {
      this.target = t;
    },
    setScissorTest() {},
    setViewport() {},
    setScissor() {},
    setClearColor() {},
  };
  const post = new PostProcess(THREE, renderer, caps, { failures: new Map() });
  const camera = new THREE.PerspectiveCamera(70, 1280 / 720, 0.1, 1000);
  camera.updateMatrixWorld();
  const palette = {
    direction: new THREE.Vector3(0, 1, 0),
    sun: new THREE.Color(1, 1, 1),
    horizon: new THREE.Color(0.5, 0.5, 0.5),
  };
  const draw = () => {};
  const s = {
    ...PRESETS.cinematic,
    aoStrength: 0,
    bloomStrength: 0,
    sunRayStrength: 0,
    lensFlareStrength: 0,
    fxaaEnabled: false,
    sharpenEnabled: false,
    volumetricEnabled: true,
    volumetricStrength: 0,
  };
  post.render(new THREE.Scene(), camera, s, draw, palette);
  assert.deepEqual(post.passOrder, ["scene", "grade-output"]);
  assert.deepEqual([...post.pool.targets.keys()], ["scene"]);
  assert.equal(
    post.pool.get("scene", 1280, 720, { depth: true, samples: 0 }).samples,
    0,
  );
  post.render(new THREE.Scene(), camera,
    { ...s, volumetricStrength: 0.08, sunRayStrength: 0.24 }, draw, palette);
  assert.deepEqual(post.passOrder, ["scene", "grade-output"], "behind-camera sun skips shaft rendering");
  assert.equal(renderer.initialized.length, 4, "configured buffers are initialized before the sun enters view");
  const preparedAllocations = post.pool.allocations;
  palette.direction.set(0, 0.03, -1).normalize();
  post.render(
    new THREE.Scene(),
    camera,
    { ...s, volumetricStrength: 0.08, sunRayStrength: 0.24 },
    draw,
    palette,
  );
  assert.equal(post.active.volumetric, true);
  assert.equal(post.pool.allocations, preparedAllocations, "first partial occlusion allocates no buffers");
  assert.equal(renderer.initialized.length, 4);
  assert.equal(
    post.active.sunRays,
    true,
    "partial sun visibility keeps radial shafts active alongside softer volumetrics",
  );
  assert.deepEqual(post.passOrder, [
    "scene",
    "sun-visibility",
    "sun-mask",
    "sun-rays",
    "volumetric",
    "grade-output",
  ]);
  const volume = post.pool.targets.get("volumetric");
  assert.deepEqual([volume.width, volume.height], [1280, 720]);
  assert.equal(
    post.materials.get("grade-output").uniforms.atmosphereStrength.value,
    s.atmosphereStrength * 0.8,
  );
  post.sunVisibility.partial = 0;
  const rays = post.pool.targets.get("sun-rays"), allocations = post.pool.allocations;
  post.render(
    new THREE.Scene(),
    camera,
    { ...s, volumetricStrength: 0.08, sunRayStrength: 0.24 },
    draw,
    palette,
  );
  assert.deepEqual(
    post.passOrder,
    ["scene", "sun-visibility", "grade-output"],
    "fully visible sun skips costly shaft passes",
  );
  assert.equal(post.pool.targets.get("sun-rays"), rays, "occlusion transitions retain shaft buffers");
  assert.equal(post.pool.targets.get("volumetric"), volume);
  assert.equal(post.pool.allocations, allocations);
  post.render(new THREE.Scene(), camera, s, draw, palette);
  assert.deepEqual([...post.pool.targets.keys()], ["scene"]);
  post.render(
    new THREE.Scene(),
    camera,
    { ...s, postEnabled: false },
    draw,
    palette,
  );
  assert.equal(post.pool.targets.size, 0);
  post.dispose();
});
test("sun visibility never reads a pending fence and deletes pending resources on disable", () => {
  let ready = false,
    reads = 0,
    deleted = 0,
    waitArgs;
  const gl = {
    ALREADY_SIGNALED: 1,
    CONDITION_SATISFIED: 2,
    TIMEOUT_EXPIRED: 3,
    createBuffer: () => ({}),
    bindBuffer() {},
    bufferData() {},
    readPixels() {},
    fenceSync: () => ({}),
    clientWaitSync(...args) {
      waitArgs = args;
      return ready ? 1 : 3;
    },
    getBufferSubData(t, o, data) {
      reads++;
      data.set([255, 0, 0, 255]);
    },
    deleteSync() {
      deleted++;
    },
    deleteBuffer() {
      deleted++;
    },
  };
  const probe = new SunVisibility({ getContext: () => gl });
  probe.capture({ x: 0.5, y: 0.5 });
  probe.poll();
  assert.equal(reads, 0);
  assert.equal(waitArgs[2], 0);
  ready = true;
  probe.poll();
  assert.equal(reads, 1);
  assert.equal(probe.clear, 1);
  assert.equal(probe.partial, 0);
  probe.dispose();
  assert.equal(deleted, 2);
});

test("sun screen visibility fades at the edge and stops for offscreen or behind-camera suns", () => {
  assert.equal(sunScreenVisibility(1, new THREE.Vector2(0.5, 0.5)), 1);
  assert.ok(sunScreenVisibility(1, new THREE.Vector2(0.02, 0.5)) > 0);
  assert.equal(sunScreenVisibility(1, new THREE.Vector2(-0.04, 0.5)), 0);
  assert.equal(sunScreenVisibility(-1, new THREE.Vector2(0.5, 0.5)), 0);
});
test("missing SpotLight keeps native lamps and creates no omni light fallback", () => {
  const manager = new BrakeLights(
    { ...THREE, SpotLight: undefined },
    new THREE.Scene(),
  );
  manager.warned = true;
  manager.scan(PRESETS.cinematic, new THREE.PerspectiveCamera());
  assert.equal(manager.report().type, "native-emissive-only");
  assert.equal(manager.report().lights, 0);
});
test("saved artistic and optical overrides survive default calibration", () => {
  const old = {
    schemaVersion: 2,
    preset: "recording",
    enabled: true,
    overrides: {
      exposure: 1.1,
      shadowLift: 0.012,
      cloudAmount: 0.4,
      sunRayStrength: 0.16,
    },
  };
  assert.deepEqual(normalizeSettings(old).overrides, old.overrides);
});
