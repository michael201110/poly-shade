// Reuse only identical shadow views. Moving casters, parent transforms, new
// objects, geometry uploads and light/projection changes invalidate the cache.
// Animated/deformed shadow casters conservatively update every frame.
const TRANSFORM_FIELDS = [
  ["position", "x"], ["position", "y"], ["position", "z"],
  ["quaternion", "x"], ["quaternion", "y"], ["quaternion", "z"], ["quaternion", "w"],
  ["scale", "x"], ["scale", "y"], ["scale", "z"],
];
const CAMERA_FIELDS = ["left", "right", "top", "bottom", "near", "far", "zoom"];
export class ShadowCache {
  constructor() {
    this.original = new Map();
    this.transforms = [];
    this.meshes = [];
    this.topology = [];
    this.lights = [];
    this.valid = false;
    this.updated = 0;
    this.reused = 0;
  }
  scan(scene) {
    const transforms = new Set(), priorityTransforms = new Set(), meshes = [], topology = [], lights = [];
    let animated = false;
    const addTransform = (node, priority = false) => {
      for (; node; node = node.parent) {
        transforms.add(node);
        if (priority) priorityTransforms.add(node);
      }
    };
    scene.traverse((node) => {
      if (node.userData?.polyShadeOwned && !node.castShadow && !node.isDirectionalLight) return;
      topology.push(node);
      if (node.isMesh) {
        meshes.push(node);
        if (node.castShadow) {
          addTransform(node, !!node.morphTargetInfluences?.length || !!node.isSkinnedMesh);
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          if (node.isSkinnedMesh ||
            node.onBeforeRender !== Object.getPrototypeOf(node).onBeforeRender ||
            materials.some((m) => m?.displacementMap || m?.map?.isVideoTexture || m?.alphaMap?.isVideoTexture))
            animated = true;
        }
      }
      if (node.isDirectionalLight && node.castShadow && node.shadow &&
        typeof node.shadow.autoUpdate === "boolean") {
        lights.push(node);
        addTransform(node, true);
        if (node.target) addTransform(node.target, true);
      }
    });
    const same = (next, previous) => next.length === previous.length &&
      next.every((node, i) => node === previous[i].node);
    const nodes = [...priorityTransforms, ...[...transforms].filter((node) => !priorityTransforms.has(node))];
    if (!same(nodes, this.transforms) || !same(meshes, this.meshes) ||
      !same(topology, this.topology) || !same(lights, this.lights)) {
      this.transforms = nodes.map((node) => ({ node, scannedParent: node.parent, values: new Float64Array(16) }));
      this.meshes = meshes.map((node) => ({ node, scannedCast: node.castShadow }));
      this.topology = topology.map((node) => ({ node, children: node.children.length }));
      this.lights = lights.map((node) => ({ node, values: new Float64Array(9) }));
      this.valid = false;
    }
    for (const row of this.transforms) row.scannedParent = row.node.parent;
    for (const row of this.meshes) row.scannedCast = row.node.castShadow;
    this.animated = animated;
    const active = new Set(lights.map((light) => light.shadow));
    for (const [shadow, value] of this.original)
      if (!active.has(shadow)) {
        shadow.autoUpdate = value;
        shadow.needsUpdate = true;
        this.original.delete(shadow);
      }
    for (const light of lights)
      if (!this.original.has(light.shadow))
        this.original.set(light.shadow, light.shadow.autoUpdate);
  }
  prepare(camera) {
    let dirty = !this.valid || this.animated;
    if (this.cameraLayers !== camera?.layers?.mask) dirty = true;
    this.cameraLayers = camera?.layers?.mask;
    for (const row of this.topology)
      if (row.children !== row.node.children.length) dirty = true;
    for (const row of this.transforms) {
      const n = row.node, a = row.values;
      const mode = n.matrixWorldAutoUpdate === false ? 2 : n.matrixAutoUpdate === false ? 1 : 0;
      if (mode) {
        const matrix = mode === 2 ? n.matrixWorld : n.matrix;
        for (let i = 0; i < 16; i++) {
          const value = matrix.elements[i];
          if (a[i] !== value) dirty = true;
          a[i] = value;
        }
      } else {
        for (let i = 0; i < TRANSFORM_FIELDS.length; i++) {
          const field = TRANSFORM_FIELDS[i], value = n[field[0]][field[1]];
          if (a[i] !== value) dirty = true;
          a[i] = value;
        }
      }
      if (row.scannedParent !== n.parent || row.visible !== n.visible || row.auto !== mode)
        dirty = true;
      row.visible = n.visible; row.auto = mode;
      // Any change already requires a fresh shadow render. During driving,
      // checking the priority car/light transforms avoids walking every track
      // mesh's material and geometry merely to reach the same conclusion.
      if (dirty && this.valid) return this.invalidate();
    }
    for (const row of this.meshes) {
      const n = row.node, g = n.geometry;
      if (row.scannedCast !== n.castShadow || row.cast !== n.castShadow) dirty = true;
      if (n.castShadow) {
        if (n.isSkinnedMesh ||
          n.customDepthMaterial || n.onBeforeShadow !== Object.getPrototypeOf(n).onBeforeShadow ||
          n.onBeforeRender !== Object.getPrototypeOf(n).onBeforeRender)
          dirty = true;
        const morphs = n.morphTargetInfluences;
        if ((row.morphs?.length ?? 0) !== (morphs?.length ?? 0)) {
          row.morphs = new Float64Array(morphs?.length ?? 0); dirty = true;
        }
        if (morphs?.length) {
          for (let i = 0; i < morphs.length; i++) {
            if (row.morphs[i] !== morphs[i]) dirty = true;
            row.morphs[i] = morphs[i];
          }
          const attributes = g?.morphAttributes.position ?? [];
          const versions = (row.morphVersions ??= []);
          for (let i = 0; i < attributes.length; i++) {
            if (versions[i] !== attributes[i].version) dirty = true;
            versions[i] = attributes[i].version;
          }
        }
        const version = g?.attributes?.position?.version;
        const index = g?.index?.version;
        const instances = n.instanceMatrix?.version;
        if (row.geometry !== g || row.version !== version || row.index !== index ||
          row.instances !== instances || row.material !== n.material ||
          row.depthMaterial !== n.customDepthMaterial || row.layers !== n.layers.mask ||
          row.culled !== n.frustumCulled || row.drawStart !== g?.drawRange.start || row.drawCount !== g?.drawRange.count) dirty = true;
        row.geometry = g; row.version = version; row.index = index;
        row.instances = instances; row.material = n.material; row.depthMaterial = n.customDepthMaterial;
        row.layers = n.layers.mask; row.culled = n.frustumCulled;
        row.drawStart = g?.drawRange.start; row.drawCount = g?.drawRange.count;
        const array = Array.isArray(n.material), count = array ? n.material.length : 1;
        if (row.materialCount !== count) dirty = true;
        row.materialCount = count;
        const previous = (row.materials ??= []);
        for (let i = 0; i < count; i++) {
          const m = array ? n.material[i] : n.material;
          const entry = (previous[i] ??= {});
          if (entry.material !== m || entry.version !== m?.version || entry.visible !== m?.visible ||
            entry.alphaMap !== m?.alphaMap || entry.alphaVersion !== m?.alphaMap?.version ||
            entry.alphaTest !== m?.alphaTest || entry.opacity !== m?.opacity || entry.side !== m?.side ||
            (m?.alphaTest > 0 && (entry.map !== m.map || entry.mapVersion !== m.map?.version))) dirty = true;
          entry.material = m; entry.version = m?.version; entry.visible = m?.visible;
          entry.alphaMap = m?.alphaMap; entry.alphaVersion = m?.alphaMap?.version;
          entry.map = m?.map; entry.mapVersion = m?.map?.version;
          entry.alphaTest = m?.alphaTest; entry.opacity = m?.opacity; entry.side = m?.side;
        }
      }
      row.cast = n.castShadow;
    }
    for (const row of this.lights) {
      const s = row.node.shadow, c = s.camera, a = row.values;
      for (let i = 0; i < 9; i++) {
        const value = i === 0 ? s.mapSize.x : i === 1 ? s.mapSize.y : c[CAMERA_FIELDS[i - 2]];
        const stored = value === undefined ? NaN : value;
        if (!Object.is(a[i], stored)) dirty = true;
        a[i] = stored;
      }
      if (!s.map || s.needsUpdate) dirty = true;
    }
    for (const { node } of this.lights) {
      node.shadow.autoUpdate = false;
      node.shadow.needsUpdate = dirty;
    }
    this.pending = dirty;
    return dirty;
  }
  invalidate() {
    for (const { node } of this.lights) {
      node.shadow.autoUpdate = false;
      node.shadow.needsUpdate = true;
    }
    this.pending = true;
    return true;
  }
  commit() {
    this.valid = this.lights.every(({ node }) => node.shadow.map && !node.shadow.needsUpdate);
    if (this.pending) this.updated++;
    else this.reused++;
  }
  report() {
    return { updated: this.updated, reused: this.reused, animated: this.animated };
  }
  dispose() {
    for (const [shadow, autoUpdate] of this.original) {
      shadow.autoUpdate = autoUpdate;
      shadow.needsUpdate = true;
    }
    this.original.clear();
    this.transforms.length = this.meshes.length = this.topology.length = this.lights.length = 0;
    this.valid = false;
  }
}
