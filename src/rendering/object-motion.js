import { isReplayGhost } from "../materials.js";

const VERTEX = `
uniform mat4 previousObjectViewProjection;
varying vec4 previousClip;
void main(){
 previousClip=previousObjectViewProjection*vec4(position,1.0);
 gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}`;
const FRAGMENT = `
uniform sampler2D sceneDepth;
uniform vec2 texel,velocityRange;
uniform vec4 jitterUV;
uniform float temporalOutput;
uniform float movingObject;
uniform float objectHistoryInvalid;
uniform mat4 previousInverseProjection;
varying vec4 previousClip;
void main(){
 vec2 uv=gl_FragCoord.xy*texel;
 float depth=texture2D(sceneDepth,uv).r;
 // The car contributes only where its real geometry matches scene depth.
 // Walls and bridges therefore occlude the velocity pass too.
 if(abs(gl_FragCoord.z-depth)>max(0.0000002,fwidth(gl_FragCoord.z)*0.5))discard;
 vec2 velocity=vec2(0.0);
 if(previousClip.w>0.00001)velocity=uv-jitterUV.xy-(previousClip.xy/previousClip.w*0.5+0.5-jitterUV.zw);
 if(temporalOutput>0.5){
   vec4 previousView=previousInverseProjection*previousClip;
   float previousDepth=clamp(-previousView.z/max(previousView.w,0.000001),0.0,65000.0);
   gl_FragColor=vec4(velocity*2.0,1.0+movingObject+2.0*objectHistoryInvalid,previousDepth);
 }
 else gl_FragColor=vec4(clamp(velocity/velocityRange*0.5+0.5,0.0,1.0),0.0,1.0);
}`;

// Reuse native car geometry without modifying its materials or scene hierarchy.
// Separate previous transforms include body translation, steering and wheel spin.
export class ObjectMotion {
  constructor(three) {
    this.three = three;
    this.scene = new three.Scene();
    this.scene.matrixWorldAutoUpdate = false;
    this.entries = [];
    this.sourceScene = null;
    this.lastScan = -Infinity;
    this.velocityRange = new three.Vector2(1, 1);
    this.texel = new three.Vector2();
  }
  update(scene, previousViewProjection, valid, { temporal = false, maxTravel = Infinity } = {}) {
    if (scene !== this.sourceScene || temporal !== this.temporalMode) {
      this.dispose();
      this.sourceScene = scene;
      this.temporalMode = temporal;
    }
    this.historyChanged = false;
    const now = performance.now();
    if (now - this.lastScan > 500) {
      this.lastScan = now;
      const sources = new Set();
      scene.traverse((body) => {
        if (!body.isMesh || body.userData?.polyShadeOwned) return;
        const materials = [].concat(body.material ?? []);
        if (!(materials.some(m => m?.name === "BrakeLight") || (temporal && body.userData?.polyShadeDynamic)) ||
            materials.some(m => m.transparent || (m.opacity ?? 1) < 0.98 || (!temporal && isReplayGhost(body, m)))) return;
        const root = body.userData?.polyShadeDynamic ? body : body.parent?.isGroup ? body.parent : body;
        root.traverse(mesh => {
          if (!mesh.isMesh || mesh.userData?.polyShadeOwned || mesh.isSkinnedMesh || mesh.isInstancedMesh) return;
          if ([].concat(mesh.material ?? []).some(m => m.transparent || (m.opacity ?? 1) < 0.98)) return;
          sources.add(mesh);
        });
      });
      for (let i = this.entries.length - 1; i >= 0; i--) {
        const entry = this.entries[i];
        if (!sources.has(entry.source)) {
          this.scene.remove(entry.proxy);
          entry.proxy.material.dispose();
          this.entries.splice(i, 1);
          this.historyChanged = true;
        }
      }
      const known = new Set(this.entries.map(e => e.source));
      for (const source of sources) {
        if (known.has(source)) continue;
        const material = new this.three.ShaderMaterial({
          name: "PolyShade object velocity", vertexShader: VERTEX, fragmentShader: FRAGMENT,
          uniforms: {
            previousObjectViewProjection: { value: new this.three.Matrix4() },
            sceneDepth: { value: null }, texel: { value: this.texel },
            velocityRange: { value: this.velocityRange },
            jitterUV: { value: new this.three.Vector4() }, temporalOutput: { value: 0 },
            previousInverseProjection: { value: new this.three.Matrix4() },
            movingObject: { value: 0 },
            objectHistoryInvalid: { value: 0 },
          },
          depthTest: false, depthWrite: false, toneMapped: false,
          blending: this.three.NoBlending, side: this.three.DoubleSide,
        });
        const proxy = new this.three.Mesh(source.geometry, material);
        proxy.matrixAutoUpdate = false;
        proxy.matrixWorldAutoUpdate = false;
        proxy.frustumCulled = false;
        this.scene.add(proxy);
        this.entries.push({ source, proxy, previous: source.matrixWorld.clone(), fresh: true });
        this.historyChanged = true;
      }
    }
    for (const entry of this.entries) {
      const { source, proxy, previous } = entry;
      const a = source.matrixWorld.elements, b = previous.elements;
      const teleported = valid && !entry.fresh && Math.hypot(a[12] - b[12], a[13] - b[13], a[14] - b[14]) > maxTravel;
      const objectValid = valid && !entry.fresh && !teleported && proxy.geometry === source.geometry;
      proxy.material.uniforms.objectHistoryInvalid.value = temporal && !objectValid ? 1 : 0;
      proxy.material.uniforms.movingObject.value = valid && !entry.fresh && a.some((value, i) => Math.abs(value - b[i]) > 1e-6) ? 1 : 0;
      if (teleported)
        this.historyChanged = true;
      proxy.visible = true;
      for (let node = source; node; node = node.parent)
        if (!node.visible) { proxy.visible = false; break; }
      proxy.layers.mask = source.layers.mask;
      proxy.geometry = source.geometry;
      proxy.matrix.copy(source.matrixWorld);
      proxy.matrixWorld.copy(source.matrixWorld);
      proxy.material.uniforms.previousObjectViewProjection.value.multiplyMatrices(
        previousViewProjection, objectValid ? previous : source.matrixWorld);
      previous.copy(source.matrixWorld);
      entry.fresh = false;
    }
  }
  render(renderer, camera, target, depth, draw, { temporal = false, clear = true, jitterUV = null, previousInverseProjection = null } = {}) {
    this.texel.set(1 / target.width, 1 / target.height);
    this.velocityRange.set(64 / target.width, 64 / target.height);
    for (const { proxy } of this.entries) {
      const u = proxy.material.uniforms;
      u.sceneDepth.value = depth;
      u.temporalOutput.value = temporal ? 1 : 0;
      if (previousInverseProjection) u.previousInverseProjection.value.copy(previousInverseProjection);
      if (jitterUV) u.jitterUV.value.copy(jitterUV);
      else u.jitterUV.value.set(0, 0, 0, 0);
    }
    renderer.setRenderTarget(target);
    renderer.setScissorTest(false);
    renderer.setClearColor(0, 0);
    if (clear) renderer.clear(true, false, false);
    draw(this.scene, camera);
  }
  dispose() {
    for (const { proxy } of this.entries) {
      this.scene.remove(proxy);
      proxy.material.dispose();
    }
    this.entries.length = 0;
    this.sourceScene = null;
    this.lastScan = -Infinity;
  }
}
