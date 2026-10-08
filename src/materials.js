const MATERIAL_KEYWORDS = Object.freeze({
  tire: /(?:^|[^a-z0-9])(tire|tyre|wheel|rubber)(?:$|[^a-z0-9])/,
  glass: /(?:^|[^a-z0-9])(glass|window|windscreen|windshield)(?:$|[^a-z0-9])/,
  car: /(?:^|[^a-z0-9])(car|vehicle|body|paint|chassis)(?:$|[^a-z0-9])/,
  barrier:
    /(?:^|[^a-z0-9])(barrier|guard.?rail|wall|fence|concrete|block)(?:$|[^a-z0-9])/,
  grass: /(?:^|[^a-z0-9])(grass|turf|field|ground|terrain)(?:$|[^a-z0-9])/,
  road: /(?:^|[^a-z0-9])(road|asphalt|track|pavement|surface)(?:$|[^a-z0-9])/,
});

function ancestorNames(mesh) {
  const names = [];
  for (
    let parent = mesh?.parent;
    parent && !parent.isScene;
    parent = parent.parent
  ) {
    if (typeof parent.name === "string") names.push(parent.name);
    if (typeof parent.userData?.type === "string")
      names.push(parent.userData.type);
  }
  return names.join(" ");
}

const GHOST_MARKER = /ghost|replay|swarm|training/i;
export function isReplayGhost(mesh, material) {
  const marker = GHOST_MARKER;
  if (marker.test(material?.name ?? "") || marker.test(material?.userData?.type ?? ""))
    return true;
  for (let node = mesh; node && !node.isScene; node = node.parent)
    if (marker.test(node.name ?? "") || marker.test(node.userData?.type ?? ""))
      return true;
  return false;
}

export function describeMaterial(mesh, material) {
  const geometry = mesh?.geometry;
  const stable = geometry
    ? `${geometry.type}:${geometry.attributes?.position?.count ?? 0}`
    : "";
  return {
    material: material?.name || `unnamed-${material?.type ?? "material"}`,
    mesh: mesh?.name || `unnamed-${stable}`,
    parent: ancestorNames(mesh),
  };
}
function patternMatch(value, pattern) {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp("^" + escaped + "$", "i").test(value);
}
export function classifyMaterialEvidence(mesh, material, overrides = {}) {
  const names = describeMaterial(mesh, material);
  if (isReplayGhost(mesh, material) || mesh?.userData?.polyShadeOwned)
    return {
      kind: "ignore",
      confidence: 1,
      evidence: ["owned effect or replay"],
    };
  for (const [pattern, kind] of Object.entries(overrides)) {
    const colon = pattern.indexOf(":");
    const key = pattern.slice(0, colon);
    if (patternMatch(names[key] ?? "", pattern.slice(colon + 1)))
      return { kind, confidence: 1, evidence: ["manual " + pattern] };
  }
  const descriptors = [
    ...Object.values(names),
    mesh?.userData?.type,
    material?.userData?.type,
    material?.map?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  const direct = (material?.name ?? "").toLowerCase();
  for (const [kind, pattern] of Object.entries({
    tire: /tire|tyre|rubber/,
    glass: /glass|window/,
    metal: /metal|chrome|steel|rim|exhaust/,
    emissive: /brakelight|emissive|neon/,
    marking: /marking|stripe/,
    signage: /sign|arrow/,
  })) {
    if (pattern.test(direct))
      return { kind, confidence: 0.98, evidence: ["explicit material name"] };
  }
  const compact = descriptors.replace(/[^a-z]/g, "");
  if (/carbody|chassis|vehicle|carpaint/.test(compact))
    return {
      kind: "car",
      confidence: 0.95,
      evidence: ["vehicle hierarchy/name"],
    };
  const extra = {
    metal: /metal|steel|chrome/,
    concrete: /concrete/,
    marking: /marking|stripe|kerb|curb/,
    signage: /sign|arrow|checkpoint/,
    emissive: /emissive|neon|lamp|lightpanel/,
    architecture: /building|architecture|tower|platform|pillar/,
  };
  for (const kind of [
    "tire",
    "glass",
    "car",
    "concrete",
    "barrier",
    "grass",
    "road",
    "metal",
    "marking",
    "signage",
    "emissive",
    "architecture",
  ]) {
    if ((extra[kind] ?? MATERIAL_KEYWORDS[kind])?.test(descriptors))
      return { kind, confidence: 0.9, evidence: ["semantic name/hierarchy"] };
  }
  // Geometry and native material provenance corroborate terrain; green alone is insufficient.
  const g = mesh?.geometry;
  if (g && material?.color && !material.vertexColors) {
    if (!g.boundingBox) g.computeBoundingBox?.();
    const box = g.boundingBox;
    if (box) {
      const x = box.max.x - box.min.x,
        y = box.max.y - box.min.y,
        z = box.max.z - box.min.z;
      const c = material.color;
      const flat = Math.max(x, z) > 15 && y < Math.max(x, z) * 0.04;
      if (flat && c.g > c.r * 1.18 && c.g > c.b * 1.12)
        return {
          kind: "grass",
          confidence: 0.7,
          evidence: ["large flat geometry + green diffuse colour"],
        };
      if (flat && Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) < 0.15)
        return {
          kind: "road",
          confidence: 0.6,
          evidence: ["large flat neutral surface"],
        };
      if (
        Math.max(x, y, z) > 5 &&
        Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) < 0.12
      )
        return {
          kind: "architecture",
          confidence: 0.5,
          evidence: ["large neutral geometry"],
        };
    }
  }
  // Colour alone cannot distinguish terrain from green car paint.
  if (material?.isMeshStandardMaterial && material.metalness > 0.65)
    return { kind: "metal", confidence: 0.65, evidence: ["PBR metalness"] };
  return {
    kind: "other",
    confidence: 0.2,
    evidence: ["no reliable semantic evidence"],
  };
}
export function classifyMaterial(mesh, material, overrides) {
  const result = classifyMaterialEvidence(mesh, material, overrides);
  return result.kind === "ignore" ? "other" : result.kind;
}

