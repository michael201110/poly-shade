import { SHADOW_MAP_SIZES } from "./presets.js";
import { applyMaterialTuning, classifyMaterial, isReplayGhost, restoreMaterials } from "./materials.js";

const OWNED_LIGHT = "polyShadeOwnedLight";
const FAILED_EFFECTS = new Set();

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
  if (
    typeof three.Box3 !== "function"
    || typeof three.Sphere !== "function"
    || typeof Vector3 !== "function"
  ) return null;
  const bounds = new three.Box3().setFromObject(scene);
  if (bounds.isEmpty()) return null;
  const center = bounds.getCenter(new Vector3());
  const sphere = bounds.getBoundingSphere(new three.Sphere());
  return {
    center,
    radius: Math.max(sphere.radius, 1),
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
    shadow: light.shadow
      ? {
          mapSize: light.shadow.mapSize?.clone?.(),
          bias: light.shadow.bias,
          normalBias: light.shadow.normalBias,
          radius: light.shadow.radius,
          camera: light.shadow.camera
            ? {
                left: light.shadow.camera.left,
                right: light.shadow.camera.right,
                top: light.shadow.camera.top,
                bottom: light.shadow.camera.bottom,
                near: light.shadow.camera.near,
                far: light.shadow.camera.far,
              }
            : null,
        }
      : null,
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

  sun = new three.DirectionalLight(0xfff2df, 1.8);
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
    if (!fill && (object.isHemisphereLight || object.isAmbientLight) && object.intensity > 0) fill = object;
  });
  if (fill) return fill;

  if (typeof three.HemisphereLight === "function") {
    fill = new three.HemisphereLight(0xd7e6f4, 0x77766f, 0.7);
  } else if (typeof three.AmbientLight === "function") {
    fill = new three.AmbientLight(0xcbd8e8, 0.55);
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

function configureLight(sceneState, three, light, settings, bounds) {
  rememberLight(sceneState, light);
  const snapshot = sceneState.lightSnapshots.get(light);

  if (light.isDirectionalLight) {
    light.intensity = snapshot.intensity * settings.sunIntensity;
    setLightColor(light, snapshot, three, settings.sunColor, 0.13);

    const center = bounds?.center ?? sceneState.scene.position?.clone?.();
    if (!center) throw new Error("Three.js scene position vectors are unavailable.");
    const oldDistance = snapshot.position?.distanceTo?.(snapshot.targetPosition ?? center) || 100;
    const elevation = settings.sunElevation * Math.PI / 180;
    const azimuth = settings.sunAzimuth * Math.PI / 180;
    const direction = snapshot.position?.clone?.() ?? center.clone?.();
    if (!direction?.set) throw new Error("Three.js direction vectors are unavailable.");
    direction.set(
      Math.cos(elevation) * Math.sin(azimuth),
      Math.sin(elevation),
      Math.cos(elevation) * Math.cos(azimuth),
    );
    if (light.position?.copy && light.target?.position?.copy) {
      light.position.copy(center).addScaledVector(direction, oldDistance);
      light.target.position.copy(center);
      if (!light.target.parent) {
        sceneState.scene.add(light.target);
        sceneState.attachedTargets.add(light.target);
      }
    }

    const mapSize = SHADOW_MAP_SIZES[settings.shadowQuality];
    if (mapSize > 0 && light.shadow) {
      light.castShadow = true;
      if (light.shadow.mapSize?.x !== mapSize || light.shadow.mapSize?.y !== mapSize) {
        light.shadow.map?.dispose?.();
        light.shadow.map = null;
        light.shadow.mapSize?.set?.(mapSize, mapSize);
      }
      if (typeof light.shadow.bias === "number") light.shadow.bias = -0.00012;
      if (typeof light.shadow.normalBias === "number") light.shadow.normalBias = 0.025;
      if (typeof light.shadow.radius === "number") light.shadow.radius = 3;

      const camera = light.shadow.camera;
      if (camera && bounds && Number.isFinite(bounds.radius)) {
        const extent = bounds.radius * 1.15;
        camera.left = -extent;
        camera.right = extent;
        camera.top = extent;
        camera.bottom = -extent;
        camera.near = Math.max(0.1, extent * 0.01);
        camera.far = Math.max(extent * 4, 100);
        camera.updateProjectionMatrix?.();
      }
    }
  } else {
    light.intensity = snapshot.intensity * settings.ambientIntensity;
    setLightColor(light, snapshot, three, settings.ambientColor, 0.1);
    if (light.groundColor && snapshot.groundColor) {
      light.groundColor.copy(snapshot.groundColor);
      light.groundColor.lerp?.(new three.Color(0x87877f), 0.08);
    }
  }
}

function updateBackground(sceneState, three) {
  const background = sceneState.originalBackground;
  if (background === null || background?.isColor) {
    const color = background?.clone?.() ?? new three.Color(0x83a9cb);
    color.lerp(new three.Color(0xaabed0), 0.08);
    sceneState.scene.background = color;
  }
}

function updateFog(sceneState, three, settings, camera, bounds) {
  if (!settings.fogEnabled) {
    sceneState.scene.fog = sceneState.originalFog;
    return;
  }
  if (typeof three.Fog !== "function") throw new Error("Three.js Fog is unavailable.");

  const background = sceneState.scene.background;
  const color = background?.isColor
    ? background.clone()
    : new three.Color(0xaabed0);
  const cameraFar = Number.isFinite(camera?.far) ? camera.far : 2000;
  const horizonDistance = Math.min(cameraFar, (bounds?.radius ?? cameraFar) * 3);
  const far = Math.max(40, horizonDistance * (0.3 - settings.fogStrength * 0.08));
  const near = far * (0.4 + (1 - settings.fogStrength) * 0.25);

  if (!sceneState.fog || sceneState.fog.constructor !== three.Fog) {
    sceneState.fog = new three.Fog(color, near, far);
  } else {
    sceneState.fog.color.copy(color);
    sceneState.fog.near = near;
    sceneState.fog.far = far;
  }
  sceneState.scene.fog = sceneState.fog;
}

export function createSceneState(scene) {
  return {
    scene,
    originalBackground: scene.background,
    originalFog: scene.fog,
    fog: null,
    bounds: null,
    lastBoundsAt: 0,
    lastScanAt: 0,
    ownedLights: new Set(),
    lightSnapshots: new Map(),
    meshShadowSnapshots: new Map(),
    materialClones: new Map(),
    originalMaterials: new Map(),
    processedMeshes: new Map(),
    attachedTargets: new Set(),
  };
}

export function applySceneEffects(sceneState, three, settings, camera, now) {
  if (now - sceneState.lastBoundsAt >= 5000 || !sceneState.bounds) {
    safelyApply("scene bounds", () => {
      sceneState.bounds = getSceneBounds(three, sceneState.scene);
    });
    sceneState.lastBoundsAt = now;
  }

  safelyApply("sky", () => updateBackground(sceneState, three));
  safelyApply("directional sunlight", () => {
    const sun = ensureSun(sceneState, three);
    configureLight(sceneState, three, sun, settings, sceneState.bounds);
  });
  safelyApply("ambient fill", () => {
    const fill = ensureFill(sceneState, three);
    configureLight(sceneState, three, fill, settings, sceneState.bounds);
  });
  if (SHADOW_MAP_SIZES[settings.shadowQuality] > 0) {
    safelyApply("shadow receivers and casters", () => {
      const activeMeshes = new Set();
      sceneState.scene.traverse((object) => {
        if (!object?.isMesh) return;
        activeMeshes.add(object);
        if (!sceneState.meshShadowSnapshots.has(object)) {
          sceneState.meshShadowSnapshots.set(object, {
            castShadow: object.castShadow,
            receiveShadow: object.receiveShadow,
          });
        }
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        const isGhost = materials.some((material) => isReplayGhost(object, material)
          || material?.transparent || material?.opacity < 0.98);
        if (isGhost) return;

        object.receiveShadow = true;
        const kind = materials.map((material) => classifyMaterial(object, material))
          .find((materialKind) => materialKind === "car" || materialKind === "barrier");
        if (kind === "car" || kind === "barrier") object.castShadow = true;
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
  safelyApply("atmospheric haze", () => updateFog(sceneState, three, settings, camera, sceneState.bounds));

  if (now - sceneState.lastScanAt >= 1000 || sceneState.lastScanAt === 0) {
    safelyApply("material response", () => applyMaterialTuning(sceneState));
    sceneState.lastScanAt = now;
  }
}

export function applyRendererEffects(rendererState, three, settings) {
  const { renderer } = rendererState;
  safelyApply("tone mapping and exposure", () => {
    if (!("toneMapping" in renderer) || typeof rendererState.originalExposure !== "number") {
      throw new Error("WebGLRenderer tone mapping or exposure controls are unavailable.");
    }
    if (typeof three.ACESFilmicToneMapping !== "number") {
      throw new Error("The ACES filmic tone-mapping mode is unavailable.");
    }
    renderer.toneMapping = three.ACESFilmicToneMapping;
    renderer.toneMappingExposure = rendererState.originalExposure * settings.exposure;
  });

  safelyApply("shadow quality", () => {
    const shadowMap = renderer.shadowMap;
    const size = SHADOW_MAP_SIZES[settings.shadowQuality];
    if (!shadowMap || typeof shadowMap.enabled !== "boolean") {
      throw new Error("WebGLRenderer shadow-map controls are unavailable.");
    }
    shadowMap.enabled = size > 0;
    if (size > 0 && typeof three.PCFSoftShadowMap === "number") {
      shadowMap.type = three.PCFSoftShadowMap;
    }
  });

  safelyApply("render scale", () => {
    if (rendererState.appliedScale === settings.renderScale) return;
    if (typeof renderer.setPixelRatio !== "function" || rendererState.originalPixelRatio === null) {
      if (settings.renderScale !== 1) throw new Error("WebGLRenderer pixel-ratio controls are unavailable.");
      return;
    }
    renderer.setPixelRatio(rendererState.originalPixelRatio * settings.renderScale);
    rendererState.appliedScale = settings.renderScale;
  });
}

export function createRendererState(renderer) {
  return {
    renderer,
    originalToneMapping: renderer.toneMapping,
    originalExposure: renderer.toneMappingExposure,
    originalShadowEnabled: renderer.shadowMap?.enabled,
    originalShadowType: renderer.shadowMap?.type,
    originalPixelRatio: typeof renderer.getPixelRatio === "function" ? renderer.getPixelRatio() : null,
    appliedScale: null,
  };
}

export function restoreRenderer(rendererState) {
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

export function restoreScene(sceneState) {
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
