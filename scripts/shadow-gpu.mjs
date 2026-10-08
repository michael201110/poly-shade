import assert from 'node:assert/strict';
import { safeShadowChunk } from '../src/rendering/shadow-safety.js';

export async function verifyShadowGpu(page) {
  const chunk = await page.evaluate(() => window.__controller.three.ShaderChunk?.shadowmap_pars_fragment);
  assert.ok(chunk, 'native game shadow chunk discovered');
  const result = await page.evaluate(source => {
    const c = window.__controller, t = c.three, r = c.activeRenderer, p = c.cinematic.post;
    const savedQuad = p.quad.material;
    const map = new t.DataTexture(new Uint8Array(4),1,1,t.RGBAFormat,t.UnsignedByteType);
    map.needsUpdate = true; map.colorSpace = t.NoColorSpace;
    const target = new t.WebGLRenderTarget(1,1,{type:t.UnsignedByteType,depthBuffer:false});
    const coord = new t.Vector4();
    const material = new t.ShaderMaterial({ depthTest:false, depthWrite:false, toneMapped:false,
      defines:{ USE_SHADOWMAP:1 }, uniforms:{ probeMap:{value:map}, probeCoord:{value:coord} },
      vertexShader:'void main(){gl_Position=vec4(position.xy,0.0,1.0);}',
      fragmentShader:`#include <common>\n#include <packing>\n${source}
        uniform sampler2D probeMap;uniform vec4 probeCoord;
        void main(){float shadow=getShadow(probeMap,vec2(1.0),1.0,0.0,1.0,probeCoord);gl_FragColor=vec4(vec3(shadow),1.0);}`,
    });
    const cases = [
      {name:'valid occluder',coord:[.5,.5,.5,1],lit:false},
      {name:'behind light',coord:[-.5,-.5,-.5,-1],lit:true},
      {name:'zero w',coord:[0,0,0,0],lit:true},
      {name:'before near plane',coord:[.5,.5,-.1,1],lit:true},
      {name:'beyond far plane',coord:[.5,.5,1.1,1],lit:true},
      {name:'outside x',coord:[1.1,.5,.5,1],lit:true},
      {name:'outside y',coord:[.5,-.1,.5,1],lit:true},
    ];
    p.state.capture(r);
    try {
      r.autoClear=false;r.setScissorTest(false);r.toneMapping=t.NoToneMapping;r.outputColorSpace=t.LinearSRGBColorSpace;
      r.setRenderTarget(target);p.quad.material=material;
      for(const probe of cases){
        coord.set(...probe.coord);r.__polyShadeNativeDraw.call(r,p.scene,p.camera);
        const pixel=new Uint8Array(4);r.readRenderTargetPixels(target,0,0,1,1,pixel);probe.pixel=[...pixel];
      }
      return {cases,receivers:c.sceneState.shadowShaderSnapshots?.size};
    } finally {
      p.quad.material=savedQuad;p.state.restore(r);target.dispose();material.dispose();map.dispose();
    }
  }, safeShadowChunk(chunk));
  assert.ok(result.receivers>0, 'guard attached to the real scene receivers');
  for(const probe of result.cases) {
    assert.equal(probe.pixel[0],probe.lit?255:0,probe.name);
    assert.equal(probe.pixel[3],255,probe.name+' valid output');
  }
  return result;
}