function tuneMaterial(material, kind, settings = {}) {
  if (
    typeof material.roughness === "number" &&
    typeof material.metalness === "number"
  ) {
    const tuning = {
      road: [settings.roadRoughness ?? 0.85, 0.01],
      grass: [0.88, 0],
      barrier: [0.78, 0.04],
      car: [0.28, 0.22],
      concrete: [0.92, 0],
      architecture: [0.87, 0],
      metal: [0.3, 0.75],
      marking: [0.78, 0],
      signage: [0.65, 0],
      tire: [0.94, 0.01],
    }[kind];
    if (tuning) {
      material.roughness = tuning[0];
      material.metalness = tuning[1];
      material.envMapIntensity =
        (settings.environmentIntensity ?? 0.6) *
        (kind === "car"
          ? (settings.carReflection ?? 1)
          : kind === "metal"
            ? 1.1
            : kind === "tire"
              ? 0.08
              : 0.2);
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
  "name",
  "map",
  "alphaMap",
  "alphaTest",
  "opacity",
  "transparent",
  "side",
  "vertexColors",
  "fog",
  "wireframe",
  "depthTest",
  "depthWrite",
  "colorWrite",
  "blending",
  "blendSrc",
  "blendDst",
  "blendEquation",
  "premultipliedAlpha",
  "polygonOffset",
  "polygonOffsetFactor",
  "polygonOffsetUnits",
  "visible",
  "lightMap",
  "lightMapIntensity",
  "aoMap",
  "aoMapIntensity",
  "envMap",
  "combine",
  "reflectivity",
  "refractionRatio",
  "skinning",
  "morphTargets",
  "morphNormals",
];

const SYNC_PROPERTIES = ["opacity", "transparent", "visible", "depthWrite", "map", "alphaMap", "alphaTest", "vertexColors"];
export function syncMaterialColors(sceneState, settings = {}) {
  const snapshots = (sceneState.materialSyncSnapshots ??= new WeakMap());
  for (const [source, byKind] of sceneState.materialClones) {
    for (const [kind, clone] of byKind) {
      const previous = snapshots.get(clone);
      const warmth = settings.surfaceWarmth ?? 0;
      if (previous && previous.warmth === warmth && source.color && clone.color &&
        source.color.r === previous.sourceR && source.color.g === previous.sourceG && source.color.b === previous.sourceB &&
        clone.color.r === previous.outputR && clone.color.g === previous.outputG && clone.color.b === previous.outputB) {
        let unchanged = true;
        for (const key of SYNC_PROPERTIES)
          if (source[key] !== previous[key] || clone[key] !== previous[key]) { unchanged = false; break; }
        if (unchanged) continue;
      }
      for (const key of SYNC_PROPERTIES) {
        if (
          previous &&
          source[key] === previous[key] &&
          clone[key] !== previous[key]
        ) {
          source[key] = clone[key];
          if (!["opacity", "visible", "depthWrite"].includes(key))
            source.needsUpdate = true;
        }
        if (source[key] === undefined || clone[key] === source[key]) continue;
        clone[key] = source[key];
        if (!["opacity", "visible", "depthWrite"].includes(key))
          clone.needsUpdate = true;
      }
      if (!clone.color?.copy || !source.color) continue;
      if (
        previous &&
        source.color.r === previous.sourceR &&
        source.color.g === previous.sourceG &&
        source.color.b === previous.sourceB &&
        (clone.color.r !== previous.outputR ||
          clone.color.g !== previous.outputG ||
          clone.color.b !== previous.outputB)
      ) {
        // The game also updates colors through mesh.material after async model loading.
        source.color.copy(clone.color);
      }
      clone.color.copy(source.color);
      const { r, g, b } = source.color;
      // Tint only neutral architecture; retain saturated paint and track markings.
      const neutral = Math.max(r, g, b) - Math.min(r, g, b) < 0.12;
      if (
        neutral &&
        kind !== "car" &&
        kind !== "tire" &&
        !source.map &&
        !source.vertexColors
      ) {
        clone.color.r *= 1 - warmth * 0.04;
        clone.color.g *= 1 - warmth * 0.16;
        clone.color.b *= 1 - warmth * 0.32;
      }
      const snapshot = previous ?? {};
      Object.assign(snapshot, {
        warmth,
        sourceR: source.color.r,
        sourceG: source.color.g,
        sourceB: source.color.b,
        outputR: clone.color.r,
        outputG: clone.color.g,
        outputB: clone.color.b,
        opacity: source.opacity,
        transparent: source.transparent,
        visible: source.visible,
        depthWrite: source.depthWrite,
        map: source.map,
        alphaMap: source.alphaMap,
        alphaTest: source.alphaTest,
        vertexColors: source.vertexColors,
      });
      if (!previous) snapshots.set(clone, snapshot);
    }
  }
}

export function applyMaterialTuning(sceneState, three = {}, settings = {}) {
  const LitMaterial =
    three.MeshStandardMaterial ??
    three.MeshPhongMaterial ??
    three.MeshLambertMaterial;
  const { scene, materialClones, originalMaterials, processedMeshes } =
    sceneState;
  const activeMeshes = new Set();
  sceneState.inspectorRecords ??= new Map();
  let modified = 0;
  scene.traverse((mesh) => {
    if (!mesh?.isMesh || mesh.userData?.polyShadeOwned) return;
    activeMeshes.add(mesh);

    const knownMaterial = processedMeshes.get(mesh);
    if (knownMaterial === mesh.material) {
      const source = originalMaterials.get(mesh);
      const sources = Array.isArray(source) ? source : [source];
      if (
        !source ||
        !sources.some(
          (material) =>
            isReplayGhost(mesh, material) ||
            material?.transparent ||
            material?.opacity < 0.98,
        )
      )
        return;
      mesh.material = source;
    }
    if (processedMeshes.has(mesh)) {
      // The game assigned a new material: keep that assignment as the new baseline.
      originalMaterials.delete(mesh);
    }

    const original = mesh.material;
    const isArray = Array.isArray(original);
    const materials = isArray ? original : [original];
    const replayGhost = materials.some((material) =>
      isReplayGhost(mesh, material),
    );
    let changed = false;
    const replacements = materials.map((material) => {
      const info = classifyMaterialEvidence(
        mesh,
        material,
        settings.materialOverrides,
      );
      const kind = info.kind;
      const records = sceneState.inspectorRecords.get(mesh) ?? [];
      records.push({
        ...describeMaterial(mesh, material),
        ...info,
        type: material?.type,
        converted: !!material?.isMeshBasicMaterial,
      });
      sceneState.inspectorRecords.set(mesh, records.slice(-materials.length));
      if (!material || typeof material.clone !== "function") return material;
      // Native code keeps an emissive-material handle for the brake lamps.
      // Replacing that material separates visible lamps from braking state.
      if (material.name === "BrakeLight") return material;
      if (replayGhost || material.transparent || material.opacity < 0.98)
        return material;
      if (
        material.wireframe ||
        material.onBeforeCompile !==
          Object.getPrototypeOf(material).onBeforeCompile
      )
        return material;
      if (kind === "ignore" || material.isShaderMaterial) return material;
      const basic =
        (material.isMeshBasicMaterial ||
          (material.isMeshLambertMaterial && kind !== "other")) &&
        typeof LitMaterial === "function" &&
        mesh.geometry?.attributes?.normal;
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
          clone.flatShading = material.flatShading === true;
          clone.toneMapped = true;
        } else {
          clone = material.clone();
        }
        if (!tuneMaterial(clone, kind, settings) && !basic) {
          clone.dispose?.();
          return material;
        }
        if (
          settings.materialDetail &&
          ["road", "grass", "concrete", "architecture"].includes(kind) &&
          clone.isMeshStandardMaterial &&
          !clone.roughnessMap
        ) {
          clone.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader
              .replace(
                "#include <common>",
                "#include <common>\nvarying vec3 polyShadeSurface;",
              )
              .replace(
                "#include <begin_vertex>",
                "#include <begin_vertex>\npolyShadeSurface=position;",
              );
            shader.fragmentShader =
              "// PolyShade_material\n" +
              shader.fragmentShader
                .replace(
                  "#include <common>",
                  "#include <common>\nvarying vec3 polyShadeSurface;",
                )
                .replace(
                  "#include <roughnessmap_fragment>",
                  "#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+0.035*(fract(sin(dot(floor(polyShadeSurface*12.0),vec3(12.9898,78.233,37.719)))*43758.5453)-0.5),0.04,1.0);",
                );
          };
          clone.customProgramCacheKey = () => "PolyShade roughness v2";
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
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
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
  for (const mesh of sceneState.inspectorRecords.keys())
    if (!activeMeshes.has(mesh)) sceneState.inspectorRecords.delete(mesh);
  sceneState.materialInspector = [...sceneState.inspectorRecords.values()]
    .flat()
    .slice(0, 250);
  sceneState.paintEnvironmentSnapshots ??= new Map();
  scene.traverse((mesh) => {
    if (mesh.name !== "Body") return;
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]) {
      if (
        material?.name !== "Main" ||
        !material.isMeshStandardMaterial ||
        material.defines?.USE_CSM !== undefined
      )
        continue;
      if (!sceneState.paintEnvironmentSnapshots.has(material))
        sceneState.paintEnvironmentSnapshots.set(
          material,
          material.envMapIntensity,
        );
      material.envMapIntensity =
        (settings.environmentIntensity ?? 0.6) * (settings.carReflection ?? 1);
    }
  });
  syncMaterialColors(sceneState, settings);
  return modified;
}

export function restoreMaterials(sceneState) {
  for (const [material, value] of sceneState.paintEnvironmentSnapshots ?? [])
    material.envMapIntensity = value;
  sceneState.paintEnvironmentSnapshots?.clear();
  for (const [mesh, material] of sceneState.originalMaterials) {
    if (mesh && mesh.material === sceneState.processedMeshes.get(mesh))
      mesh.material = material;
  }
  for (const byKind of sceneState.materialClones.values()) {
    for (const clone of byKind.values()) clone.dispose?.();
  }
  sceneState.inspectorRecords?.clear();
  sceneState.originalMaterials.clear();
  sceneState.materialClones.clear();
  sceneState.processedMeshes.clear();
}
