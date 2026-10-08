import { linearColor, skyPalette } from "./rendering/sky.js";
import { SHADOW_MAP_SIZES } from "./presets.js";
import {
  applyMaterialTuning,
  classifyMaterial,
  isReplayGhost,
  restoreMaterials,
} from "./materials.js";

const OWNED_LIGHT = "polyShadeOwnedLight";

function warnEffect(name, error) {
  console.warn(
    `[PolyShade] ${name} was disabled; other rendering changes remain active.`,
    error,
  );
}

function safelyApply(owner, name, callback) {
  const failed = (owner.failedEffects ??= new Set());
  if (failed.has(name)) return;
  try {
    callback();
  } catch (error) {
    failed.add(name);
    warnEffect(name, error);
  }
}

function getSceneBounds(three, scene) {
  const Vector3 = three.Vector3 ?? scene.position?.constructor;
  if (
    typeof three.Box3 !== "function" ||
    typeof three.Sphere !== "function" ||
    typeof Vector3 !== "function"
  )
    return null;
  const bounds = new three.Box3();
  if (bounds.makeEmpty && bounds.expandByObject) {
    scene.updateMatrixWorld?.();
    bounds.makeEmpty();
    scene.traverse((object) => {
      if (
        object.isMesh &&
        !object.userData?.polyShadeOwned &&
        !object.material?.isShaderMaterial
      )
        bounds.expandByObject(object);
    });
  } else bounds.setFromObject(scene);
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
    visible: light.visible,
    shadow: light.shadow
      ? {
          mapSize: light.shadow.mapSize?.clone?.(),
          bias: light.shadow.bias,
          normalBias: light.shadow.normalBias,
          radius: light.shadow.radius,
          intensity: light.shadow.intensity,
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

function muteLight(sceneState, light) {
  rememberLight(sceneState, light);
  if (light.castShadow && light.shadow?.map) {
    light.shadow.map.dispose();
    light.shadow.map = null;
  }
  light.intensity = 0;
  if (typeof light.visible === "boolean") light.visible = false;
  light.castShadow = false;
  sceneState.mutedLights.add(light);
}

function restoreShadowSettings(light, snapshot) {
  if (!snapshot.shadow || !light.shadow) return;
  if (snapshot.shadow.mapSize && light.shadow.mapSize?.copy) {
    light.shadow.mapSize.copy(snapshot.shadow.mapSize);
  }
  light.shadow.bias = snapshot.shadow.bias;
  light.shadow.normalBias = snapshot.shadow.normalBias;
  light.shadow.radius = snapshot.shadow.radius;
  if (typeof snapshot.shadow.intensity === "number")
    light.shadow.intensity = snapshot.shadow.intensity;
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
    if (!sun && object.isDirectionalLight && object.userData?.[OWNED_LIGHT])
      sun = object;
  });
  if (sun) return sun;

  sun = new three.DirectionalLight(0xfff2df, 4.7);
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
    if (
      !fill &&
      (object.isHemisphereLight || object.isAmbientLight) &&
      object.userData?.[OWNED_LIGHT]
    )
      fill = object;
  });
  if (!fill && typeof three.HemisphereLight !== "function") {
    sceneState.scene.traverse((object) => {
      if (!fill && object.isAmbientLight && object.intensity > 0) fill = object;
    });
  }
  if (fill) return fill;

  if (typeof three.HemisphereLight === "function") {
    fill = new three.HemisphereLight(0xd7e6f4, 0x77766f, 1.6);
  } else if (typeof three.AmbientLight === "function") {
    fill = new three.AmbientLight(0xcbd8e8, 0.55);
  } else {
    throw new Error(
      "This Three.js build does not provide an ambient or hemisphere light.",
    );
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
    light.color.lerp(linearColor(three, color), amount);
  }
}

