const CLASS_NAMES = [
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
  "GameRenderer",
];
// Canonical enums verified in the 0.6.3 game module factories (not npm Three).
// Mangled export keys cannot reveal their names; named exports take precedence.
export const ENUMS = Object.freeze({
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
  EquirectangularReflectionMapping: 303,
});

function matches(candidate, name) {
  if (typeof candidate !== "function") return false;
  const source = Function.prototype.toString.call(candidate);
  if (new RegExp(`\\.is${name}\\s*=`).test(source)) return true;
  if (new RegExp(`\\.type\\s*=\\s*["']${name}["']`).test(source)) return true;
  const proto = candidate.prototype;
  if (name === "GameRenderer")
    return !!(
      proto?.isTrackShadowsEnabled &&
      proto?.getMaxAnisotropy &&
      proto?.setCamera
    );
  if (name === "PMREMGenerator")
    return !!(
      proto?.fromScene &&
      proto?.fromEquirectangular &&
      proto?.compileCubemapShader
    );
  if (name === "Raycaster")
    return !!(proto?.intersectObject && proto?.setFromCamera);
  if (name === "Clock")
    return !!(proto?.getDelta && proto?.getElapsedTime && proto?.start);
  if (name === "Frustum")
    return !!(proto?.setFromProjectionMatrix && proto?.intersectsSphere);
  return false;
}

export function discoverThree(pml) {
  if (typeof pml?.getFromPolyTrack !== "function")
    throw new Error("PML getFromPolyTrack is unavailable.");
  let require;
  for (const key of ["i", "n"]) {
    try {
      const value = pml.getFromPolyTrack(key);
      if (typeof value === "function" && value.m) {
        require = value;
        break;
      }
    } catch {
      /* Verify the module table instead of trusting an identifier. */
    }
  }
  if (!require)
    throw new Error(
      "PolyTrack's scoped Webpack require function or module table is unavailable.",
    );
  const core = [],
    renderer = [];
  for (const [id, factory] of Object.entries(require.m)) {
    const source = String(factory);
    if (/\.isWebGLRenderer\s*=/.test(source)) renderer.push(id);
    else if (
      (/\.isScene\s*=/.test(source) && /\.isColor\s*=/.test(source)) ||
      /\.isShaderMaterial\s*=|\.isWebGLRenderTarget\s*=|isTrackShadowsEnabled\(\)/.test(
        source,
      )
    )
      core.push(id);
  }
  if (!core.length && !renderer.length)
    throw new Error(
      "Module table does not contain the expected Three.js modules.",
    );
  const three = { ...ENUMS },
    found = new Set(),
    exportValues = [];
  for (const id of new Set([...core, ...renderer])) {
    const exports = require(id);
    exportValues.push(...Object.values(exports));
    for (const name of Object.keys(ENUMS))
      if (exports[name] !== undefined) three[name] = exports[name];
  }
  three.ShaderChunk = exportValues.find(value => value &&
    typeof value.shadowmap_pars_fragment === "string");
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
    "DirectionalLight",
  ].filter((name) => !found.has(name));
  if (missing.length)
    throw new Error(`Missing Three.js classes: ${missing.join(", ")}`);
  three.discovery = {
    classes: Object.fromEntries(
      CLASS_NAMES.map((name) => [name, found.has(name)]),
    ),
    enumSource:
      "PolyTrack 0.6.3 bundle stable enum table; named exports preferred",
  };
  return three;
}

export function inspectRenderer(three, renderer) {
  const gl = renderer.getContext();
  const webgl2 = typeof gl.texStorage2D === "function";
  const extensions = gl.getSupportedExtensions() ?? [];
  const halfFloat =
    webgl2 &&
    !!(
      gl.getExtension("EXT_color_buffer_float") ||
      gl.getExtension("EXT_color_buffer_half_float")
    );
  const timer = gl.getExtension(
    webgl2 ? "EXT_disjoint_timer_query_webgl2" : "EXT_disjoint_timer_query",
  );
  const shader = !!(
    three.ShaderMaterial &&
    three.Mesh &&
    three.OrthographicCamera &&
    three.PlaneGeometry
  );
  const targets = !!three.WebGLRenderTarget;
  const depth = webgl2 && !!three.DepthTexture;
  return {
    classes: three.discovery?.classes ?? {},
    constants: {
      ...ENUMS,
      RGBFormat: three.RGBFormat ?? null,
      sRGBEncoding: three.sRGBEncoding ?? null,
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
      environment: !!(
        three.DataTexture &&
        three.MeshStandardMaterial &&
        halfFloat
      ),
      postprocess: shader && targets,
      ssao: shader && targets && depth,
      bloom: shader && targets,
      sunRays: shader && targets && depth,
      fxaa: shader && targets,
      gpuTimer: webgl2 && !!timer,
    },
    timerExtension: webgl2 ? timer : null,
  };
}
