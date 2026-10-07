const MATERIAL_KEYWORDS = Object.freeze({
  tire: /(?:^|[^a-z0-9])(tire|tyre|wheel|rubber)(?:$|[^a-z0-9])/,
  glass: /(?:^|[^a-z0-9])(glass|window|windscreen|windshield)(?:$|[^a-z0-9])/,
  car: /(?:^|[^a-z0-9])(car|vehicle|body|paint|chassis)(?:$|[^a-z0-9])/,
  barrier: /(?:^|[^a-z0-9])(barrier|guard.?rail|wall|fence|concrete|block)(?:$|[^a-z0-9])/,
  grass: /(?:^|[^a-z0-9])(grass|turf|field|ground|terrain)(?:$|[^a-z0-9])/,
  road: /(?:^|[^a-z0-9])(road|asphalt|track|pavement|surface)(?:$|[^a-z0-9])/,
});

export function isReplayGhost(mesh, material) {
  const descriptors = [
    mesh?.name,
    mesh?.userData?.type,
    material?.name,
    material?.userData?.type,
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
      material.roughness = Math.max(material.roughness, tuning[0]);
      material.metalness = Math.min(material.metalness, tuning[1]);
      material.needsUpdate = true;
      return true;
    }
  }

  if (typeof material.shininess === "number") {
    const ceiling = kind === "car" ? 38 : kind === "tire" ? 4 : 16;
    material.shininess = Math.min(material.shininess, ceiling);
    material.needsUpdate = true;
    return true;
  }
  return false;
}

export function applyMaterialTuning(sceneState) {
  const { scene, materialClones, originalMaterials, processedMeshes } = sceneState;
  const activeMeshes = new Set();
  let modified = 0;
  scene.traverse((mesh) => {
    if (!mesh?.isMesh) return;
    activeMeshes.add(mesh);

    const knownMaterial = processedMeshes.get(mesh);
    if (knownMaterial === mesh.material) return;
    if (processedMeshes.has(mesh)) {
      const original = originalMaterials.get(mesh);
      if (original !== undefined) mesh.material = original;
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
      const kind = classifyMaterial(mesh, material);
      if (kind === "other" || kind === "glass") return material;

      let byKind = materialClones.get(material);
      if (!byKind) {
        byKind = new Map();
        materialClones.set(material, byKind);
      }
      let clone = byKind.get(kind);
      if (!clone) {
        clone = material.clone();
        if (!tuneMaterial(clone, kind)) {
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
  return modified;
}

export function restoreMaterials(sceneState) {
  for (const [mesh, material] of sceneState.originalMaterials) {
    if (mesh) mesh.material = material;
  }
  for (const byKind of sceneState.materialClones.values()) {
    for (const clone of byKind.values()) clone.dispose?.();
  }
  sceneState.originalMaterials.clear();
  sceneState.materialClones.clear();
  sceneState.processedMeshes.clear();
}