function configureLight(sceneState, three, light, settings, bounds) {
  rememberLight(sceneState, light);
  const snapshot = sceneState.lightSnapshots.get(light);

  if (light.isDirectionalLight) {
    light.intensity = snapshot.intensity * settings.sunIntensity;
    light.color.copy((sceneState.palette ?? skyPalette(three, settings)).sun);

    const center = bounds?.center ?? sceneState.scene.position?.clone?.();
    if (!center)
      throw new Error("Three.js scene position vectors are unavailable.");
    const oldDistance =
      snapshot.position?.distanceTo?.(snapshot.targetPosition ?? center) || 100;
    const elevation = (settings.sunElevation * Math.PI) / 180;
    const azimuth = (settings.sunAzimuth * Math.PI) / 180;
    const direction = snapshot.position?.clone?.() ?? center.clone?.();
    if (!direction?.set)
      throw new Error("Three.js direction vectors are unavailable.");
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

    const mapSize = Math.min(
      SHADOW_MAP_SIZES[settings.shadowQuality],
      sceneState.maxShadowSize ?? 4096,
    );
    if (mapSize > 0 && light.shadow) {
      light.castShadow = true;
      if (
        light.shadow.mapSize?.x !== mapSize ||
        light.shadow.mapSize?.y !== mapSize
      ) {
        light.shadow.map?.dispose?.();
        light.shadow.map = null;
        light.shadow.mapSize?.set?.(mapSize, mapSize);
      }
      if (typeof light.shadow.bias === "number")
        light.shadow.bias = settings.shadowBias;
      if (typeof light.shadow.normalBias === "number")
        light.shadow.normalBias = settings.shadowNormalBias;
      if (typeof light.shadow.radius === "number")
        light.shadow.radius = settings.shadowSoftness ?? 1.5;
      if (typeof light.shadow.intensity === "number")
        light.shadow.intensity = settings.shadowStrength ?? 0.84;

      const camera = light.shadow.camera;
      if (camera && bounds && Number.isFinite(bounds.radius)) {
        const extent = settings.shadowDistance ?? 85;
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
    light.intensity = snapshot.intensity * settings.ambientIntensity;
    light.color
      .copy((sceneState.palette ?? skyPalette(three, settings)).horizon)
      .lerp(linearColor(three, settings.ambientColor ?? "#b9d0eb"), 0.4);
    if (light.groundColor && snapshot.groundColor) {
      light.groundColor.copy(snapshot.groundColor);
      light.groundColor.lerp?.(
        linearColor(three, settings.groundColor ?? "#aaa294"),
        0.8,
      );
    }
  }
}

function updateBackground(sceneState, three) {
  const background = sceneState.originalBackground;
  if (background === null || background?.isColor) {
    const color = background?.clone?.() ?? new three.Color(0x83a9cb);
    color.lerp(new three.Color(0x94b4cf), 0.5);
    sceneState.scene.background = color;
  }
}

function updateFog(sceneState, three, settings, camera, bounds) {
  if (!settings.fogEnabled) {
    sceneState.scene.fog = sceneState.originalFog;
    return;
  }
  if (typeof three.Fog !== "function")
    throw new Error("Three.js Fog is unavailable.");

  const background = sceneState.scene.background;
  const color = background?.isColor
    ? background.clone()
    : new three.Color(0xaabed0);
  const cameraFar = Number.isFinite(camera?.far) ? camera.far : 2000;
  const horizonDistance = Math.min(
    cameraFar,
    (bounds?.radius ?? cameraFar) * 3,
  );
  const far = Math.max(
    100,
    horizonDistance * (1.2 - settings.fogStrength * 0.4),
  );
  const near = far * (0.65 - settings.fogStrength * 0.15);

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
    managedShadowMeshes: new Map(),
    materialClones: new Map(),
    originalMaterials: new Map(),
    processedMeshes: new Map(),
    attachedTargets: new Set(),
    mutedLights: new Set(),
  };
}

export function applySceneEffects(sceneState, three, settings, camera, now) {
  // Camera-focused sunlight needs no whole-track bounds. Only fallback fog
  // uses the radius; avoid a periodic recursive bounds walk during gameplay.
  if (settings.fogEnabled && (now - sceneState.lastBoundsAt >= 5000 || !sceneState.bounds)) {
    safelyApply(sceneState, "scene bounds", () => {
      sceneState.bounds = getSceneBounds(three, sceneState.scene);
    });
    sceneState.lastBoundsAt = now;
  }

  for (const light of sceneState.lightSnapshots.keys())
    if (!light.parent && !sceneState.ownedLights.has(light))
      sceneState.lightSnapshots.delete(light);
  sceneState.nativeCSM = usesNativeCSM(sceneState.scene);
  sceneState.scene.traverse((object) => {
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    if (materials.some((material) => material?.defines?.USE_CSM !== undefined))
      sceneState.nativeCSM = true;
  });
  safelyApply(sceneState, "directional sunlight", () => {
    if (sceneState.nativeCSM) {
      // CSM indexes directional lights as cascades; an extra sun breaks its shader arrays.
      for (const light of sceneState.ownedLights) {
        if (!light.isDirectionalLight) continue;
        light.parent?.remove(light);
        light.target?.parent?.remove(light.target);
        light.shadow?.map?.dispose?.();
        sceneState.ownedLights.delete(light);
        sceneState.lightSnapshots.delete(light);
      }
      sceneState.sun = null;
      sceneState.scene.traverse((light) => {
        if (!light.isDirectionalLight) return;
        rememberLight(sceneState, light);
        const snapshot = sceneState.lightSnapshots.get(light);
        if (light.userData?.[OWNED_LIGHT]) {
          light.intensity = 0;
          light.castShadow = false;
          return;
        }
        // CSM indexes every native directional light; undo local-sun muting
        // before the game's cascade shader sees this scene.
        sceneState.mutedLights.delete(light);
        if (typeof snapshot.visible === "boolean") light.visible = snapshot.visible;
        if (typeof snapshot.castShadow === "boolean") light.castShadow = snapshot.castShadow;
        light.intensity = snapshot.intensity * settings.sunIntensity;
        light.color.copy(
          (sceneState.palette ?? skyPalette(three, settings)).sun,
        );
      });
      return;
    }
    const sun = ensureSun(sceneState, three);
    configureLight(sceneState, three, sun, settings, sceneState.bounds);
    sceneState.sun = sun;
    sceneState.scene.traverse((light) => {
      if (light !== sun && light.isDirectionalLight) {
        muteLight(sceneState, light);
      }
    });
  });
  safelyApply(sceneState, "ambient fill", () => {
    const fill = ensureFill(sceneState, three);
    configureLight(sceneState, three, fill, settings, sceneState.bounds);
    sceneState.scene.traverse((light) => {
      if (light !== fill && (light.isAmbientLight || light.isHemisphereLight)) {
        muteLight(sceneState, light);
      }
    });
  });
  if (SHADOW_MAP_SIZES[settings.shadowQuality] > 0) {
    safelyApply(sceneState, "shadow receivers and casters", () => {
      const activeMeshes = new Set();
      sceneState.scene.traverse((object) => {
        if (
          !object?.isMesh ||
          object.userData?.polyShadeOwned ||
          object.material?.isShaderMaterial
        )
          return;
        activeMeshes.add(object);
        if (!sceneState.meshShadowSnapshots.has(object)) {
          sceneState.meshShadowSnapshots.set(object, {
            castShadow: object.castShadow,
            receiveShadow: object.receiveShadow,
          });
        }
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        const isGhost = materials.some(
          (material) =>
            isReplayGhost(object, material) ||
            material?.transparent ||
            material?.opacity < 0.98,
        );
        if (isGhost) {
          const snapshot = sceneState.meshShadowSnapshots.get(object);
          object.castShadow = snapshot.castShadow;
          object.receiveShadow = snapshot.receiveShadow;
          snapshot.managedCastShadow = snapshot.castShadow;
          snapshot.managedReceiveShadow = snapshot.receiveShadow;
          sceneState.managedShadowMeshes.set(object, snapshot);
          return;
        }

        object.receiveShadow = true;
        if (
          !materials.some((material) => material?.wireframe) &&
          (object.geometry?.attributes?.normal || materials.some((material) =>
            ["car", "barrier", "concrete", "architecture"].includes(classifyMaterial(object, material))))
        ) {
          object.castShadow = true;
        }
        const snapshot = sceneState.meshShadowSnapshots.get(object);
        snapshot.managedCastShadow = object.castShadow;
        snapshot.managedReceiveShadow = object.receiveShadow;
        sceneState.managedShadowMeshes.set(object, snapshot);
      });
      for (const [mesh, snapshot] of sceneState.meshShadowSnapshots) {
        if (activeMeshes.has(mesh)) continue;
        mesh.castShadow = snapshot.castShadow;
        mesh.receiveShadow = snapshot.receiveShadow;
        sceneState.meshShadowSnapshots.delete(mesh);
        sceneState.managedShadowMeshes.delete(mesh);
      }
    });
  } else {
    for (const [mesh, snapshot] of sceneState.meshShadowSnapshots) {
      mesh.castShadow = snapshot.castShadow;
      mesh.receiveShadow = snapshot.receiveShadow;
    }
    sceneState.meshShadowSnapshots.clear();
    sceneState.managedShadowMeshes.clear();
    for (const [light, snapshot] of sceneState.lightSnapshots) {
      if (!light.isDirectionalLight) continue;
      if (typeof snapshot.castShadow === "boolean")
        light.castShadow = snapshot.castShadow;
      restoreShadowSettings(light, snapshot);
    }
  }
  safelyApply(sceneState, "atmospheric haze", () =>
    updateFog(sceneState, three, settings, camera, sceneState.bounds),
  );

  if (now - sceneState.lastScanAt >= 1000 || sceneState.lastScanAt === 0) {
    safelyApply(sceneState, "material response", () =>
      applyMaterialTuning(sceneState, three, settings),
    );
    sceneState.lastScanAt = now;
  }
  updateShadowFocus(sceneState, settings, camera);
  updateShadowRange(sceneState, settings, camera, three);
}

export function usesNativeCSM(scene) {
  let count = 0;
  for (const light of scene.children ?? [])
    if (light.isDirectionalLight && !light.userData?.[OWNED_LIGHT] && ++count > 1)
      return true;
  return false;
}

// Keep a fixed-size, texel-aligned shadow region around the visible action.
// Whole-track bounds can turn even a 4096 map into metre-wide shadow pixels.
export function updateShadowFocus(sceneState, settings, camera) {
  const sun = sceneState.sun;
  const size = SHADOW_MAP_SIZES[settings.shadowQuality];
  if (sceneState.nativeCSM || !sun || !size || !camera?.position?.clone) return;
  let extent = settings.shadowDistance ?? 30;
  const focus = (sceneState.shadowFocus ??= camera.position.clone());
  const previous = (sceneState.lastCameraPosition ??= camera.position.clone());
  const speed = camera.position.distanceTo(previous);
  previous.copy(camera.position);
  if (settings.adaptiveShadows)
    extent *=
      1 +
      Math.min(
        0.6,
        speed * 0.12 +
          Math.max(0, camera.position.y - 20) * 0.003 +
          (camera.fov ?? 60) / 600,
      );
  extent = Math.round(extent / 2) * 2;
  sceneState.shadowExtent ??= extent;
  sceneState.shadowExtent += (extent - sceneState.shadowExtent) * 0.05;
  extent = Math.round(sceneState.shadowExtent / 2) * 2;
  const shadowCamera = sun.shadow.camera;
  if (shadowCamera.right !== extent) {
    Object.assign(shadowCamera, {
      left: -extent,
      right: extent,
      top: extent,
      bottom: -extent,
      near: 0.1,
      far: Math.max(100, extent * 4),
    });
    shadowCamera.updateProjectionMatrix();
  }
  sun.shadow.bias =
    settings.shadowBias * (extent / (settings.shadowDistance ?? 30));
  sun.shadow.normalBias = settings.shadowNormalBias * (extent / 30);
  if (camera.getWorldPosition) camera.getWorldPosition(focus);
  else focus.copy(camera.position);
  const forward = (sceneState.shadowForward ??= focus.clone());
  if (camera.getWorldDirection) {
    camera.getWorldDirection(forward);
    focus.addScaledVector(forward, extent * (settings.shadowForward ?? 0.4));
  }
  const smooth = (sceneState.smoothedFocus ??= focus.clone());
  if (smooth.distanceTo(focus) > extent * 1.5) smooth.copy(focus);
  else smooth.lerp(focus, 0.12);
  focus.copy(smooth);
  const elevation = (settings.sunElevation * Math.PI) / 180;
  const azimuth = (settings.sunAzimuth * Math.PI) / 180;
  const sa = Math.sin(azimuth),
    ca = Math.cos(azimuth);
  const se = Math.sin(elevation),
    ce = Math.cos(elevation);
  const texel = (extent * 2) / size;
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

// The local shadow map only has stable detail near the camera. Distant
// receivers expose its finite resolution as large square patches, so restrict
// mod-managed shadow work to the configured coverage radius.
function updateShadowRange(sceneState, settings, camera, three) {
  if (!camera?.getWorldPosition || !three?.Vector3) return;
  const range = Math.max(15, settings.shadowDistance ?? 30);
  const rangeSquared = range * range;
  const cameraPosition = (sceneState.shadowRangeCamera ??= new three.Vector3());
  const meshPosition = (sceneState.shadowRangeMesh ??= new three.Vector3());
  camera.getWorldPosition(cameraPosition);
  for (const [mesh, desired] of sceneState.managedShadowMeshes) {
    const matrix = mesh.matrixWorld?.elements;
    if (matrix) meshPosition.set(matrix[12], matrix[13], matrix[14]);
    else mesh.getWorldPosition?.(meshPosition);
    const dx = meshPosition.x - cameraPosition.x;
    const dy = meshPosition.y - cameraPosition.y;
    const dz = meshPosition.z - cameraPosition.z;
    const inRange = dx * dx + dy * dy + dz * dz <= rangeSquared;
    mesh.castShadow = inRange && desired.managedCastShadow;
    mesh.receiveShadow = inRange && desired.managedReceiveShadow;
  }
}

export function refreshFrameEffects(
  sceneState,
  rendererState,
  three,
  settings,
  camera,
) {
  // The native renderer's update() rewrites shadowMap.enabled before every render.
  applyRendererEffects(rendererState, three, settings);
  for (const light of sceneState.mutedLights) {
    if (typeof light.visible === "boolean") light.visible = false;
    light.castShadow = false;
    light.intensity = 0;
  }
  if (!sceneState.nativeCSM && sceneState.sun) {
    sceneState.sun.castShadow = SHADOW_MAP_SIZES[settings.shadowQuality] > 0;
  }
  updateShadowFocus(sceneState, settings, camera);
}

export function applyRendererEffects(rendererState, three, settings) {
  const { renderer } = rendererState;
  safelyApply(rendererState, "tone mapping and exposure", () => {
    if (
      !("toneMapping" in renderer) ||
      typeof rendererState.originalExposure !== "number"
    ) {
      throw new Error(
        "WebGLRenderer tone mapping or exposure controls are unavailable.",
      );
    }
    if (typeof three.ACESFilmicToneMapping !== "number") {
      throw new Error("The ACES filmic tone-mapping mode is unavailable.");
    }
    renderer.outputColorSpace = three.SRGBColorSpace;
    renderer.toneMapping = three.ACESFilmicToneMapping;
    renderer.toneMappingExposure =
      rendererState.originalExposure * settings.exposure;
  });

  safelyApply(rendererState, "shadow quality", () => {
    const shadowMap = renderer.shadowMap;
    const size = SHADOW_MAP_SIZES[settings.shadowQuality];
    if (!shadowMap || typeof shadowMap.enabled !== "boolean") {
      throw new Error("WebGLRenderer shadow-map controls are unavailable.");
    }
    shadowMap.enabled = size > 0;
    if (size > 0 && typeof three.PCFSoftShadowMap === "number") {
      shadowMap.type = three.PCFSoftShadowMap ?? three.PCFShadowMap;
    }
  });

  safelyApply(rendererState, "render scale", () => {
    if (rendererState.postScale) {
      rendererState.appliedScale = settings.renderScale;
      return;
    }
    if (rendererState.appliedScale === settings.renderScale) return;
    if (
      typeof renderer.setPixelRatio !== "function" ||
      rendererState.originalPixelRatio === null
    ) {
      if (settings.renderScale !== 1)
        throw new Error("WebGLRenderer pixel-ratio controls are unavailable.");
      return;
    }
    renderer.setPixelRatio(
      rendererState.originalPixelRatio * settings.renderScale,
    );
    rendererState.appliedScale = settings.renderScale;
  });
}

export function createRendererState(renderer) {
  return {
    renderer,
    originalToneMapping: renderer.toneMapping,
    originalOutputColorSpace: renderer.outputColorSpace,
    originalExposure: renderer.toneMappingExposure,
    originalShadowEnabled: renderer.shadowMap?.enabled,
    originalShadowType: renderer.shadowMap?.type,
    originalPixelRatio:
      typeof renderer.getPixelRatio === "function"
        ? renderer.getPixelRatio()
        : null,
    appliedScale: null,
  };
}

export function restoreRenderer(rendererState) {
  const { renderer } = rendererState;
  renderer.outputColorSpace = rendererState.originalOutputColorSpace;
  if ("toneMapping" in renderer)
    renderer.toneMapping = rendererState.originalToneMapping;
  if (typeof rendererState.originalExposure === "number") {
    renderer.toneMappingExposure = rendererState.originalExposure;
  }
  if (
    renderer.shadowMap &&
    typeof rendererState.originalShadowEnabled === "boolean"
  ) {
    renderer.shadowMap.enabled = rendererState.originalShadowEnabled;
    renderer.shadowMap.type = rendererState.originalShadowType;
  }
  if (
    rendererState.originalPixelRatio !== null &&
    typeof renderer.setPixelRatio === "function"
  ) {
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
  sceneState.managedShadowMeshes.clear();

  for (const [light, snapshot] of sceneState.lightSnapshots) {
    light.intensity = snapshot.intensity;
    if (typeof snapshot.visible === "boolean") light.visible = snapshot.visible;
    if (snapshot.color && light.color?.copy) light.color.copy(snapshot.color);
    if (snapshot.groundColor && light.groundColor?.copy)
      light.groundColor.copy(snapshot.groundColor);
    if (snapshot.position && light.position?.copy)
      light.position.copy(snapshot.position);
    if (snapshot.targetPosition && light.target?.position?.copy) {
      light.target.position.copy(snapshot.targetPosition);
    }
    if (typeof snapshot.castShadow === "boolean")
      light.castShadow = snapshot.castShadow;
    restoreShadowSettings(light, snapshot);
  }

  for (const light of sceneState.ownedLights) {
    light.parent?.remove(light);
    if (light.target?.parent) light.target.parent.remove(light.target);
    light.shadow?.map?.dispose?.();
  }
  for (const target of sceneState.attachedTargets)
    target.parent?.remove(target);
  sceneState.attachedTargets.clear();
  sceneState.ownedLights.clear();
  sceneState.lightSnapshots.clear();
  sceneState.mutedLights.clear();
  sceneState.fog = null;
}
