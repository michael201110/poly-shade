import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three/src/Three.WebGPU.js';
import {SwarmMotion} from '../src/rendering/webgpu/swarm-motion.js';

test('GPU motion history retains exact previous rendered matrices and weights across frames and resets',()=>{
  globalThis.GPUBufferUsage={VERTEX:1,STORAGE:2,COPY_DST:4,COPY_SRC:8,UNIFORM:16,INDEX:32};
  const buffers=[],draws=[];let groups=0;
  const device={createBuffer({size}){const b={bytes:new Uint8Array(size),destroy(){this.destroyed=true;}};buffers.push(b);return b;},
    createBindGroup(d){groups++;return d;},queue:{writeBuffer(b,offset,data,start=0,size){
      const element=data.BYTES_PER_ELEMENT??1;
      const bytes=ArrayBuffer.isView(data)?new Uint8Array(data.buffer,data.byteOffset,data.byteLength):new Uint8Array(data);
      b.bytes.set(bytes.subarray(start*element,size===undefined?undefined:(start+size)*element),offset);
    }}};
  const motion=new SwarmMotion(device);motion.pipeline={getBindGroupLayout(){return {};}};
  const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));
  const mesh=new T.InstancedMesh(geometry,new T.MeshBasicMaterial(),2);
  const row={mesh,parameters:new T.InstancedBufferAttribute(new Float32Array(8),4),kind:0};
  const registry={sources:new Map([[1,{groups:[row]}]])};
  const temporal={currentJitteredVP:new T.Matrix4(),previousJitteredVP:new T.Matrix4(),previousInverseProjection:new T.Matrix4(),jitterUV:new T.Vector4(),valid:true};
  const depth={createView(){return {};}};
  function frame(){let ended=false,bind;const copies=[];const encoder={beginRenderPass(){return {setPipeline(){},setBindGroup(i,g){bind=g;},setVertexBuffer(){},draw(){
    const entry=i=>bind.entries.find(e=>e.binding===i).resource.buffer;
    draws.push({current:entry(2).bytes.slice(),previous:entry(4).bytes.slice(),flags:new Float32Array(entry(0).bytes.slice().buffer).slice(52)});
  },setIndexBuffer(){},drawIndexed(){this.draw();},end(){ended=true;}};},copyBufferToBuffer(...args){assert.equal(ended,true);copies.push(args);}};
    motion.render(encoder,{view:{}},depth,registry,temporal);
    for(const [a,ao,b,bo,size]of copies)b.bytes.set(a.bytes.subarray(ao,ao+size),bo);
  }
  row.parameters.array.set([.1,.2,.3,.4,.5,.6,.7,.8]);frame();
  assert.deepEqual(draws[0].current,draws[0].previous);assert.equal(draws[0].flags[0],0);
  const original=draws[0].current;
  mesh.instanceMatrix.array[12]=3;row.parameters.array[0]=.9;row.parameters.needsUpdate=true;frame();
  assert.deepEqual(draws[1].previous,original);assert.notDeepEqual(draws[1].current,original);assert.equal(draws[1].flags[0],1);
  temporal.valid=false;mesh.instanceMatrix.array[12]=9;frame();
  assert.deepEqual(draws[2].previous,draws[1].current);assert.equal(draws[2].flags[0],0);
  // A compact batch can shrink while weights change, then grow with identical
  // CPU attribute version. Newly visible slots must still upload those weights.
  mesh.count=1;row.parameters.array.fill(.25);row.parameters.needsUpdate=true;frame();
  mesh.count=2;frame();
  assert.deepEqual(Array.from(new Float32Array(draws[4].current.buffer).slice(32)),Array(8).fill(.25));
  assert.equal(groups,1);registry.sources.clear();frame();assert.equal(motion.entries.size,0);
  assert.ok(buffers.every(b=>b.destroyed));motion.dispose();
});
