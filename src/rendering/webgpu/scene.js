import { SwarmInstances } from "../swarm-interop.js";
import * as T from "three/src/Three.WebGPU.js";
import {
  uniform,
  positionLocal,
  materialRoughness,
  materialColor,
  mix,
  texture,
  uv,
  vec3,
  smoothstep,
  length,
  wgslFn,
} from "three/src/Three.TSL.js";
import { CSMShadowNode } from "three/addons/csm/CSMShadowNode.js";

// PolyTrack shader uniforms use both Color and Vector3 representations.
export function copyLinearColour(target, value) {
  const rgb = [
    value?.r ?? value?.x ?? value?.[0],
    value?.g ?? value?.y ?? value?.[1],
    value?.b ?? value?.z ?? value?.[2],
  ];
  if (!rgb.every(Number.isFinite))
    throw new Error("Native colour uniform is not a finite RGB vector");
  return target.setRGB(...rgb);
}

// Only CPU scene descriptions cross this boundary. GPU resources never cross APIs.
// Own attributes are essential: WebGPU may realign index/storage attributes.
export class GPUScene {
  constructor() {
    this.scene = new T.Scene();
    this.swarms = new SwarmInstances(this);
    this.objects = new Map();
    this.materials = new Map();
    this.materialLists = new WeakMap();
    this.geometries = new Map();
    this.textures = new Map();
    this.topologyVersion = 0;
    this.camera = new T.PerspectiveCamera();
    this.camera.matrixAutoUpdate = false;
    this.camera.matrixWorldAutoUpdate = false;
    this.camera.coordinateSystem = T.WebGPUCoordinateSystem;
    this.fill = new T.HemisphereLight();
    this.nativeFill = new Map();
    this.sun = new T.DirectionalLight();
    this.sun.shadow.shadowNode = new CSMShadowNode(this.sun, {
      cascades: 3,
      maxFar: 200,
    });
    this.scene.add(this.fill, this.sun, this.sun.target);
    this.skippedProjected = 0;
  }
  texture(source) {
    if (!source) return null;
    if (!this.textures.has(source)) {
      if (source.isRenderTargetTexture)
        throw new Error("WebGPU cannot import a WebGL render-target texture");
      if (source.isCompressedTexture)
        throw new Error(
          "Compressed game textures require a WebGPU texture adapter",
        );
      const texture = source.isDataTexture
        ? new T.DataTexture(
            source.image.data,
            source.image.width,
            source.image.height,
            source.format,
            source.type,
          )
        : source.isCubeTexture
          ? new T.CubeTexture(source.image)
          : new T.Texture(source.image);
      for (const k of [
        "mapping",
        "wrapS",
        "wrapT",
        "magFilter",
        "minFilter",
        "anisotropy",
        "format",
        "type",
        "colorSpace",
        "flipY",
        "generateMipmaps",
      ])
        texture[k] = source[k];
      texture.offset.copy(source.offset);
      texture.repeat.copy(source.repeat);
      texture.rotation = source.rotation;
      texture.needsUpdate = true;
      const onDispose = () => {
        texture.dispose();
        this.textures.delete(source);
        source.removeEventListener("dispose", onDispose);
      };
      source.addEventListener("dispose", onDispose);
      this.textures.set(source, {
        texture,
        version: source.version,
        onDispose,
      });
    }
    const e = this.textures.get(source);
    if (e.version !== source.version) {
      e.texture.image = source.image;
      e.texture.needsUpdate = true;
      e.version = source.version;
    }
    return e.texture;
  }
  geometry(source) {
    if (!this.geometries.has(source)) {
      const geo = new T.BufferGeometry();
      geo.groups = source.groups.map((g) => ({ ...g }));
      geo.setDrawRange(source.drawRange.start, source.drawRange.count);
      geo.morphTargetsRelative = source.morphTargetsRelative;
      for (const [key, list] of Object.entries(source.morphAttributes))
        geo.morphAttributes[key] = list.map(
          (a) =>
            new T.BufferAttribute(a.array.slice(), a.itemSize, a.normalized),
        );
      this.geometries.set(source, { geo, versions: new Map() });
    }
    const { geo, versions } = this.geometries.get(source);
    for (const [key, a] of Object.entries({
      ...source.attributes,
      index: source.index,
    })) {
      if (!a) continue;
      if (a.isInterleavedBufferAttribute)
        throw new Error(
          "Interleaved game geometry is unsupported by the WebGPU compatibility layer",
        );
      if (versions.get(key) === a.version) continue;
      let attr = key === "index" ? geo.index : geo.getAttribute(key);
      if (!attr || attr.array.length !== a.array.length) {
        attr = new T.BufferAttribute(a.array.slice(), a.itemSize, a.normalized);
        if (key === "index") geo.setIndex(attr);
        else geo.setAttribute(key, attr);
      } else {
        attr.array.set(a.array);
        attr.needsUpdate = true;
      }
      versions.set(key, a.version);
    }
    return geo;
  }
  material(source) {
    if (!this.materials.has(source)) {
      let material;
      if (source.name === "PolyShade car contact shadow") {
        material = new T.MeshBasicNodeMaterial();
        material.colorNode = vec3(0.025, 0.035, 0.05);
        const opacity = uniform(0);
        material.opacityNode = smoothstep(0.12, 1, length(uv().mul(2).sub(1)))
          .oneMinus()
          .mul(opacity);
        material.userData.opacity = opacity;
      } else if (source.isShaderMaterial || source.isRawShaderMaterial) {
        throw new Error(
          `Unsupported legacy shader material: ${source.name || source.type}`,
        );
      } else
        material = source.isMeshPhysicalMaterial
          ? new T.MeshPhysicalNodeMaterial()
          : source.isMeshStandardMaterial
            ? new T.MeshStandardNodeMaterial()
            : source.isMeshBasicMaterial
              ? new T.MeshBasicNodeMaterial()
              : source.isMeshPhongMaterial
                ? new T.MeshPhongNodeMaterial()
                : new T.MeshLambertNodeMaterial();
      const callback =
        this.shadowSnapshots?.get(source)?.callback ?? source.onBeforeCompile;
      const emptyCallback = /\{\s*\}$/.test(String(callback));
      if (
        !emptyCallback &&
        callback !== Object.getPrototypeOf(source).onBeforeCompile &&
        source.name !== "PolyShade car contact shadow"
      ) {
        if (
          String(callback).includes("carColorPattern") ||
          (source.name === "Main" && source.defines?.USE_CSM !== undefined)
        ) {
          // Run only the CPU shader-description callback to obtain the game's
          // live uniform handles. No legacy shader or GL image is rendered.
          const shader = {
            vertexShader: "#include <common>\n#include <begin_vertex>",
            fragmentShader:
              "vec4 diffuseColor = vec4( diffuse, opacity );\n#include <common>\n#include <lights_fragment_begin>\n#include <shadowmap_pars_fragment>",
            uniforms: {},
            defines: {},
          };
          callback.call(source, shader, null);
          const pattern = shader.uniforms.carColorPattern,
            secondary = shader.uniforms.carColorSecondary;
          if (pattern && secondary) {
            const colour = uniform(
              copyLinearColour(new T.Color(), secondary.value),
            );
            const patternNode = texture(this.texture(pattern.value), uv());
            material.colorNode = mix(materialColor.rgb, colour, patternNode.g);
            material.userData.carColours = {
              secondary,
              colour,
              pattern,
              patternNode,
              sourcePattern: pattern.value,
            };
          } else if (source.defines?.USE_CSM === undefined)
            throw new Error("Native car pattern uniforms are unavailable");
        } else if (
          source.customProgramCacheKey?.().includes("PolyShade roughness v2")
        ) {
          const detail = wgslFn(
            `fn roughnessDetail(position:vec3f,value:f32)->f32{return clamp(value+.035*(fract(sin(dot(floor(position*12.),vec3f(12.9898,78.233,37.719)))*43758.5453)-.5),.04,1.);}`,
          );
          material.roughnessNode = detail({
            position: positionLocal,
            value: materialRoughness,
          });
        } else if (source.defines?.USE_CSM === undefined) {
          this.unsupportedCallback = {
            name: source.name,
            type: source.type,
            callback: String(callback),
            defines: source.defines,
          };
          throw new Error(
            `Unknown native shader callback: ${source.name || source.type}`,
          );
        }
      }
      this.materials.set(source, material);
    }
    const m = this.materials.get(source);
    if (source.color) m.color.copy(source.color);
    if (source.emissive && m.emissive) m.emissive.copy(source.emissive);
    if (source.specular && m.specular) m.specular.copy(source.specular);
    if (m.userData.carColours) {
      const { secondary, colour, pattern, patternNode, sourcePattern } =
        m.userData.carColours;
      copyLinearColour(colour.value, secondary.value);
      if (pattern.value !== sourcePattern) {
        patternNode.value = this.texture(pattern.value);
        m.userData.carColours.sourcePattern = pattern.value;
      }
    }
    for (const key of [
      "name",
      "visible",
      "colorWrite",
      "fog",
      "wireframe",
      "shadowSide",
      "transparent",
      "opacity",
      "side",
      "vertexColors",
      "alphaTest",
      "depthWrite",
      "depthTest",
      "blending",
      "blendSrc",
      "blendDst",
      "blendEquation",
      "blendSrcAlpha",
      "blendDstAlpha",
      "blendEquationAlpha",
      "premultipliedAlpha",
      "polygonOffset",
      "polygonOffsetFactor",
      "polygonOffsetUnits",
      "flatShading",
      "shininess",
      "reflectivity",
      "refractionRatio",
      "normalMapType",
      "bumpScale",
      "displacementScale",
      "displacementBias",
      "aoMapIntensity",
      "lightMapIntensity",
      "roughness",
      "metalness",
      "emissiveIntensity",
      "envMapIntensity",
      "clearcoat",
      "clearcoatRoughness",
      "transmission",
      "ior",
    ])
      if (source[key] !== undefined) m[key] = source[key];
    for (const key of [
      "map",
      "normalMap",
      "roughnessMap",
      "metalnessMap",
      "emissiveMap",
      "alphaMap",
      "aoMap",
      "specularMap",
      "bumpMap",
      "lightMap",
      "displacementMap",
    ])
      m[key] = source[key] ? this.texture(source[key]) : null;
    if (source.normalScale && m.normalScale) m.normalScale.copy(source.normalScale);
    if (m.userData.opacity)
      m.userData.opacity.value = source.uniforms.opacity.value;
    return m;
  }
  materialList(source) {
    if (!Array.isArray(source)) return this.material(source);
    let list = this.materialLists.get(source);
    if (!list) {
      list = [];
      this.materialLists.set(source, list);
    }
    list.length = source.length;
    for (let i = 0; i < source.length; i++) list[i] = this.material(source[i]);
    return list;
  }
  sync(source, camera, settings, palette, sky, shadowSnapshots, movingSources) {
    if (this.source !== source) {
      this.clear(source);
      this.source = source;
    }
    this.shadowSnapshots = shadowSnapshots;
    source.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const c = this.camera;
    c.near = camera.near;
    c.far = camera.far;
    c.fov = camera.fov;
    c.aspect = camera.aspect;
    c.matrix.copy(camera.matrixWorld);
    c.matrixWorld.copy(camera.matrixWorld);
    c.matrixWorldInverse.copy(camera.matrixWorldInverse);
    c.projectionMatrix.copy(camera.projectionMatrix);
    const p = c.projectionMatrix.elements;
    for (const i of [2, 6, 10, 14]) p[i] = 0.5 * (p[i] + p[i + 1]);
    c.projectionMatrixInverse.copy(c.projectionMatrix).invert();
    c.layers.mask = camera.layers.mask;
    const visited = new Set();
    this.skippedProjected = 0;
    source.traverse((o) => {
      if (!o.isMesh) return;
      if (o.name === "PolyShade sky") return;
      let visible = true;
      for (let n = o; n; n = n.parent) if (!n.visible) visible = false;
      const a = o.matrixWorld.elements;
      if (
        Math.abs(a[15] - 1) > 1e-5 ||
        Math.abs(o.matrixWorld.determinant()) < 1e-9
      ) {
        this.skippedProjected++;
        return;
      }
      if (!visible && !this.objects.has(o)) return;
      if (o.isSkinnedMesh)
        throw new Error(
          "Skinned game meshes require a WebGPU deformation adapter",
        );
      let mesh = this.objects.get(o);
      if (!mesh) {
        const material = this.materialList(o.material);
        const geometry = this.geometry(o.geometry);
        mesh = o.isInstancedMesh
          ? new T.InstancedMesh(geometry, material, o.instanceMatrix.count)
          : new T.Mesh(geometry, material);
        mesh.matrixAutoUpdate = false;
        mesh.matrixWorldAutoUpdate = false;
        mesh.userData.source = o;
        this.scene.add(mesh);
        this.objects.set(o, mesh);
        this.topologyVersion++;
      }
      visited.add(o);
      mesh.visible = visible;
      mesh.geometry = this.geometry(o.geometry);
      if (o.morphTargetInfluences)
        mesh.morphTargetInfluences = [...o.morphTargetInfluences];
      mesh.material = this.materialList(o.material);
      mesh.matrix.copy(o.matrixWorld);
      mesh.matrixWorld.copy(o.matrixWorld);
      mesh.layers.mask = o.layers.mask;
      mesh.renderOrder = o.renderOrder;
      mesh.frustumCulled = o.frustumCulled;
      const cast =
        !o.userData.polyShadeOwned &&
        !!(o.castShadow || movingSources?.has(o)) &&
        ![].concat(mesh.material).some((m) => m.transparent);
      if (mesh.castShadow !== cast) {
        mesh.castShadow = cast;
        this.topologyVersion++;
      }
      mesh.receiveShadow =
        !o.userData.polyShadeOwned &&
        (o.receiveShadow || movingSources?.has(o));
      if (o.isInstancedMesh) {
        mesh.count = o.count;
        if (mesh.userData.instanceVersion !== o.instanceMatrix.version) {
          mesh.instanceMatrix.array.set(o.instanceMatrix.array);
          mesh.instanceMatrix.needsUpdate = true;
          mesh.userData.instanceVersion = o.instanceMatrix.version;
        }
        if (o.instanceColor) {
          if (!mesh.instanceColor)
            mesh.instanceColor = new T.InstancedBufferAttribute(
              o.instanceColor.array.slice(),
              o.instanceColor.itemSize,
            );
          else if (mesh.userData.colorVersion !== o.instanceColor.version) {
            mesh.instanceColor.array.set(o.instanceColor.array);
            mesh.instanceColor.needsUpdate = true;
          }
          mesh.userData.colorVersion = o.instanceColor.version;
        }
      }
    });
    for (const [o, m] of this.objects)
      if (!visited.has(o)) {
        this.scene.remove(m);
        this.objects.delete(o);
        this.topologyVersion++;
      }
    this.fill.color.set(settings.ambientColor);
    this.fill.groundColor.set(settings.groundColor);
    this.fill.intensity = settings.ambientIntensity;
    // The logical scene has already applied the preset to native ambient
    // lights. Preserve those contributions instead of dropping the game's
    // base fill and replacing it with a single, darker hemisphere.
    const fills = new Set();
    let nativeSun = 0;
    source.traverse((light) => {
      if (light.isDirectionalLight && light.visible)
        nativeSun = Math.max(nativeSun, light.intensity);
      if (!light.isAmbientLight && !light.isHemisphereLight) return;
      fills.add(light);
      let copy = this.nativeFill.get(light);
      if (!copy) {
        copy = light.isHemisphereLight
          ? new T.HemisphereLight()
          : new T.AmbientLight();
        this.nativeFill.set(light, copy);
        this.scene.add(copy);
        this.topologyVersion++;
      }
      copy.color.copy(light.color);
      copy.intensity = light.intensity;
      copy.visible = light.visible;
      copy.position.setFromMatrixPosition(light.matrixWorld);
      if (light.isHemisphereLight) copy.groundColor.copy(light.groundColor);
    });
    for (const [light, copy] of this.nativeFill)
      if (!fills.has(light)) {
        this.scene.remove(copy);
        this.nativeFill.delete(light);
        this.topologyVersion++;
      }
    this.fill.visible = fills.size === 0;
    this.sun.color.copy(palette.sun);
    this.sun.intensity = nativeSun > 0 ? nativeSun : settings.sunIntensity;
    this.sun.position
      .copy(palette.direction)
      .multiplyScalar(100)
      .add(c.position.setFromMatrixPosition(c.matrixWorld));
    this.sun.target.position.copy(c.position);
    this.sun.castShadow = settings.shadowQuality !== "off";
    this.sun.shadow.bias = Math.min(-0.0005, settings.shadowBias * 2);
    this.sun.shadow.normalBias = Math.max(0.03, settings.shadowNormalBias);
    this.sun.shadow.intensity = settings.shadowStrength;
    const size = { off: 512, low: 1024, medium: 2048, high: 4096 }[
      settings.shadowQuality
    ];
    this.sun.shadow.mapSize.set(size, size);
    const csm = this.sun.shadow.shadowNode;
    for (const l of csm.lights) {
      l.shadow.bias = this.sun.shadow.bias;
      l.shadow.normalBias = this.sun.shadow.normalBias;
      l.shadow.intensity = settings.shadowStrength;
      l.shadow.mapSize.set(size, size);
      l.shadow.radius = settings.shadowSoftness;
    }
    this.scene.environment = settings.environmentEnabled
      ? this.texture(source.environment)
      : null;
    // Source material envMapIntensity already includes PolyShade's slider.
    this.scene.environmentIntensity = source.environmentIntensity ?? 1;
    const fog = source.fog;
    if (fog) {
      if (!this.scene.fog || this.scene.fog.isFogExp2 !== fog.isFogExp2)
        this.scene.fog = fog.isFogExp2 ? new T.FogExp2() : new T.Fog();
      this.scene.fog.color.copy(fog.color);
      for (const key of ["density", "near", "far"])
        if (fog[key] !== undefined) this.scene.fog[key] = fog[key];
    } else this.scene.fog = null;
    this.scene.background = source.background?.isColor
      ? new T.Color().copy(source.background)
      : new T.Color().copy(palette.horizon);
    this.syncSky(sky, c);
    // Brake spill is actual GPU light transport, not an emissive-only substitute.
    const lightSources = [];
    source.traverse((o) => {
      if (o.isSpotLight || o.isPointLight) lightSources.push(o);
    });
    this.spills ??= [];
    while (this.spills.length < lightSources.length) {
      const src = lightSources[this.spills.length];
      const l = src.isSpotLight ? new T.SpotLight() : new T.PointLight();
      this.scene.add(l);
      if (l.target) this.scene.add(l.target);
      this.spills.push(l);
      this.topologyVersion++;
    }
    this.spills.forEach((l, i) => {
      const s = lightSources[i];
      l.visible = !!s && s.visible;
      if (!s) return;
      l.color.copy(s.color);
      for (const k of ["intensity", "distance", "angle", "penumbra", "decay"])
        if (s[k] !== undefined) l[k] = s[k];
      l.position.setFromMatrixPosition(s.matrixWorld);
      if (l.target)
        l.target.position.setFromMatrixPosition(s.target.matrixWorld);
    });
    return c;
  }
  syncSky(sky, camera) {
    if (!sky) {
      if (this.skyMesh) this.skyMesh.visible = false;
      return;
    }
    if (!this.skyMesh) {
      const u = Object.fromEntries(
        Object.entries(sky.uniforms).map(([k, { value }]) => [
          k,
          uniform(
            typeof value === "number"
              ? value
              : value.isColor
                ? new T.Color().copy(value)
                : new T.Vector3().copy(value),
          ),
        ]),
      );
      const fn = wgslFn(
        `fn stylizedSky(direction:vec3f,zenith:vec3f,horizon:vec3f,sunDirection:vec3f,sunColor:vec3f,intensity:f32,turbidity:f32,discSize:f32,glow:f32,cloudAmount:f32,time:f32)->vec3f{
       let d=normalize(direction);let h=pow(clamp(d.y,0.,1.),.45+.025*turbidity);var c=mix(horizon,zenith,h);c=mix(c,horizon,clamp(-d.y*3.,0.,1.));let mu=max(dot(d,sunDirection),0.);
       c+=sunColor*pow(mu,mix(64.,20.,clamp(turbidity/8.,0.,1.)))*glow*.25+zenith*.04*(1.+mu*mu)*(1.-h);
       c+=sunColor*smoothstep(cos(discSize*.0174533),cos(discSize*.0122173),mu)*5.;
       if(cloudAmount>0.&&d.y>.02){let p=d.xz/max(d.y+.35,.1)*2.+vec2f(time*.001,0.);let n=skyNoise(p)*.78+skyNoise(p*1.9)*.22;let cloud=smoothstep(1.-cloudAmount,1.-cloudAmount+.14,n)*smoothstep(.02,.25,d.y);c=mix(c,mix(horizon*1.2,sunColor*.8,mu*.16),cloud*.55);}return c*intensity;
      }`,
        [
          wgslFn(
            `fn skyHash(p:vec2f)->f32{return fract(sin(dot(p,vec2f(127.1,311.7)))*43758.5453);}`,
          ),
          wgslFn(
            `fn skyNoise(p:vec2f)->f32{let i=floor(p);var f=fract(p);f=f*f*(3.-2.*f);return mix(mix(skyHash(i),skyHash(i+vec2f(1,0)),f.x),mix(skyHash(i+vec2f(0,1)),skyHash(i+vec2f(1,1)),f.x),f.y);}`,
          ),
        ],
      );
      const m = new T.MeshBasicNodeMaterial({
        side: T.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
        toneMapped: false,
      });
      m.colorNode = fn({
        direction: positionLocal,
        zenith: u.zenith,
        horizon: u.horizon,
        sunDirection: u.sunDirection,
        sunColor: u.sunColor,
        intensity: u.intensity,
        turbidity: u.turbidity,
        discSize: u.discSize,
        glow: u.glow,
        cloudAmount: u.cloudAmount,
        time: u.time,
      });
      this.skyMesh = new T.Mesh(new T.SphereGeometry(1, 24, 12), m);
      this.skyMesh.renderOrder = -10000;
      this.skyMesh.frustumCulled = false;
      this.scene.add(this.skyMesh);
      this.skyUniforms = u;
    }
    for (const [k, { value }] of Object.entries(sky.uniforms)) {
      const u = this.skyUniforms[k];
      if (typeof value === "number") u.value = value;
      else u.value.copy(value);
    }
    this.skyMesh.visible = sky.mesh.visible;
    this.skyMesh.position.setFromMatrixPosition(camera.matrixWorld);
    this.skyMesh.scale.setScalar(camera.far * 0.4);
  }
  clear(preserveSwarmScene = null) {
    this.swarms.clear("track or renderer changed", preserveSwarmScene);
    this.topologyVersion++;
    this.materialLists = new WeakMap();
    for (const light of this.nativeFill.values()) this.scene.remove(light);
    this.nativeFill.clear();
    for (const l of this.spills ?? []) {
      this.scene.remove(l);
      if (l.target) this.scene.remove(l.target);
    }
    this.spills = [];
    for (const m of this.objects.values()) this.scene.remove(m);
    this.objects.clear();
    for (const { geo } of this.geometries.values()) geo.dispose();
    this.geometries.clear();
    for (const m of this.materials.values()) m.dispose();
    this.materials.clear();
    for (const [source, { texture, onDispose }] of this.textures) {
      source.removeEventListener("dispose", onDispose);
      texture.dispose();
    }
    this.textures.clear();
  }
  dispose() {
    this.clear();
    this.skyMesh?.geometry.dispose();
    this.skyMesh?.material.dispose();
    this.sun.shadow.dispose();
    for (const light of this.sun.shadow.shadowNode.lights)
      light.shadow.dispose();
  }
}
