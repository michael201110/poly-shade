// Persistent GPU-owned textures. No GL handles or CPU image transfer exists here.
export class GPUResources {
  constructor(device) {
    this.device = device;
    this.targets = new Map();
    this.allocations = 0;
    this.resizes = 0;
  }
  get(name, width, height, format = "rgba16float", storage = false) {
    const usage =
      GPUTextureUsage.TEXTURE_BINDING |
      (storage
        ? GPUTextureUsage.STORAGE_BINDING
        : GPUTextureUsage.RENDER_ATTACHMENT);
    let entry = this.targets.get(name);
    if (
      entry &&
      (entry.width !== width ||
        entry.height !== height ||
        entry.format !== format ||
        entry.usage !== usage)
    ) {
      entry.texture.destroy();
      this.targets.delete(name);
      entry = null;
      this.resizes++;
    }
    if (!entry) {
      const texture = this.device.createTexture({
        label: `PolyShade ${name}`,
        size: [width, height],
        format,
        usage,
      });
      entry = {
        texture,
        view: texture.createView(),
        name,
        width,
        height,
        format,
        usage,
      };
      this.targets.set(name, entry);
      this.allocations++;
    }
    return entry;
  }
  retain(names) {
    for (const [key, value] of this.targets)
      if (!names.has(key)) {
        value.texture.destroy();
        this.targets.delete(key);
      }
  }
  release(prefix) {
    for (const [key, value] of this.targets)
      if (key.startsWith(prefix)) {
        value.texture.destroy();
        this.targets.delete(key);
      }
  }
  dispose() {
    for (const value of this.targets.values()) value.texture.destroy();
    this.targets.clear();
  }
  report() {
    return [...this.targets.values()].map(
      ({ name, width, height, format, usage }) => ({
        name,
        width,
        height,
        format,
        usage,
      }),
    );
  }
}
