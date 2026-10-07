const MATERIAL_KEYWORDS = Object.freeze({
  tire: /(?:^|[^a-z0-9])(tire|tyre|wheel|rubber)(?:$|[^a-z0-9])/,
  glass: /(?:^|[^a-z0-9])(glass|window|windscreen|windshield)(?:$|[^a-z0-9])/,
  car: /(?:^|[^a-z0-9])(car|vehicle|body|paint|chassis)(?:$|[^a-z0-9])/,
  barrier: /(?:^|[^a-z0-9])(barrier|guard.?rail|wall|fence|concrete|block)(?:$|[^a-z0-9])/,
  grass: /(?:^|[^a-z0-9])(grass|turf|field|ground|terrain)(?:$|[^a-z0-9])/,
  road: /(?:^|[^a-z0-9])(road|asphalt|track|pavement|surface)(?:$|[^a-z0-9])/,
});

function ancestorNames(mesh) {
  const names = [];
  for (let parent = mesh?.parent; parent && !parent.isScene; parent = parent.parent) {
    if (typeof parent.name === "string") names.push(parent.name);
    if (typeof parent.userData?.type === "string") names.push(parent.userData.type);
  }
  return names.join(" ");
}

export function isReplayGhost(mesh, material) {
  const descriptors = [
    mesh?.name,
    mesh?.userData?.type,
    material?.name,
    material?.userData?.type,
    ancestorNames(mesh),
  ].filter((value) => typeof value === "string").join(" ").toLowerCase();
  return ["ghost", "replay", "swarm", "training"].some((marker) => descriptors.includes(marker));
}

export function classifyMaterial(mesh, material) {
  const descriptors = [
    mesh?.name,
    mesh?.userData?.type,
    mesh?.userData?.material,
    material?.name,
    material?.userData?.type,
    material?.map?.name,
    ancestorNames(mesh),
  ].filter((value) => typeof value === "string").join(" ").toLowerCase();

  if (isReplayGhost(mesh, material)) {
    return "other";
  }
  for (const kind of ["tire", "glass", "car", "barrier", "grass", "road"]) {
    if (MATERIAL_KEYWORDS[kind].test(descriptors)) return kind;
  }

  const color = material?.color;
  if (color && Number.isFinite(color.r) && Number.isFinite(color.g) && Number.isFinite(color.b)) {
    if (color.g > color.r * 1.18 && color.g > color.b * 1.12) return "grass";
  }
  return "other";
}

function tuneMaterial(material, kind) {
  if (typeof material.roughness === "number" && typeof material.metalness === "number") {
    const tuning = {
      road: [0.72, 0.04],
      grass: [0.88, 0],
      barrier: [0.78, 0.04],
      car: [0.34, 0.18],
      tire: [0.94, 0.01],
    }[kind];
    if (tuning) {
      material.roughness = tuning[0];
      material.metalness = Math.min(material.metalness, tuning[1]);
      material.needsUpdate = true;
      return true;
    }
  }

  if (typeof material.shininess === "number") {
    material.shininess = kind === "car" ? 65 : kind === "tire" ? 4 : 12;
    material.needsUpdate = true;
    return true;
  }
  return false;
}

// Copy common render flags without copying Basic's type or shader identity.
const SURFACE_PROPERTIES = [
  "name", "map", "alphaMap", "alphaTest", "opacity", "transparent", "side",
  "vertexColors", "fog", "wireframe", "depthTest", "depthWrite", "colorWrite",
  "blending", "blendSrc", "blendDst", "blendEquation", "premultipliedAlpha",
  "polygonOffset", "polygonOffsetFactor", "polygonOffsetUnits", "visible",
  "lightMap", "lightMapIntensity", "aoMap", "aoMapIntensity", "envMap",
  "combine", "reflectivity", "refractionRatio", "skinning", "morphTargets", "morphNormals",
];

export function syncMaterialColors(sceneState, settings = {}) {
  const snapshots = sceneState.materialSyncSnapshots ??= new WeakMap();
  for (const [source, byKind] of sceneState.materialClones) {
    for (const [kind, clone] of byKind) {
      const previous = snapshots.get(clone);
      for (const key of ["opacity", "transparent", "visible", "depthWrite", "map", "alphaMap", "alphaTest", "vertexColors"]) {
        if (previous && source[key] === previous[key] && clone[key] !== previous[key]) {
          source[key] = clone[key];
          if (!["opacity", "visible", "depthWrite"].includes(key)) source.needsUpdate = true;
        }
        if (source[key] === undefined || clone[key] === source[key]) continue;
        clone[key] = source[key];
        if (!["opacity", "visible", "depthWrite"].includes(key)) clone.needsUpdate = true;
      }
      if (!clone.color?.copy || !source.color) continue;
      if (previous && source.color.r === previous.sourceR && source.color.g === previous.sourceG
        && source.color.b === previous.sourceB && (clone.color.r !== previous.outputR
          || clone.color.g !== previous.outputG || clone.color.b !== previous.outputB)) {
        // The game also updates colors through mesh.material after async model loading.
        source.color.copy(clone.color);
      }
      clone.color.copy(source.color);
      const { r, g, b } = source.color;
      // Tint only neutral architecture; retain saturated paint and track markings.
      const neutral = Math.max(r, g, b) - Math.min(r, g, b) < 0.12;
      if (neutral && kind !== "car" && kind !== "tire" && !source.map && !source.vertexColors) {
        const warmth = settings.surfaceWarmth ?? 0;
        clone.color.r *= 1 - warmth * 0.04;
        clone.color.g *= 1 - warmth * 0.16;
        clone.color.b *= 1 - warmth * 0.32;
      }
      snapshots.set(clone, {
        sourceR: source.color.r, sourceG: source.color.g, sourceB: source.color.b,
        outputR: clone.color.r, outputG: clone.color.g, outputB: clone.color.b,
        opacity: source.opacity, transparent: source.transparent, visible: source.visible,
        depthWrite: source.depthWrite, map: source.map, alphaMap: source.alphaMap,
        alphaTest: source.alphaTest, vertexColors: source.vertexColors,
      });
    }
  }
}

