// src/presets.js
var PRESET_IDS = Object.freeze([
  "vanilla",
  "cinematic-lite",
  "cinematic",
  "recording"
]);
var PRESET_LABELS = Object.freeze({
  vanilla: "Vanilla",
  "cinematic-lite": "Golden Hour Lite",
  cinematic: "Golden Hour",
  recording: "Golden Hour Capture"
});
var SHADOW_MAP_SIZES = Object.freeze({
  off: 0,
  low: 1024,
  medium: 2048,
  high: 4096
});
var PRESETS = Object.freeze({
  vanilla: Object.freeze({
    sunIntensity: 1,
    sunElevation: 30,
    sunAzimuth: 225,
    sunColor: "#ffe3ba",
    ambientIntensity: 1,
    ambientColor: "#b9d0eb",
    exposure: 1,
    fogEnabled: false,
    fogStrength: 0.2,
    shadowQuality: "off",
    renderScale: 1,
    surfaceWarmth: 0.65,
    shadowDistance: 85,
    shadowSoftness: 1.5
  }),
  "cinematic-lite": Object.freeze({
    sunIntensity: 1.45,
    sunElevation: 30,
    sunAzimuth: 225,
    sunColor: "#ffe3ba",
    ambientIntensity: 0.65,
    ambientColor: "#b9d0eb",
    exposure: 1.08,
    fogEnabled: false,
    fogStrength: 0.12,
    shadowQuality: "low",
    renderScale: 1,
    surfaceWarmth: 0.65,
    shadowDistance: 85,
    shadowSoftness: 1.5
  }),
  cinematic: Object.freeze({
    sunIntensity: 1.65,
    sunElevation: 26,
    sunAzimuth: 225,
    sunColor: "#ffe3ba",
    ambientIntensity: 0.55,
    ambientColor: "#b9d0eb",
    exposure: 1.1,
    fogEnabled: false,
    fogStrength: 0.2,
    shadowQuality: "medium",
    renderScale: 1,
    surfaceWarmth: 0.65,
    shadowDistance: 85,
    shadowSoftness: 1.5
  }),
  recording: Object.freeze({
    sunIntensity: 1.65,
    sunElevation: 26,
    sunAzimuth: 225,
    sunColor: "#ffe3ba",
    ambientIntensity: 0.55,
    ambientColor: "#b9d0eb",
    exposure: 1.1,
    fogEnabled: false,
    fogStrength: 0.22,
    shadowQuality: "high",
    renderScale: 1,
    surfaceWarmth: 0.65,
    shadowDistance: 85,
    shadowSoftness: 1.5
  })
});
var OVERRIDE_LIMITS = Object.freeze({
  sunIntensity: [0.5, 2],
  sunElevation: [10, 75],
  sunAzimuth: [0, 360],
  ambientIntensity: [0.1, 1.8],
  exposure: [0.7, 1.4],
  fogStrength: [0, 1],
  renderScale: [1, 1.5],
  surfaceWarmth: [0, 1],
  shadowDistance: [30, 200],
  shadowSoftness: [0, 4]
});
function resolvePresetSettings(settings2) {
  return {
    ...PRESETS[settings2.preset],
    ...settings2.overrides,
    enabled: settings2.enabled && settings2.preset !== "vanilla"
  };
}

