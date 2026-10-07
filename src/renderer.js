const RENDER_PATCH = Symbol.for("polyshade.webgl-render-patch");
const CLASS_MARKERS = Object.freeze({
  WebGLRenderer: "isWebGLRenderer",
  Scene: "isScene",
  Color: "isColor",
  Fog: "isFog",
  DirectionalLight: "isDirectionalLight",
  Vector3: "isVector3",
  AmbientLight: "isAmbientLight",
  HemisphereLight: "isHemisphereLight",
  Box3: "isBox3",
  Sphere: "isSphere",
  MeshPhongMaterial: "isMeshPhongMaterial",
  MeshStandardMaterial: "isMeshStandardMaterial",
  MeshLambertMaterial: "isMeshLambertMaterial",
});

function sourceHasMarker(source, marker) {
  return new RegExp(`\\.${marker}\\s*=`).test(source);
}

function hasInstanceMarker(candidate, marker) {
  if (typeof candidate !== "function") return false;
  try {
    return sourceHasMarker(Function.prototype.toString.call(candidate), marker);
  } catch (error) {
    console.warn(`[PolyShade] Could not inspect a bundled Three.js export (${marker}).`, error);
    return false;
  }
}

function readThreeExports(moduleExports) {
  const three = {};
  for (const exports of moduleExports) {
    if (!exports || (typeof exports !== "object" && typeof exports !== "function")) continue;
    let candidates;
    try {
      candidates = Object.values(exports);
    } catch (error) {
      console.warn("[PolyShade] A bundled module export could not be inspected.", error);
      continue;
    }

    for (const [name, marker] of Object.entries(CLASS_MARKERS)) {
      if (three[name]) continue;
      for (const candidate of candidates) {
        if (hasInstanceMarker(candidate, marker)) {
          three[name] = candidate;
          break;
        }
      }
    }
    for (const name of ["ACESFilmicToneMapping", "PCFSoftShadowMap", "PCFShadowMap"]) {
      if (typeof exports[name] === "number") three[name] = exports[name];
    }
  }
  return three;
}

function findThreeModuleIds(moduleFactories) {
  const coreIds = [];
  const rendererIds = [];

  for (const [id, factory] of Object.entries(moduleFactories)) {
    if (typeof factory !== "function") continue;

    let source;
    try {
      source = Function.prototype.toString.call(factory);
    } catch (error) {
      console.warn(`[PolyShade] Could not inspect bundled module ${id}.`, error);
      continue;
    }

    if (sourceHasMarker(source, CLASS_MARKERS.WebGLRenderer)) rendererIds.push(id);
    if (["MeshPhongMaterial", "MeshStandardMaterial", "MeshLambertMaterial"]
      .some((name) => sourceHasMarker(source, CLASS_MARKERS[name]))) coreIds.push(id);
    if (
      sourceHasMarker(source, CLASS_MARKERS.Scene)
      && sourceHasMarker(source, CLASS_MARKERS.Color)
      && sourceHasMarker(source, CLASS_MARKERS.DirectionalLight)
    ) {
      coreIds.push(id);
    }
  }

  return [...new Set([...coreIds, ...rendererIds])];
}

export function findThreeNamespace(pml) {
  if (typeof pml?.getFromPolyTrack !== "function") {
    throw new Error("PML getFromPolyTrack is unavailable; PolyShade cannot access the live renderer.");
  }

  let webpackRequire;
  for (const name of ["i", "n"]) {
    try {
      const candidate = pml.getFromPolyTrack(name);
      if (typeof candidate === "function" && candidate.m) {
        webpackRequire = candidate;
        break;
      }
    } catch {
      // Minified identifiers differ between game bundles; verify the module table.
    }
  }

  const moduleFactories = webpackRequire?.m;
  if (typeof webpackRequire !== "function" || !moduleFactories || typeof moduleFactories !== "object") {
    throw new Error("PolyTrack's scoped Webpack require function or module table is unavailable.");
  }

  const moduleIds = findThreeModuleIds(moduleFactories);
  if (moduleIds.length === 0) {
    throw new Error("PolyTrack's Webpack module table does not contain the expected Three.js modules.");
  }

  const moduleExports = [];
  for (const moduleId of moduleIds) {
    try {
      moduleExports.push(webpackRequire(moduleId));
    } catch (error) {
      throw new Error(`PolyTrack could not load bundled Three.js module ${moduleId}.`, { cause: error });
    }
  }

  const three = readThreeExports(moduleExports);
  if (
    typeof three.WebGLRenderer === "function"
    && typeof three.Scene === "function"
    && typeof three.Color === "function"
    && typeof three.DirectionalLight === "function"
  ) {
    // Three.js bundles often mangle the export keys; these are its stable enum values.
    three.ACESFilmicToneMapping ??= 4;
    three.PCFSoftShadowMap ??= 2;
    three.PCFShadowMap ??= 1;
    return three;
  }

  const missing = ["WebGLRenderer", "Scene", "Color", "DirectionalLight"]
    .filter((name) => typeof three[name] !== "function");
  throw new Error(`The live PolyTrack Three.js exports are missing required classes: ${missing.join(", ")}.`);
}

export function installRenderHook(three, onRender) {
  const prototype = three?.WebGLRenderer?.prototype;
  if (!prototype) {
    throw new Error("Three.js WebGLRenderer is not accessible.");
  }

  const existing = prototype[RENDER_PATCH];
  if (existing) {
    existing.listeners.add(onRender);
    return () => existing.remove(onRender);
  }

  const originalRender = prototype.render;
  const listeners = new Set([onRender]);
  const instances = new Map();
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "render");
  function invoke(original, renderer, scene, camera, args) {
    for (const listener of listeners) {
      try {
        listener.before(renderer, scene, camera);
      } catch (error) {
        console.error("[PolyShade] Render pre-hook failed; the original frame will still render.", error);
      }
    }
    const started = performance.now();
    try {
      return original.call(renderer, scene, camera, ...args);
    } finally {
      const duration = performance.now() - started;
      for (const listener of listeners) {
        try {
          listener.after(renderer, scene, camera, duration);
        } catch (error) {
          console.error("[PolyShade] Render post-hook failed.", error);
        }
      }
    }
  }

  function polyShadeRender(scene, camera, ...args) {
    return invoke(originalRender, this, scene, camera, args);
  }

  function remove(listener) {
    listeners.delete(listener);
    if (listeners.size) return;
    for (const [renderer, entry] of instances) {
      if (renderer.render === entry.wrapper) renderer.render = entry.original;
    }
    instances.clear();
    if (descriptor) Object.defineProperty(prototype, "render", descriptor);
    else delete prototype.render;
    delete prototype[RENDER_PATCH];
  }

  Object.defineProperty(prototype, RENDER_PATCH, {
    configurable: true,
    value: { originalRender, listeners, wrapper: polyShadeRender, remove },
  });
  if (typeof originalRender === "function") prototype.render = polyShadeRender;
  else {
    // Three.js assigns this.render inside its constructor. Install before game init.
    Object.defineProperty(prototype, "render", {
      configurable: true,
      set(original) {
        const renderer = this;
        const wrapper = function (scene, camera, ...args) {
          return invoke(original, renderer, scene, camera, args);
        };
        Object.defineProperty(renderer, "render", {
          configurable: true, enumerable: true, writable: true, value: wrapper,
        });
        instances.set(renderer, { original, wrapper });
      },
    });
  }

  return () => remove(onRender);
}
