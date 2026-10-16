import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GPUScene} from '../src/rendering/webgpu/scene.js';
import {normalizeSettings} from '../src/settings.js';
import {OPTION_DEFINITIONS} from '../src/options.js';
import {readFileSync} from 'node:fs';

test('Phong paint preserves authored highlights and clears removed texture maps',()=>{
 const scene=new GPUScene(),source=new T.MeshPhongMaterial({shininess:65,reflectivity:.7});
 source.normalScale.set(.3,.6);source.specularMap=new T.Texture();
 const m=scene.material(source);
 assert.equal(m.shininess,65);assert.equal(m.reflectivity,.7);
 assert.deepEqual(m.normalScale.toArray(),[.3,.6]);assert.ok(m.specularMap);
 source.shininess=12;source.specularMap=null;scene.material(source);
 assert.equal(m.shininess,12);assert.equal(m.specularMap,null);scene.dispose();
});
test('WebGPU sky excludes world fog and scene tone mapping',()=>{
 const scene=new GPUScene(),camera=new T.PerspectiveCamera();camera.updateMatrixWorld(true);
 const sky={mesh:{visible:true},uniforms:Object.fromEntries(Object.entries({zenith:new T.Color(),horizon:new T.Color(),sunDirection:new T.Vector3(0,1,0),sunColor:new T.Color(),intensity:1,turbidity:2,discSize:.6,glow:.4,cloudAmount:0,time:0}).map(([k,value])=>[k,{value}]))};
 scene.syncSky(sky,camera);assert.equal(scene.skyMesh.material.fog,false);assert.equal(scene.skyMesh.material.toneMapped,false);scene.dispose();
});
test('saved Fragment settings migrate to Compute and legacy renderer controls are absent',()=>{
 const s=normalizeSettings({schemaVersion:2,preset:'cinematic',overrides:{upscaling:'sgsr2-fragment',renderBackend:'webgl',sceneSamples:'4'}});
 assert.deepEqual(s.overrides,{upscaling:'sgsr2-compute'});
 assert.equal(OPTION_DEFINITIONS.renderBackend,undefined);assert.equal(OPTION_DEFINITIONS.sceneSamples,undefined);
 assert.ok(!OPTION_DEFINITIONS.upscaling[2].includes('sgsr2-fragment'));
});

test('release excludes the GL backend and duplicate bundled Three node systems',()=>{
 const bundle=readFileSync(new URL('../0.4.1/main.mod.js',import.meta.url),'utf8');
 assert.doesNotMatch(bundle,/webgl-fallback\/|class WebGLBackend|SGSR2Fragment|three\/build\/three\.webgpu/);
 assert.match(bundle,/class WebGPUBackend|WebGPUBackend = class/);
});
