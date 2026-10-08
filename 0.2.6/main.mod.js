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
    if (typeof parent.userData?.type === "string")
      names.push(parent.userData.type);
  }
  return names.join(" ");
}
var GHOST_MARKER = /ghost|replay|swarm|training/i;
function isReplayGhost(mesh, material) {
  const marker = GHOST_MARKER;
  if (marker.test(material?.name ?? "") || marker.test(material?.userData?.type ?? ""))
    return true;
  for (let node = mesh; node && !node.isScene; node = node.parent)
    if (marker.test(node.name ?? "") || marker.test(node.userData?.type ?? ""))
      return true;
  return false;
}
function describeMaterial(mesh, material) {
  const geometry = mesh?.geometry;
  const stable = geometry ? `${geometry.type}:${geometry.attributes?.position?.count ?? 0}` : "";
  return {
    material: material?.name || `unnamed-${material?.type ?? "material"}`,
    mesh: mesh?.name || `unnamed-${stable}`,
    parent: ancestorNames(mesh)
  };
}
function patternMatch(value, pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + escaped + "$", "i").test(value);
}
function classifyMaterialEvidence(mesh, material, overrides = {}) {
  const names = describeMaterial(mesh, material);
  if (isReplayGhost(mesh, material) || mesh?.userData?.polyShadeOwned)
    return {
      kind: "ignore",
      confidence: 1,
      evidence: ["owned effect or replay"]
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
    material?.map?.name
  ].filter(Boolean).join(" ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  const direct = (material?.name ?? "").toLowerCase();
  for (const [kind, pattern] of Object.entries({
    tire: /tire|tyre|rubber/,
    glass: /glass|window/,
    metal: /metal|chrome|steel|rim|exhaust/,
    emissive: /brakelight|emissive|neon/,
    marking: /marking|stripe/,
    signage: /sign|arrow/
  })) {
    if (pattern.test(direct))
      return { kind, confidence: 0.98, evidence: ["explicit material name"] };
  }
  const compact = descriptors.replace(/[^a-z]/g, "");
  if (/carbody|chassis|vehicle|carpaint/.test(compact))
    return {
      kind: "car",
      confidence: 0.95,
      evidence: ["vehicle hierarchy/name"]
    };
  const extra = {
    metal: /metal|steel|chrome/,
    concrete: /concrete/,
    marking: /marking|stripe|kerb|curb/,
    signage: /sign|arrow|checkpoint/,
    emissive: /emissive|neon|lamp|lightpanel/,
    architecture: /building|architecture|tower|platform|pillar/
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
    "architecture"
  ]) {
    if ((extra[kind] ?? MATERIAL_KEYWORDS[kind])?.test(descriptors))
      return { kind, confidence: 0.9, evidence: ["semantic name/hierarchy"] };
  }
  const g = mesh?.geometry;
  if (g && material?.color && !material.vertexColors) {
    if (!g.boundingBox) g.computeBoundingBox?.();
    const box = g.boundingBox;
    if (box) {
      const x = box.max.x - box.min.x, y = box.max.y - box.min.y, z = box.max.z - box.min.z;
      const c = material.color;
      const flat = Math.max(x, z) > 15 && y < Math.max(x, z) * 0.04;
      if (flat && c.g > c.r * 1.18 && c.g > c.b * 1.12)
        return {
          kind: "grass",
          confidence: 0.7,
          evidence: ["large flat geometry + green diffuse colour"]
        };
      if (flat && Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) < 0.15)
        return {
          kind: "road",
          confidence: 0.6,
          evidence: ["large flat neutral surface"]
        };
      if (Math.max(x, y, z) > 5 && Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) < 0.12)
        return {
          kind: "architecture",
          confidence: 0.5,
          evidence: ["large neutral geometry"]
        };
    }
  }
  if (material?.isMeshStandardMaterial && material.metalness > 0.65)
    return { kind: "metal", confidence: 0.65, evidence: ["PBR metalness"] };
  return {
    kind: "other",
    confidence: 0.2,
    evidence: ["no reliable semantic evidence"]
  };
}
function classifyMaterial(mesh, material, overrides) {
  const result = classifyMaterialEvidence(mesh, material, overrides);
  return result.kind === "ignore" ? "other" : result.kind;
}
function tuneMaterial(material, kind, settings2 = {}) {
  if (typeof material.roughness === "number" && typeof material.metalness === "number") {
    const tuning = {
      road: [settings2.roadRoughness ?? 0.85, 0.01],
      grass: [0.88, 0],
      barrier: [0.78, 0.04],
      car: [0.28, 0.22],
      concrete: [0.92, 0],
      architecture: [0.87, 0],
      metal: [0.3, 0.75],
      marking: [0.78, 0],
      signage: [0.65, 0],
      tire: [0.94, 0.01]
    }[kind];
    if (tuning) {
      material.roughness = tuning[0];
      material.metalness = tuning[1];
      material.envMapIntensity = (settings2.environmentIntensity ?? 0.6) * (kind === "car" ? settings2.carReflection ?? 1 : kind === "metal" ? 1.1 : kind === "tire" ? 0.08 : 0.2);
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
var SYNC_PROPERTIES = ["opacity", "transparent", "visible", "depthWrite", "map", "alphaMap", "alphaTest", "vertexColors"];
function syncMaterialColors(sceneState, settings2 = {}) {
  const snapshots = sceneState.materialSyncSnapshots ??= /* @__PURE__ */ new WeakMap();
  for (const [source, byKind] of sceneState.materialClones) {
    for (const [kind, clone] of byKind) {
      const previous = snapshots.get(clone);
      const warmth = settings2.surfaceWarmth ?? 0;
      if (previous && previous.warmth === warmth && source.color && clone.color && source.color.r === previous.sourceR && source.color.g === previous.sourceG && source.color.b === previous.sourceB && clone.color.r === previous.outputR && clone.color.g === previous.outputG && clone.color.b === previous.outputB) {
        let unchanged = true;
        for (const key of SYNC_PROPERTIES)
          if (source[key] !== previous[key] || clone[key] !== previous[key]) {
            unchanged = false;
            break;
          }
        if (unchanged) continue;
      }
      for (const key of SYNC_PROPERTIES) {
        if (previous && source[key] === previous[key] && clone[key] !== previous[key]) {
          source[key] = clone[key];
          if (!["opacity", "visible", "depthWrite"].includes(key))
            source.needsUpdate = true;
        }
        if (source[key] === void 0 || clone[key] === source[key]) continue;
        clone[key] = source[key];
        if (!["opacity", "visible", "depthWrite"].includes(key))
          clone.needsUpdate = true;
      }
      if (!clone.color?.copy || !source.color) continue;
      if (previous && source.color.r === previous.sourceR && source.color.g === previous.sourceG && source.color.b === previous.sourceB && (clone.color.r !== previous.outputR || clone.color.g !== previous.outputG || clone.color.b !== previous.outputB)) {
        source.color.copy(clone.color);
      }
      clone.color.copy(source.color);
      const { r, g, b } = source.color;
      const neutral = Math.max(r, g, b) - Math.min(r, g, b) < 0.12;
      if (neutral && kind !== "car" && kind !== "tire" && !source.map && !source.vertexColors) {
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
        vertexColors: source.vertexColors
      });
      if (!previous) snapshots.set(clone, snapshot);
    }
  }
}
function applyMaterialTuning(sceneState, three = {}, settings2 = {}) {
  const LitMaterial = three.MeshStandardMaterial ?? three.MeshPhongMaterial ?? three.MeshLambertMaterial;
  const { scene, materialClones, originalMaterials, processedMeshes } = sceneState;
  const activeMeshes = /* @__PURE__ */ new Set();
  sceneState.inspectorRecords ??= /* @__PURE__ */ new Map();
  let modified = 0;
  scene.traverse((mesh) => {
    if (!mesh?.isMesh || mesh.userData?.polyShadeOwned) return;
    activeMeshes.add(mesh);
    const knownMaterial = processedMeshes.get(mesh);
    if (knownMaterial === mesh.material) {
      const source = originalMaterials.get(mesh);
      const sources = Array.isArray(source) ? source : [source];
      if (!source || !sources.some(
        (material) => isReplayGhost(mesh, material) || material?.transparent || material?.opacity < 0.98
      ))
        return;
      mesh.material = source;
    }
    if (processedMeshes.has(mesh)) {
      originalMaterials.delete(mesh);
    }
    const original = mesh.material;
    const isArray = Array.isArray(original);
    const materials = isArray ? original : [original];
    const replayGhost = materials.some(
      (material) => isReplayGhost(mesh, material)
    );
    let changed = false;
    const replacements = materials.map((material) => {
      const info = classifyMaterialEvidence(
        mesh,
        material,
        settings2.materialOverrides
      );
      const kind = info.kind;
      const records = sceneState.inspectorRecords.get(mesh) ?? [];
      records.push({
        ...describeMaterial(mesh, material),
        ...info,
        type: material?.type,
        converted: !!material?.isMeshBasicMaterial
      });
      sceneState.inspectorRecords.set(mesh, records.slice(-materials.length));
      if (!material || typeof material.clone !== "function") return material;
      if (material.name === "BrakeLight") return material;
      if (replayGhost || material.transparent || material.opacity < 0.98)
        return material;
      if (material.wireframe || material.onBeforeCompile !== Object.getPrototypeOf(material).onBeforeCompile)
        return material;
      if (kind === "ignore" || material.isShaderMaterial) return material;
      const basic = (material.isMeshBasicMaterial || material.isMeshLambertMaterial && kind !== "other") && typeof LitMaterial === "function" && mesh.geometry?.attributes?.normal;
      if (kind === "glass" || kind === "other" && !basic) return material;
      let byKind = materialClones.get(material);
      if (!byKind) {
        byKind = /* @__PURE__ */ new Map();
        materialClones.set(material, byKind);
      }
      let clone = byKind.get(kind);
      if (!clone) {
        if (basic) {
          clone = new LitMaterial();
          for (const key of SURFACE_PROPERTIES) {
            if (material[key] !== void 0) clone[key] = material[key];
          }
          clone.color.copy(material.color);
          clone.flatShading = material.flatShading === true;
          clone.toneMapped = true;
        } else {
          clone = material.clone();
        }
        if (!tuneMaterial(clone, kind, settings2) && !basic) {
          clone.dispose?.();
          return material;
        }
        if (settings2.materialDetail && ["road", "grass", "concrete", "architecture"].includes(kind) && clone.isMeshStandardMaterial && !clone.roughnessMap) {
          clone.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
              "#include <common>",
              "#include <common>\nvarying vec3 polyShadeSurface;"
            ).replace(
              "#include <begin_vertex>",
              "#include <begin_vertex>\npolyShadeSurface=position;"
            );
            shader.fragmentShader = "// PolyShade_material\n" + shader.fragmentShader.replace(
              "#include <common>",
              "#include <common>\nvarying vec3 polyShadeSurface;"
            ).replace(
              "#include <roughnessmap_fragment>",
              "#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+0.035*(fract(sin(dot(floor(polyShadeSurface*12.0),vec3(12.9898,78.233,37.719)))*43758.5453)-0.5),0.04,1.0);"
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
  for (const mesh of sceneState.inspectorRecords.keys())
    if (!activeMeshes.has(mesh)) sceneState.inspectorRecords.delete(mesh);
  sceneState.materialInspector = [...sceneState.inspectorRecords.values()].flat().slice(0, 250);
  sceneState.paintEnvironmentSnapshots ??= /* @__PURE__ */ new Map();
  scene.traverse((mesh) => {
    if (mesh.name !== "Body") return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (material?.name !== "Main" || !material.isMeshStandardMaterial || material.defines?.USE_CSM !== void 0)
        continue;
      if (!sceneState.paintEnvironmentSnapshots.has(material))
        sceneState.paintEnvironmentSnapshots.set(
          material,
          material.envMapIntensity
        );
      material.envMapIntensity = (settings2.environmentIntensity ?? 0.6) * (settings2.carReflection ?? 1);
    }
  });
  syncMaterialColors(sceneState, settings2);
  return modified;
}
function restoreMaterials(sceneState) {
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

// src/mod.js
import { PolyMod } from "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/PolyTypes.js";

// src/shaders/sky.js
var SKY_VERTEX = `varying vec3 vDirection;
void main(){vDirection=position;vec4 clip=projectionMatrix*mat4(mat3(viewMatrix))*vec4(position,1.0);gl_Position=clip.xyww;}`;
var SKY_FRAGMENT = `
// PolyShade_sky
varying vec3 vDirection;
uniform vec3 zenith,horizon,sunDirection,sunColor;
uniform float intensity,warmth,turbidity,discSize,glow,cloudAmount,time;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
 vec3 d=normalize(vDirection);float h=pow(clamp(d.y,0.0,1.0),0.45+0.025*turbidity);
 vec3 c=mix(horizon,zenith,h);c=mix(c,horizon,clamp(-d.y*3.0,0.0,1.0));
 float mu=max(dot(d,sunDirection),0.0);float haze=pow(mu,mix(64.0,20.0,clamp(turbidity/8.0,0.0,1.0)));
 c+=sunColor*haze*glow*0.25;c+=zenith*0.04*(1.0+mu*mu)*(1.0-h);
 float disc=smoothstep(cos(discSize*0.0174533),cos(discSize*0.0122173),mu);
 c+=sunColor*disc*5.0;
 if(cloudAmount>0.0 && d.y>0.02){vec2 p=d.xz/max(d.y+0.35,0.1)*2.0+vec2(time*0.001,0.0);
 float n=noise(p)*0.78+noise(p*1.9)*0.22;
 float cloud=smoothstep(1.0-cloudAmount,1.0-cloudAmount+0.14,n)*smoothstep(0.02,0.25,d.y);
 c=mix(c,mix(horizon*1.2,sunColor*0.8,mu*0.16),cloud*0.55);}
 gl_FragColor=vec4(c*intensity,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

// src/rendering/sky.js
function srgbChannel(x) {
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}
function linearColor(three, hex) {
  const n = parseInt(hex.slice(1), 16);
  return new three.Color().setRGB(
    srgbChannel((n >> 16 & 255) / 255),
    srgbChannel((n >> 8 & 255) / 255),
    srgbChannel((n & 255) / 255)
  );
}
function sunDirection(three, settings2, target = new three.Vector3()) {
  const e = settings2.sunElevation * Math.PI / 180, a = settings2.sunAzimuth * Math.PI / 180;
  return target.set(
    Math.cos(e) * Math.sin(a),
    Math.sin(e),
    Math.cos(e) * Math.cos(a)
  );
}
function skyPalette(three, s) {
  const low = 1 - Math.min(1, Math.max(0, s.sunElevation) / 65);
  const zenith = linearColor(three, s.zenithColor ?? "#3978bc");
  const horizon = linearColor(three, s.horizonColor ?? "#b6cbd9");
  if (s.skyAutomatic) {
    zenith.multiplyScalar(1 - low * 0.12);
    horizon.lerp(linearColor(three, "#e6c5a4"), low * (s.horizonWarmth ?? 0.3));
  }
  const sun = linearColor(three, s.sunColor ?? "#ffe3ba");
  if (s.automaticSunColor)
    sun.copy(linearColor(three, "#fff5e5")).lerp(linearColor(three, "#ffd29a"), low * 0.65);
  return { zenith, horizon, sun, direction: sunDirection(three, s) };
}
var ProceduralSky = class {
  constructor(three, scene) {
    this.three = three;
    this.scene = scene;
    this.hidden = /* @__PURE__ */ new Map();
    this.background = scene.background;
    this.uniforms = Object.fromEntries(
      ["zenith", "horizon", "sunDirection", "sunColor"].map((k) => [
        k,
        {
          value: k === "sunDirection" ? new three.Vector3() : new three.Color()
        }
      ])
    );
    for (const k of [
      "intensity",
      "warmth",
      "turbidity",
      "discSize",
      "glow",
      "cloudAmount",
      "time"
    ])
      this.uniforms[k] = { value: 0 };
    this.material = new three.ShaderMaterial({
      name: "PolyShade procedural sky",
      uniforms: this.uniforms,
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: three.BackSide,
      depthWrite: false,
      depthTest: false,
      toneMapped: true
    });
    this.geometry = new three.SphereGeometry(1, 24, 12);
    this.mesh = new three.Mesh(this.geometry, this.material);
    this.mesh.name = "PolyShade sky";
    this.mesh.userData.polyShadeOwned = true;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1e4;
    scene.add(this.mesh);
  }
  update(s, time) {
    this.palette = skyPalette(this.three, s);
    for (const [key, value] of Object.entries({
      zenith: this.palette.zenith,
      horizon: this.palette.horizon,
      sunColor: this.palette.sun,
      sunDirection: this.palette.direction
    }))
      this.uniforms[key].value.copy(value);
    const values = {
      intensity: s.skyIntensity,
      warmth: s.horizonWarmth,
      turbidity: s.turbidity,
      discSize: s.sunDiscSize,
      glow: s.sunGlow,
      cloudAmount: s.cloudsEnabled ? s.cloudAmount : 0,
      time: time / 1e3
    };
    for (const [k, v] of Object.entries(values)) this.uniforms[k].value = v;
    this.mesh.visible = s.skyEnabled;
    this.enabled = s.skyEnabled;
    this.scene.background = s.skyEnabled ? null : this.background;
    for (const [o, v] of this.hidden) o.visible = s.skyEnabled ? false : v;
  }
  scan() {
    if (!this.enabled) return;
    this.scene.traverse((o) => {
      if (o === this.mesh || !o.isMesh || !o.material?.isShaderMaterial) return;
      if (o.geometry?.type === "SphereGeometry" || /sky/i.test(o.name)) {
        if (!this.hidden.has(o)) this.hidden.set(o, o.visible);
        o.visible = false;
      }
    });
  }
  dispose() {
    this.scene.background = this.background;
    for (const [o, v] of this.hidden) o.visible = v;
    this.hidden.clear();
    this.scene.remove(this.mesh);
    this.material.dispose();
    this.geometry.dispose();
  }
};

// src/rendering/brake-lights.js
var BrakeLights = class {
  constructor(three, scene) {
    this.three = three;
    this.scene = scene;
    this.cars = /* @__PURE__ */ new Map();
    this.position = new three.Vector3();
    this.sphere = three.Sphere ? new three.Sphere() : null;
    this.frustum = three.Frustum ? new three.Frustum() : null;
    this.projection = three.Matrix4 ? new three.Matrix4() : null;
  }
  scan(settings2, camera, sceneState) {
    this.camera = camera;
    if (!settings2.brakeLightsEnabled || !this.three.SpotLight) {
      if (settings2.brakeLightsEnabled && !this.three.SpotLight && !this.warned) {
        console.warn(
          "[PolyShade] SpotLight is unavailable in this game bundle; keeping native emissive brake lamps without omnidirectional spill."
        );
        this.warned = true;
      }
      this.dispose();
      return;
    }
    const candidates = [];
    this.scene.traverse((mesh) => {
      if (!mesh.isMesh || mesh.userData?.polyShadeOwned || mesh.visible === false)
        return;
      const source = sceneState?.originalMaterials.get(mesh) ?? mesh.material;
      const materials = Array.isArray(source) ? source : [source];
      const index = materials.findIndex(
        (m) => m?.name === "BrakeLight" && m.emissive
      );
      if (index < 0 || materials.some(
        (m) => isReplayGhost(mesh, m) || m?.transparent || m?.opacity < 0.98
      ))
        return;
      candidates.push({ mesh, material: materials[index], index });
    });
    const position = new this.three.Vector3();
    candidates.sort(
      (a, b) => a.mesh.getWorldPosition(position).distanceToSquared(camera.position) - b.mesh.getWorldPosition(position).distanceToSquared(camera.position)
    );
    const keep = /* @__PURE__ */ new Set();
    for (const candidate of candidates.slice(0, 3)) {
      const { mesh, material, index } = candidate;
      keep.add(mesh);
      if (this.cars.has(mesh)) {
        this.cars.get(mesh).material = material;
        continue;
      }
      const geometry = mesh.geometry, attribute = geometry.attributes.position, normals = geometry.attributes.normal;
      const box = new this.three.Box3().makeEmpty(), normal = new this.three.Vector3(), vertex = new this.three.Vector3();
      const groups = Array.isArray(mesh.material) ? geometry.groups.filter((g) => g.materialIndex === index) : [{ start: 0, count: geometry.index?.count ?? attribute.count }];
      for (const group of groups)
        for (let offset = group.start; offset < Math.min(group.start + group.count, group.start + 1e4); offset++) {
          const id = geometry.index ? geometry.index.getX(offset) : offset;
          vertex.fromBufferAttribute(attribute, id);
          box.expandByPoint(vertex);
          if (normals) {
            vertex.fromBufferAttribute(normals, id);
            normal.add(vertex);
          }
        }
      if (box.isEmpty()) continue;
      const centre = box.getCenter(new this.three.Vector3()), size = box.getSize(new this.three.Vector3());
      normal.normalize();
      if (normal.lengthSq() < 0.01) continue;
      const direction = normal.clone();
      direction.y = Math.min(-0.25, direction.y - 0.25);
      direction.normalize();
      centre.addScaledVector(
        normal,
        Math.max(size.x, size.y, size.z) * 0.03 + 0.01
      );
      const offsets = size.x > 0.1 ? [-size.x * 0.25, size.x * 0.25] : [0];
      const lights = offsets.map((offset) => {
        const light = new this.three.SpotLight(
          16724e3,
          0,
          settings2.brakeLightDistance,
          Math.PI / 4,
          0.7,
          2
        );
        light.color.copy(linearColor(this.three, "#ff3020"));
        light.name = "PolyShade brake spill";
        light.userData.polyShadeOwned = true;
        light.castShadow = false;
        light.visible = false;
        light.position.copy(centre);
        light.position.x += offset;
        mesh.add(light);
        light.target.name = "PolyShade brake target";
        light.target.userData.polyShadeOwned = true;
        light.target.position.copy(light.position).add(direction);
        mesh.add(light.target);
        return light;
      });
      this.cars.set(mesh, { material, lights });
    }
    for (const [mesh, car] of this.cars)
      if (!keep.has(mesh)) {
        for (const light of car.lights) {
          light.target.parent?.remove(light.target);
          light.parent?.remove(light);
          light.dispose?.();
        }
        this.cars.delete(mesh);
      }
  }
  update(settings2) {
    const camera = this.camera;
    if (this.frustum && camera?.projectionMatrix && camera?.matrixWorldInverse)
      this.frustum.setFromProjectionMatrix(
        this.projection.multiplyMatrices(
          camera.projectionMatrix,
          camera.matrixWorldInverse
        )
      );
    for (const [mesh, { material, lights }] of this.cars) {
      mesh.getWorldPosition(this.position);
      if (this.sphere) {
        this.sphere.center.copy(this.position);
        this.sphere.radius = settings2.brakeLightDistance + 1;
      }
      const relevant = !camera || this.position.distanceToSquared(camera.position) < 1600 && (!this.frustum || this.frustum.intersectsSphere(this.sphere));
      const enabled = relevant && settings2.brakeLightsEnabled && Math.max(
        material.emissive.r,
        material.emissive.g,
        material.emissive.b
      ) > 0.05;
      for (const light of lights) {
        light.visible = enabled;
        light.intensity = enabled ? settings2.brakeLightIntensity * (material.emissiveIntensity ?? 1) : 0;
        light.distance = settings2.brakeLightDistance;
      }
    }
  }
  report() {
    return {
      cars: this.cars.size,
      lights: [...this.cars.values()].reduce((n, c) => n + c.lights.length, 0),
      active: [...this.cars.values()].some(
        (c) => c.lights.some((l) => l.intensity > 0)
      ),
      type: this.three.SpotLight ? "SpotLight" : "native-emissive-only",
      targets: [...this.cars.values()].reduce((n, c) => n + c.lights.length, 0)
    };
  }
  dispose() {
    for (const { lights } of this.cars.values())
      for (const light of lights) {
        light.target.parent?.remove(light.target);
        light.parent?.remove(light);
        light.dispose?.();
      }
    this.cars.clear();
  }
};

// src/rendering/capabilities.js
var CLASS_NAMES = [
  "WebGLRenderer",
  "Scene",
  "Color",
  "Fog",
  "FogExp2",
  "DirectionalLight",
  "PointLight",
  "SpotLight",
  "AmbientLight",
  "HemisphereLight",
  "Vector2",
  "Vector3",
  "Vector4",
  "Matrix4",
  "Quaternion",
  "Box3",
  "Sphere",
  "ShaderMaterial",
  "RawShaderMaterial",
  "Mesh",
  "BufferGeometry",
  "BufferAttribute",
  "PlaneGeometry",
  "SphereGeometry",
  "OrthographicCamera",
  "PerspectiveCamera",
  "WebGLRenderTarget",
  "WebGLCubeRenderTarget",
  "CubeCamera",
  "DepthTexture",
  "DataTexture",
  "Texture",
  "Raycaster",
  "MeshStandardMaterial",
  "MeshPhysicalMaterial",
  "MeshLambertMaterial",
  "MeshPhongMaterial",
  "Frustum",
  "Clock",
  "PMREMGenerator",
  "GameRenderer"
];
var ENUMS = Object.freeze({
  NoBlending: 0,
  AdditiveBlending: 2,
  CustomBlending: 5,
  FrontSide: 0,
  BackSide: 1,
  DoubleSide: 2,
  NearestFilter: 1003,
  LinearFilter: 1006,
  HalfFloatType: 1016,
  FloatType: 1015,
  UnsignedByteType: 1009,
  UnsignedIntType: 1014,
  RGBAFormat: 1023,
  DepthFormat: 1026,
  SRGBColorSpace: "srgb",
  LinearSRGBColorSpace: "srgb-linear",
  NoColorSpace: "",
  ACESFilmicToneMapping: 4,
  NoToneMapping: 0,
  PCFShadowMap: 1,
  PCFSoftShadowMap: 2,
  VSMShadowMap: 3,
  EquirectangularReflectionMapping: 303
});
function matches(candidate, name) {
  if (typeof candidate !== "function") return false;
  const source = Function.prototype.toString.call(candidate);
  if (new RegExp(`\\.is${name}\\s*=`).test(source)) return true;
  if (new RegExp(`\\.type\\s*=\\s*["']${name}["']`).test(source)) return true;
  const proto = candidate.prototype;
  if (name === "GameRenderer")
    return !!(proto?.isTrackShadowsEnabled && proto?.getMaxAnisotropy && proto?.setCamera);
  if (name === "PMREMGenerator")
    return !!(proto?.fromScene && proto?.fromEquirectangular && proto?.compileCubemapShader);
  if (name === "Raycaster")
    return !!(proto?.intersectObject && proto?.setFromCamera);
  if (name === "Clock")
    return !!(proto?.getDelta && proto?.getElapsedTime && proto?.start);
  if (name === "Frustum")
    return !!(proto?.setFromProjectionMatrix && proto?.intersectsSphere);
  return false;
}
function discoverThree(pml2) {
  if (typeof pml2?.getFromPolyTrack !== "function")
    throw new Error("PML getFromPolyTrack is unavailable.");
  let require2;
  for (const key of ["i", "n"]) {
    try {
      const value = pml2.getFromPolyTrack(key);
      if (typeof value === "function" && value.m) {
        require2 = value;
        break;
      }
    } catch {
    }
  }
  if (!require2)
    throw new Error(
      "PolyTrack's scoped Webpack require function or module table is unavailable."
    );
  const core = [], renderer = [];
  for (const [id, factory] of Object.entries(require2.m)) {
    const source = String(factory);
    if (/\.isWebGLRenderer\s*=/.test(source)) renderer.push(id);
    else if (/\.isScene\s*=/.test(source) && /\.isColor\s*=/.test(source) || /\.isShaderMaterial\s*=|\.isWebGLRenderTarget\s*=|isTrackShadowsEnabled\(\)/.test(
      source
    ))
      core.push(id);
  }
  if (!core.length && !renderer.length)
    throw new Error(
      "Module table does not contain the expected Three.js modules."
    );
  const three = { ...ENUMS }, found = /* @__PURE__ */ new Set(), exportValues = [];
  for (const id of /* @__PURE__ */ new Set([...core, ...renderer])) {
    const exports = require2(id);
    exportValues.push(...Object.values(exports));
    for (const name of Object.keys(ENUMS))
      if (exports[name] !== void 0) three[name] = exports[name];
  }
  for (const name of CLASS_NAMES) {
    const candidate = exportValues.find((value) => matches(value, name));
    if (candidate) {
      three[name] = candidate;
      found.add(name);
    }
  }
  const missing = [
    "WebGLRenderer",
    "Scene",
    "Color",
    "DirectionalLight"
  ].filter((name) => !found.has(name));
  if (missing.length)
    throw new Error(`Missing Three.js classes: ${missing.join(", ")}`);
  three.discovery = {
    classes: Object.fromEntries(
      CLASS_NAMES.map((name) => [name, found.has(name)])
    ),
    enumSource: "PolyTrack 0.6.3 bundle stable enum table; named exports preferred"
  };
  return three;
}
function inspectRenderer(three, renderer) {
  const gl = renderer.getContext();
  const webgl2 = typeof gl.texStorage2D === "function";
  const extensions = gl.getSupportedExtensions() ?? [];
  const halfFloat = webgl2 && !!(gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"));
  const timer = gl.getExtension(
    webgl2 ? "EXT_disjoint_timer_query_webgl2" : "EXT_disjoint_timer_query"
  );
  const shader = !!(three.ShaderMaterial && three.Mesh && three.OrthographicCamera && three.PlaneGeometry);
  const targets = !!three.WebGLRenderTarget;
  const depth = webgl2 && !!three.DepthTexture;
  return {
    classes: three.discovery?.classes ?? {},
    constants: {
      ...ENUMS,
      RGBFormat: three.RGBFormat ?? null,
      sRGBEncoding: three.sRGBEncoding ?? null
    },
    enumSource: three.discovery?.enumSource,
    extensions,
    webgl2,
    halfFloat,
    floatLinear: !!gl.getExtension("OES_texture_float_linear"),
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
    maxSamples: webgl2 ? gl.getParameter(gl.MAX_SAMPLES) : 0,
    maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
    maxColorAttachments: webgl2 ? gl.getParameter(gl.MAX_COLOR_ATTACHMENTS) : 1,
    multipleRenderTargets: webgl2,
    antialias: gl.getContextAttributes()?.antialias ?? false,
    devicePixelRatio: globalThis.devicePixelRatio ?? 1,
    pixelRatio: renderer.getPixelRatio(),
    drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
    outputColorSpace: renderer.outputColorSpace,
    toneMapping: renderer.toneMapping,
    features: {
      shaderMaterial: shader,
      renderTargets: targets,
      depthTexture: depth,
      pmrem: !!three.PMREMGenerator,
      cubeCamera: !!three.CubeCamera,
      environment: !!(three.DataTexture && three.MeshStandardMaterial && halfFloat),
      postprocess: shader && targets,
      ssao: shader && targets && depth,
      bloom: shader && targets,
      sunRays: shader && targets && depth,
      fxaa: shader && targets,
      gpuTimer: webgl2 && !!timer
    },
    timerExtension: webgl2 ? timer : null
  };
}

// src/rendering/environment.js
function fract(v) {
  return v - Math.floor(v);
}
function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = fract(x), fy = fract(y), u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const hash = (a, b) => fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
  return (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v) + (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v;
}
var KEYS = [
  "skyAutomatic",
  "skyIntensity",
  "zenithColor",
  "horizonColor",
  "horizonWarmth",
  "turbidity",
  "sunDiscSize",
  "sunGlow",
  "sunElevation",
  "sunAzimuth",
  "sunColor",
  "automaticSunColor",
  "environmentQuality",
  "cloudsEnabled",
  "cloudAmount"
];
var SkyEnvironment = class {
  constructor(three, scene, capabilities = { floatLinear: true }) {
    this.capabilities = capabilities;
    this.three = three;
    this.scene = scene;
    this.original = scene.environment;
    this.texture = null;
    this.generations = 0;
  }
  update(s) {
    if (!s.environmentEnabled) {
      this.scene.environment = this.original;
      this.texture?.dispose();
      this.texture = null;
      this.hash = null;
      this.resolution = null;
      return;
    }
    const hash = JSON.stringify(KEYS.map((k) => s[k]));
    if (hash !== this.hash) {
      const t = this.three, p = skyPalette(t, s), width = { low: 128, medium: 256, high: 512 }[s.environmentQuality], height = width / 2;
      const data = new Float32Array(width * height * 4);
      let index = 0;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const latitude = ((y + 0.5) / height - 0.5) * Math.PI;
          const longitude = ((x + 0.5) / width - 0.5) * Math.PI * 2;
          const dy = Math.sin(latitude), dx = Math.cos(latitude) * Math.cos(longitude), dz = Math.cos(latitude) * Math.sin(longitude);
          const h = Math.pow(Math.max(0, dy), 0.45 + 0.025 * s.turbidity);
          const mu = Math.max(
            0,
            dx * p.direction.x + dy * p.direction.y + dz * p.direction.z
          );
          const glow = Math.pow(mu, 40) * s.sunGlow * 0.25;
          const radius = s.sunDiscSize * Math.PI / 180, pixelAngle = Math.PI / height, angle = Math.acos(Math.min(1, mu));
          const disc = 5 * Math.min(1, (radius / pixelAngle) ** 2) * Math.max(0, 1 - angle / (radius + pixelAngle));
          let cloud = 0;
          if (s.cloudsEnabled && dy > 0.02) {
            const px = dx / Math.max(dy + 0.35, 0.1) * 2, pz = dz / Math.max(dy + 0.35, 0.1) * 2, n = noise(px, pz) * 0.78 + noise(px * 1.9, pz * 1.9) * 0.22;
            cloud = Math.min(1, Math.max(0, (n - (1 - s.cloudAmount)) / 0.14));
            cloud = cloud * cloud * (3 - 2 * cloud) * Math.min(1, (dy - 0.02) / 0.23) * 0.55;
          }
          for (const channel of ["r", "g", "b"]) {
            const clear = (1 - h) * p.horizon[channel] + h * p.zenith[channel] + p.sun[channel] * (glow + disc);
            const cloudy = p.horizon[channel] * 1.2 * (1 - mu * 0.16) + p.sun[channel] * 0.8 * mu * 0.16;
            data[index++] = Math.max(
              0,
              (clear * (1 - cloud) + cloudy * cloud) * s.skyIntensity * (dy < 0 ? 0.55 : 1)
            );
          }
          data[index++] = 1;
        }
      const texture = new t.DataTexture(
        data,
        width,
        height,
        t.RGBAFormat,
        t.FloatType
      );
      texture.name = "PolyShade procedural environment";
      texture.mapping = t.EquirectangularReflectionMapping;
      texture.colorSpace = t.LinearSRGBColorSpace;
      texture.minFilter = this.capabilities.floatLinear ? t.LinearFilter : t.NearestFilter;
      texture.magFilter = texture.minFilter;
      texture.needsUpdate = true;
      this.texture?.dispose();
      this.texture = texture;
      this.hash = hash;
      this.resolution = width / 4;
      this.generations++;
    }
    this.scene.environment = this.texture;
  }
  dispose() {
    this.scene.environment = this.original;
    this.texture?.dispose();
    this.texture = null;
  }
};

// src/rendering/shader-guard.js
var ShaderGuard = class {
  constructor(renderer) {
    this.renderer = renderer;
    this.failures = /* @__PURE__ */ new Map();
    this.pass = "scene";
    this.originalCheck = renderer.debug.checkShaderErrors;
    this.originalCallback = renderer.debug.onShaderError;
    this.callback = (gl, program, vertex, fragment) => {
      const source = gl.getShaderSource(fragment) ?? "";
      const owned = source.includes("PolyShade") || this.pass !== "scene";
      if (!owned) {
        if (this.originalCallback)
          this.originalCallback(gl, program, vertex, fragment);
        else
          console.error(
            "[PolyShade] Native shader compilation failed.",
            gl.getProgramInfoLog(program),
            gl.getShaderInfoLog(vertex),
            gl.getShaderInfoLog(fragment)
          );
        return;
      }
      const name = source.includes("PolyShade_sky") ? "sky" : source.includes("PolyShade_material") ? "material" : this.pass;
      const log = [
        gl.getProgramInfoLog(program),
        gl.getShaderInfoLog(vertex),
        gl.getShaderInfoLog(fragment)
      ].filter(Boolean).join("\n");
      this.failures.set(name, log);
      console.error(
        `[PolyShade] Shader ${name} failed; disabling that effect.`,
        log
      );
    };
    renderer.debug.checkShaderErrors = true;
    renderer.debug.onShaderError = this.callback;
  }
  dispose() {
    this.renderer.debug.checkShaderErrors = this.originalCheck;
    if (this.renderer.debug.onShaderError === this.callback)
      this.renderer.debug.onShaderError = this.originalCallback;
  }
};

// src/shaders/sun-rays.js
var SUN_MASK_FRAGMENT = `
varying vec2 vUv;
uniform sampler2D tDepth;
uniform vec2 sunUv,sunMaskExtent,depthTexel;
uniform float aspect;
float sky(vec2 uv){
 if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))return 0.0;
 return step(0.999999,texture2D(tDepth,uv).r);
}
void main(){
 vec2 uv=sunUv+(vUv-0.5)*sunMaskExtent;
 vec2 t=depthTexel*0.35;
 float coverage=(sky(uv+t)+sky(uv-t)+sky(uv+vec2(t.x,-t.y))+sky(uv+vec2(-t.x,t.y)))*0.25;
 vec2 delta=(uv-sunUv)*vec2(aspect,1.0);
 gl_FragColor=vec4(vec3(coverage*exp(-dot(delta,delta)/0.0016)),1.0);
}`;
var SUN_RAYS_FRAGMENT = `
varying vec2 vUv;
uniform sampler2D tSunMask;
uniform sampler2D tSunVisibility;
uniform vec2 sunUv,sunMaskScale;
uniform vec3 sunColor;
uniform float decay,density,exposure,aspect,visibility;
void main(){
  vec3 sun=texture2D(tSunVisibility,vec2(0.5)).rgb;
  float rayVisibility=clamp(sun.r*0.15+sun.g*0.85,0.0,1.0)*sun.b;
  if(rayVisibility<0.001){gl_FragColor=vec4(0.0);return;}
  vec2 uv=vec2(0.5),stepUv=(vUv-sunUv)*sunMaskScale*density/48.0;
  float sum=0.0,weight=1.0;
  for(int i=0;i<48;i++){
    uv+=stepUv;
    // Beyond this aperture the original Gaussian contributes less than 0.00013.
    // The ray travels monotonically away from the centre, so it cannot re-enter.
    if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))break;
    sum+=texture2D(tSunMask,uv).r*weight;weight*=decay;
  }
  float normalizer=max(1.0-pow(decay,48.0),0.001);
  float shaft=sum/normalizer*rayVisibility*visibility*exposure;
  gl_FragColor=vec4(sunColor*shaft,1.0);
}`;

// src/shaders/sun-optics.js
var SUN_VISIBILITY_FRAGMENT = `
varying vec2 vUv;uniform sampler2D tDepth;uniform vec2 sunUv;uniform float aspect;
uniform vec3 sunDirection;uniform float cloudAmount,cloudTime;
float opticsHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float opticsNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(opticsHash(i),opticsHash(i+vec2(1,0)),f.x),mix(opticsHash(i+vec2(0,1)),opticsHash(i+vec2(1,1)),f.x),f.y);}
void main(){float clear=0.0;
for(int i=0;i<16;i++){float a=float(i)*0.392699;
vec2 uv=sunUv+vec2(cos(a)/aspect,sin(a))*0.012;
clear+=step(0.999999,texture2D(tDepth,clamp(uv,0.0,1.0)).r);}
clear/=16.0;
float transmission=1.0;
if(cloudAmount>0.0&&sunDirection.y>0.02){vec2 p=sunDirection.xz/max(sunDirection.y+0.35,0.1)*2.0+vec2(cloudTime*0.001,0.0);
float n=opticsNoise(p)*0.78+opticsNoise(p*1.9)*0.22;
float cloud=smoothstep(1.0-cloudAmount,1.0-cloudAmount+0.14,n)*smoothstep(0.02,0.25,sunDirection.y);
transmission=1.0-cloud*0.55;}
gl_FragColor=vec4(clear,4.0*clear*(1.0-clear),transmission,1.0);}`;
var FLARE_HELPERS = `
uniform sampler2D tSunVisibility;uniform vec2 sunUv;
uniform float flareStrength,ghostStrength,iridescence,streakStrength,sunVisibility,aspect;
vec3 lensFlare(vec2 uv){
if(flareStrength<=0.0)return vec3(0.0);
vec3 mask=texture2D(tSunVisibility,vec2(0.5)).rgb;
float visible=clamp(mask.r+mask.g*0.2,0.0,1.0)*mix(mask.b,1.0,0.18)*sunVisibility;
if(flareStrength<=0.0||visible<0.001)return vec3(0.0);
vec2 delta=(uv-sunUv)*vec2(aspect,1.0);float r=length(delta);
float sky=step(0.999999,texture2D(tDepth,uv).r);
float cloudDiffusion=4.0*mask.b*(1.0-mask.b);
vec3 f=sunColor*(exp(-r*r/0.00042)*0.62+exp(-r*r/0.0035)*cloudDiffusion*0.055)*sky;
for(int i=0;i<4;i++){
float axis=0.35+float(i)*0.4;
vec2 center=sunUv+(vec2(0.5)-sunUv)*axis;
float d=length((uv-center)*vec2(aspect,1.0));
float radius=0.016+float(i)*0.006;
vec3 ring=exp(-pow((vec3(d)-radius+vec3(-1.0,0.0,1.0)*iridescence*0.012)/0.006,vec3(2.0)));
f+=mix(vec3(dot(ring,vec3(0.333))),ring,iridescence)*ghostStrength*0.34;
}
f+=sunColor*exp(-abs(delta.x)*8.0-delta.y*delta.y/0.000008)*streakStrength*0.2*sky;
return f*flareStrength*visible;}`;

// src/rendering/sun-visibility.js
function sunScreenVisibility(clipW, uv) {
  if (clipW <= 0 || uv.x < -0.03 || uv.x > 1.03 || uv.y < -0.03 || uv.y > 1.03)
    return 0;
  const edge = Math.min(uv.x, 1 - uv.x, uv.y, 1 - uv.y), t = Math.max(0, Math.min(1, (edge + 0.03) / 0.1));
  return t * t * (3 - 2 * t);
}
var SunVisibility = class {
  constructor(renderer) {
    this.gl = renderer.getContext();
    this.result = new Uint8Array(4);
    this.clear = 1;
    this.partial = 1;
    this.transmission = 1;
    this.frame = 0;
  }
  poll() {
    const g = this.gl;
    if (!this.fence) return;
    const status = g.clientWaitSync(this.fence, 0, 0);
    if (status !== g.ALREADY_SIGNALED && status !== g.CONDITION_SATISFIED)
      return;
    const previous = g.getParameter?.(g.PIXEL_PACK_BUFFER_BINDING) ?? null;
    g.bindBuffer(g.PIXEL_PACK_BUFFER, this.buffer);
    try {
      g.getBufferSubData(g.PIXEL_PACK_BUFFER, 0, this.result);
    } finally {
      g.bindBuffer(g.PIXEL_PACK_BUFFER, previous);
      g.deleteSync(this.fence);
      this.fence = null;
    }
    this.clear = this.result[0] / 255;
    this.partial = this.result[1] / 255;
    this.transmission = this.result[2] / 255;
  }
  capture(sunUv) {
    const g = this.gl;
    if (this.lastX === void 0 || Math.abs(sunUv.x - this.lastX) + Math.abs(sunUv.y - this.lastY) > 0.015) {
      this.clear = 1;
      this.partial = 1;
      this.transmission = 1;
    }
    this.lastX = sunUv.x;
    this.lastY = sunUv.y;
    this.poll();
    if (!g.fenceSync || this.fence || this.frame++ % 6 !== 0) return;
    const previous = g.getParameter?.(g.PIXEL_PACK_BUFFER_BINDING) ?? null;
    if (!this.buffer) {
      this.buffer = g.createBuffer();
      g.bindBuffer(g.PIXEL_PACK_BUFFER, this.buffer);
      g.bufferData(g.PIXEL_PACK_BUFFER, 4, g.STREAM_READ);
    } else g.bindBuffer(g.PIXEL_PACK_BUFFER, this.buffer);
    try {
      g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, 0);
      this.fence = g.fenceSync(g.SYNC_GPU_COMMANDS_COMPLETE, 0);
    } finally {
      g.bindBuffer(g.PIXEL_PACK_BUFFER, previous);
    }
  }
  dispose() {
    if (this.fence) this.gl.deleteSync(this.fence);
    if (this.buffer) this.gl.deleteBuffer(this.buffer);
    this.fence = null;
    this.buffer = null;
    this.lastX = void 0;
    this.lastY = void 0;
    this.clear = 1;
    this.partial = 1;
    this.transmission = 1;
  }
};

// src/shaders/atmosphere.js
var DEPTH_HELPERS = `
uniform sampler2D tDepth;uniform mat4 inverseProjection;uniform vec2 nearFar;
vec3 viewPosition(vec2 uv){float d=texture2D(tDepth,uv).x;vec4 p=inverseProjection*vec4(uv*2.0-1.0,d*2.0-1.0,1.0);return p.xyz/max(abs(p.w),1e-6)*sign(p.w);}
float viewDistance(vec2 uv){float z=texture2D(tDepth,uv).x*2.0-1.0;return -(inverseProjection[2][2]*z+inverseProjection[3][2])/(inverseProjection[2][3]*z+inverseProjection[3][3]);}
`;
var ATMOSPHERE_HELPERS = `
uniform mat4 cameraWorld;uniform vec3 horizon,sunDirection,sunColor;
uniform float atmosphereStrength,atmosphereStart,atmosphereSunWarmth;
vec3 aerial(vec3 c,vec2 uv){
 float rawDepth=texture2D(tDepth,uv).r;if(rawDepth>=0.999999)return c;
 vec3 p=viewPosition(uv);float distance=length(p);
 vec3 dir=normalize((cameraWorld*vec4(normalize(p),0.0)).xyz);
 float haze=1.0-exp(-max(distance-atmosphereStart,0.0)*atmosphereStrength*0.0015);
 haze*=0.5+0.5*pow(1.0-abs(dir.y),2.0);
 vec3 tint=mix(horizon,sunColor,max(dot(dir,sunDirection),0.0)*atmosphereSunWarmth);
 return mix(c,tint,clamp(haze,0.0,0.5));
}`;

// src/shaders/volumetric.js
var VOLUMETRIC_FRAGMENT = `varying vec2 vUv;${DEPTH_HELPERS}
uniform sampler2D tSunVisibility;uniform mat4 cameraProjection;
uniform vec3 sunViewDirection,sunColor;
uniform float volumeDensity,volumeDecay,volumeMaxDistance;uniform int volumeSamples;
float sunlit(vec3 p,float distance){
 vec3 q=p+sunViewDirection*distance;if(q.z>=-0.01)return 0.0;
 vec4 clip=cameraProjection*vec4(q,1.0);vec2 uv=clip.xy/max(clip.w,0.001)*0.5+0.5;
 if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))return 0.0;
 float edge=min(min(uv.x,uv.y),min(1.0-uv.x,1.0-uv.y));
 return smoothstep(-0.75,0.75,viewDistance(uv)+0.08+q.z)*smoothstep(0.0,0.03,edge);
}
void main(){
 vec3 surface=viewPosition(vUv);float end=min(length(surface),volumeMaxDistance);
 vec3 ray=normalize(surface);vec3 vis=texture2D(tSunVisibility,vec2(0.5)).rgb;
 float cloudPartial=4.0*vis.b*(1.0-vis.b);
 float gate=(vis.g*0.82+vis.r*(0.14+cloudPartial*0.25))*mix(vis.b,1.0,cloudPartial*0.25);
 float total=0.0,stepLength=end/float(volumeSamples);
 if(gate>0.001){for(int i=0;i<16;i++){if(i>=volumeSamples)break;
 float distance=(float(i)+0.5)*stepLength;vec3 p=ray*distance;
 float light=min(sunlit(p,min(volumeMaxDistance*0.15,12.0)),sunlit(p,min(volumeMaxDistance*1.5,160.0)));
 total+=light*volumeDensity*stepLength*exp(-volumeDensity*distance)*pow(volumeDecay,float(i));}}
 float phase=0.1+0.9*pow(max(dot(ray,sunViewDirection),0.0),2.0);
 gl_FragColor=vec4(sunColor*total*phase*gate,end/volumeMaxDistance);
}`;
var VOLUME_COMPOSITE = `
uniform sampler2D tVolume;uniform vec2 volumeTexel;
uniform float volumeStrength,volumeMaxDistance;
vec3 volumeComposite(vec2 uv){
 if(volumeStrength<=0.0)return vec3(0.0);
 float depth=min(length(viewPosition(uv)),volumeMaxDistance)/volumeMaxDistance;
 vec3 sum=vec3(0.0);float weights=0.0;
 for(int i=0;i<5;i++){
 vec2 offset=vec2(0.0);
 if(i==1)offset=vec2(volumeTexel.x*0.65,0.0);
 if(i==2)offset=vec2(-volumeTexel.x*0.65,0.0);
 if(i==3)offset=vec2(0.0,volumeTexel.y*0.65);
 if(i==4)offset=vec2(0.0,-volumeTexel.y*0.65);
 vec4 sampleValue=texture2D(tVolume,uv+offset);
 float spatial=i==0?4.0:1.0;
 float w=spatial*exp(-abs(sampleValue.a-depth)*volumeMaxDistance*0.7);
 sum+=sampleValue.rgb*w;weights+=w;}
 return sum/max(weights,0.0001)*volumeStrength;
}`;

// src/shaders/fullscreen.js
var FULLSCREEN_VERTEX = `varying vec2 vUv;
void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;

// src/shaders/ssao.js
var SSAO_FRAGMENT = `varying vec2 vUv;${DEPTH_HELPERS}
uniform float radius,strength,bias;uniform int samples;uniform float projectionScale;
void main(){
 if(texture2D(tDepth,vUv).r>=0.999999){gl_FragColor=vec4(1.0);return;}
 vec3 p=viewPosition(vUv);vec3 normal=normalize(cross(dFdx(p),dFdy(p)));
 if(dot(normal,-p)<0.0)normal=-normal;
 float occ=0.0;float screenRadius=clamp(radius*projectionScale/max(-p.z,0.1),0.0001,0.12);
 for(int i=0;i<16;i++){if(i>=samples)break;float f=(float(i)+0.5)/float(samples);
 float angle=float(i)*2.3999632;vec2 offset=vec2(cos(angle),sin(angle))*screenRadius*sqrt(f);
 vec2 uv=vUv+offset;if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))continue;
 vec3 q=viewPosition(uv);vec3 delta=q-p;float len=length(delta);
 float contribution=max(dot(normal,delta)/max(len,0.001)-bias,0.0);
 occ+=contribution*(1.0-smoothstep(radius*0.4,radius,len));}
 float ao=clamp(1.0-occ/float(samples)*strength*3.0,0.55,1.0);gl_FragColor=vec4(vec3(ao),1.0);
}`;
var AO_BLUR_FRAGMENT = `varying vec2 vUv;${DEPTH_HELPERS}
uniform sampler2D tInput;uniform vec2 stepUv;
void main(){float center=viewDistance(vUv);float sum=0.0,weightSum=0.0;
 for(int i=-2;i<=2;i++){vec2 uv=vUv+stepUv*float(i);float d=viewDistance(uv);
 float w=exp(-abs(d-center)/max(0.05,center*0.002))*exp(-float(i*i)*0.4);
 sum+=texture2D(tInput,uv).r*w;weightSum+=w;}
 gl_FragColor=vec4(vec3(sum/max(weightSum,0.001)),1.0);}`;

// src/shaders/bloom.js
var BLOOM_FRAGMENT = `varying vec2 vUv;uniform sampler2D tInput;uniform float threshold;
void main(){vec3 c=texture2D(tInput,vUv).rgb;float bright=max(c.r,max(c.g,c.b));
 float soft=smoothstep(threshold*0.8,threshold*1.2,bright);
 gl_FragColor=vec4(c*max(bright-threshold,0.0)/max(bright,0.001)*soft,1.0);}`;
var BLOOM_BLUR_FRAGMENT = `varying vec2 vUv;uniform sampler2D tInput;uniform vec2 stepUv;
void main(){vec3 c=texture2D(tInput,vUv+stepUv*vec2(-1,-1)).rgb+texture2D(tInput,vUv+stepUv*vec2(1,-1)).rgb+texture2D(tInput,vUv+stepUv*vec2(-1,1)).rgb+texture2D(tInput,vUv+stepUv*vec2(1,1)).rgb;gl_FragColor=vec4(c*0.25,1.0);}`;

// src/shaders/grade.js
var GRADE_FRAGMENT = `varying vec2 vUv;${DEPTH_HELPERS}${ATMOSPHERE_HELPERS}${FLARE_HELPERS}${VOLUME_COMPOSITE}
uniform sampler2D tInput,tAO,tBloom,tRays;
uniform vec2 rayTexel;
uniform float aoActive,bloomStrength,rayStrength,atmosphereActive,gradeActive,exposure,contrast,saturation,vibrance,temperature,tint,shadowLift,highlightCompression,blackLevel,whiteLevel,vignetteStrength,vignetteSoftness;
vec3 softenedRays(vec2 uv){vec2 t=rayTexel*1.1;return (texture2D(tRays,uv).rgb*4.0+(texture2D(tRays,uv+vec2(t.x,0.0)).rgb+texture2D(tRays,uv-vec2(t.x,0.0)).rgb+texture2D(tRays,uv+vec2(0.0,t.y)).rgb+texture2D(tRays,uv-vec2(0.0,t.y)).rgb)+(texture2D(tRays,uv+t).rgb+texture2D(tRays,uv-t).rgb+texture2D(tRays,uv+vec2(t.x,-t.y)).rgb+texture2D(tRays,uv+vec2(-t.x,t.y)).rgb)*0.5)/10.0;}
uniform int debugView;
vec3 shoulder(vec3 c){return clamp((c*(2.51*c+0.03))/(c*(2.43*c+0.59)+0.14),0.0,1.0);}
void main(){
 vec3 c=texture2D(tInput,vUv).rgb;
 if(aoActive>0.5)c*=texture2D(tAO,vUv).r;
 if(atmosphereActive>0.5)c=aerial(c,vUv);
 if(bloomStrength>0.0)c+=texture2D(tBloom,vUv).rgb*bloomStrength;
 if(rayStrength>0.0)c+=softenedRays(vUv)*rayStrength;
 c+=lensFlare(vUv);
 c+=volumeComposite(vUv);
 if(gradeActive>0.5){
 c*=vec3(1.0+temperature,1.0+tint,1.0-temperature);
 float l=dot(c,vec3(0.2126,0.7152,0.0722));
 float sat=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b));
 c=mix(vec3(l),c,saturation+vibrance*(1.0-clamp(sat/max(l,0.01),0.0,1.0)));
 c+=shadowLift*pow(1.0-clamp(l,0.0,1.0),3.0);
 c=max(c-blackLevel,0.0)/whiteLevel;
 // A luminance pivot preserves hue and avoids channel-dependent contrast shifts.
 float pivotL=max(dot(c,vec3(0.2126,0.7152,0.0722)),0.001);
 c*=pow(pivotL/0.18,contrast-1.0);
 c/=1.0+highlightCompression*max(c-1.0,0.0);}
 c=shoulder(max(c,0.0)*exposure);
 if(gradeActive>0.5){float corners=length(vUv-0.5)*1.4142;c*=1.0-vignetteStrength*smoothstep(vignetteSoftness,1.0,corners);}
 if(debugView==1)c=vec3(clamp(viewDistance(vUv)/100.0,0.0,1.0));
 if(debugView==2)c=aoActive>0.5?texture2D(tAO,vUv).rgb:vec3(1.0);
 if(debugView==3)c=shoulder(texture2D(tBloom,vUv).rgb);
 if(debugView==4){float d=length((vUv-sunUv)*vec2(aspect,1.0));c=vec3(0.04,0.06,0.09);c=mix(c,vec3(0.1,0.5,1.0),1.0-smoothstep(0.04,0.18,d));c=mix(c,vec3(1.0,0.85,0.15),1.0-smoothstep(0.003,0.007,d));}
 if(debugView==5)c=texture2D(tSunVisibility,vec2(0.5)).rgb;
 if(debugView==6)c=softenedRays(vUv)*4.0;
 if(debugView==7)c=texture2D(tVolume,vUv).rgb*4.0;
 gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);
}`;

// src/shaders/finish.js
var FINISH_FRAGMENT = `varying vec2 vUv;uniform sampler2D tInput;uniform vec2 texel;uniform float fxaa,sharpen;
float polyShadeLuma(vec3 c){return dot(c,vec3(0.2126,0.7152,0.0722));}
void main(){vec3 c=texture2D(tInput,vUv).rgb;
 if(fxaa>0.5||sharpen>0.0){
 vec3 n=texture2D(tInput,vUv+vec2(0,texel.y)).rgb,s=texture2D(tInput,vUv-vec2(0,texel.y)).rgb;
 vec3 e=texture2D(tInput,vUv+vec2(texel.x,0)).rgb,w=texture2D(tInput,vUv-vec2(texel.x,0)).rgb;
 vec3 lo=min(c,min(min(n,s),min(e,w))),hi=max(c,max(max(n,s),max(e,w)));
 if(fxaa>0.5){float edge=polyShadeLuma(hi)-polyShadeLuma(lo);
 if(edge>max(0.03,polyShadeLuma(hi)*0.12)){
 vec2 gradient=vec2(polyShadeLuma(n)-polyShadeLuma(s),polyShadeLuma(w)-polyShadeLuma(e));
 vec2 direction=gradient/max(length(gradient),0.001)*texel;
 c=mix(c,(texture2D(tInput,vUv+direction*0.5).rgb+texture2D(tInput,vUv-direction*0.5).rgb)*0.5,0.55);}}
 c=clamp(c+sharpen*(4.0*c-n-s-e-w),lo,hi);}
 gl_FragColor=vec4(c,1.0);
 #include <colorspace_fragment>
}`;

// src/rendering/render-targets.js
var RenderState = class {
  constructor(t) {
    this.viewport = new t.Vector4();
    this.scissor = new t.Vector4();
    this.clearColor = new t.Color();
  }
  capture(r) {
    this.target = r.getRenderTarget();
    this.face = r.getActiveCubeFace();
    this.mip = r.getActiveMipmapLevel();
    r.getViewport(this.viewport);
    r.getScissor(this.scissor);
    this.scissorTest = r.getScissorTest();
    r.getClearColor(this.clearColor);
    this.clearAlpha = r.getClearAlpha();
    this.autoClear = r.autoClear;
    this.toneMapping = r.toneMapping;
    this.exposure = r.toneMappingExposure;
    this.output = r.outputColorSpace;
    this.xr = r.xr.enabled;
  }
  restore(r) {
    r.setRenderTarget(this.target, this.face, this.mip);
    r.setViewport(this.viewport);
    r.setScissor(this.scissor);
    r.setScissorTest(this.scissorTest);
    r.setClearColor(this.clearColor, this.clearAlpha);
    r.autoClear = this.autoClear;
    r.toneMapping = this.toneMapping;
    r.toneMappingExposure = this.exposure;
    r.outputColorSpace = this.output;
    r.xr.enabled = this.xr;
  }
};
var TargetPool = class {
  constructor(three, capabilities) {
    this.three = three;
    this.capabilities = capabilities;
    this.targets = /* @__PURE__ */ new Map();
    this.allocations = 0;
    this.disposals = 0;
    this.resizes = 0;
  }
  get(name, w, h, { depth = false, samples = 0 } = {}) {
    const t = this.three, limit = Math.min(
      this.capabilities.maxTextureSize,
      this.capabilities.maxRenderbufferSize
    );
    const factor = Math.min(1, limit / w, limit / h);
    w = Math.max(1, Math.floor(w * factor));
    h = Math.max(1, Math.floor(h * factor));
    let target = this.targets.get(name);
    samples = Math.min(samples, this.capabilities.maxSamples ?? 0);
    if (target && (target.samples !== samples || target.depthBuffer !== depth)) {
      this.remove(name);
      target = null;
    }
    if (!target) {
      target = new t.WebGLRenderTarget(w, h, {
        type: name === "grade" || name.startsWith("ao") || name === "sun-visibility" ? t.UnsignedByteType : this.capabilities.halfFloat ? t.HalfFloatType : t.UnsignedByteType,
        format: t.RGBAFormat,
        minFilter: t.LinearFilter,
        magFilter: t.LinearFilter,
        depthBuffer: depth
      });
      target.texture.name = `PolyShade ${name}`;
      target.texture.colorSpace = t.LinearSRGBColorSpace;
      if (name === "sun-visibility") target.texture.colorSpace = t.NoColorSpace;
      target.samples = samples;
      if (depth && this.capabilities.features.depthTexture) {
        target.depthTexture = new t.DepthTexture(w, h, t.UnsignedIntType);
      }
      this.targets.set(name, target);
      this.allocations++;
    } else if (target.width !== w || target.height !== h) {
      target.setSize(w, h);
      this.resizes++;
    }
    return target;
  }
  remove(name) {
    const target = this.targets.get(name);
    if (target) {
      target.dispose();
      target.depthTexture?.dispose();
      this.targets.delete(name);
      this.disposals++;
    }
  }
  retain(names) {
    for (const name of this.targets.keys())
      if (!names.has(name)) this.remove(name);
  }
  dispose() {
    for (const name of this.targets.keys()) this.remove(name);
  }
  report() {
    return [...this.targets].map(([name, t]) => {
      const bytesPerPixel = t.texture.type === this.three.HalfFloatType ? 8 : 4;
      const pixels = t.width * t.height;
      return {
        name,
        width: t.width,
        height: t.height,
        pixels,
        samples: t.samples,
        estimatedBytes: pixels * (bytesPerPixel + (t.depthTexture ? 4 : 0) + (t.samples ? (bytesPerPixel + (t.depthBuffer ? 4 : 0)) * t.samples : 0))
      };
    });
  }
};

// src/rendering/postprocess.js
var DEBUG_VIEWS = [
  "final",
  "depth",
  "ao",
  "bloom",
  "sun-position",
  "sun-visibility",
  "sun-rays",
  "volumetric"
];
var GRADE_OUTPUT_FRAGMENT = GRADE_FRAGMENT.replace(
  "gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);",
  "gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);\n#include <colorspace_fragment>"
);
var PostProcess = class {
  constructor(three, renderer, capabilities, guard) {
    this.three = three;
    this.renderer = renderer;
    this.capabilities = capabilities;
    this.guard = guard;
    this.pool = new TargetPool(three, capabilities);
    this.state = new RenderState(three);
    this.scene = new three.Scene();
    this.camera = new three.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.geometry = new three.BufferGeometry();
    this.geometry.setAttribute("position", new three.BufferAttribute(
      new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
      3
    ));
    this.geometry.setAttribute("uv", new three.BufferAttribute(
      new Float32Array([0, 0, 2, 0, 0, 2]),
      2
    ));
    this.quad = new three.Mesh(this.geometry);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    this.materials = /* @__PURE__ */ new Map();
    this.passOrder = [];
    this.disabled = false;
    this.frames = 0;
    this.active = {};
    this.sunVisibility = new SunVisibility(renderer);
  }
  material(name, fragment) {
    if (!this.materials.has(name))
      this.materials.set(
        name,
        new this.three.ShaderMaterial({
          name: `PolyShade_${name}`,
          vertexShader: FULLSCREEN_VERTEX,
          fragmentShader: `// PolyShade ${name}
${fragment}`,
          uniforms: {},
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
          blending: this.three.NoBlending
        })
      );
    return this.materials.get(name);
  }
  uniform(material, key, value) {
    const entry = material.uniforms[key];
    if (entry) entry.value = value;
    else material.uniforms[key] = { value };
  }
  warmupMaterials(s) {
    const passes = [];
    const add = (name, fragment, linear = true) => passes.push({ material: this.material(name, fragment), linear });
    if (s.aoEnabled && s.aoStrength > 0) {
      add("ao", SSAO_FRAGMENT);
      add("ao-blur", AO_BLUR_FRAGMENT);
    }
    if (s.bloomEnabled && s.bloomStrength > 0) {
      add("bloom", BLOOM_FRAGMENT);
      add("bloom-blur", BLOOM_BLUR_FRAGMENT);
    }
    if (s.sunRaysEnabled || s.lensFlareEnabled || s.volumetricEnabled)
      add("sun-visibility", SUN_VISIBILITY_FRAGMENT);
    if (s.sunRaysEnabled) {
      add("sun-mask", SUN_MASK_FRAGMENT);
      add("sun-rays", SUN_RAYS_FRAGMENT);
    }
    if (s.volumetricEnabled) add("volumetric", VOLUMETRIC_FRAGMENT);
    if (s.fxaaEnabled || s.sharpenEnabled && s.sharpenStrength > 0) {
      add("grade", GRADE_FRAGMENT);
      add("finish", FINISH_FRAGMENT, false);
    } else add("grade-output", GRADE_OUTPUT_FRAGMENT, false);
    return passes;
  }
  prepareTarget(retain, name, width, height) {
    retain.add(name);
    const existing = this.pool.targets.get(name);
    const changed = !existing || existing.width !== width || existing.height !== height;
    const target = this.pool.get(name, width, height);
    if (changed) this.renderer.initRenderTarget?.(target);
  }
  pass(name, fragment, target, values, draw, profileName = name) {
    if (this.guard.failures.has(name)) return false;
    const m = this.material(name, fragment);
    for (const key in values) this.uniform(m, key, values[key]);
    this.quad.material = m;
    this.guard.pass = name;
    this.renderer.setRenderTarget(target);
    this.renderer.setScissorTest(false);
    if (this.profiler)
      this.profiler.measure(profileName, () => draw(this.scene, this.camera));
    else draw(this.scene, this.camera);
    this.passOrder.push(name);
    return !this.guard.failures.has(name);
  }
  render(scene, camera, s, draw, palette) {
    const r = this.renderer;
    this.passOrder.length = 0;
    if (this.disabled || !s.postEnabled || s.postQuality === "off") {
      this.pool.dispose();
      this.sunVisibility.dispose();
      this.active = { post: false };
      return draw(scene, camera);
    }
    if (r.getRenderTarget() !== null || r.xr.isPresenting)
      return draw(scene, camera);
    this.state.capture(r);
    this.passOrder.length = 0;
    try {
      const gl = r.getContext();
      let w = Math.round(gl.drawingBufferWidth * s.renderScale), h = Math.round(gl.drawingBufferHeight * s.renderScale);
      const sceneTarget = this.pool.get("scene", w, h, {
        depth: true,
        samples: this.capabilities.antialias ? Math.min(
          s.sceneSamples === "auto" || s.sceneSamples === void 0 ? 0 : Number(s.sceneSamples),
          this.capabilities.maxSamples
        ) : 0
      });
      w = sceneTarget.width;
      h = sceneTarget.height;
      const finishNeeded = s.fxaaEnabled || s.sharpenEnabled && s.sharpenStrength > 0;
      const gradeTarget = finishNeeded ? this.pool.get(
        "grade",
        gl.drawingBufferWidth,
        gl.drawingBufferHeight
      ) : this.state.target, retain = new Set(finishNeeded ? ["scene", "grade"] : ["scene"]);
      r.xr.enabled = false;
      r.autoClear = true;
      r.toneMapping = this.three.NoToneMapping;
      r.outputColorSpace = this.three.LinearSRGBColorSpace;
      r.setRenderTarget(sceneTarget);
      r.setScissorTest(false);
      this.guard.pass = "scene";
      if (this.profiler) this.profiler.scene(() => draw(scene, camera));
      else draw(scene, camera);
      r.autoClear = false;
      if (this.profiler && sceneTarget.samples)
        this.profiler.measure(
          "scene-msaa-resolve",
          () => r.setRenderTarget(null)
        );
      this.passOrder.push("scene");
      const depth = sceneTarget.depthTexture;
      const depthValues = {
        tDepth: depth,
        inverseProjection: camera.projectionMatrixInverse,
        nearFar: { x: camera.near, y: camera.far }
      };
      let ao = sceneTarget.texture, aoActive = false, bloom = sceneTarget.texture, bloomActive = false;
      if (s.aoEnabled && s.aoStrength > 0 && depth && this.capabilities.features.ssao) {
        const scale = s.aoQuality === "high" ? 0.5 : 0.4, baseWidth = w / s.renderScale, baseHeight = h / s.renderScale;
        const ratio = Math.min(scale, 960 / baseWidth);
        const aw = Math.round(baseWidth * ratio), ah = Math.round(baseHeight * ratio);
        const a = this.pool.get("ao", aw, ah), b = this.pool.get("ao-blur", aw, ah);
        retain.add("ao");
        retain.add("ao-blur");
        aoActive = this.pass(
          "ao",
          SSAO_FRAGMENT,
          a,
          {
            ...depthValues,
            radius: s.aoRadius,
            strength: s.aoStrength,
            bias: s.aoBias,
            samples: { low: 8, medium: 12, high: 16 }[s.aoQuality],
            projectionScale: camera.projectionMatrix.elements[5] * 0.5
          },
          draw
        );
        if (aoActive) {
          const step = this.aoStep ??= new this.three.Vector2();
          step.set(1 / aw, 0);
          aoActive = this.pass(
            "ao-blur",
            AO_BLUR_FRAGMENT,
            b,
            { ...depthValues, tInput: a.texture, stepUv: step },
            draw,
            "ao-blur-horizontal"
          );
          step.set(0, 1 / ah);
          aoActive = this.pass(
            "ao-blur",
            AO_BLUR_FRAGMENT,
            a,
            { ...depthValues, tInput: b.texture, stepUv: step },
            draw,
            "ao-blur-vertical"
          ) && aoActive;
          ao = a.texture;
        }
      }
      if (s.bloomEnabled && s.bloomStrength > 0 && this.capabilities.features.bloom) {
        const scale = Math.min(0.25, 768 / gl.drawingBufferWidth), bw = Math.round(gl.drawingBufferWidth * scale), bh = Math.round(gl.drawingBufferHeight * scale);
        const a = this.pool.get("bloom", bw, bh), b = this.pool.get("bloom-blur", bw, bh);
        retain.add("bloom");
        retain.add("bloom-blur");
        bloomActive = this.pass(
          "bloom",
          BLOOM_FRAGMENT,
          a,
          { tInput: sceneTarget.texture, threshold: s.bloomThreshold },
          draw
        );
        if (bloomActive) {
          const step = this.bloomStep ??= new this.three.Vector2();
          step.set(s.bloomRadius / bw, s.bloomRadius / bh);
          bloomActive = this.pass(
            "bloom-blur",
            BLOOM_BLUR_FRAGMENT,
            b,
            { tInput: a.texture, stepUv: step },
            draw,
            "bloom-blur-1"
          );
          step.multiplyScalar(s.postQuality === "high" ? 2 : 1.5);
          bloomActive = this.pass(
            "bloom-blur",
            BLOOM_BLUR_FRAGMENT,
            a,
            { tInput: b.texture, stepUv: step },
            draw,
            "bloom-blur-2"
          ) && bloomActive;
          bloom = a.texture;
        }
      }
      let rays = sceneTarget.texture, raysActive = false, opticsActive = false, visibility = 0;
      const rayTexel = this.rayTexel ??= new this.three.Vector2(1, 1);
      const debugSun = s.debugView === "sun-position" || s.debugView === "sun-visibility" || s.debugView === "sun-rays" || s.debugView === "volumetric";
      const debugRays = s.debugView === "sun-rays";
      const debugVolume = s.debugView === "volumetric";
      const raysRequested = (s.sunRaysEnabled && s.sunRayStrength > 0 && s.sunRayExposure > 0 || debugRays) && !this.guard.failures.has("sun-rays") && !this.guard.failures.has("sun-mask");
      const volumeRequested = (s.volumetricEnabled && s.volumetricStrength > 0 && s.volumetricDensity > 0 || debugVolume) && !this.guard.failures.has("volumetric");
      const sunUv = this.sunUv ??= new this.three.Vector2();
      const sunRequested = raysRequested || s.lensFlareEnabled && s.lensFlareStrength > 0 || volumeRequested || debugSun;
      if (raysRequested) {
        const scale = Math.min(0.5, 1024 / gl.drawingBufferWidth);
        this.prepareTarget(retain, "sun-rays", Math.round(gl.drawingBufferWidth * scale), Math.round(gl.drawingBufferHeight * scale));
        const maskSize = Math.min(512, Math.max(
          128,
          2 ** Math.ceil(Math.log2(gl.drawingBufferHeight * 0.24))
        ));
        this.prepareTarget(retain, "sun-mask", maskSize, maskSize);
      }
      if (volumeRequested) {
        const scale = Math.min(0.5, 1024 / w);
        this.prepareTarget(retain, "volumetric", Math.round(w * scale), Math.round(h * scale));
      }
      if (sunRequested) this.prepareTarget(retain, "sun-visibility", 1, 1);
      let visibilityTexture = sceneTarget.texture;
      if (sunRequested && depth) {
        const direction = this.sunView ??= new this.three.Vector3();
        direction.copy(palette.direction).transformDirection(camera.matrixWorldInverse);
        const clip = this.sunClip ??= new this.three.Vector4();
        clip.set(direction.x, direction.y, direction.z, 0).applyMatrix4(camera.projectionMatrix);
        sunUv.set(
          clip.x / Math.max(clip.w, 1e-3) * 0.5 + 0.5,
          clip.y / Math.max(clip.w, 1e-3) * 0.5 + 0.5
        );
        visibility = sunScreenVisibility(clip.w, sunUv);
        if (visibility > 0 || debugSun) {
          const probe = this.pool.get("sun-visibility", 1, 1);
          retain.add("sun-visibility");
          this.pass(
            "sun-visibility",
            SUN_VISIBILITY_FRAGMENT,
            probe,
            {
              tDepth: depth,
              sunUv,
              aspect: w / h,
              sunDirection: palette.direction,
              cloudAmount: s.skyEnabled && s.cloudsEnabled ? s.cloudAmount : 0,
              cloudTime: performance.now() / 1e3
            },
            draw
          );
          visibilityTexture = probe.texture;
          if (this.profiler)
            this.profiler.measure(
              "sun-visibility-transfer",
              () => this.sunVisibility.capture(sunUv),
              false
            );
          else this.sunVisibility.capture(sunUv);
          opticsActive = s.lensFlareEnabled && s.lensFlareStrength > 0 && this.sunVisibility.clear > 0.01;
          if (raysRequested && (debugRays || this.sunVisibility.partial > 0.01)) {
            const scale = Math.min(0.5, 1024 / gl.drawingBufferWidth), target = this.pool.get(
              "sun-rays",
              Math.round(gl.drawingBufferWidth * scale),
              Math.round(gl.drawingBufferHeight * scale)
            );
            const maskSize = Math.min(512, Math.max(
              128,
              2 ** Math.ceil(Math.log2(gl.drawingBufferHeight * 0.24))
            ));
            const mask = this.pool.get("sun-mask", maskSize, maskSize);
            const extent = this.sunMaskExtent ??= new this.three.Vector2();
            extent.set(0.24 / (w / h), 0.24);
            const maskScale = this.sunMaskScale ??= new this.three.Vector2();
            maskScale.set(1 / extent.x, 1 / extent.y);
            const depthTexel = this.depthTexel ??= new this.three.Vector2();
            depthTexel.set(1 / w, 1 / h);
            const maskActive = this.pass("sun-mask", SUN_MASK_FRAGMENT, mask, {
              tDepth: depth,
              sunUv,
              sunMaskExtent: extent,
              depthTexel,
              aspect: w / h
            }, draw);
            rayTexel.set(1 / target.width, 1 / target.height);
            retain.add("sun-rays");
            raysActive = maskActive && this.pass(
              "sun-rays",
              SUN_RAYS_FRAGMENT,
              target,
              {
                tSunMask: mask.texture,
                sunMaskScale: maskScale,
                tSunVisibility: visibilityTexture,
                sunUv,
                sunColor: palette.sun,
                decay: s.sunRayDecay,
                density: s.sunRayDensity,
                exposure: s.sunRayExposure,
                aspect: w / h,
                visibility
              },
              draw
            );
            rays = target.texture;
          }
        }
      }
      let volume = sceneTarget.texture, volumeActive = false;
      const volumeTexel = this.volumeTexel ??= new this.three.Vector2();
      if (volumeRequested && depth && (visibility > 0 || debugVolume) && (this.sunVisibility.partial > 0.01 || debugVolume)) {
        const scale = Math.min(0.5, 1024 / w), vw = Math.round(w * scale), vh = Math.round(h * scale);
        const target = this.pool.get("volumetric", vw, vh);
        volumeTexel.set(1 / vw, 1 / vh);
        volumeActive = this.pass(
          "volumetric",
          VOLUMETRIC_FRAGMENT,
          target,
          {
            ...depthValues,
            tSunVisibility: visibilityTexture,
            cameraProjection: camera.projectionMatrix,
            sunViewDirection: this.sunView,
            sunColor: palette.sun,
            volumeDensity: s.volumetricDensity,
            volumeDecay: s.volumetricDecay,
            volumeSamples: Math.min(
              16,
              Math.max(4, Math.round(s.volumetricSamples))
            ),
            volumeMaxDistance: s.volumetricMaxDistance
          },
          draw
        );
        if (volumeActive) {
          retain.add("volumetric");
          volume = target.texture;
        }
      }
      if (!aoActive) {
        retain.delete("ao");
        retain.delete("ao-blur");
      }
      if (!bloomActive) {
        retain.delete("bloom");
        retain.delete("bloom-blur");
      }
      const values = {
        ...depthValues,
        tInput: sceneTarget.texture,
        tAO: ao,
        tBloom: bloom,
        tRays: rays,
        rayTexel,
        tVolume: volume,
        volumeTexel,
        volumeMaxDistance: s.volumetricMaxDistance,
        volumeStrength: volumeActive && s.volumetricEnabled ? s.volumetricStrength : 0,
        tSunVisibility: visibilityTexture,
        sunUv,
        aspect: w / h,
        sunVisibility: visibility,
        flareStrength: opticsActive ? s.lensFlareStrength : 0,
        ghostStrength: s.flareGhostStrength,
        iridescence: s.flareIridescence,
        streakStrength: s.flareStreakStrength,
        rayStrength: raysActive ? s.sunRayStrength * (volumeActive ? 0.2 : 1) : 0,
        aoActive: aoActive ? 1 : 0,
        bloomStrength: bloomActive ? s.bloomStrength : 0,
        cameraWorld: camera.matrixWorld,
        horizon: palette.horizon,
        sunDirection: palette.direction,
        sunColor: palette.sun,
        atmosphereActive: s.atmosphereEnabled && s.atmosphereStrength > 0 && depth ? 1 : 0,
        gradeActive: s.gradeEnabled ? 1 : 0,
        debugView: DEBUG_VIEWS.indexOf(s.debugView)
      };
      for (const key of [
        "exposure",
        "contrast",
        "saturation",
        "vibrance",
        "temperature",
        "tint",
        "shadowLift",
        "highlightCompression",
        "blackLevel",
        "whiteLevel",
        "vignetteStrength",
        "vignetteSoftness",
        "atmosphereStrength",
        "atmosphereStart",
        "atmosphereSunWarmth"
      ])
        values[key] = s[key];
      values.exposure *= this.state.exposure / s.exposure;
      if (volumeActive) values.atmosphereStrength *= 0.8;
      if (!finishNeeded) r.outputColorSpace = this.state.output;
      const gradeFragment = finishNeeded ? GRADE_FRAGMENT : GRADE_OUTPUT_FRAGMENT;
      if (!this.pass(
        finishNeeded ? "grade" : "grade-output",
        gradeFragment,
        gradeTarget,
        values,
        draw
      ))
        throw new Error("Colour grade failed");
      r.outputColorSpace = this.state.output;
      const texel = this.texel ??= new this.three.Vector2();
      texel.set(1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight);
      if (finishNeeded && !this.pass(
        "finish",
        FINISH_FRAGMENT,
        this.state.target,
        {
          tInput: gradeTarget.texture,
          texel,
          fxaa: s.fxaaEnabled ? 1 : 0,
          sharpen: s.sharpenEnabled ? s.sharpenStrength : 0
        },
        draw
      ))
        throw new Error("Final colour output failed");
      this.pool.retain(retain);
      if (!retain.has("sun-visibility")) this.sunVisibility.dispose();
      this.frames++;
      this.active = {
        post: true,
        depth: !!depth,
        ao: aoActive,
        bloom: bloomActive,
        sunRays: raysActive,
        volumetric: volumeActive,
        lensFlare: opticsActive,
        sunUv: [sunUv.x, sunUv.y],
        sunScreenVisibility: visibility,
        sunClear: this.sunVisibility.clear,
        sunPartial: this.sunVisibility.partial,
        cloudTransmission: this.sunVisibility.transmission,
        samples: sceneTarget.samples,
        fxaa: s.fxaaEnabled,
        sceneSize: [w, h],
        targets: this.pool.targets.size
      };
    } catch (error) {
      this.disabled = true;
      console.error(
        "[PolyShade] Post processing disabled; using direct rendering.",
        error
      );
      this.state.restore(r);
      draw(scene, camera);
    } finally {
      this.guard.pass = "scene";
      this.state.restore(r);
    }
  }
  dispose() {
    this.sunVisibility.dispose();
    this.pool.dispose();
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
    this.geometry.dispose();
  }
};

// src/rendering/performance.js
var GpuTimer = class {
  constructor(renderer, capabilities) {
    this.gl = renderer.getContext();
    this.ext = capabilities.timerExtension;
    this.pending = [];
    this.samples = [];
    this.frame = 0;
  }
  begin() {
    if (!this.ext || this.pending.length >= 8 || this.frame++ % 12 !== 0)
      return;
    const gl = this.gl, ext = this.ext;
    if (gl.getQuery(ext.TIME_ELAPSED_EXT, gl.CURRENT_QUERY)) return;
    this.active = gl.createQuery();
    gl.beginQuery(ext.TIME_ELAPSED_EXT, this.active);
  }
  end() {
    if (this.active) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.pending.push(this.active);
      this.active = null;
    }
    this.collect();
  }
  collect() {
    if (!this.ext || !this.pending.length) return;
    const gl = this.gl, disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    if (disjoint) {
      for (const query of this.pending) gl.deleteQuery(query);
      this.pending = [];
      return;
    }
    while (this.pending.length && gl.getQueryParameter(this.pending[0], gl.QUERY_RESULT_AVAILABLE)) {
      const q = this.pending.shift();
      if (!disjoint) {
        this.samples.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
        if (this.samples.length > 120) this.samples.shift();
      }
      gl.deleteQuery(q);
    }
  }
  metrics() {
    if (!this.samples.length) return null;
    const values = [...this.samples].sort((a, b) => a - b);
    return {
      average: values.reduce((s, v) => s + v, 0) / values.length,
      p95: values[Math.ceil(values.length * 0.95) - 1],
      samples: values.length
    };
  }
  dispose() {
    if (this.active) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.gl.deleteQuery(this.active);
      this.active = null;
    }
    for (const q of this.pending) this.gl.deleteQuery(q);
    this.pending = [];
  }
};
var PassProfiler = class {
  constructor(renderer, capabilities) {
    this.renderer = renderer;
    this.capabilities = capabilities;
    this.timers = /* @__PURE__ */ new Map();
    this.cpu = /* @__PURE__ */ new Map();
  }
  measure(name, fn, gpu = true) {
    let timer = this.timers.get(name);
    if (!timer) {
      timer = new GpuTimer(this.renderer, this.capabilities);
      this.timers.set(name, timer);
    }
    if (gpu) timer.begin();
    const start = performance.now();
    try {
      return fn();
    } finally {
      timer.end();
      const values = this.cpu.get(name) ?? [];
      values.push(performance.now() - start);
      if (values.length > 120) values.shift();
      this.cpu.set(name, values);
    }
  }
  scene(fn) {
    this.sceneFrame = (this.sceneFrame ?? 0) + 1;
    if (this.sceneFrame % 2 === 0 || !this.renderer.shadowMap?.render)
      return this.measure("scene-including-shadows", fn);
    const shadowMap = this.renderer.shadowMap, original = shadowMap.render, profiler = this;
    shadowMap.render = function(...args) {
      return args[0]?.length ? profiler.measure("shadows", () => original.apply(this, args)) : original.apply(this, args);
    };
    try {
      return this.measure("scene-including-shadows", fn, false);
    } finally {
      shadowMap.render = original;
    }
  }
  report() {
    return Object.fromEntries(
      [...this.timers].map(([name, timer]) => {
        timer.collect();
        const a = [...this.cpu.get(name)].sort((a2, b) => a2 - b);
        return [
          name,
          {
            gpu: timer.metrics(),
            cpu: {
              average: a.reduce((s, v) => s + v, 0) / a.length,
              p95: a[Math.ceil(a.length * 0.95) - 1],
              samples: a.length
            }
          }
        ];
      })
    );
  }
  dispose() {
    for (const timer of this.timers.values()) timer.dispose();
  }
};

// src/rendering/shadow-cache.js
var TRANSFORM_FIELDS = [
  ["position", "x"],
  ["position", "y"],
  ["position", "z"],
  ["quaternion", "x"],
  ["quaternion", "y"],
  ["quaternion", "z"],
  ["quaternion", "w"],
  ["scale", "x"],
  ["scale", "y"],
  ["scale", "z"]
];
var CAMERA_FIELDS = ["left", "right", "top", "bottom", "near", "far", "zoom"];
var ShadowCache = class {
  constructor() {
    this.original = /* @__PURE__ */ new Map();
    this.transforms = [];
    this.meshes = [];
    this.topology = [];
    this.lights = [];
    this.valid = false;
    this.updated = 0;
    this.reused = 0;
  }
  scan(scene) {
    const transforms = /* @__PURE__ */ new Set(), priorityTransforms = /* @__PURE__ */ new Set(), meshes = [], topology = [], lights = [];
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
          if (node.isSkinnedMesh || node.onBeforeRender !== Object.getPrototypeOf(node).onBeforeRender || materials.some((m) => m?.displacementMap || m?.map?.isVideoTexture || m?.alphaMap?.isVideoTexture))
            animated = true;
        }
      }
      if (node.isDirectionalLight && node.castShadow && node.shadow && typeof node.shadow.autoUpdate === "boolean") {
        lights.push(node);
        addTransform(node, true);
        if (node.target) addTransform(node.target, true);
      }
    });
    const same = (next, previous) => next.length === previous.length && next.every((node, i) => node === previous[i].node);
    const nodes = [...priorityTransforms, ...[...transforms].filter((node) => !priorityTransforms.has(node))];
    if (!same(nodes, this.transforms) || !same(meshes, this.meshes) || !same(topology, this.topology) || !same(lights, this.lights)) {
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
      row.visible = n.visible;
      row.auto = mode;
      if (dirty && this.valid) return this.invalidate();
    }
    for (const row of this.meshes) {
      const n = row.node, g = n.geometry;
      if (row.scannedCast !== n.castShadow || row.cast !== n.castShadow) dirty = true;
      if (n.castShadow) {
        if (n.isSkinnedMesh || n.customDepthMaterial || n.onBeforeShadow !== Object.getPrototypeOf(n).onBeforeShadow || n.onBeforeRender !== Object.getPrototypeOf(n).onBeforeRender)
          dirty = true;
        const morphs = n.morphTargetInfluences;
        if ((row.morphs?.length ?? 0) !== (morphs?.length ?? 0)) {
          row.morphs = new Float64Array(morphs?.length ?? 0);
          dirty = true;
        }
        if (morphs?.length) {
          for (let i = 0; i < morphs.length; i++) {
            if (row.morphs[i] !== morphs[i]) dirty = true;
            row.morphs[i] = morphs[i];
          }
          const attributes = g?.morphAttributes.position ?? [];
          const versions = row.morphVersions ??= [];
          for (let i = 0; i < attributes.length; i++) {
            if (versions[i] !== attributes[i].version) dirty = true;
            versions[i] = attributes[i].version;
          }
        }
        const version = g?.attributes?.position?.version;
        const index = g?.index?.version;
        const instances = n.instanceMatrix?.version;
        if (row.geometry !== g || row.version !== version || row.index !== index || row.instances !== instances || row.material !== n.material || row.depthMaterial !== n.customDepthMaterial || row.layers !== n.layers.mask || row.culled !== n.frustumCulled || row.drawStart !== g?.drawRange.start || row.drawCount !== g?.drawRange.count) dirty = true;
        row.geometry = g;
        row.version = version;
        row.index = index;
        row.instances = instances;
        row.material = n.material;
        row.depthMaterial = n.customDepthMaterial;
        row.layers = n.layers.mask;
        row.culled = n.frustumCulled;
        row.drawStart = g?.drawRange.start;
        row.drawCount = g?.drawRange.count;
        const array = Array.isArray(n.material), count = array ? n.material.length : 1;
        if (row.materialCount !== count) dirty = true;
        row.materialCount = count;
        const previous = row.materials ??= [];
        for (let i = 0; i < count; i++) {
          const m = array ? n.material[i] : n.material;
          const entry = previous[i] ??= {};
          if (entry.material !== m || entry.version !== m?.version || entry.visible !== m?.visible || entry.alphaMap !== m?.alphaMap || entry.alphaVersion !== m?.alphaMap?.version || entry.alphaTest !== m?.alphaTest || entry.opacity !== m?.opacity || entry.side !== m?.side || m?.alphaTest > 0 && (entry.map !== m.map || entry.mapVersion !== m.map?.version)) dirty = true;
          entry.material = m;
          entry.version = m?.version;
          entry.visible = m?.visible;
          entry.alphaMap = m?.alphaMap;
          entry.alphaVersion = m?.alphaMap?.version;
          entry.map = m?.map;
          entry.mapVersion = m?.map?.version;
          entry.alphaTest = m?.alphaTest;
          entry.opacity = m?.opacity;
          entry.side = m?.side;
        }
      }
      row.cast = n.castShadow;
    }
    for (const row of this.lights) {
      const s = row.node.shadow, c = s.camera, a = row.values;
      for (let i = 0; i < 9; i++) {
        const value = i === 0 ? s.mapSize.x : i === 1 ? s.mapSize.y : c[CAMERA_FIELDS[i - 2]];
        const stored = value === void 0 ? NaN : value;
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
};

// src/rendering/shader-warmup.js
var ShaderWarmup = class {
  constructor(three, renderer) {
    this.three = three;
    this.renderer = renderer;
    this.supported = typeof renderer.compile === "function" && !!renderer.getContext().getExtension?.("KHR_parallel_shader_compile");
    this.jobs = [];
    this.submitted = 0;
  }
  schedule(scene, camera, settings2, post, brakes, meshCount, nativeCSM = false) {
    if (!this.supported) return;
    const lights = [];
    for (const { lights: lamps } of brakes?.cars.values() ?? []) lights.push(...lamps);
    if (this.settings === settings2 && this.meshCount === meshCount && this.nativeCSM === nativeCSM && this.lights?.length === lights.length && lights.every((light, i) => this.lights[i] === light))
      return;
    this.settings = settings2;
    this.meshCount = meshCount;
    this.lights = lights;
    this.nativeCSM = nativeCSM;
    this.jobs.length = 0;
    let count = 0;
    if (!nativeCSM) this.jobs.push({ scene, camera, lights, count: 0, linear: !!post && settings2.postEnabled && settings2.postQuality !== "off" });
    for (const { lights: lamps } of brakes?.cars.values() ?? []) {
      if (nativeCSM) break;
      count += lamps.length;
      this.jobs.push({ scene, camera, lights, count, linear: !!post && settings2.postEnabled && settings2.postQuality !== "off" });
    }
    if (post && settings2.postEnabled && settings2.postQuality !== "off") {
      for (const { material, linear } of post.warmupMaterials(settings2)) {
        this.jobs.push({ scene: post.scene, camera: post.camera, mesh: post.quad, material, linear });
      }
    }
  }
  run() {
    const job = this.jobs.shift();
    if (!job) return;
    const r = this.renderer, t = this.three;
    const target = r.getRenderTarget(), face = r.getActiveCubeFace(), mip = r.getActiveMipmapLevel();
    const tone = r.toneMapping, output = r.outputColorSpace, material = job.mesh?.material;
    const visible = job.lights?.map((light) => light.visible);
    const parents = /* @__PURE__ */ new Map();
    try {
      if (job.mesh) job.mesh.material = job.material;
      if (job.lights) job.lights.forEach((light, i) => {
        light.visible = i < job.count;
      });
      for (let i = 0; i < (job.count ?? 0); i++) {
        for (let node = job.lights[i].parent; node && node !== job.scene; node = node.parent) {
          if (!parents.has(node)) parents.set(node, node.visible);
          node.visible = true;
        }
      }
      r.setRenderTarget(null);
      if (job.linear) {
        r.toneMapping = t.NoToneMapping;
        r.outputColorSpace = t.LinearSRGBColorSpace;
      }
      r.compile(job.scene, job.camera);
      this.submitted++;
    } catch (error) {
      this.jobs.length = 0;
      this.supported = false;
      console.warn("[PolyShade] Background shader warming unavailable.", error);
    } finally {
      if (job.mesh) job.mesh.material = material;
      if (job.lights) job.lights.forEach((light, i) => {
        light.visible = visible[i];
      });
      for (const [node, value] of parents) node.visible = value;
      r.setRenderTarget(target, face, mip);
      r.toneMapping = tone;
      r.outputColorSpace = output;
    }
  }
  report() {
    return { supported: this.supported, submitted: this.submitted, queued: this.jobs.length };
  }
  clear() {
    this.jobs.length = 0;
    this.settings = null;
    this.lights = null;
  }
};

// src/rendering/cinematic.js
var CinematicRenderer = class {
  constructor(three, renderer) {
    this.three = three;
    this.capabilities = inspectRenderer(three, renderer);
    this.guard = new ShaderGuard(renderer);
    this.timer = new GpuTimer(renderer, this.capabilities);
    this.renderer = renderer;
    this.shadows = new ShadowCache();
    this.warmup = new ShaderWarmup(three, renderer);
    if (this.capabilities.features.postprocess)
      this.post = new PostProcess(
        three,
        renderer,
        this.capabilities,
        this.guard
      );
  }
  attachScene(scene) {
    this.detachScene();
    this.brakeLights = new BrakeLights(this.three, scene);
    if (this.three.ShaderMaterial && this.three.SphereGeometry)
      this.sky = new ProceduralSky(this.three, scene);
    if (this.capabilities.features.environment)
      this.environment = new SkyEnvironment(
        this.three,
        scene,
        this.capabilities
      );
  }
  update(state, settings2, now, camera) {
    this.configureProfiler(settings2);
    this.brakeLights?.scan(settings2, camera, state);
    this.brakeLights?.update(settings2);
    this.palette = skyPalette(this.three, settings2);
    this.sky?.update(settings2, now);
    this.sky?.scan();
    try {
      if (this.profiler)
        this.profiler.measure(
          "environment-generation-and-assignment",
          () => this.environment?.update(settings2)
        );
      else this.environment?.update(settings2);
    } catch (error) {
      console.warn("[PolyShade] Environment unavailable.", error);
      this.environment?.dispose();
      this.environment = null;
    }
    state.palette = this.palette;
  }
  frame(settings2, now, camera) {
    if (this.brakeLights && camera) this.brakeLights.camera = camera;
    this.brakeLights?.update(settings2);
    if (this.sky && this.guard.failures.has("sky")) {
      this.sky.dispose();
      this.sky = null;
    }
    if (this.sky && settings2.cloudsEnabled)
      this.sky.uniforms.time.value = now / 1e3;
  }
  configureProfiler(settings2) {
    if (settings2.debugProfile && this.profileSettings !== settings2) {
      this.profileSettings = settings2;
      const key = JSON.stringify(settings2);
      if (this.profileKey !== key) {
        this.profiler?.dispose();
        this.profiler = null;
        this.profileKey = key;
      }
    }
    if (settings2.debugProfile && !this.profiler)
      this.profiler = new PassProfiler(this.renderer, this.capabilities);
    if (!settings2.debugProfile && this.profiler) {
      this.profiler.dispose();
      this.profiler = null;
    }
  }
  render(scene, camera, settings2, draw) {
    this.configureProfiler(settings2);
    if (this.post) this.post.profiler = this.profiler;
    if (!this.profiler) this.timer.begin();
    if (settings2.shadowQuality !== "off") this.shadows.prepare(camera);
    try {
      return this.post ? this.post.render(scene, camera, settings2, draw, this.palette) : draw();
    } finally {
      if (settings2.shadowQuality !== "off") this.shadows.commit();
      if (!this.profiler) this.timer.end();
      if (this.renderer.getRenderTarget() === null && !this.renderer.xr.isPresenting)
        this.warmup.run();
    }
  }
  report() {
    const { timerExtension, ...capabilities } = this.capabilities;
    return {
      ...capabilities,
      passes: this.post?.passOrder,
      active: this.post?.active,
      resources: this.post ? {
        allocated: this.post.pool.allocations,
        disposed: this.post.pool.disposals,
        resized: this.post.pool.resizes,
        live: this.post.pool.targets.size,
        targets: this.post.pool.report()
      } : null,
      failures: Object.fromEntries(this.guard.failures),
      profile: this.profiler?.report(),
      brakeLights: this.brakeLights?.report(),
      shadowCache: this.shadows.report(),
      shaderWarmup: this.warmup.report(),
      environment: this.environment ? {
        generations: this.environment.generations,
        cubeSize: this.environment.resolution
      } : null
    };
  }
  detachScene() {
    this.warmup.clear();
    this.shadows.dispose();
    this.brakeLights?.dispose();
    this.brakeLights = null;
    this.sky?.dispose();
    this.environment?.dispose();
    this.sky = null;
    this.environment = null;
  }
  dispose() {
    this.detachScene();
    this.post?.dispose();
    this.timer.dispose();
    this.profiler?.dispose();
    this.guard.dispose();
  }
};

// src/options.js
var OPTIONS = {
  Sky: {
    skyEnabled: ["Sky enabled", true],
    skyAutomatic: ["Automatic palette", true],
    skyIntensity: ["Sky intensity", 1, 0.1, 3],
    zenithColor: ["Zenith colour", "#3978bc"],
    horizonColor: ["Horizon colour", "#b6cbd9"],
    horizonWarmth: ["Horizon warmth", 0.3, 0, 1],
    turbidity: ["Turbidity", 2.2, 1, 8],
    sunDiscSize: ["Sun disc degrees", 0.6, 0.1, 2],
    sunGlow: ["Sun glow", 0.45, 0, 2],
    cloudsEnabled: ["Clouds", false],
    cloudAmount: ["Cloud amount", 0.16, 0, 0.7]
  },
  Lighting: {
    brakeLightsEnabled: ["Brake light spill", true],
    brakeLightIntensity: ["Brake light power", 1.5, 0, 5],
    brakeLightDistance: ["Brake light reach", 2.5, 0.5, 6],
    sunIntensity: ["Sun intensity", 1.35, 0.5, 2],
    sunElevation: ["Sun elevation", 30, 2, 75],
    sunAzimuth: ["Sun azimuth", 225, 0, 360],
    automaticSunColor: ["Automatic sun colour", true],
    sunColor: ["Sun colour", "#ffe3ba"],
    ambientIntensity: ["Ambient fill", 0.85, 0.1, 1.8],
    ambientColor: ["Sky fill", "#b9d0eb"],
    groundColor: ["Ground fill", "#aaa294"],
    environmentEnabled: ["Environment", true],
    environmentIntensity: ["Environment intensity", 0.6, 0, 2],
    environmentQuality: [
      "Environment quality",
      "medium",
      ["low", "medium", "high"]
    ]
  },
  Shadows: {
    shadowQuality: [
      "Shadow quality",
      "medium",
      ["off", "low", "medium", "high"]
    ],
    shadowDistance: ["Coverage", 30, 15, 200],
    adaptiveShadows: ["Adaptive coverage", true],
    shadowForward: ["Forward bias", 0.4, 0, 0.9],
    shadowSoftness: ["Softness", 4, 0, 4],
    shadowStrength: ["Shadow strength", 0.84, 0, 1],
    shadowBias: ["Bias", -1e-4, -2e-3, 2e-3],
    shadowNormalBias: ["Normal bias", 0.015, 0, 0.1],
    nativeCSMTuning: ["Native CSM tuning", true]
  },
  Materials: {
    surfaceWarmth: ["Architecture warmth", 0.2, 0, 1],
    materialDetail: ["Procedural roughness", true],
    carReflection: ["Car reflection", 1, 0, 2],
    roadRoughness: ["Road roughness", 0.85, 0.65, 1],
    materialOverrides: ["Material overrides", {}]
  },
  Atmosphere: {
    volumetricEnabled: ["Volumetric sunlight", false],
    volumetricStrength: ["Volumetric strength", 0.08, 0, 0.3],
    volumetricDensity: ["Volumetric density", 8e-3, 0, 0.03],
    volumetricDecay: ["Volumetric decay", 0.96, 0.8, 1],
    volumetricSamples: ["Volumetric samples", 8, 4, 16],
    volumetricMaxDistance: ["Volumetric max distance", 80, 10, 200],
    atmosphereEnabled: ["Aerial perspective", true],
    atmosphereStrength: ["Atmosphere strength", 0.13, 0, 1],
    atmosphereStart: ["Start distance", 80, 5, 500],
    atmosphereSunWarmth: ["Sun warmth", 0.25, 0, 1],
    fogEnabled: ["Fallback fog", false],
    fogStrength: ["Fog strength", 0.12, 0, 1]
  },
  "Post Processing": {
    postEnabled: ["Post processing", true],
    gradeEnabled: ["Colour grade", true],
    exposure: ["Exposure", 1.08, 0.7, 1.4],
    contrast: ["Contrast", 1.045, 0.8, 1.2],
    saturation: ["Saturation", 1.02, 0.7, 1.3],
    vibrance: ["Vibrance", 0.08, -0.2, 0.4],
    temperature: ["Temperature", 0.015, -0.15, 0.15],
    tint: ["Tint", 0, -0.1, 0.1],
    shadowLift: ["Shadow lift", 4e-3, 0, 0.1],
    highlightCompression: ["Highlight shoulder", 0.04, 0, 0.3],
    blackLevel: ["Black level", 3e-3, 0, 0.06],
    whiteLevel: ["White level", 1, 0.8, 1.2],
    vignetteStrength: ["Vignette", 0.035, 0, 0.2],
    vignetteSoftness: ["Vignette softness", 0.7, 0.3, 1],
    aoEnabled: ["Contact AO", true],
    aoQuality: ["AO quality", "low", ["low", "medium", "high"]],
    aoStrength: ["AO strength", 0.3, 0, 1],
    aoRadius: ["AO radius", 0.8, 0.1, 3],
    aoBias: ["AO bias", 0.04, 5e-3, 0.2],
    sunRaysEnabled: ["Sun rays", true],
    sunRayStrength: ["Sun ray strength", 0.2, 0, 1],
    sunRayDecay: ["Sun ray decay", 0.96, 0.8, 0.995],
    sunRayDensity: ["Sun ray density", 0.8, 0.2, 1.2],
    sunRayExposure: ["Sun ray exposure", 0.5, 0, 2],
    lensFlareEnabled: ["Lens flare", true],
    lensFlareStrength: ["Lens flare strength", 0.32, 0, 1],
    flareGhostStrength: ["Ghost strength", 0.65, 0, 1],
    flareIridescence: ["Iridescence", 0.65, 0, 1],
    flareStreakStrength: ["Streak strength", 0.12, 0, 1],
    bloomEnabled: ["Bloom", true],
    bloomThreshold: ["Bloom threshold", 1.5, 0.5, 5],
    bloomStrength: ["Bloom strength", 0.055, 0, 0.3],
    bloomRadius: ["Bloom radius", 1.2, 0.5, 3],
    postQuality: ["Post quality", "medium", ["off", "low", "medium", "high"]],
    fxaaEnabled: ["FXAA", true],
    sharpenEnabled: ["Sharpen", false],
    sharpenStrength: ["Sharpen strength", 0.08, 0, 0.3]
  },
  Quality: {
    renderScale: ["Render scale", 1, 1, 1.5],
    sceneSamples: ["Scene MSAA", "auto", ["auto", "0", "2", "4"]]
  },
  Debug: {
    debugProfile: ["Per-pass profiling (diagnostic only)", false],
    debugEnabled: ["Detailed diagnostics", false],
    debugView: [
      "Render view",
      "final",
      [
        "final",
        "depth",
        "ao",
        "bloom",
        "sun-position",
        "sun-visibility",
        "sun-rays",
        "volumetric"
      ]
    ]
  }
};
var OPTION_DEFINITIONS = Object.freeze(
  Object.assign({}, ...Object.values(OPTIONS))
);
var OPTION_DEFAULTS = Object.freeze(
  Object.fromEntries(
    Object.entries(OPTION_DEFINITIONS).map(([k, v]) => [k, v[1]])
  )
);
var MATERIAL_KINDS = [
  "road",
  "grass",
  "concrete",
  "barrier",
  "car",
  "metal",
  "tire",
  "glass",
  "marking",
  "signage",
  "emissive",
  "architecture",
  "other",
  "ignore"
];

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
var PRESETS2 = Object.freeze({
  vanilla: Object.freeze({
    ...OPTION_DEFAULTS,
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
    surfaceWarmth: 0.2,
    shadowDistance: 30,
    shadowSoftness: 4
  }),
  "cinematic-lite": Object.freeze({
    ...OPTION_DEFAULTS,
    sunIntensity: 1.45,
    sunElevation: 30,
    sunAzimuth: 225,
    sunColor: "#ffe3ba",
    ambientIntensity: 0.9,
    ambientColor: "#b9d0eb",
    exposure: 1.08,
    fogEnabled: false,
    fogStrength: 0.12,
    shadowQuality: "low",
    renderScale: 1,
    sunRaysEnabled: false,
    lensFlareEnabled: false,
    volumetricEnabled: false,
    aoEnabled: false,
    bloomEnabled: false,
    materialDetail: false,
    vignetteStrength: 0,
    environmentQuality: "low",
    postQuality: "low",
    surfaceWarmth: 0.2,
    shadowDistance: 30,
    shadowSoftness: 4
  }),
  cinematic: Object.freeze({
    ...OPTION_DEFAULTS,
    cloudsEnabled: true,
    cloudAmount: 0.4,
    sunIntensity: 1.35,
    sunElevation: 26,
    sunAzimuth: 225,
    sunColor: "#ffe3ba",
    ambientIntensity: 0.8,
    ambientColor: "#b9d0eb",
    exposure: 1.04,
    fogEnabled: false,
    fogStrength: 0.2,
    shadowQuality: "medium",
    renderScale: 1,
    surfaceWarmth: 0.2,
    shadowDistance: 30,
    shadowSoftness: 4,
    sunRaysEnabled: true,
    sunRayStrength: 0.2,
    lensFlareEnabled: true,
    lensFlareStrength: 0.32,
    flareGhostStrength: 0.65,
    flareIridescence: 0.65,
    flareStreakStrength: 0.12,
    volumetricEnabled: false
  }),
  recording: Object.freeze({
    ...OPTION_DEFAULTS,
    cloudsEnabled: true,
    cloudAmount: 0.4,
    sunIntensity: 1.35,
    sunElevation: 26,
    sunAzimuth: 225,
    sunColor: "#ffe3ba",
    ambientIntensity: 0.8,
    ambientColor: "#b9d0eb",
    exposure: 1.04,
    fogEnabled: false,
    fogStrength: 0.22,
    shadowQuality: "medium",
    renderScale: 1,
    sunRaysEnabled: true,
    sunRayStrength: 0.3,
    lensFlareEnabled: true,
    lensFlareStrength: 0.46,
    flareGhostStrength: 0.8,
    flareIridescence: 0.75,
    flareStreakStrength: 0.17,
    volumetricStrength: 0.08,
    volumetricDensity: 8e-3,
    aoQuality: "high",
    environmentQuality: "high",
    postQuality: "high",
    sharpenEnabled: false,
    fxaaEnabled: true,
    volumetricEnabled: true,
    surfaceWarmth: 0.2,
    shadowDistance: 30,
    shadowSoftness: 4
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
    ...PRESETS2[settings2.preset],
    ...settings2.overrides,
    enabled: settings2.enabled && settings2.preset !== "vanilla"
  };
}

// src/effects.js
var OWNED_LIGHT = "polyShadeOwnedLight";
function warnEffect(name, error) {
  console.warn(
    `[PolyShade] ${name} was disabled; other rendering changes remain active.`,
    error
  );
}
function safelyApply(owner, name, callback) {
  const failed = owner.failedEffects ??= /* @__PURE__ */ new Set();
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
  if (typeof three.Box3 !== "function" || typeof three.Sphere !== "function" || typeof Vector3 !== "function")
    return null;
  const bounds = new three.Box3();
  if (bounds.makeEmpty && bounds.expandByObject) {
    scene.updateMatrixWorld?.();
    bounds.makeEmpty();
    scene.traverse((object) => {
      if (object.isMesh && !object.userData?.polyShadeOwned && !object.material?.isShaderMaterial)
        bounds.expandByObject(object);
    });
  } else bounds.setFromObject(scene);
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
    visible: light.visible,
    shadow: light.shadow ? {
      mapSize: light.shadow.mapSize?.clone?.(),
      bias: light.shadow.bias,
      normalBias: light.shadow.normalBias,
      radius: light.shadow.radius,
      intensity: light.shadow.intensity,
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
  sun = new three.DirectionalLight(16773855, 4.7);
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
    if (!fill && (object.isHemisphereLight || object.isAmbientLight) && object.userData?.[OWNED_LIGHT])
      fill = object;
  });
  if (!fill && typeof three.HemisphereLight !== "function") {
    sceneState.scene.traverse((object) => {
      if (!fill && object.isAmbientLight && object.intensity > 0) fill = object;
    });
  }
  if (fill) return fill;
  if (typeof three.HemisphereLight === "function") {
    fill = new three.HemisphereLight(14149364, 7829103, 1.6);
  } else if (typeof three.AmbientLight === "function") {
    fill = new three.AmbientLight(13359336, 0.55);
  } else {
    throw new Error(
      "This Three.js build does not provide an ambient or hemisphere light."
    );
  }
  fill.name = "PolyShade ambient fill";
  fill.userData[OWNED_LIGHT] = true;
  sceneState.scene.add(fill);
  sceneState.ownedLights.add(fill);
  return fill;
}
function configureLight(sceneState, three, light, settings2, bounds) {
  rememberLight(sceneState, light);
  const snapshot = sceneState.lightSnapshots.get(light);
  if (light.isDirectionalLight) {
    light.intensity = snapshot.intensity * settings2.sunIntensity;
    light.color.copy((sceneState.palette ?? skyPalette(three, settings2)).sun);
    const center = bounds?.center ?? sceneState.scene.position?.clone?.();
    if (!center)
      throw new Error("Three.js scene position vectors are unavailable.");
    const oldDistance = snapshot.position?.distanceTo?.(snapshot.targetPosition ?? center) || 100;
    const elevation = settings2.sunElevation * Math.PI / 180;
    const azimuth = settings2.sunAzimuth * Math.PI / 180;
    const direction = snapshot.position?.clone?.() ?? center.clone?.();
    if (!direction?.set)
      throw new Error("Three.js direction vectors are unavailable.");
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
    const mapSize = Math.min(
      SHADOW_MAP_SIZES[settings2.shadowQuality],
      sceneState.maxShadowSize ?? 4096
    );
    if (mapSize > 0 && light.shadow) {
      light.castShadow = true;
      if (light.shadow.mapSize?.x !== mapSize || light.shadow.mapSize?.y !== mapSize) {
        light.shadow.map?.dispose?.();
        light.shadow.map = null;
        light.shadow.mapSize?.set?.(mapSize, mapSize);
      }
      if (typeof light.shadow.bias === "number")
        light.shadow.bias = settings2.shadowBias;
      if (typeof light.shadow.normalBias === "number")
        light.shadow.normalBias = settings2.shadowNormalBias;
      if (typeof light.shadow.radius === "number")
        light.shadow.radius = settings2.shadowSoftness ?? 1.5;
      if (typeof light.shadow.intensity === "number")
        light.shadow.intensity = settings2.shadowStrength ?? 0.84;
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
    light.color.copy((sceneState.palette ?? skyPalette(three, settings2)).horizon).lerp(linearColor(three, settings2.ambientColor ?? "#b9d0eb"), 0.4);
    if (light.groundColor && snapshot.groundColor) {
      light.groundColor.copy(snapshot.groundColor);
      light.groundColor.lerp?.(
        linearColor(three, settings2.groundColor ?? "#aaa294"),
        0.8
      );
    }
  }
}
function updateFog(sceneState, three, settings2, camera, bounds) {
  if (!settings2.fogEnabled) {
    sceneState.scene.fog = sceneState.originalFog;
    return;
  }
  if (typeof three.Fog !== "function")
    throw new Error("Three.js Fog is unavailable.");
  const background = sceneState.scene.background;
  const color = background?.isColor ? background.clone() : new three.Color(11189968);
  const cameraFar = Number.isFinite(camera?.far) ? camera.far : 2e3;
  const horizonDistance = Math.min(
    cameraFar,
    (bounds?.radius ?? cameraFar) * 3
  );
  const far = Math.max(
    100,
    horizonDistance * (1.2 - settings2.fogStrength * 0.4)
  );
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
    managedShadowMeshes: /* @__PURE__ */ new Map(),
    materialClones: /* @__PURE__ */ new Map(),
    originalMaterials: /* @__PURE__ */ new Map(),
    processedMeshes: /* @__PURE__ */ new Map(),
    attachedTargets: /* @__PURE__ */ new Set(),
    mutedLights: /* @__PURE__ */ new Set()
  };
}
function applySceneEffects(sceneState, three, settings2, camera, now) {
  if (settings2.fogEnabled && (now - sceneState.lastBoundsAt >= 5e3 || !sceneState.bounds)) {
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
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.some((material) => material?.defines?.USE_CSM !== void 0))
      sceneState.nativeCSM = true;
  });
  safelyApply(sceneState, "directional sunlight", () => {
    if (sceneState.nativeCSM) {
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
        sceneState.mutedLights.delete(light);
        if (typeof snapshot.visible === "boolean") light.visible = snapshot.visible;
        if (typeof snapshot.castShadow === "boolean") light.castShadow = snapshot.castShadow;
        light.intensity = snapshot.intensity * settings2.sunIntensity;
        light.color.copy(
          (sceneState.palette ?? skyPalette(three, settings2)).sun
        );
      });
      return;
    }
    const sun = ensureSun(sceneState, three);
    configureLight(sceneState, three, sun, settings2, sceneState.bounds);
    sceneState.sun = sun;
    sceneState.scene.traverse((light) => {
      if (light !== sun && light.isDirectionalLight) {
        muteLight(sceneState, light);
      }
    });
  });
  safelyApply(sceneState, "ambient fill", () => {
    const fill = ensureFill(sceneState, three);
    configureLight(sceneState, three, fill, settings2, sceneState.bounds);
    sceneState.scene.traverse((light) => {
      if (light !== fill && (light.isAmbientLight || light.isHemisphereLight)) {
        muteLight(sceneState, light);
      }
    });
  });
  if (SHADOW_MAP_SIZES[settings2.shadowQuality] > 0) {
    safelyApply(sceneState, "shadow receivers and casters", () => {
      const activeMeshes = /* @__PURE__ */ new Set();
      sceneState.scene.traverse((object) => {
        if (!object?.isMesh || object.userData?.polyShadeOwned || object.material?.isShaderMaterial)
          return;
        activeMeshes.add(object);
        if (!sceneState.meshShadowSnapshots.has(object)) {
          sceneState.meshShadowSnapshots.set(object, {
            castShadow: object.castShadow,
            receiveShadow: object.receiveShadow
          });
        }
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        const isGhost = materials.some(
          (material) => isReplayGhost(object, material) || material?.transparent || material?.opacity < 0.98
        );
        if (isGhost) {
          const snapshot2 = sceneState.meshShadowSnapshots.get(object);
          object.castShadow = snapshot2.castShadow;
          object.receiveShadow = snapshot2.receiveShadow;
          snapshot2.managedCastShadow = snapshot2.castShadow;
          snapshot2.managedReceiveShadow = snapshot2.receiveShadow;
          sceneState.managedShadowMeshes.set(object, snapshot2);
          return;
        }
        object.receiveShadow = true;
        if (!materials.some((material) => material?.wireframe) && (object.geometry?.attributes?.normal || materials.some((material) => ["car", "barrier", "concrete", "architecture"].includes(classifyMaterial(object, material))))) {
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
  safelyApply(
    sceneState,
    "atmospheric haze",
    () => updateFog(sceneState, three, settings2, camera, sceneState.bounds)
  );
  if (now - sceneState.lastScanAt >= 1e3 || sceneState.lastScanAt === 0) {
    safelyApply(
      sceneState,
      "material response",
      () => applyMaterialTuning(sceneState, three, settings2)
    );
    sceneState.lastScanAt = now;
  }
  updateShadowFocus(sceneState, settings2, camera);
  updateShadowRange(sceneState, settings2, camera, three);
}
function usesNativeCSM(scene) {
  let count = 0;
  for (const light of scene.children ?? [])
    if (light.isDirectionalLight && !light.userData?.[OWNED_LIGHT] && ++count > 1)
      return true;
  return false;
}
function updateShadowFocus(sceneState, settings2, camera) {
  const sun = sceneState.sun;
  const size = SHADOW_MAP_SIZES[settings2.shadowQuality];
  if (sceneState.nativeCSM || !sun || !size || !camera?.position?.clone) return;
  let extent = settings2.shadowDistance ?? 30;
  const focus = sceneState.shadowFocus ??= camera.position.clone();
  const previous = sceneState.lastCameraPosition ??= camera.position.clone();
  const speed = camera.position.distanceTo(previous);
  previous.copy(camera.position);
  if (settings2.adaptiveShadows)
    extent *= 1 + Math.min(
      0.6,
      speed * 0.12 + Math.max(0, camera.position.y - 20) * 3e-3 + (camera.fov ?? 60) / 600
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
      far: Math.max(100, extent * 4)
    });
    shadowCamera.updateProjectionMatrix();
  }
  sun.shadow.bias = settings2.shadowBias * (extent / (settings2.shadowDistance ?? 30));
  sun.shadow.normalBias = settings2.shadowNormalBias * (extent / 30);
  if (camera.getWorldPosition) camera.getWorldPosition(focus);
  else focus.copy(camera.position);
  const forward = sceneState.shadowForward ??= focus.clone();
  if (camera.getWorldDirection) {
    camera.getWorldDirection(forward);
    focus.addScaledVector(forward, extent * (settings2.shadowForward ?? 0.4));
  }
  const smooth = sceneState.smoothedFocus ??= focus.clone();
  if (smooth.distanceTo(focus) > extent * 1.5) smooth.copy(focus);
  else smooth.lerp(focus, 0.12);
  focus.copy(smooth);
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
function updateShadowRange(sceneState, settings2, camera, three) {
  if (!camera?.getWorldPosition || !three?.Vector3) return;
  const range = Math.max(20, (settings2.shadowDistance ?? 30) * 2);
  const rangeSquared = range * range;
  const cameraPosition = sceneState.shadowRangeCamera ??= new three.Vector3();
  const meshPosition = sceneState.shadowRangeMesh ??= new three.Vector3();
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
function refreshFrameEffects(sceneState, rendererState, three, settings2, camera) {
  applyRendererEffects(rendererState, three, settings2);
  for (const light of sceneState.mutedLights) {
    if (typeof light.visible === "boolean") light.visible = false;
    light.castShadow = false;
    light.intensity = 0;
  }
  if (!sceneState.nativeCSM && sceneState.sun) {
    sceneState.sun.castShadow = SHADOW_MAP_SIZES[settings2.shadowQuality] > 0;
  }
  updateShadowFocus(sceneState, settings2, camera);
}
function applyRendererEffects(rendererState, three, settings2) {
  const { renderer } = rendererState;
  safelyApply(rendererState, "tone mapping and exposure", () => {
    if (!("toneMapping" in renderer) || typeof rendererState.originalExposure !== "number") {
      throw new Error(
        "WebGLRenderer tone mapping or exposure controls are unavailable."
      );
    }
    if (typeof three.ACESFilmicToneMapping !== "number") {
      throw new Error("The ACES filmic tone-mapping mode is unavailable.");
    }
    renderer.outputColorSpace = three.SRGBColorSpace;
    renderer.toneMapping = three.ACESFilmicToneMapping;
    renderer.toneMappingExposure = rendererState.originalExposure * settings2.exposure;
  });
  safelyApply(rendererState, "shadow quality", () => {
    const shadowMap = renderer.shadowMap;
    const size = SHADOW_MAP_SIZES[settings2.shadowQuality];
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
      rendererState.appliedScale = settings2.renderScale;
      return;
    }
    if (rendererState.appliedScale === settings2.renderScale) return;
    if (typeof renderer.setPixelRatio !== "function" || rendererState.originalPixelRatio === null) {
      if (settings2.renderScale !== 1)
        throw new Error("WebGLRenderer pixel-ratio controls are unavailable.");
      return;
    }
    renderer.setPixelRatio(
      rendererState.originalPixelRatio * settings2.renderScale
    );
    rendererState.appliedScale = settings2.renderScale;
  });
}
function createRendererState(renderer) {
  return {
    renderer,
    originalToneMapping: renderer.toneMapping,
    originalOutputColorSpace: renderer.outputColorSpace,
    originalExposure: renderer.toneMappingExposure,
    originalShadowEnabled: renderer.shadowMap?.enabled,
    originalShadowType: renderer.shadowMap?.type,
    originalPixelRatio: typeof renderer.getPixelRatio === "function" ? renderer.getPixelRatio() : null,
    appliedScale: null
  };
}
function restoreRenderer(rendererState) {
  const { renderer } = rendererState;
  renderer.outputColorSpace = rendererState.originalOutputColorSpace;
  if ("toneMapping" in renderer)
    renderer.toneMapping = rendererState.originalToneMapping;
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
  resolveSettings() {
    const source = this.getSettings();
    if (this.settingsRevision !== this.revision || this.settingsSource !== source || this.settingsPreset !== source.preset || this.settingsEnabled !== source.enabled || this.settingsOverrides !== source.overrides) {
      this.resolvedSettings = resolvePresetSettings(source);
      this.settingsSource = source;
      this.settingsRevision = this.revision;
      this.settingsPreset = source.preset;
      this.settingsEnabled = source.enabled;
      this.settingsOverrides = source.overrides;
    }
    return this.resolvedSettings;
  }
  onRender(renderer, scene, camera) {
    const now = performance.now();
    this.camera = camera;
    if (!scene?.isScene) return;
    const settings2 = this.resolveSettings();
    if (!settings2.enabled) {
      if (this.sceneState || this.rendererState) this.restore();
      return;
    }
    if (renderer !== this.activeRenderer) this.attachRenderer(renderer);
    if (settings2.atmosphereEnabled && !this.cinematic.capabilities.features.depthTexture)
      settings2.fogEnabled = true;
    if (scene !== this.activeScene) {
      if (countMeshes(scene) < 3) return;
      this.attachScene(scene);
    }
    const csmChanged = usesNativeCSM(scene) !== Boolean(this.sceneState.nativeCSM);
    if (csmChanged) {
      restoreMaterials(this.sceneState);
      this.sceneState.lastScanAt = 0;
    }
    if (this.revision !== this.appliedRevision || csmChanged || now - this.sceneState.lastScanAt >= 1e3) {
      if (this.revision !== this.appliedRevision) {
        restoreMaterials(this.sceneState);
        this.sceneState.lastScanAt = 0;
      }
      applyRendererEffects(this.rendererState, this.three, settings2);
      this.cinematic.update(this.sceneState, settings2, now, camera);
      applySceneEffects(this.sceneState, this.three, settings2, camera, now);
      this.cinematic.shadows.scan(scene);
      this.cinematic.warmup.schedule(
        scene,
        camera,
        settings2,
        this.cinematic.post,
        this.cinematic.brakeLights,
        this.sceneState.processedMeshes.size,
        this.sceneState.nativeCSM
      );
      this.modifiedMaterials = this.sceneState.originalMaterials.size;
      this.appliedRevision = this.revision;
    }
    if (this.cinematic.guard.failures.has("material")) {
      restoreMaterials(this.sceneState);
      (this.sceneState.failedEffects ??= /* @__PURE__ */ new Set()).add("material response");
    }
    this.cinematic.frame(settings2, now, camera);
    this.updateCSM(settings2);
    refreshFrameEffects(
      this.sceneState,
      this.rendererState,
      this.three,
      settings2,
      camera
    );
    syncMaterialColors(this.sceneState, settings2);
  }
  updateCSM(settings2) {
    const csm = this.nativeWrapper?.csm;
    if (!csm || !this.sceneState.nativeCSM) return;
    if (!this.csmSnapshot || this.csmSnapshot.csm !== csm)
      this.csmSnapshot = {
        csm,
        direction: csm.lightDirection.clone(),
        sizes: csm.lights.map((l) => l.shadow.mapSize.clone())
      };
    if (!settings2.nativeCSMTuning) {
      csm.lights.forEach((light, index) => {
        const size = this.csmSnapshot.sizes[index];
        if (size && light.shadow.mapSize.x !== size.x) {
          light.shadow.map?.dispose();
          light.shadow.map = null;
          light.shadow.mapSize.copy(size);
        }
        const original = this.sceneState.lightSnapshots.get(light)?.shadow;
        if (original) {
          light.shadow.bias = original.bias;
          light.shadow.normalBias = original.normalBias;
          light.shadow.radius = original.radius;
          if (typeof original.intensity === "number")
            light.shadow.intensity = original.intensity;
        }
      });
      csm.lightDirection.copy(this.cinematic.palette.direction).negate();
      csm.update();
      return;
    }
    csm.lightDirection.copy(this.cinematic.palette.direction).negate();
    const limit = this.cinematic.capabilities.maxTextureSize;
    csm.lights.forEach((light, index) => {
      const requested = { off: 0, low: 1024, medium: 2048, high: 4096 }[settings2.shadowQuality];
      const size = Math.min(
        limit,
        index < 2 ? requested : Math.min(requested, 2048)
      );
      if (size && light.shadow.mapSize.x !== size) {
        light.shadow.map?.dispose();
        light.shadow.map = null;
        light.shadow.mapSize.set(size, size);
      }
      light.shadow.bias = settings2.shadowBias * (1 + index * 0.3);
      light.shadow.normalBias = index < 2 ? settings2.shadowNormalBias * (1 + index) : Math.max(
        settings2.shadowNormalBias,
        this.sceneState.lightSnapshots.get(light)?.shadow?.normalBias ?? 0.1
      );
      light.shadow.radius = settings2.shadowSoftness;
      if (typeof light.shadow.intensity === "number")
        light.shadow.intensity = settings2.shadowStrength;
      light.color.copy(this.cinematic.palette.sun);
    });
    csm.update();
  }
  aroundRender(renderer, scene, camera, draw) {
    if (scene !== this.activeScene || !this.cinematic) return draw();
    return this.cinematic.render(
      scene,
      camera,
      this.resolveSettings(),
      draw
    );
  }
  onFrame(renderer, scene, duration) {
    if (scene !== this.activeScene || renderer !== this.activeRenderer) return;
    const settings2 = this.resolveSettings();
    if (settings2.enabled) {
      this.renderCount += 1;
      this.recordFrame(duration, performance.now(), settings2);
    }
  }
  attachScene(scene) {
    if (this.sceneState) restoreScene(this.sceneState);
    this.cinematic?.detachScene();
    this.cinematic?.post?.pool.dispose();
    this.activeScene = scene;
    this.sceneState = createSceneState(scene);
    this.sceneState.maxShadowSize = this.cinematic?.capabilities.maxTextureSize;
    this.cinematic?.attachScene(scene);
    this.appliedRevision = -1;
  }
  attachRenderer(renderer) {
    this.settingsRevision = -1;
    if (this.sceneState) restoreScene(this.sceneState);
    this.sceneState = null;
    this.activeScene = null;
    if (this.rendererState) restoreRenderer(this.rendererState);
    this.cinematic?.dispose();
    this.cinematic = new CinematicRenderer(this.three, renderer);
    this.removeContextListener?.();
    const onRestored = () => this.restore();
    renderer.domElement?.addEventListener("webglcontextrestored", onRestored);
    this.removeContextListener = () => renderer.domElement?.removeEventListener(
      "webglcontextrestored",
      onRestored
    );
    this.activeRenderer = renderer;
    this.rendererState = createRendererState(renderer);
    this.rendererState.postScale = !!this.cinematic.post;
    this.appliedRevision = -1;
  }
  restore() {
    this.removeContextListener?.();
    this.removeContextListener = null;
    if (this.csmSnapshot) {
      const { csm, direction, sizes } = this.csmSnapshot;
      csm.lightDirection.copy(direction);
      csm.lights.forEach((l, i) => {
        if (sizes[i]) l.shadow.mapSize.copy(sizes[i]);
      });
      this.csmSnapshot = null;
    }
    this.cinematic?.dispose();
    this.cinematic = null;
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
    const ordered = Array.from(this.samples.slice(0, this.sampleCount)).sort(
      (a, b) => a - b
    );
    const average = ordered.reduce((sum, value) => sum + value, 0) / Math.max(1, ordered.length);
    const p95 = ordered[Math.max(0, Math.ceil(ordered.length * 0.95) - 1)] ?? 0;
    this.onMetrics({
      capabilities: this.cinematic?.report(),
      gpu: this.cinematic?.timer.metrics(),
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
var findThreeNamespace = discoverThree;
function installRenderHook(three, onRender) {
  const prototype = three?.WebGLRenderer?.prototype;
  if (!prototype) {
    throw new Error("Three.js WebGLRenderer is not accessible.");
  }
  const existing = prototype[RENDER_PATCH];
  if (existing) {
    existing.listeners.add(onRender);
    return () => existing.remove(onRender);
  }
  const originalRender = prototype.render;
  const listeners = /* @__PURE__ */ new Set([onRender]);
  const instances = /* @__PURE__ */ new Map();
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "render");
  let depth = 0;
  function invoke(original, renderer, scene, camera, args) {
    if (depth) return original.call(renderer, scene, camera, ...args);
    depth++;
    try {
      for (const listener of listeners) {
        try {
          listener.before(renderer, scene, camera);
        } catch (error) {
          console.error(
            "[PolyShade] Render pre-hook failed; the original frame will still render.",
            error
          );
        }
      }
      const started = performance.now();
      try {
        const draw = (renderScene = scene, renderCamera = camera) => original.call(renderer, renderScene, renderCamera, ...args);
        for (const listener of listeners) {
          if (listener.around)
            return listener.around(renderer, scene, camera, draw);
        }
        return draw();
      } finally {
        const duration = performance.now() - started;
        for (const listener of listeners) {
          try {
            listener.after(renderer, scene, camera, duration);
          } catch (error) {
            console.error("[PolyShade] Render post-hook failed.", error);
          }
        }
      }
    } finally {
      depth--;
    }
  }
  function polyShadeRender(scene, camera, ...args) {
    return invoke(originalRender, this, scene, camera, args);
  }
  function remove(listener) {
    listeners.delete(listener);
    if (listeners.size) return;
    for (const [renderer, entry] of instances) {
      if (renderer.render === entry.wrapper) renderer.render = entry.original;
    }
    instances.clear();
    if (descriptor) Object.defineProperty(prototype, "render", descriptor);
    else delete prototype.render;
    delete prototype[RENDER_PATCH];
  }
  Object.defineProperty(prototype, RENDER_PATCH, {
    configurable: true,
    value: { originalRender, listeners, wrapper: polyShadeRender, remove }
  });
  if (typeof originalRender === "function") prototype.render = polyShadeRender;
  else {
    Object.defineProperty(prototype, "render", {
      configurable: true,
      set(original) {
        const renderer = this;
        const wrapper = function(scene, camera, ...args) {
          return invoke(original, renderer, scene, camera, args);
        };
        Object.defineProperty(renderer, "render", {
          configurable: true,
          enumerable: true,
          writable: true,
          value: wrapper
        });
        instances.set(renderer, { original, wrapper });
      }
    });
  }
  return () => remove(onRender);
}
function installGameRendererHook(three, onUpdate) {
  const prototype = three.GameRenderer?.prototype;
  if (!prototype?.update) return () => {
  };
  const original = prototype.update;
  const wrapper = function(...args) {
    onUpdate(this);
    return original.apply(this, args);
  };
  prototype.update = wrapper;
  return () => {
    if (prototype.update === wrapper) prototype.update = original;
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
#${PANEL_ID} details { border-top:1px solid #465260;margin-top:8px;padding-top:7px; }
#${PANEL_ID} summary { cursor:pointer; font-weight:600; padding:3px 0; }
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
#${PANEL_ID} .polyshade-range {
  appearance: none; width: 100%; height: 5px; padding: 0; margin: 5px 0;
  background: #526171; border: 0; border-radius: 3px; box-shadow: none;
}
#${PANEL_ID} .polyshade-range::-webkit-slider-thumb {
  appearance: none; width: 12px; height: 12px; border: 0; border-radius: 50%;
  background: #d8b985; box-shadow: none;
}
#${PANEL_ID} .polyshade-range::-moz-range-thumb {
  width: 12px; height: 12px; border: 0; border-radius: 50%; background: #d8b985;
}
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
  row.append(
    createElement(container.ownerDocument, "span", "", labelText),
    control
  );
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
  const enabled = makeCheck(
    document2,
    "PolyShade enabled",
    initialSettings.enabled,
    callbacks.onEnabled
  );
  content.appendChild(enabled);
  const controls = {};
  for (const [group, definitions] of Object.entries(OPTIONS)) {
    const details = createElement(document2, "details");
    details.append(createElement(document2, "summary", "", group));
    if (group === "Sky") details.open = true;
    for (const [key, definition] of Object.entries(definitions)) {
      const [label, value, min, max] = definition;
      if (key === "materialOverrides") continue;
      let control;
      if (typeof value === "number") {
        const range = makeRange(document2, {
          min,
          max,
          step: max - min > 10 ? 1 : max - min < 0.01 ? 1e-5 : 0.01,
          value: initialSettings.values[key],
          format: (v) => String(Number(v.toFixed(5))),
          onChange: (v) => callbacks.onValue(key, v)
        });
        control = range.element;
        controls[key] = (v) => range.setValue(v);
      } else if (typeof value === "boolean") {
        control = makeCheck(
          document2,
          label,
          initialSettings.values[key],
          (v) => callbacks.onValue(key, v)
        );
        controls[key] = (v) => {
          control.querySelector("input").checked = v;
        };
        details.append(control);
        continue;
      } else if (value.startsWith("#")) {
        control = makeColor(
          document2,
          initialSettings.values[key],
          (v) => callbacks.onValue(key, v)
        );
        controls[key] = (v) => {
          control.value = v;
        };
      } else {
        control = makeSelect(
          document2,
          min.map((v) => [v, v]),
          initialSettings.values[key],
          (v) => callbacks.onValue(key, v)
        );
        controls[key] = (v) => {
          control.value = v;
        };
      }
      control.dataset.option = key;
      addRow(details, label, control);
    }
    content.append(details);
  }
  const inspector = createElement(document2, "details");
  inspector.append(
    createElement(document2, "summary", "", "Material inspector / overrides")
  );
  const filter = document2.createElement("input");
  filter.placeholder = "Filter names or category";
  filter.style.width = "100%";
  inspector.append(filter);
  const listing = createElement(document2, "pre", "polyshade-metrics");
  listing.style.maxHeight = "190px";
  listing.style.overflow = "auto";
  inspector.append(listing);
  const refresh = createElement(document2, "button", "", "Refresh inspector");
  refresh.onclick = () => {
    const records = callbacks.onInspect?.() ?? [];
    const needle = filter.value.toLowerCase();
    listing.textContent = records.filter((r) => JSON.stringify(r).toLowerCase().includes(needle)).map(
      (r) => `${r.kind} (${Math.round(r.confidence * 100)}%) ${r.type}
material:${r.material} mesh:${r.mesh} parent:${r.parent}
${r.evidence.join(", ")}`
    ).join("\n\n") || "No matching materials.";
  };
  inspector.append(refresh);
  let picking = false;
  const pick = createElement(document2, "button", "", "Pick from canvas");
  pick.onclick = () => {
    picking = !picking;
    pick.textContent = picking ? "Alt-click a surface" : "Pick from canvas";
  };
  inspector.append(pick);
  const pickHandler = (event) => {
    if (!picking || !event.altKey || panel2.contains(event.target)) return;
    const records = callbacks.onPick?.(event) ?? [];
    listing.textContent = records.map(
      (r) => `${r.kind} (${Math.round(r.confidence * 100)}%) ${r.type}
material:${r.material} mesh:${r.mesh} parent:${r.parent}
${r.evidence.join(", ")}`
    ).join("\n\n");
    picking = false;
    pick.textContent = "Pick from canvas";
  };
  document2.addEventListener("pointerdown", pickHandler);
  const pattern = document2.createElement("input");
  pattern.placeholder = "mesh:Car* or material:Paint";
  pattern.style.width = "100%";
  inspector.append(pattern);
  const kind = makeSelect(
    document2,
    MATERIAL_KINDS.map((v) => [v, v]),
    "car",
    () => {
    }
  );
  inspector.append(kind);
  const apply = createElement(document2, "button", "", "Save override");
  let overrideValues = initialSettings.values.materialOverrides;
  apply.onclick = () => {
    if (!/^(material|mesh|parent):.+/.test(pattern.value)) return;
    callbacks.onValue("materialOverrides", {
      ...overrideValues,
      [pattern.value]: kind.value
    });
  };
  const remove = createElement(document2, "button", "", "Remove pattern");
  remove.onclick = () => {
    const next = { ...overrideValues };
    delete next[pattern.value];
    callbacks.onValue("materialOverrides", next);
  };
  inspector.append(apply, remove);
  content.append(inspector);
  const actions = createElement(document2, "div", "polyshade-actions");
  const reset = createElement(document2, "button", "", "Reset preset");
  reset.type = "button";
  reset.addEventListener("click", callbacks.onReset);
  const disable = createElement(document2, "button", "", "Disable");
  disable.type = "button";
  disable.addEventListener("click", () => callbacks.onEnabled(false));
  actions.append(reset, disable);
  content.appendChild(actions);
  const status = createElement(
    document2,
    "div",
    "polyshade-status",
    "Waiting for the live PolyTrack scene."
  );
  status.setAttribute("role", "status");
  content.appendChild(status);
  const metrics = createElement(document2, "div", "polyshade-metrics");
  metrics.hidden = true;
  content.appendChild(metrics);
  content.appendChild(
    createElement(
      document2,
      "p",
      "polyshade-muted",
      "F7 toggles PolyShade. UI remains outside the game canvas."
    )
  );
  panel2.appendChild(content);
  document2.body.appendChild(panel2);
  return {
    setStatus(text) {
      status.textContent = text;
    },
    setSettings(settings2) {
      presetSelect.value = settings2.preset;
      enabled.querySelector("input").checked = settings2.enabled;
      for (const [key, set] of Object.entries(controls))
        set(settings2.values[key]);
      overrideValues = settings2.values.materialOverrides;
      metrics.hidden = !settings2.values.debugEnabled;
    },
    setMetrics(data) {
      if (metrics.hidden) return;
      const shadowSize = SHADOW_MAP_SIZES[data.shadowQuality] || "off";
      metrics.textContent = [
        `FPS (render calls): ${data.fps.toFixed(0)}`,
        `CPU render submission avg / p95: ${data.averageFrameTime.toFixed(2)} / ${data.p95FrameTime.toFixed(2)} ms`,
        `Preset: ${PRESET_LABELS[data.preset]} | scale: ${data.renderScale.toFixed(2)}x`,
        `Shadow map: ${shadowSize} | tuned materials: ${data.modifiedMaterials}`,
        data.gpu ? `GPU render avg / p95: ${data.gpu.average.toFixed(2)} / ${data.gpu.p95.toFixed(2)} ms (${data.gpu.samples} samples)` : "GPU timer unavailable / no completed queries",
        ...data.capabilities ? [
          `WebGL ${data.capabilities.webgl2 ? 2 : 1} | HDR ${data.capabilities.halfFloat} | depth ${data.capabilities.features.depthTexture}`,
          `Passes: ${data.capabilities.passes?.join(" ? ")}`,
          `Targets: ${JSON.stringify(data.capabilities.resources)}`,
          `Environment: ${JSON.stringify(data.capabilities.environment)}`,
          `Failures: ${JSON.stringify(data.capabilities.failures)}`,
          ...data.capabilities.profile ? Object.entries(data.capabilities.profile).map(
            ([name, p]) => `${name}: CPU ${p.cpu.average.toFixed(2)} / ${p.cpu.p95.toFixed(2)} ms; GPU ${p.gpu ? p.gpu.average.toFixed(2) + " / " + p.gpu.p95.toFixed(2) + " ms" : "unavailable"}`
          ) : []
        ] : []
      ].join("\n");
    },
    dispose() {
      document2.removeEventListener("pointerdown", pickHandler);
      panel2.remove();
      style.remove();
    }
  };
}
function installHotkey(document2, toggle) {
  const onKeyDown = (event) => {
    if (event.code !== "F7" || event.repeat || event.target?.isContentEditable)
      return;
    const tagName = event.target?.tagName?.toLowerCase();
    if (tagName === "input" || tagName === "textarea" || tagName === "select")
      return;
    event.preventDefault();
    toggle();
  };
  document2.addEventListener("keydown", onKeyDown, true);
  return () => document2.removeEventListener("keydown", onKeyDown, true);
}

// src/settings.js
var SETTINGS_SCHEMA_VERSION = 2;
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
function validateOption(key, value) {
  const definition = OPTION_DEFINITIONS[key];
  if (!definition) throw new TypeError(`Invalid PolyShade setting: ${key}`);
  const sample = definition[1];
  if (key === "materialOverrides") {
    if (!isPlainObject(value))
      throw new TypeError("Material overrides must be an object");
    return Object.fromEntries(
      Object.entries(value).filter(
        ([pattern, kind]) => pattern.length <= 160 && /^(material|mesh|parent):.+/.test(pattern) && MATERIAL_KINDS.includes(kind)
      ).slice(0, 100)
    );
  }
  if (typeof sample === "boolean") {
    if (typeof value !== "boolean")
      throw new TypeError(`${key} must be a boolean`);
    return value;
  }
  if (typeof sample === "string") {
    if (sample.startsWith("#")) {
      if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value))
        throw new TypeError(`${key} must be a six-digit hexadecimal color`);
      return value.toLowerCase();
    }
    if (!definition[2].includes(value))
      throw new RangeError(`Unknown ${key}: ${value}`);
    return value;
  }
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new TypeError(`Invalid PolyShade setting: ${key}`);
  return Math.min(definition[3], Math.max(definition[2], value));
}
function normalizeOverrides(overrides) {
  const normalized = {};
  if (!isPlainObject(overrides)) return normalized;
  for (const [key, value] of Object.entries(overrides)) {
    try {
      normalized[key] = validateOption(key, value);
    } catch {
    }
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
  if (value.schemaVersion === 1 || value.schemaVersion === 0 || value.schemaVersion === void 0) {
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
    warn(
      "[PolyShade] Saved settings could not be read; defaults are active.",
      error
    );
    return createDefaultSettings();
  }
}
function saveSettings(storage, settings2, warn = console.warn) {
  if (!storage) {
    warn(
      "[PolyShade] Settings were not persisted because localStorage is unavailable."
    );
    return false;
  }
  try {
    storage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(normalizeSettings(settings2))
    );
    return true;
  } catch (error) {
    warn("[PolyShade] Settings could not be persisted.", error);
    return false;
  }
}
function selectPreset(settings2, preset) {
  if (!PRESET_IDS.includes(preset))
    throw new RangeError(`Unknown PolyShade preset: ${preset}`);
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    preset,
    enabled: preset !== "vanilla",
    overrides: {}
  };
}
function updateOverride(settings2, key, value) {
  const next = normalizeSettings(settings2);
  value = validateOption(key, value);
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
var removeGameHook;
var removeHotkey;
var unloadListener;
var confirmedScene;
function getStorage() {
  try {
    return globalThis.localStorage;
  } catch (error) {
    console.warn(
      "[PolyShade] Browser storage is unavailable; settings will reset on reload.",
      error
    );
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
  panel?.setStatus(
    enabled ? "PolyShade enabled." : "Restored the original rendering state."
  );
}
function attachRenderer() {
  controller?.restore();
  removeRenderHook?.();
  try {
    const three = findThreeNamespace(pml);
    controller = new RenderController(
      three,
      () => settings,
      (metrics) => panel?.setMetrics(metrics)
    );
    removeGameHook?.();
    removeGameHook = installGameRendererHook(three, (wrapper) => {
      controller.nativeWrapper = wrapper;
    });
    removeRenderHook = installRenderHook(three, {
      before(renderer, scene, camera) {
        try {
          controller.onRender(renderer, scene, camera);
          if (controller.activeScene === scene && confirmedScene !== scene) {
            confirmedScene = scene;
            panel?.setStatus(
              `Enhancing the live scene; ${controller.modifiedMaterials} mesh materials tuned.`
            );
          }
        } catch (error) {
          console.error(
            "[PolyShade] Scene enhancement failed; rendering continues unchanged.",
            error
          );
        }
      },
      around(renderer, scene, camera, draw) {
        return controller.aroundRender(renderer, scene, camera, draw);
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
    console.error(
      "[PolyShade] Could not attach to the live PolyTrack renderer.",
      error
    );
    panel?.setStatus(`Renderer unavailable: ${error.message}`);
  }
}
function makePanel() {
  if (!globalThis.document?.body || panel) return;
  panel = mountPanel(
    document,
    {
      onInspect() {
        return controller?.sceneState?.materialInspector ?? [];
      },
      onPick(event) {
        if (!controller?.activeRenderer || !controller.three.Raycaster)
          return [];
        const c = controller, rect = c.activeRenderer.domElement.getBoundingClientRect();
        const mouse = new c.three.Vector2(
          (event.clientX - rect.left) / rect.width * 2 - 1,
          -(event.clientY - rect.top) / rect.height * 2 + 1
        );
        const ray = new c.three.Raycaster();
        ray.setFromCamera(mouse, c.camera);
        const mesh = ray.intersectObjects(c.activeScene.children, true).find((hit) => !hit.object.userData.polyShadeOwned)?.object;
        if (!mesh) return [];
        return (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((material) => ({
          ...describeMaterial(mesh, material),
          ...classifyMaterialEvidence(
            mesh,
            material,
            resolvePresetSettings(settings).materialOverrides
          ),
          type: material.type
        }));
      },
      onPreset(preset) {
        persistAndApply(selectPreset(settings, preset));
        panel?.setStatus(
          preset === "vanilla" ? "Vanilla rendering restored." : `${preset} preset loaded.`
        );
      },
      onEnabled: toggleEnabled,
      onValue(key, value) {
        persistAndApply(updateOverride(settings, key, value));
      },
      onReset() {
        persistAndApply(selectPreset(settings, settings.preset));
        panel?.setStatus(`${settings.preset} preset restored.`);
      }
    },
    {
      preset: settings.preset,
      enabled: settings.enabled && settings.preset !== "vanilla",
      values: resolvePresetSettings(settings)
    }
  );
}
function restoreAndDispose() {
  controller?.restore();
  removeRenderHook?.();
  removeHotkey?.();
  removeGameHook?.();
  if (unloadListener)
    globalThis.removeEventListener?.("pagehide", unloadListener);
  panel?.dispose();
  controller = null;
  confirmedScene = null;
  panel = null;
  removeRenderHook = void 0;
  removeHotkey = void 0;
}
var PolyShadeMod = class extends PolyMod {
};
var polyMod = Object.assign(new PolyShadeMod(), {
  modName: "PolyShade",
  modID: "polyshade",
  modVersion: "0.2.6",
  modAuthor: "PolyShade",
  modDescription: "<p>Lighting, shadows, material response, and atmosphere for PolyTrack's live Three.js scene. Rendering only; no physics or simulation changes.</p>",
  touchingPhysics: false,
  preInit(pmlInstance) {
    pml = pmlInstance;
  },
  init(pmlInstance) {
    pml ??= pmlInstance;
    settings = loadSettings(getStorage());
    attachRenderer();
  },
  postInit() {
    if (!settings) settings = loadSettings(getStorage());
    makePanel();
    if (controller)
      panel?.setStatus(
        controller.activeScene ? `Enhancing the live scene; ${controller.modifiedMaterials} mesh materials tuned.` : "Renderer hook installed; waiting for a rendered scene."
      );
    removeHotkey ??= installHotkey(
      document,
      () => toggleEnabled(!settings.enabled)
    );
  },
  onGameLoad() {
    if (!settings) settings = loadSettings(getStorage());
    makePanel();
    if (!removeHotkey)
      removeHotkey = installHotkey(
        document,
        () => toggleEnabled(!settings.enabled)
      );
    if (!controller) attachRenderer();
    unloadListener ??= restoreAndDispose;
    globalThis.addEventListener?.("pagehide", unloadListener, { once: true });
  },
  dispose: restoreAndDispose
});
export {
  polyMod
};
