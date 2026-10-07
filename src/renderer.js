const RENDER_PATCH = Symbol.for("polyshade.webgl-render-patch");
import { discoverThree } from "./rendering/capabilities.js";
export const findThreeNamespace = discoverThree;

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
  let depth = 0;
  function invoke(original, renderer, scene, camera, args) {
    if (depth) return original.call(renderer, scene, camera, ...args);
    depth++;
    try {
      for (const listener of listeners) {
        try {
          listener.before(renderer, scene, camera);
        } catch (error) {
          console.error(
            "[PolyShade] Render pre-hook failed; the original frame will still render.",
            error,
          );
        }
      }
      const started = performance.now();
      try {
        const draw = (renderScene = scene, renderCamera = camera) =>
          original.call(renderer, renderScene, renderCamera, ...args);
        for (const listener of listeners) {
          if (listener.around)
            return listener.around(renderer, scene, camera, draw);
        }
        return draw();
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
    } finally {
      depth--;
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
          configurable: true,
          enumerable: true,
          writable: true,
          value: wrapper,
        });
        instances.set(renderer, { original, wrapper });
      },
    });
  }

  return () => remove(onRender);
}

// Capture the public native CSM object without reaching into renderer WeakMaps.
export function installGameRendererHook(three, onUpdate) {
  const prototype = three.GameRenderer?.prototype;
  if (!prototype?.update) return () => {};
  const original = prototype.update;
  const wrapper = function (...args) {
    onUpdate(this);
    return original.apply(this, args);
  };
  prototype.update = wrapper;
  return () => {
    if (prototype.update === wrapper) prototype.update = original;
  };
}
