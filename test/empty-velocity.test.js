import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three/src/Three.WebGPU.js';
import {GPUMotion} from '../src/rendering/webgpu/motion.js';

test('no visible cars leave static velocity untouched without opening a GPU pass',()=>{
  const motion=new GPUMotion({});motion.scan=()=>{};
  const parent=new T.Group(),mesh=new T.Mesh();parent.visible=false;parent.add(mesh);
  let destroyed=false,passes=0;
  motion.entries.set(mesh,{uniform:{destroy(){destroyed=true;}}});
  const encoder={beginRenderPass(){passes++;throw Error('no drawable velocity entries');}};
  motion.render(encoder);motion.render(encoder);
  assert.equal(passes,0);assert.equal(motion.visible.length,0);
  motion.clear();assert.equal(destroyed,true);assert.equal(motion.visible.length,0);
});
