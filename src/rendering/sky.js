import { SKY_VERTEX, SKY_FRAGMENT } from "../shaders/sky.js";
export function srgbChannel(x) {
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}
export function linearColor(three, hex) {
  const n = parseInt(hex.slice(1), 16);
  return new three.Color().setRGB(
    srgbChannel(((n >> 16) & 255) / 255),
    srgbChannel(((n >> 8) & 255) / 255),
    srgbChannel((n & 255) / 255),
  );
}
export function sunDirection(three, settings, target = new three.Vector3()) {
  const e = (settings.sunElevation * Math.PI) / 180,
    a = (settings.sunAzimuth * Math.PI) / 180;
  return target.set(
    Math.cos(e) * Math.sin(a),
    Math.sin(e),
    Math.cos(e) * Math.cos(a),
  );
}
export function skyPalette(three, s) {
  const low = 1 - Math.min(1, Math.max(0, s.sunElevation) / 65);
  const zenith = linearColor(three, s.zenithColor ?? "#3978bc");
  const horizon = linearColor(three, s.horizonColor ?? "#b6cbd9");
  if (s.skyAutomatic) {
    zenith.multiplyScalar(1 - low * 0.12);
    horizon.lerp(linearColor(three, "#e6c5a4"), low * (s.horizonWarmth ?? 0.3));
  }
  const sun = linearColor(three, s.sunColor ?? "#ffe3ba");
  if (s.automaticSunColor)
    sun
      .copy(linearColor(three, "#fff5e5"))
      .lerp(linearColor(three, "#ffd29a"), low * 0.65);
  return { zenith, horizon, sun, direction: sunDirection(three, s) };
}
export class ProceduralSky {
  constructor(three, scene) {
    this.three = three;
    this.scene = scene;
    this.hidden = new Map();
    this.background = scene.background;
    this.uniforms = Object.fromEntries(
      ["zenith", "horizon", "sunDirection", "sunColor"].map((k) => [
        k,
        {
          value: k === "sunDirection" ? new three.Vector3() : new three.Color(),
        },
      ]),
    );
    for (const k of [
      "intensity",
      "warmth",
      "turbidity",
      "discSize",
      "glow",
      "cloudAmount",
      "time",
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
      toneMapped: true,
    });
    this.geometry = new three.SphereGeometry(1, 24, 12);
    this.mesh = new three.Mesh(this.geometry, this.material);
    this.mesh.name = "PolyShade sky";
    this.mesh.userData.polyShadeOwned = true;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10000;
    scene.add(this.mesh);
  }
  update(s, time) {
    this.palette = skyPalette(this.three, s);
    for (const [key, value] of Object.entries({
      zenith: this.palette.zenith,
      horizon: this.palette.horizon,
      sunColor: this.palette.sun,
      sunDirection: this.palette.direction,
    }))
      this.uniforms[key].value.copy(value);
    const values = {
      intensity: s.skyIntensity,
      warmth: s.horizonWarmth,
      turbidity: s.turbidity,
      discSize: s.sunDiscSize,
      glow: s.sunGlow,
      cloudAmount: s.cloudsEnabled ? s.cloudAmount : 0,
      time: time / 1000,
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
}
