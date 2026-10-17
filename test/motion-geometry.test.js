import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three/src/Three.WebGPU.js';
import {packMotionGeometry} from '../src/rendering/webgpu/motion-geometry.js';

test('velocity indexing preserves every triangle and morph bit, including signed zero',()=>{
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute([0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,-0,0,0],3));
  for(let m=0;m<4;m++)geometry.setAttribute(`swarmMorph${m}`,new T.Float32BufferAttribute([m,0,0,m,1,0,m,2,0,m,0,0,m,2,0,m,0,0],3));
  const packed=packMotionGeometry(geometry,true);assert.equal(packed.vertexCount,4);assert.equal(packed.count,6);
  const floatBits=(a)=>Array.from(new Uint32Array(a.buffer,a.byteOffset,a.length));
  for(let i=0;i<packed.count;i++) {
    const index=packed.indices[i];
    assert.deepEqual(floatBits(packed.positions.subarray(index*3,index*3+3)),floatBits(geometry.attributes.position.array.subarray(i*3,i*3+3)));
    for(let m=0;m<4;m++) {
      const offset=(m*packed.vertexCount+index)*4;
      assert.deepEqual(floatBits(packed.morphs.subarray(offset,offset+3)),floatBits(geometry.attributes[`swarmMorph${m}`].array.subarray(i*3,i*3+3)));
    }
  }
  geometry.setIndex([5,4,0,1,3,2]);const indexed=packMotionGeometry(geometry,true);
  assert.deepEqual(Array.from(indexed.indices),Array.from(geometry.index.array).map(i=>packed.indices[i]));
});
