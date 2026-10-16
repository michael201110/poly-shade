import { ShadowCache } from "../shadow-cache.js";

// Reuse the established caster/geometry/morph invalidation logic. CSMShadowNode
// owns lightweight cascade lights outside the scene hierarchy; adapt that list.
export class GPUShadowCache {
  constructor() {
    this.cache = new ShadowCache();
    this.camera = new Float64Array(32);
  }
  prepare(mirror, camera) {
    const lights = mirror.sun.shadow.shadowNode.lights;
    if (
      this.topology !== mirror.topologyVersion ||
      this.lightCount !== lights.length
    ) {
      this.cache.scan(mirror.scene);
      this.cache.lights = lights.map((node) => ({
        node,
        values: new Float64Array(9),
      }));
      this.topology = mirror.topologyVersion;
      this.lightCount = lights.length;
    }
    // Compare UNJITTERED camera state, before temporal sampling changes it.
    const matrices = [
      camera.matrixWorld.elements,
      camera.projectionMatrix.elements,
    ];
    let changed = false;
    matrices.forEach((a, j) =>
      a.forEach((v, i) => {
        const at = j * 16 + i;
        if (this.camera[at] !== v) changed = true;
        this.camera[at] = v;
      }),
    );
    if (changed) this.cache.valid = false;
    return this.cache.prepare(camera);
  }
  commit() {
    this.cache.commit();
  }
  dispose() {
    this.cache.dispose();
  }
  report() {
    return this.cache.report();
  }
}
