import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three/src/Three.WebGPU.js';
import {SourceIndex} from '../src/rendering/webgpu/source-index.js';

test('source discovery invalidates on nested add, removal and reparenting; visibility remains live',()=>{
  const scene=new T.Scene(),a=new T.Group(),b=new T.Group(),mesh=new T.Mesh();
  scene.add(a,b);a.add(mesh);const index=new SourceIndex(true);
  let scans=0;const traverse=scene.traverse;scene.traverse=function(cb){scans++;traverse.call(this,cb);};
  index.get(scene);assert.equal(scans,1);assert.equal(index.meshes.length,1);
  a.visible=false;index.get(scene);assert.equal(index.visible(mesh),false);assert.equal(scans,1);
  b.add(mesh);index.get(scene);assert.equal(index.visible(mesh),true);assert.equal(scans,2);
  const light=new T.PointLight();a.add(light);index.get(scene);assert.deepEqual(index.spills,[light]);
  b.remove(mesh);index.get(scene);assert.equal(index.meshes.length,0);
  b.add(mesh);const ancestor=new T.Group();ancestor.add(scene);ancestor.visible=false;
  index.get(scene);assert.equal(index.visible(mesh),false);
  index.clear();assert.equal(index.nodes.length,0);
  assert.ok(!a.hasEventListener('childadded',index.invalidate));
  assert.ok(!mesh.hasEventListener('childremoved',index.invalidate));
});

test('legacy native scene without topology events retains immediate discovery',()=>{
  class LegacyScene extends T.Scene {
    dispatchEvent(e){if(e.type!=='childadded'&&e.type!=='childremoved')super.dispatchEvent(e);}
  }
  const scene=new LegacyScene(),index=new SourceIndex();index.get(scene);
  scene.add(new T.Mesh());index.get(scene);assert.equal(index.meshes.length,1);
  scene.clear();index.get(scene);assert.equal(index.meshes.length,0);index.clear();
});

test('discovery does not construct game objects or consume the game random stream',()=>{
  const scene=new T.Scene(),index=new SourceIndex(true),random=Math.random;
  Math.random=()=>{throw Error('native RNG must not be consumed by discovery');};
  try{index.get(scene);index.get(scene);index.clear();}finally{Math.random=random;}
});