// src/materials.js
var MATERIAL_KEYWORDS = Object.freeze({
  tire: /(?:^|[^a-z0-9])(tire|tyre|wheel|rubber)(?:$|[^a-z0-9])/,
  glass: /(?:^|[^a-z0-9])(glass|window|windscreen|windshield)(?:$|[^a-z0-9])/,
  car: /(?:^|[^a-z0-9])(car|vehicle|body|paint|chassis)(?:$|[^a-z0-9])/,
  barrier: /(?:^|[^a-z0-9])(barrier|guard.?rail|wall|fence|concrete|block)(?:$|[^a-z0-9])/,
  grass: /(?:^|[^a-z0-9])(grass|turf|field|ground|terrain)(?:$|[^a-z0-9])/,
  road: /(?:^|[^a-z0-9])(road|asphalt|track|pavement|surface)(?:$|[^a-z0-9])/
});
function ancestorNames(mesh) {
  const names = [];
  for (let parent = mesh?.parent; parent && !parent.isScene; parent = parent.parent) {
    if (typeof parent.name === "string") names.push(parent.name);
    if (typeof parent.userData?.type === "string") names.push(parent.userData.type);
  }
  return names.join(" ");
}
function isReplayGhost(mesh, material) {
  const descriptors = [
    mesh?.name,
    mesh?.userData?.type,
    material?.name,
    material?.userData?.type,
    ancestorNames(mesh)
  ].filter((value) => typeof value === "string").join(" ").toLowerCase();
  return ["ghost", "replay", "swarm", "training"].some((marker) => descriptors.includes(marker));
}
function classifyMaterial(mesh, material) {
  const descriptors = [
    mesh?.name,
    mesh?.userData?.type,
    mesh?.userData?.material,
    material?.name,
    material?.userData?.type,
    material?.map?.name,
    ancestorNames(mesh)
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
      tire: [0.94, 0.01]
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
var SURFACE_PROPERTIES = [
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
  "morphNormals"
];
function syncMaterialColors(sceneState, settings2 = {}) {
  for (const [source, byKind] of sceneState.materialClones) {
    for (const [kind, clone] of byKind) {
      for (const key of ["opacity", "transparent", "visible", "depthWrite", "map", "alphaMap", "alphaTest", "vertexColors"]) {
        if (source[key] === void 0 || clone[key] === source[key]) continue;
        clone[key] = source[key];
        if (!["opacity", "visible", "depthWrite"].includes(key)) clone.needsUpdate = true;
      }
      if (!clone.color?.copy || !source.color) continue;
      clone.color.copy(source.color);
      const { r, g, b } = source.color;
      const neutral = Math.max(r, g, b) - Math.min(r, g, b) < 0.12;
      if (neutral && kind !== "car" && kind !== "tire" && !source.map && !source.vertexColors) {
        const warmth = settings2.surfaceWarmth ?? 0;
        clone.color.r *= 1 - warmth * 0.04;
        clone.color.g *= 1 - warmth * 0.16;
        clone.color.b *= 1 - warmth * 0.32;
      }
    }
  }
}
function applyMaterialTuning(sceneState, three = {}, settings2 = {}) {
  const { scene, materialClones, originalMaterials, processedMeshes } = sceneState;
  const activeMeshes = /* @__PURE__ */ new Set();
  let modified = 0;
  scene.traverse((mesh) => {
    if (!mesh?.isMesh) return;
    activeMeshes.add(mesh);
    const knownMaterial = processedMeshes.get(mesh);
    if (knownMaterial === mesh.material) {
      const source = originalMaterials.get(mesh);
      const sources = Array.isArray(source) ? source : [source];
      if (!source || !sources.some((material) => isReplayGhost(mesh, material) || material?.transparent || material?.opacity < 0.98)) return;
      mesh.material = source;
    }
    if (processedMeshes.has(mesh)) {
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
      if (material.wireframe || material.onBeforeCompile !== Object.getPrototypeOf(material).onBeforeCompile) return material;
      const kind = classifyMaterial(mesh, material);
      const basic = material.isMeshBasicMaterial && typeof three.MeshPhongMaterial === "function" && mesh.geometry?.attributes?.normal;
      if (kind === "glass" || kind === "other" && !basic) return material;
      let byKind = materialClones.get(material);
      if (!byKind) {
        byKind = /* @__PURE__ */ new Map();
        materialClones.set(material, byKind);
      }
      let clone = byKind.get(kind);
      if (!clone) {
        if (basic) {
          clone = new three.MeshPhongMaterial();
          for (const key of SURFACE_PROPERTIES) {
            if (material[key] !== void 0) clone[key] = material[key];
          }
          clone.color.copy(material.color);
          clone.flatShading = true;
          clone.toneMapped = true;
        } else {
          clone = material.clone();
        }
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
    if (original !== void 0) mesh.material = original;
    originalMaterials.delete(mesh);
    processedMeshes.delete(mesh);
  }
  const activeMaterials = /* @__PURE__ */ new Set();
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
  syncMaterialColors(sceneState, settings2);
  return modified;
}
function restoreMaterials(sceneState) {
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

// src/effects.js
var OWNED_LIGHT = "polyShadeOwnedLight";
var FAILED_EFFECTS = /* @__PURE__ */ new Set();
function warnEffect(name, error) {
  console.warn(`[PolyShade] ${name} was disabled; other rendering changes remain active.`, error);
}
function safelyApply(name, callback) {
  if (FAILED_EFFECTS.has(name)) return;
  try {
    callback();
  } catch (error) {
    FAILED_EFFECTS.add(name);
    warnEffect(name, error);
  }
}
function getSceneBounds(three, scene) {
  const Vector3 = three.Vector3 ?? scene.position?.constructor;
  if (typeof three.Box3 !== "function" || typeof three.Sphere !== "function" || typeof Vector3 !== "function") return null;
  const bounds = new three.Box3().setFromObject(scene);
  if (bounds.isEmpty()) return null;
  const center = bounds.getCenter(new Vector3());
  const sphere = bounds.getBoundingSphere(new three.Sphere());
  return {
    center,
    radius: Math.max(sphere.radius, 1)
  };
}
function rememberLight(sceneState, light) {
  if (sceneState.lightSnapshots.has(light)) return;
  sceneState.lightSnapshots.set(light, {
    intensity: light.intensity,
    color: light.color?.clone?.(),
    groundColor: light.groundColor?.clone?.(),
    position: light.position?.clone?.(),
    targetPosition: light.target?.position?.clone?.(),
    castShadow: light.castShadow,
    shadow: light.shadow ? {
      mapSize: light.shadow.mapSize?.clone?.(),
      bias: light.shadow.bias,
      normalBias: light.shadow.normalBias,
      radius: light.shadow.radius,
      camera: light.shadow.camera ? {
        left: light.shadow.camera.left,
        right: light.shadow.camera.right,
        top: light.shadow.camera.top,
        bottom: light.shadow.camera.bottom,
        near: light.shadow.camera.near,
        far: light.shadow.camera.far
      } : null
    } : null
  });
}
function restoreShadowSettings(light, snapshot) {
  if (!snapshot.shadow || !light.shadow) return;
  if (snapshot.shadow.mapSize && light.shadow.mapSize?.copy) {
    light.shadow.mapSize.copy(snapshot.shadow.mapSize);
  }
  light.shadow.bias = snapshot.shadow.bias;
  light.shadow.normalBias = snapshot.shadow.normalBias;
  light.shadow.radius = snapshot.shadow.radius;
  const camera = light.shadow.camera;
  if (camera && snapshot.shadow.camera) {
    Object.assign(camera, snapshot.shadow.camera);
    camera.updateProjectionMatrix?.();
  }
  light.shadow.map?.dispose?.();
  light.shadow.map = null;
}
function ensureSun(sceneState, three) {
  let sun;
  sceneState.scene.traverse((object) => {
    if (!sun && object.isDirectionalLight && object.intensity > 0) sun = object;
  });
  if (sun) return sun;
  sun = new three.DirectionalLight(16773855, 1.8);
  sun.name = "PolyShade sunlight";
  sun.userData[OWNED_LIGHT] = true;
  sun.castShadow = true;
  sceneState.scene.add(sun);
  sceneState.scene.add(sun.target);
  sceneState.ownedLights.add(sun);
  return sun;
}
function ensureFill(sceneState, three) {
  let fill;
  sceneState.scene.traverse((object) => {
    if (!fill && object.isHemisphereLight && object.intensity > 0) fill = object;
  });
  if (!fill && typeof three.HemisphereLight !== "function") {
    sceneState.scene.traverse((object) => {
      if (!fill && object.isAmbientLight && object.intensity > 0) fill = object;
    });
  }
  if (fill) return fill;
  if (typeof three.HemisphereLight === "function") {
    fill = new three.HemisphereLight(14149364, 7829103, 0.7);
  } else if (typeof three.AmbientLight === "function") {
    fill = new three.AmbientLight(13359336, 0.55);
  } else {
    throw new Error("This Three.js build does not provide an ambient or hemisphere light.");
  }
  fill.name = "PolyShade ambient fill";
  fill.userData[OWNED_LIGHT] = true;
  sceneState.scene.add(fill);
  sceneState.ownedLights.add(fill);
  return fill;
}
function setLightColor(light, snapshot, three, color, amount) {
  if (!light.color?.copy || !snapshot.color) return;
  light.color.copy(snapshot.color);
  if (typeof light.color.lerp === "function") {
    light.color.lerp(new three.Color(color), amount);
  }
}
function configureLight(sceneState, three, light, settings2, bounds) {
  rememberLight(sceneState, light);
  const snapshot = sceneState.lightSnapshots.get(light);
  if (light.isDirectionalLight) {
    light.intensity = snapshot.intensity * settings2.sunIntensity;
    setLightColor(light, snapshot, three, settings2.sunColor, 0.75);
    const center = bounds?.center ?? sceneState.scene.position?.clone?.();
    if (!center) throw new Error("Three.js scene position vectors are unavailable.");
    const oldDistance = snapshot.position?.distanceTo?.(snapshot.targetPosition ?? center) || 100;
    const elevation = settings2.sunElevation * Math.PI / 180;
    const azimuth = settings2.sunAzimuth * Math.PI / 180;
    const direction = snapshot.position?.clone?.() ?? center.clone?.();
    if (!direction?.set) throw new Error("Three.js direction vectors are unavailable.");
    direction.set(
      Math.cos(elevation) * Math.sin(azimuth),
      Math.sin(elevation),
      Math.cos(elevation) * Math.cos(azimuth)
    );
    if (light.position?.copy && light.target?.position?.copy) {
      light.position.copy(center).addScaledVector(direction, oldDistance);
      light.target.position.copy(center);
      if (!light.target.parent) {
        sceneState.scene.add(light.target);
        sceneState.attachedTargets.add(light.target);
      }
    }
    const mapSize = SHADOW_MAP_SIZES[settings2.shadowQuality];
    if (mapSize > 0 && light.shadow) {
      light.castShadow = true;
      if (light.shadow.mapSize?.x !== mapSize || light.shadow.mapSize?.y !== mapSize) {
        light.shadow.map?.dispose?.();
        light.shadow.map = null;
        light.shadow.mapSize?.set?.(mapSize, mapSize);
      }
      if (typeof light.shadow.bias === "number") light.shadow.bias = -12e-5;
      if (typeof light.shadow.normalBias === "number") light.shadow.normalBias = 0.015;
      if (typeof light.shadow.radius === "number") light.shadow.radius = settings2.shadowSoftness ?? 1.5;
      const camera = light.shadow.camera;
      if (camera && bounds && Number.isFinite(bounds.radius)) {
        const extent = settings2.shadowDistance ?? 85;
        camera.left = -extent;
        camera.right = extent;
        camera.top = extent;
        camera.bottom = -extent;
        camera.near = 0.1;
        camera.far = Math.max(extent * 4, 100);
        camera.updateProjectionMatrix?.();
      }
    }
  } else {
    light.intensity = snapshot.intensity * settings2.ambientIntensity;
    setLightColor(light, snapshot, three, settings2.ambientColor, 0.8);
    if (light.groundColor && snapshot.groundColor) {
      light.groundColor.copy(snapshot.groundColor);
      light.groundColor.lerp?.(new three.Color(11639419), 0.65);
    }
  }
}
function updateBackground(sceneState, three) {
  const background = sceneState.originalBackground;
  if (background === null || background?.isColor) {
    const color = background?.clone?.() ?? new three.Color(8628683);
    color.lerp(new three.Color(9745615), 0.5);
    sceneState.scene.background = color;
  }
}
function updateFog(sceneState, three, settings2, camera, bounds) {
  if (!settings2.fogEnabled) {
    sceneState.scene.fog = sceneState.originalFog;
    return;
  }
  if (typeof three.Fog !== "function") throw new Error("Three.js Fog is unavailable.");
  const background = sceneState.scene.background;
  const color = background?.isColor ? background.clone() : new three.Color(11189968);
  const cameraFar = Number.isFinite(camera?.far) ? camera.far : 2e3;
  const horizonDistance = Math.min(cameraFar, (bounds?.radius ?? cameraFar) * 3);
  const far = Math.max(100, horizonDistance * (1.2 - settings2.fogStrength * 0.4));
  const near = far * (0.65 - settings2.fogStrength * 0.15);
  if (!sceneState.fog || sceneState.fog.constructor !== three.Fog) {
    sceneState.fog = new three.Fog(color, near, far);
  } else {
    sceneState.fog.color.copy(color);
    sceneState.fog.near = near;
    sceneState.fog.far = far;
  }
  sceneState.scene.fog = sceneState.fog;
}
function createSceneState(scene) {
  return {
    scene,
    originalBackground: scene.background,
    originalFog: scene.fog,
    fog: null,
    bounds: null,
    lastBoundsAt: 0,
    lastScanAt: 0,
    ownedLights: /* @__PURE__ */ new Set(),
    lightSnapshots: /* @__PURE__ */ new Map(),
    meshShadowSnapshots: /* @__PURE__ */ new Map(),
    materialClones: /* @__PURE__ */ new Map(),
    originalMaterials: /* @__PURE__ */ new Map(),
    processedMeshes: /* @__PURE__ */ new Map(),
    attachedTargets: /* @__PURE__ */ new Set()
  };
}
function applySceneEffects(sceneState, three, settings2, camera, now) {
  if (now - sceneState.lastBoundsAt >= 5e3 || !sceneState.bounds) {
    safelyApply("scene bounds", () => {
      sceneState.bounds = getSceneBounds(three, sceneState.scene);
    });
    sceneState.lastBoundsAt = now;
  }
  safelyApply("sky", () => updateBackground(sceneState, three));
  safelyApply("directional sunlight", () => {
    const sun = ensureSun(sceneState, three);
    configureLight(sceneState, three, sun, settings2, sceneState.bounds);
    sceneState.sun = sun;
    sceneState.scene.traverse((light) => {
      if (light !== sun && light.isDirectionalLight) {
        rememberLight(sceneState, light);
        light.intensity = 0;
      }
    });
  });
  safelyApply("ambient fill", () => {
    const fill = ensureFill(sceneState, three);
    configureLight(sceneState, three, fill, settings2, sceneState.bounds);
    sceneState.scene.traverse((light) => {
      if (light !== fill && (light.isAmbientLight || light.isHemisphereLight)) {
        rememberLight(sceneState, light);
        light.intensity = 0;
      }
    });
  });
  if (SHADOW_MAP_SIZES[settings2.shadowQuality] > 0) {
    safelyApply("shadow receivers and casters", () => {
      const activeMeshes = /* @__PURE__ */ new Set();
      sceneState.scene.traverse((object) => {
        if (!object?.isMesh) return;
        activeMeshes.add(object);
        if (!sceneState.meshShadowSnapshots.has(object)) {
          sceneState.meshShadowSnapshots.set(object, {
            castShadow: object.castShadow,
            receiveShadow: object.receiveShadow
          });
        }
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        const isGhost = materials.some((material) => isReplayGhost(object, material) || material?.transparent || material?.opacity < 0.98);
        if (isGhost) {
          const snapshot = sceneState.meshShadowSnapshots.get(object);
          object.castShadow = snapshot.castShadow;
          object.receiveShadow = snapshot.receiveShadow;
          return;
        }
        object.receiveShadow = true;
        const kind = materials.map((material) => classifyMaterial(object, material)).find((materialKind) => materialKind === "car" || materialKind === "barrier");
        if (!materials.some((material) => material?.wireframe) && (kind === "car" || kind === "barrier" || object.geometry?.attributes?.normal)) {
          object.castShadow = true;
        }
      });
      for (const [mesh, snapshot] of sceneState.meshShadowSnapshots) {
        if (activeMeshes.has(mesh)) continue;
        mesh.castShadow = snapshot.castShadow;
        mesh.receiveShadow = snapshot.receiveShadow;
        sceneState.meshShadowSnapshots.delete(mesh);
      }
    });
  } else {
    for (const [mesh, snapshot] of sceneState.meshShadowSnapshots) {
      mesh.castShadow = snapshot.castShadow;
      mesh.receiveShadow = snapshot.receiveShadow;
    }
    sceneState.meshShadowSnapshots.clear();
    for (const [light, snapshot] of sceneState.lightSnapshots) {
      if (!light.isDirectionalLight) continue;
      if (typeof snapshot.castShadow === "boolean") light.castShadow = snapshot.castShadow;
      restoreShadowSettings(light, snapshot);
    }
  }
  safelyApply("atmospheric haze", () => updateFog(sceneState, three, settings2, camera, sceneState.bounds));
  if (now - sceneState.lastScanAt >= 1e3 || sceneState.lastScanAt === 0) {
    safelyApply("material response", () => applyMaterialTuning(sceneState, three, settings2));
    sceneState.lastScanAt = now;
  }
  updateShadowFocus(sceneState, settings2, camera);
}
function updateShadowFocus(sceneState, settings2, camera) {
  const sun = sceneState.sun;
  const size = SHADOW_MAP_SIZES[settings2.shadowQuality];
  if (!sun || !size || !camera?.position?.clone) return;
  const extent = settings2.shadowDistance ?? 85;
  const focus = sceneState.shadowFocus ??= camera.position.clone();
  if (camera.getWorldPosition) camera.getWorldPosition(focus);
  else focus.copy(camera.position);
  const forward = sceneState.shadowForward ??= focus.clone();
  if (camera.getWorldDirection) {
    camera.getWorldDirection(forward);
    focus.addScaledVector(forward, extent * 0.3);
  }
  const elevation = settings2.sunElevation * Math.PI / 180;
  const azimuth = settings2.sunAzimuth * Math.PI / 180;
  const sa = Math.sin(azimuth), ca = Math.cos(azimuth);
  const se = Math.sin(elevation), ce = Math.cos(elevation);
  const texel = extent * 2 / size;
  const u = focus.x * ca - focus.z * sa;
  const v = -focus.x * se * sa + focus.y * ce - focus.z * se * ca;
  const du = Math.round(u / texel) * texel - u;
  const dv = Math.round(v / texel) * texel - v;
  focus.x += du * ca - dv * se * sa;
  focus.y += dv * ce;
  focus.z += -du * sa - dv * se * ca;
  sun.target.position.copy(focus);
  sun.target.parent?.worldToLocal?.(sun.target.position);
  sun.position.copy(focus);
  sun.position.x += ce * sa * extent * 2;
  sun.position.y += se * extent * 2;
  sun.position.z += ce * ca * extent * 2;
  sun.parent?.worldToLocal?.(sun.position);
  sun.target.updateMatrixWorld?.();
  sun.updateMatrixWorld?.();
}
function applyRendererEffects(rendererState, three, settings2) {
  const { renderer } = rendererState;
  safelyApply("tone mapping and exposure", () => {
    if (!("toneMapping" in renderer) || typeof rendererState.originalExposure !== "number") {
      throw new Error("WebGLRenderer tone mapping or exposure controls are unavailable.");
    }
    if (typeof three.ACESFilmicToneMapping !== "number") {
      throw new Error("The ACES filmic tone-mapping mode is unavailable.");
    }
    renderer.toneMapping = three.ACESFilmicToneMapping;
    renderer.toneMappingExposure = rendererState.originalExposure * settings2.exposure;
  });
  safelyApply("shadow quality", () => {
    const shadowMap = renderer.shadowMap;
    const size = SHADOW_MAP_SIZES[settings2.shadowQuality];
    if (!shadowMap || typeof shadowMap.enabled !== "boolean") {
      throw new Error("WebGLRenderer shadow-map controls are unavailable.");
    }
    shadowMap.enabled = size > 0;
    if (size > 0 && typeof three.PCFSoftShadowMap === "number") {
      shadowMap.type = three.PCFShadowMap ?? three.PCFSoftShadowMap;
    }
  });
  safelyApply("render scale", () => {
    if (rendererState.appliedScale === settings2.renderScale) return;
    if (typeof renderer.setPixelRatio !== "function" || rendererState.originalPixelRatio === null) {
      if (settings2.renderScale !== 1) throw new Error("WebGLRenderer pixel-ratio controls are unavailable.");
      return;
    }
    renderer.setPixelRatio(rendererState.originalPixelRatio * settings2.renderScale);
    rendererState.appliedScale = settings2.renderScale;
  });
}
function createRendererState(renderer) {
  return {
    renderer,
    originalToneMapping: renderer.toneMapping,
    originalExposure: renderer.toneMappingExposure,
    originalShadowEnabled: renderer.shadowMap?.enabled,
    originalShadowType: renderer.shadowMap?.type,
    originalPixelRatio: typeof renderer.getPixelRatio === "function" ? renderer.getPixelRatio() : null,
    appliedScale: null
  };
}
function restoreRenderer(rendererState) {
  const { renderer } = rendererState;
  if ("toneMapping" in renderer) renderer.toneMapping = rendererState.originalToneMapping;
  if (typeof rendererState.originalExposure === "number") {
    renderer.toneMappingExposure = rendererState.originalExposure;
  }
  if (renderer.shadowMap && typeof rendererState.originalShadowEnabled === "boolean") {
    renderer.shadowMap.enabled = rendererState.originalShadowEnabled;
    renderer.shadowMap.type = rendererState.originalShadowType;
  }
  if (rendererState.originalPixelRatio !== null && typeof renderer.setPixelRatio === "function") {
    renderer.setPixelRatio(rendererState.originalPixelRatio);
  }
  rendererState.appliedScale = null;
}
function restoreScene(sceneState) {
  const { scene } = sceneState;
  scene.background = sceneState.originalBackground;
  scene.fog = sceneState.originalFog;
  restoreMaterials(sceneState);
  for (const [mesh, snapshot] of sceneState.meshShadowSnapshots) {
    mesh.castShadow = snapshot.castShadow;
    mesh.receiveShadow = snapshot.receiveShadow;
  }
  sceneState.meshShadowSnapshots.clear();
  for (const [light, snapshot] of sceneState.lightSnapshots) {
    light.intensity = snapshot.intensity;
    if (snapshot.color && light.color?.copy) light.color.copy(snapshot.color);
    if (snapshot.groundColor && light.groundColor?.copy) light.groundColor.copy(snapshot.groundColor);
    if (snapshot.position && light.position?.copy) light.position.copy(snapshot.position);
    if (snapshot.targetPosition && light.target?.position?.copy) {
      light.target.position.copy(snapshot.targetPosition);
    }
    if (typeof snapshot.castShadow === "boolean") light.castShadow = snapshot.castShadow;
    restoreShadowSettings(light, snapshot);
  }
  for (const light of sceneState.ownedLights) {
    light.parent?.remove(light);
    if (light.target?.parent) light.target.parent.remove(light.target);
    light.shadow?.map?.dispose?.();
  }
  for (const target of sceneState.attachedTargets) target.parent?.remove(target);
  sceneState.attachedTargets.clear();
  sceneState.ownedLights.clear();
  sceneState.lightSnapshots.clear();
  sceneState.fog = null;
}

// src/controller.js
var MAX_SAMPLES = 240;
function countMeshes(scene) {
  let count = 0;
  scene.traverse((object) => {
    if (object?.isMesh && object.visible !== false) count += 1;
  });
  return count;
}
var RenderController = class {
  constructor(three, getSettings, onMetrics = () => {
  }) {
    this.three = three;
    this.getSettings = getSettings;
    this.onMetrics = onMetrics;
    this.activeScene = null;
    this.activeRenderer = null;
    this.sceneState = null;
    this.rendererState = null;
    this.revision = 0;
    this.appliedRevision = -1;
    this.samples = new Float64Array(MAX_SAMPLES);
    this.sampleIndex = 0;
    this.sampleCount = 0;
    this.lastMetricsAt = performance.now();
    this.renderCount = 0;
    this.modifiedMaterials = 0;
  }
  notifySettingsChanged() {
    this.revision += 1;
    if (!this.getSettings().enabled) this.restore();
  }
  onRender(renderer, scene, camera) {
    const now = performance.now();
    if (!scene?.isScene) return;
    const settings2 = resolvePresetSettings(this.getSettings());
    if (!settings2.enabled) {
      if (this.sceneState || this.rendererState) this.restore();
      return;
    }
    if (renderer !== this.activeRenderer) this.attachRenderer(renderer);
    if (scene !== this.activeScene) {
      if (countMeshes(scene) < 3) return;
      this.attachScene(scene);
    }
    if (this.revision !== this.appliedRevision || now - this.sceneState.lastScanAt >= 1e3) {
      applyRendererEffects(this.rendererState, this.three, settings2);
      applySceneEffects(this.sceneState, this.three, settings2, camera, now);
      this.modifiedMaterials = this.sceneState.originalMaterials.size;
      this.appliedRevision = this.revision;
    }
    updateShadowFocus(this.sceneState, settings2, camera);
    syncMaterialColors(this.sceneState, settings2);
  }
  onFrame(renderer, scene, duration) {
    if (scene !== this.activeScene || renderer !== this.activeRenderer) return;
    const settings2 = resolvePresetSettings(this.getSettings());
    if (settings2.enabled) {
      this.renderCount += 1;
      this.recordFrame(duration, performance.now(), settings2);
    }
  }
  attachScene(scene) {
    if (this.sceneState) restoreScene(this.sceneState);
    this.activeScene = scene;
    this.sceneState = createSceneState(scene);
    this.appliedRevision = -1;
  }
  attachRenderer(renderer) {
    if (this.rendererState) restoreRenderer(this.rendererState);
    this.activeRenderer = renderer;
    this.rendererState = createRendererState(renderer);
    this.appliedRevision = -1;
  }
  restore() {
    if (this.sceneState) restoreScene(this.sceneState);
    if (this.rendererState) restoreRenderer(this.rendererState);
    this.sceneState = null;
    this.rendererState = null;
    this.activeScene = null;
    this.activeRenderer = null;
    this.appliedRevision = -1;
    this.modifiedMaterials = 0;
  }
  recordFrame(duration, now, settings2) {
    this.samples[this.sampleIndex] = duration;
    this.sampleIndex = (this.sampleIndex + 1) % MAX_SAMPLES;
    this.sampleCount = Math.min(this.sampleCount + 1, MAX_SAMPLES);
    if (now - this.lastMetricsAt < 1e3) return;
    const ordered = Array.from(this.samples.slice(0, this.sampleCount)).sort((a, b) => a - b);
    const average = ordered.reduce((sum, value) => sum + value, 0) / Math.max(1, ordered.length);
    const p95 = ordered[Math.max(0, Math.ceil(ordered.length * 0.95) - 1)] ?? 0;
    this.onMetrics({
      fps: this.renderCount / Math.max((now - this.lastMetricsAt) / 1e3, 1),
      averageFrameTime: average,
      p95FrameTime: p95,
      preset: this.getSettings().preset,
      renderScale: settings2.renderScale,
      shadowQuality: settings2.shadowQuality,
      modifiedMaterials: this.modifiedMaterials
    });
    this.lastMetricsAt = now;
    this.renderCount = 0;
  }
};

// src/renderer.js
var RENDER_PATCH = Symbol.for("polyshade.webgl-render-patch");
var CLASS_MARKERS = Object.freeze({
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
  MeshPhongMaterial: "isMeshPhongMaterial"
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
    if (!exports || typeof exports !== "object" && typeof exports !== "function") continue;
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
    if (sourceHasMarker(source, CLASS_MARKERS.MeshPhongMaterial)) coreIds.push(id);
    if (sourceHasMarker(source, CLASS_MARKERS.Scene) && sourceHasMarker(source, CLASS_MARKERS.Color) && sourceHasMarker(source, CLASS_MARKERS.DirectionalLight)) {
      coreIds.push(id);
    }
  }
  return [.../* @__PURE__ */ new Set([...coreIds, ...rendererIds])];
}
function findThreeNamespace(pml2) {
  if (typeof pml2?.getFromPolyTrack !== "function") {
    throw new Error("PML getFromPolyTrack is unavailable; PolyShade cannot access the live renderer.");
  }
  let webpackRequire;
  try {
    webpackRequire = pml2.getFromPolyTrack("n");
  } catch (error) {
    throw new Error("PML could not access PolyTrack's scoped Webpack require function.", { cause: error });
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
  if (typeof three.WebGLRenderer === "function" && typeof three.Scene === "function" && typeof three.Color === "function" && typeof three.DirectionalLight === "function") {
    three.ACESFilmicToneMapping ??= 4;
    three.PCFSoftShadowMap ??= 2;
    three.PCFShadowMap ??= 1;
    return three;
  }
  const missing = ["WebGLRenderer", "Scene", "Color", "DirectionalLight"].filter((name) => typeof three[name] !== "function");
  throw new Error(`The live PolyTrack Three.js exports are missing required classes: ${missing.join(", ")}.`);
}
function installRenderHook(three, onRender) {
  const prototype = three?.WebGLRenderer?.prototype;
  if (!prototype || typeof prototype.render !== "function") {
    throw new Error("Three.js WebGLRenderer.render is not accessible.");
  }
  const existing = prototype[RENDER_PATCH];
  if (existing) {
    existing.listeners.add(onRender);
    return () => existing.listeners.delete(onRender);
  }
  const originalRender = prototype.render;
  const listeners = /* @__PURE__ */ new Set([onRender]);
  function polyShadeRender(scene, camera, ...args) {
    for (const listener of listeners) {
      try {
        listener.before(this, scene, camera);
      } catch (error) {
        console.error("[PolyShade] Render pre-hook failed; the original frame will still render.", error);
      }
    }
    const started = performance.now();
    try {
      return originalRender.call(this, scene, camera, ...args);
    } finally {
      const duration = performance.now() - started;
      for (const listener of listeners) {
        try {
          listener.after(this, scene, camera, duration);
        } catch (error) {
          console.error("[PolyShade] Render post-hook failed.", error);
        }
      }
    }
  }
  Object.defineProperty(prototype, RENDER_PATCH, {
    configurable: true,
    value: { originalRender, listeners, wrapper: polyShadeRender }
  });
  prototype.render = polyShadeRender;
  return () => {
    listeners.delete(onRender);
    if (listeners.size === 0 && prototype.render === polyShadeRender) {
      prototype.render = originalRender;
      delete prototype[RENDER_PATCH];
    }
  };
}

// src/ui.js
var STYLE_ID = "polyshade-styles";
var PANEL_ID = "polyshade-panel";
var CSS = `
#${PANEL_ID} {
  position: fixed; z-index: 2147483000; right: 14px; top: 14px; width: 282px;
  max-height: calc(100vh - 28px); overflow: auto; padding: 14px; box-sizing: border-box;
  color: #eef2f6; background: rgba(20, 27, 35, .94); border: 1px solid rgba(211, 226, 238, .24);
  border-radius: 9px; box-shadow: 0 8px 28px rgba(0, 0, 0, .38);
  font: 12px/1.4 system-ui, sans-serif; backdrop-filter: blur(10px);
}
#${PANEL_ID} * { box-sizing: border-box; }
#${PANEL_ID} header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
#${PANEL_ID} h2 { margin: 0; font-size: 15px; font-weight: 650; }
#${PANEL_ID} button, #${PANEL_ID} select {
  color: inherit; background: #2b3743; border: 1px solid #526171; border-radius: 5px; padding: 5px 7px;
  font: inherit;
}
#${PANEL_ID} button { cursor: pointer; }
#${PANEL_ID} button:hover { background: #394a59; }
#${PANEL_ID} .polyshade-row { display: grid; grid-template-columns: 1fr 112px; gap: 8px; align-items: center; margin: 8px 0; }
#${PANEL_ID} .polyshade-range { width: 100%; accent-color: #d8b985; }
#${PANEL_ID} output { display: block; color: #bac7d2; text-align: right; }
#${PANEL_ID} .polyshade-check { display: flex; align-items: center; gap: 7px; }
#${PANEL_ID} .polyshade-actions { display: flex; gap: 7px; margin-top: 11px; }
#${PANEL_ID} .polyshade-actions button { flex: 1; }
#${PANEL_ID} .polyshade-status, #${PANEL_ID} .polyshade-metrics { color: #bac7d2; margin-top: 9px; }
#${PANEL_ID} .polyshade-metrics { white-space: pre-line; font: 11px/1.5 ui-monospace, monospace; }
#${PANEL_ID} .polyshade-muted { color: #9caab6; font-size: 11px; }
#${PANEL_ID}[data-collapsed="true"] .polyshade-content { display: none; }
`;
function createElement(document2, tag, className, text) {
  const element = document2.createElement(tag);
  if (className) element.className = className;
  if (text !== void 0) element.textContent = text;
  return element;
}
function addRow(container, labelText, control) {
  const row = createElement(container.ownerDocument, "label", "polyshade-row");
  row.append(createElement(container.ownerDocument, "span", "", labelText), control);
  container.appendChild(row);
  return row;
}
function makeRange(document2, { min, max, step, value, format, onChange }) {
  const wrap = document2.createElement("div");
  const input = document2.createElement("input");
  input.type = "range";
  input.className = "polyshade-range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  const output = createElement(document2, "output");
  const update = () => {
    output.textContent = format(Number(input.value));
  };
  input.addEventListener("input", () => {
    update();
    onChange(Number(input.value));
  });
  update();
  wrap.append(input, output);
  return {
    element: wrap,
    input,
    setValue(value2) {
      input.value = String(value2);
      update();
    }
  };
}
function makeSelect(document2, values, selected, onChange) {
  const select = document2.createElement("select");
  for (const [value, label] of values) {
    const option = createElement(document2, "option", "", label);
    option.value = value;
    select.appendChild(option);
  }
  select.value = selected;
  select.addEventListener("change", () => onChange(select.value));
  return select;
}
function makeCheck(document2, text, checked, onChange) {
  const label = createElement(document2, "label", "polyshade-check");
  const input = document2.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  label.append(input, createElement(document2, "span", "", text));
  return label;
}
function makeColor(document2, value, onChange) {
  const input = document2.createElement("input");
  input.type = "color";
  input.value = value;
  input.addEventListener("input", () => onChange(input.value));
  return input;
}
function mountPanel(document2, callbacks, initialSettings) {
  document2.getElementById(STYLE_ID)?.remove();
  document2.getElementById(PANEL_ID)?.remove();
  const style = document2.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document2.head.appendChild(style);
  const panel2 = document2.createElement("section");
  panel2.id = PANEL_ID;
  panel2.setAttribute("aria-label", "PolyShade rendering controls");
  panel2.dataset.collapsed = "false";
  const header = document2.createElement("header");
  header.appendChild(createElement(document2, "h2", "", "PolyShade"));
  const collapse = createElement(document2, "button", "", "Hide");
  collapse.type = "button";
  collapse.addEventListener("click", () => {
    panel2.dataset.collapsed = panel2.dataset.collapsed !== "true" ? "true" : "false";
    collapse.textContent = panel2.dataset.collapsed === "true" ? "Show" : "Hide";
  });
  header.appendChild(collapse);
  panel2.appendChild(header);
  const content = createElement(document2, "div", "polyshade-content");
  const presetSelect = makeSelect(
    document2,
    PRESET_IDS.map((id) => [id, PRESET_LABELS[id]]),
    initialSettings.preset,
    callbacks.onPreset
  );
  addRow(content, "Preset", presetSelect);
  const enabled = makeCheck(document2, "PolyShade enabled", initialSettings.enabled, callbacks.onEnabled);
  content.appendChild(enabled);
  const ranges = {};
  const rangeDefinitions = [
    ["sunIntensity", "Sun intensity", 0.5, 2, 0.01, (v) => v.toFixed(2) + "x"],
    ["sunElevation", "Sun elevation", 10, 75, 1, (v) => `${Math.round(v)} deg`],
    ["sunAzimuth", "Sun azimuth", 0, 360, 1, (v) => `${Math.round(v)} deg`],
    ["ambientIntensity", "Ambient fill", 0.1, 1.8, 0.01, (v) => v.toFixed(2) + "x"],
    ["surfaceWarmth", "Cream surfaces", 0, 1, 0.01, (v) => `${Math.round(v * 100)}%`],
    ["shadowDistance", "Shadow coverage", 30, 200, 1, (v) => `${Math.round(v)} units`],
    ["shadowSoftness", "Shadow softness", 0, 4, 0.1, (v) => v.toFixed(1)],
    ["fogStrength", "Haze strength", 0, 1, 0.01, (v) => v.toFixed(2)],
    ["exposure", "Exposure", 0.7, 1.4, 0.01, (v) => v.toFixed(2)]
  ];
  for (const [key, label, min, max, step, format] of rangeDefinitions) {
    const range = makeRange(document2, {
      min,
      max,
      step,
      value: initialSettings.values[key],
      format,
      onChange: (value) => callbacks.onValue(key, value)
    });
    ranges[key] = range;
    addRow(content, label, range.element);
  }
  const sunColor = makeColor(
    document2,
    initialSettings.values.sunColor,
    (value) => callbacks.onValue("sunColor", value)
  );
  addRow(content, "Sun color", sunColor);
  const ambientColor = makeColor(
    document2,
    initialSettings.values.ambientColor,
    (value) => callbacks.onValue("ambientColor", value)
  );
  addRow(content, "Ambient color", ambientColor);
  const shadow = makeSelect(
    document2,
    [["off", "Off"], ["low", "1024"], ["medium", "2048"], ["high", "4096"]],
    initialSettings.values.shadowQuality,
    (value) => callbacks.onValue("shadowQuality", value)
  );
  addRow(content, "Shadow map", shadow);
  const scale = makeSelect(
    document2,
    [["1", "1.00x"], ["1.25", "1.25x"], ["1.5", "1.50x"]],
    String(initialSettings.values.renderScale),
    (value) => callbacks.onValue("renderScale", Number(value))
  );
  addRow(content, "Render scale", scale);
  const fog = makeCheck(
    document2,
    "Atmospheric haze",
    initialSettings.values.fogEnabled,
    (value) => callbacks.onValue("fogEnabled", value)
  );
  content.appendChild(fog);
  const actions = createElement(document2, "div", "polyshade-actions");
  const reset = createElement(document2, "button", "", "Reset preset");
  reset.type = "button";
  reset.addEventListener("click", callbacks.onReset);
  const disable = createElement(document2, "button", "", "Disable");
  disable.type = "button";
  disable.addEventListener("click", () => callbacks.onEnabled(false));
  actions.append(reset, disable);
  content.appendChild(actions);
  const status = createElement(document2, "div", "polyshade-status", "Waiting for the live PolyTrack scene.");
  status.setAttribute("role", "status");
  content.appendChild(status);
  const metricsToggle = makeCheck(document2, "Show render diagnostics", false, (visible) => {
    metrics.hidden = !visible;
  });
  content.appendChild(metricsToggle);
  const metrics = createElement(document2, "div", "polyshade-metrics");
  metrics.hidden = true;
  content.appendChild(metrics);
  content.appendChild(createElement(document2, "p", "polyshade-muted", "F7 toggles PolyShade. UI remains outside the game canvas."));
  panel2.appendChild(content);
  document2.body.appendChild(panel2);
  return {
    setStatus(text) {
      status.textContent = text;
    },
    setSettings(settings2) {
      presetSelect.value = settings2.preset;
      enabled.querySelector("input").checked = settings2.enabled;
      for (const [key, range] of Object.entries(ranges)) {
        range.setValue(settings2.values[key]);
      }
      sunColor.value = settings2.values.sunColor;
      ambientColor.value = settings2.values.ambientColor;
      shadow.value = settings2.values.shadowQuality;
      scale.value = String(settings2.values.renderScale);
      fog.querySelector("input").checked = settings2.values.fogEnabled;
    },
    setMetrics(data) {
      const shadowSize = SHADOW_MAP_SIZES[data.shadowQuality] || "off";
      metrics.textContent = [
        `FPS (render calls): ${data.fps.toFixed(0)}`,
        `Frame time avg / p95: ${data.averageFrameTime.toFixed(2)} / ${data.p95FrameTime.toFixed(2)} ms`,
        `Preset: ${PRESET_LABELS[data.preset]} | scale: ${data.renderScale.toFixed(2)}x`,
        `Shadow map: ${shadowSize} | tuned materials: ${data.modifiedMaterials}`
      ].join("\n");
    },
    dispose() {
      panel2.remove();
      style.remove();
    }
  };
}
function installHotkey(document2, toggle) {
  const onKeyDown = (event) => {
    if (event.code !== "F7" || event.repeat || event.target?.isContentEditable) return;
    const tagName = event.target?.tagName?.toLowerCase();
    if (tagName === "input" || tagName === "textarea" || tagName === "select") return;
    event.preventDefault();
    toggle();
  };
  document2.addEventListener("keydown", onKeyDown, true);
  return () => document2.removeEventListener("keydown", onKeyDown, true);
}

// src/settings.js
var SETTINGS_SCHEMA_VERSION = 1;
var SETTINGS_STORAGE_KEY = "polyshade.settings";
var DEFAULTS = Object.freeze({
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  preset: "cinematic",
  enabled: true,
  overrides: Object.freeze({})
});
function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function normalizeOverrides(overrides) {
  if (!isPlainObject(overrides)) return {};
  const normalized = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (key === "fogEnabled") {
      if (typeof value === "boolean") normalized[key] = value;
      continue;
    }
    if (key === "sunColor" || key === "ambientColor") {
      if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) {
        normalized[key] = value.toLowerCase();
      }
      continue;
    }
    if (key === "shadowQuality") {
      if (Object.hasOwn(SHADOW_MAP_SIZES, value)) normalized[key] = value;
      continue;
    }
    const limits = OVERRIDE_LIMITS[key];
    if (!limits || typeof value !== "number" || !Number.isFinite(value)) continue;
    normalized[key] = Math.min(limits[1], Math.max(limits[0], value));
  }
  return normalized;
}
function createDefaultSettings() {
  return {
    ...DEFAULTS,
    overrides: {}
  };
}
function normalizeSettings(value) {
  if (!isPlainObject(value)) return createDefaultSettings();
  const preset = PRESET_IDS.includes(value.preset) ? value.preset : DEFAULTS.preset;
  const enabled = typeof value.enabled === "boolean" ? value.enabled : preset !== "vanilla";
  if (value.schemaVersion === SETTINGS_SCHEMA_VERSION) {
    return {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      preset,
      enabled: preset === "vanilla" ? false : enabled,
      overrides: normalizeOverrides(value.overrides)
    };
  }
  if (value.schemaVersion === 0 || value.schemaVersion === void 0) {
    const legacyOverrides = isPlainObject(value.overrides) ? value.overrides : {};
    return {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      preset,
      enabled: preset === "vanilla" ? false : enabled,
      overrides: normalizeOverrides(legacyOverrides)
    };
  }
  return createDefaultSettings();
}
function loadSettings(storage, warn = console.warn) {
  if (!storage) return createDefaultSettings();
  try {
    const serialized = storage.getItem(SETTINGS_STORAGE_KEY);
    return serialized === null ? createDefaultSettings() : normalizeSettings(JSON.parse(serialized));
  } catch (error) {
    warn("[PolyShade] Saved settings could not be read; defaults are active.", error);
    return createDefaultSettings();
  }
}
function saveSettings(storage, settings2, warn = console.warn) {
  if (!storage) {
    warn("[PolyShade] Settings were not persisted because localStorage is unavailable.");
    return false;
  }
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizeSettings(settings2)));
    return true;
  } catch (error) {
    warn("[PolyShade] Settings could not be persisted.", error);
    return false;
  }
}
function selectPreset(settings2, preset) {
  if (!PRESET_IDS.includes(preset)) throw new RangeError(`Unknown PolyShade preset: ${preset}`);
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    preset,
    enabled: preset !== "vanilla",
    overrides: {}
  };
}
function updateOverride(settings2, key, value) {
  const next = normalizeSettings(settings2);
  const limits = OVERRIDE_LIMITS[key];
  if (key === "fogEnabled") {
    if (typeof value !== "boolean") throw new TypeError("fogEnabled must be a boolean");
  } else if (key === "sunColor" || key === "ambientColor") {
    if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
      throw new TypeError(`${key} must be a six-digit hexadecimal color`);
    }
    value = value.toLowerCase();
  } else if (key === "shadowQuality") {
    if (!Object.hasOwn(SHADOW_MAP_SIZES, value)) {
      throw new RangeError(`Unknown shadow quality: ${value}`);
    }
  } else if (!limits || typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Invalid PolyShade setting: ${key}`);
  } else {
    value = Math.min(limits[1], Math.max(limits[0], value));
  }
  return {
    ...next,
    preset: next.preset === "vanilla" ? "cinematic" : next.preset,
    enabled: true,
    overrides: { ...next.overrides, [key]: value }
  };
}

// src/mod.js
var pml;
var settings;
var controller;
var panel;
var removeRenderHook;
var removeHotkey;
var unloadListener;
function getStorage() {
  try {
    return globalThis.localStorage;
  } catch (error) {
    console.warn("[PolyShade] Browser storage is unavailable; settings will reset on reload.", error);
    return void 0;
  }
}
function persistAndApply(nextSettings) {
  settings = nextSettings;
  saveSettings(getStorage(), settings);
  if (controller) controller.notifySettingsChanged();
  updatePanel();
}
function updatePanel() {
  if (!panel || !settings) return;
  panel.setSettings({
    preset: settings.preset,
    enabled: settings.enabled && settings.preset !== "vanilla",
    values: resolvePresetSettings(settings)
  });
}
function toggleEnabled(enabled) {
  const next = settings.preset === "vanilla" && enabled ? { ...selectPreset(settings, "cinematic"), enabled: true } : { ...settings, enabled: enabled && settings.preset !== "vanilla" };
  persistAndApply(next);
  panel?.setStatus(enabled ? "PolyShade enabled." : "Restored the original rendering state.");
}
function attachRenderer() {
  controller?.restore();
  removeRenderHook?.();
  try {
    const three = findThreeNamespace(pml);
    controller = new RenderController(three, () => settings, (metrics) => panel?.setMetrics(metrics));
    removeRenderHook = installRenderHook(three, {
      before(renderer, scene, camera) {
        try {
          controller.onRender(renderer, scene, camera);
        } catch (error) {
          console.error("[PolyShade] Scene enhancement failed; rendering continues unchanged.", error);
        }
      },
      after(renderer, scene, _camera, duration) {
        try {
          controller.onFrame(renderer, scene, duration);
        } catch (error) {
          console.error("[PolyShade] Performance diagnostics failed.", error);
        }
      }
    });
    panel?.setStatus("Attached to the live Three.js scene.");
    controller.notifySettingsChanged();
  } catch (error) {
    console.error("[PolyShade] Could not attach to the live PolyTrack renderer.", error);
    panel?.setStatus(`Renderer unavailable: ${error.message}`);
  }
}
function makePanel() {
  if (!globalThis.document?.body || panel) return;
  panel = mountPanel(document, {
    onPreset(preset) {
      persistAndApply(selectPreset(settings, preset));
      panel?.setStatus(preset === "vanilla" ? "Vanilla rendering restored." : `${preset} preset loaded.`);
    },
    onEnabled: toggleEnabled,
    onValue(key, value) {
      persistAndApply(updateOverride(settings, key, value));
    },
    onReset() {
      persistAndApply(selectPreset(settings, settings.preset));
      panel?.setStatus(`${settings.preset} preset restored.`);
    }
  }, {
    preset: settings.preset,
    enabled: settings.enabled && settings.preset !== "vanilla",
    values: resolvePresetSettings(settings)
  });
}
function restoreAndDispose() {
  controller?.restore();
  removeRenderHook?.();
  removeHotkey?.();
  if (unloadListener) globalThis.removeEventListener?.("pagehide", unloadListener);
  panel?.dispose();
  controller = null;
  panel = null;
  removeRenderHook = void 0;
  removeHotkey = void 0;
}
var polyMod = {
  modName: "PolyShade",
  modID: "polyshade",
  modVersion: "0.1.0",
  modAuthor: "PolyShade",
  modDescription: "<p>Lighting, shadows, material response, and atmosphere for PolyTrack's live Three.js scene. Rendering only; no physics or simulation changes.</p>",
  touchingPhysics: false,
  preInit(pmlInstance) {
    pml = pmlInstance;
  },
  init(pmlInstance) {
    pml ??= pmlInstance;
    settings = loadSettings(getStorage());
  },
  postInit() {
    if (!settings) settings = loadSettings(getStorage());
    makePanel();
    removeHotkey ??= installHotkey(document, () => toggleEnabled(!settings.enabled));
  },
  onGameLoad() {
    if (!settings) settings = loadSettings(getStorage());
    makePanel();
    if (!removeHotkey) removeHotkey = installHotkey(document, () => toggleEnabled(!settings.enabled));
    attachRenderer();
    unloadListener ??= restoreAndDispose;
    globalThis.addEventListener?.("pagehide", unloadListener, { once: true });
  },
  dispose: restoreAndDispose
};
export {
  polyMod
};
