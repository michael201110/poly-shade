// The only adapter to pinned Three r181 backend internals. It exposes GPU-owned
// attachments on the SAME device, never reads pixels or copies WebGL textures.
export function gpuTexture(renderer, texture) {
  if (!renderer.backend.isWebGPUBackend)
    throw new Error("Three renderer silently selected a non-WebGPU backend");
  const handle = renderer.backend.get(texture).texture;
  if (!handle) throw new Error(`GPU attachment not allocated: ${texture.name}`);
  return handle;
}
export function gpuContext(renderer) {
  return renderer.backend.getContext();
}
export function sceneTimestamps(renderer, profiler, isShadowTarget) {
  const backend = renderer.backend,
    original = backend.initTimestampQuery;
  backend.initTimestampQuery = function (type, uid, descriptor) {
    if (profiler.current)
      Object.assign(descriptor, profiler.descriptor(
        isShadowTarget?.(renderer.getRenderTarget()) ? "shadows" : "scene"));
    else {
      delete descriptor.timestampWrites;
      original.call(this, type, uid, descriptor);
    }
  };
  return () => {
    backend.initTimestampQuery = original;
  };
}