export function applyMaterialTuning(sceneState, three = {}, settings = {}) {
  const LitMaterial = three.MeshPhongMaterial ?? three.MeshStandardMaterial ?? three.MeshLambertMaterial;
  const { scene, materialClones, originalMaterials, processedMeshes } = sceneState;
  const activeMeshes = new Set();
  let modified = 0;
  scene.traverse((mesh) => {
    if (!mesh?.isMesh) return;
    activeMeshes.add(mesh);

    const knownMaterial = processedMeshes.get(mesh);
    if (knownMaterial === mesh.material) {
      const source = originalMaterials.get(mesh);
      const sources = Array.isArray(source) ? source : [source];
      if (!source || !sources.some((material) => isReplayGhost(mesh, material)
        || material?.transparent || material?.opacity < 0.98)) return;
      mesh.material = source;
    }
    if (processedMeshes.has(mesh)) {
      // The game assigned a new material: keep that assignment as the new baseline.
      originalMaterials.delete(mesh);
    }

    const original = mesh.material;
    const isArray = Array.isArray(original);
    const materials = isArray ? original : [original];
    const replayGhost = materials.some((material) => isReplayGhost(mesh, material));
    let changed = false;
    const replacements = materials.map((material) => {
      if (!material || typeof material.clone !== "function") return material;
      if (replayGhost || material.transparent || material.opacity < 0.98) return material;
      if (material.wireframe
        || material.onBeforeCompile !== Object.getPrototypeOf(material).onBeforeCompile) return material;
      const kind = classifyMaterial(mesh, material);
      const basic = material.isMeshBasicMaterial
        && typeof LitMaterial === "function" && mesh.geometry?.attributes?.normal;
      if (kind === "glass" || (kind === "other" && !basic)) return material;

      let byKind = materialClones.get(material);
      if (!byKind) {
        byKind = new Map();
        materialClones.set(material, byKind);
      }
      let clone = byKind.get(kind);
      if (!clone) {
        if (basic) {
          clone = new LitMaterial();
          for (const key of SURFACE_PROPERTIES) {
            if (material[key] !== undefined) clone[key] = material[key];
          }
          clone.color.copy(material.color);
          clone.flatShading = true;
          clone.toneMapped = true;
        } else {
          clone = material.clone();
        }
        if (!tuneMaterial(clone, kind) && !basic) {
          clone.dispose?.();
          return material;
        }
        byKind.set(kind, clone);
      }
      changed = true;
      return clone;
    });

    if (changed) {
      originalMaterials.set(mesh, original);
      mesh.material = isArray ? replacements : replacements[0];
      modified += 1;
    }
    processedMeshes.set(mesh, mesh.material);
  });

  for (const mesh of processedMeshes.keys()) {
    if (activeMeshes.has(mesh)) continue;
    const original = originalMaterials.get(mesh);
    if (original !== undefined) mesh.material = original;
    originalMaterials.delete(mesh);
    processedMeshes.delete(mesh);
  }

  const activeMaterials = new Set();
  for (const mesh of activeMeshes) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) activeMaterials.add(material);
  }
  for (const [material, byKind] of materialClones) {
    for (const [kind, clone] of byKind) {
      if (activeMaterials.has(clone)) continue;
      clone.dispose?.();
      byKind.delete(kind);
    }
    if (byKind.size === 0) materialClones.delete(material);
  }
  syncMaterialColors(sceneState, settings);
  return modified;
}

export function restoreMaterials(sceneState) {
  for (const [mesh, material] of sceneState.originalMaterials) {
    if (mesh && mesh.material === sceneState.processedMeshes.get(mesh)) mesh.material = material;
  }
  for (const byKind of sceneState.materialClones.values()) {
    for (const clone of byKind.values()) clone.dispose?.();
  }
  sceneState.originalMaterials.clear();
  sceneState.materialClones.clear();
  sceneState.processedMeshes.clear();
}
