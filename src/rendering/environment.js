import { skyPalette } from "./sky.js";
function fract(v) {
  return v - Math.floor(v);
}
function noise(x, y) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = fract(x),
    fy = fract(y),
    u = fx * fx * (3 - 2 * fx),
    v = fy * fy * (3 - 2 * fy);
  const hash = (a, b) => fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
  return (
    (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v) +
    (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v
  );
}
const KEYS = [
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
  "cloudAmount",
];
export class SkyEnvironment {
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
      return;
    }
    const hash = JSON.stringify(KEYS.map((k) => s[k]));
    if (hash !== this.hash) {
      const t = this.three,
        p = skyPalette(t, s),
        width = { low: 128, medium: 256, high: 512 }[s.environmentQuality],
        height = width / 2;
      const data = new Float32Array(width * height * 4);
      let index = 0;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          // Inverse of the game's equirectUv: atan(z,x)/(2*pi)+.5, asin(y)/pi+.5.
          const latitude = ((y + 0.5) / height - 0.5) * Math.PI;
          const longitude = ((x + 0.5) / width - 0.5) * Math.PI * 2;
          const dy = Math.sin(latitude),
            dx = Math.cos(latitude) * Math.cos(longitude),
            dz = Math.cos(latitude) * Math.sin(longitude);
          const h = Math.pow(Math.max(0, dy), 0.45 + 0.025 * s.turbidity);
          const mu = Math.max(
            0,
            dx * p.direction.x + dy * p.direction.y + dz * p.direction.z,
          );
          const glow = Math.pow(mu, 40) * s.sunGlow * 0.25;
          const radius = (s.sunDiscSize * Math.PI) / 180,
            pixelAngle = Math.PI / height,
            angle = Math.acos(Math.min(1, mu));
          const disc =
            5 *
            Math.min(1, (radius / pixelAngle) ** 2) *
            Math.max(0, 1 - angle / (radius + pixelAngle));
          let cloud = 0;
          if (s.cloudsEnabled && dy > 0.02) {
            const px = (dx / Math.max(dy + 0.35, 0.1)) * 2,
              pz = (dz / Math.max(dy + 0.35, 0.1)) * 2,
              n = noise(px, pz) * 0.78 + noise(px * 1.9, pz * 1.9) * 0.22;
            cloud = Math.min(1, Math.max(0, (n - (1 - s.cloudAmount)) / 0.14));
            cloud =
              cloud *
              cloud *
              (3 - 2 * cloud) *
              Math.min(1, (dy - 0.02) / 0.23) *
              0.55;
          }
          for (const channel of ["r", "g", "b"]) {
            const clear =
              (1 - h) * p.horizon[channel] +
              h * p.zenith[channel] +
              p.sun[channel] * (glow + disc);
            const cloudy =
              p.horizon[channel] * 1.2 * (1 - mu * 0.16) +
              p.sun[channel] * 0.8 * mu * 0.16;
            data[index++] = Math.max(
              0,
              (clear * (1 - cloud) + cloudy * cloud) *
                s.skyIntensity *
                (dy < 0 ? 0.55 : 1),
            );
          }
          data[index++] = 1;
        }
      const texture = new t.DataTexture(
        data,
        width,
        height,
        t.RGBAFormat,
        t.FloatType,
      );
      texture.name = "PolyShade procedural environment";
      texture.mapping = t.EquirectangularReflectionMapping;
      texture.colorSpace = t.LinearSRGBColorSpace;
      texture.minFilter = this.capabilities.floatLinear
        ? t.LinearFilter
        : t.NearestFilter;
      texture.magFilter = texture.minFilter;
      texture.needsUpdate = true;
      this.texture?.dispose();
      this.texture = texture;
      this.hash = hash;
      this.resolution = width / 4;
      this.generations++;
    }
    // PolyTrack's internal WebGLCubeUVMaps creates PMREM for equirectangular environments.
    // It exposes that path even though PMREMGenerator and CubeCamera are tree-shaken exports.
    this.scene.environment = this.texture;
  }
  dispose() {
    this.scene.environment = this.original;
    this.texture?.dispose();
    this.texture = null;
  }
}
