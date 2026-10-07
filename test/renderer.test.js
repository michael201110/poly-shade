import test from "node:test";
import assert from "node:assert/strict";
import { findThreeNamespace, installRenderHook } from "../src/renderer.js";

test("Three namespace is discovered through PML's scoped Webpack require", () => {
  class WebGLRenderer { constructor() { this.isWebGLRenderer = true; } }
  class Scene { constructor() { this.isScene = true; } }
  class Color { constructor() { this.isColor = true; } }
  class DirectionalLight { constructor() { this.isDirectionalLight = true; } }
  const factories = {
    core: function coreModule() {
      return "this.isScene = true; this.isColor = true; this.isDirectionalLight = true;";
    },
    renderer: function rendererModule() {
      return "this.isWebGLRenderer = true;";
    },
    unrelated: function unrelatedModule() {
      return "this.isScene = true;";
    },
  };
  const exportsById = {
    core: { Scene, Color, DirectionalLight },
    renderer: { WebGLRenderer },
  };
  const loadedModules = [];
  function webpackRequire(id) {
    loadedModules.push(id);
    return exportsById[id];
  }
  webpackRequire.m = factories;
  const pml = { getFromPolyTrack: (path) => path === "n" ? webpackRequire : undefined };
  const discovered = findThreeNamespace(pml);
  assert.equal(discovered.WebGLRenderer, WebGLRenderer);
  assert.equal(discovered.Scene, Scene);
  assert.equal(discovered.ACESFilmicToneMapping, 4);
  assert.equal(discovered.PCFSoftShadowMap, 2);
  assert.deepEqual(loadedModules, ["core", "renderer"]);
});

test("Three discovery reports when PML does not expose the Webpack module table", () => {
  assert.throws(
    () => findThreeNamespace({ getFromPolyTrack: () => () => undefined }),
    /Webpack require function or module table is unavailable/,
  );
});

test("Three discovery reports when the module table has no supported Three modules", () => {
  function webpackRequire() {
    throw new Error("No modules should be loaded");
  }
  webpackRequire.m = { unrelated: () => "not Three.js" };
  assert.throws(
    () => findThreeNamespace({ getFromPolyTrack: () => webpackRequire }),
    /does not contain the expected Three\.js modules/,
  );
});

test("render hook forwards the original call once and restores it on detach", () => {
  class WebGLRenderer {
    render(scene, camera, extra) {
      this.calls.push([scene, camera, extra]);
      return "frame";
    }
    constructor() { this.calls = []; }
  }

  const three = { WebGLRenderer };
  let before = 0;
  let after = 0;
  const original = WebGLRenderer.prototype.render;
  const remove = installRenderHook(three, {
    before() { before += 1; },
    after(_renderer, _scene, _camera, duration) {
      assert.equal(typeof duration, "number");
      after += 1;
    },
  });
  const renderer = new WebGLRenderer();
  const scene = {};
  const camera = {};

  assert.equal(renderer.render(scene, camera, "extra"), "frame");
  assert.deepEqual(renderer.calls, [[scene, camera, "extra"]]);
  assert.equal(before, 1);
  assert.equal(after, 1);

  remove();
  assert.equal(WebGLRenderer.prototype.render, original);
});

test('the PML 0.6.3 i binding is used instead of its unrelated n CSS module', () => {
  class WebGLRenderer { constructor() { this.isWebGLRenderer = true; } }
  class Scene { constructor() { this.isScene = true; } }
  class Color { constructor() { this.isColor = true; } }
  class DirectionalLight { constructor() { this.isDirectionalLight = true; } }
  function webpackRequire() { return { WebGLRenderer, Scene, Color, DirectionalLight }; }
  webpackRequire.m = { core: () => 'this.isWebGLRenderer = true; this.isScene = true; this.isColor = true; this.isDirectionalLight = true;' };
  assert.equal(findThreeNamespace({ getFromPolyTrack(name) {
    return name === 'i' ? webpackRequire : {};
  } }).WebGLRenderer, WebGLRenderer);
});

test('constructor-assigned render methods are intercepted before instantiation and restored on final detach', () => {
  class WebGLRenderer {
    constructor() {
      this.calls = 0;
      this.render = function () { this.calls++; return 'frame'; };
    }
  }
  let before = 0, after = 0;
  const listener = { before() { before++; }, after() { after++; } };
  const removeFirst = installRenderHook({ WebGLRenderer }, listener);
  const renderer = new WebGLRenderer();
  const other = { before() { before++; }, after() {} };
  const removeSecond = installRenderHook({ WebGLRenderer }, other);
  assert.equal(renderer.render({}, {}), 'frame');
  assert.equal(renderer.calls, 1);
  assert.equal(before, 2);
  assert.equal(after, 1);
  removeFirst();
  renderer.render({}, {});
  assert.equal(before, 3);
  removeSecond();
  renderer.render({}, {});
  assert.equal(before, 3);
  assert.equal(renderer.calls, 3);
  assert.equal(Object.hasOwn(WebGLRenderer.prototype, 'render'), false);
});
