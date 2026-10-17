import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three/src/Three.WebGPU.js';
import Attributes from 'three/src/renderers/common/Attributes.js';
import Geometries from 'three/src/renderers/common/Geometries.js';
import {AttributeType} from 'three/src/renderers/common/Constants.js';
import {SwarmInstances} from '../src/rendering/swarm-interop.js';

test('queued skid deltas survive one GPU upload; unchanged frames never upload the full ring',()=>{
  const mirror={scene:new T.Scene(),topologyVersion:0},registry=new SwarmInstances(mirror);
  const handle=registry.register({version:1,maxCars:500,groups:[{name:'test',kind:0,paintMode:1,materialType:'MeshBasicMaterial',colour:[1,1,1],positions:new Float32Array([0,0,0,1,0,0,0,1,0]),normals:new Float32Array([0,1,0,0,1,0,0,1,0])}]});
  const packet=(id,value)=>new Float32Array([id,...Array(12).fill(value)]);
  registry.updateTrails(handle,packet(0,1),0,1,false);
  const trail=registry.sources.get(handle).trails,uploads=[];
  const backend={createAttribute(){},updateAttribute(attribute){const b=attribute.data??attribute;uploads.push(b.updateRanges.map(r=>({...r})));b.clearUpdateRanges();}};
  const attributes=new Attributes(backend),info={render:{calls:1}},geometries=new Geometries(attributes,info);
  const render=()=>{for(let i=0;i<4;i++)geometries.updateAttribute(trail.mesh.geometry.attributes[`trail${i}`],AttributeType.VERTEX);info.render.calls++;};
  render();trail.buffer.clearUpdateRanges(); // Initial mapped buffer contains the full initial CPU data.
  registry.updateTrails(handle,packet(1,2),0,1,false);
  registry.updateTrails(handle,packet(2,3),0,1,false);
  assert.deepEqual(trail.buffer.updateRanges,[{start:12,count:24}]);
  render();assert.deepEqual(uploads,[[{start:12,count:24}]]);
  assert.deepEqual(Array.from(trail.array.subarray(12,36)),[...Array(12).fill(2),...Array(12).fill(3)]);
  for(let frame=0;frame<60;frame++)render();assert.equal(uploads.length,1);
  registry.updateTrails(handle,packet(0,4),0,1,false);render();assert.deepEqual(uploads.at(-1),[{start:0,count:12}]);
  registry.updateTrails(handle,packet(3,5),0,1,false);
  registry.updateTrails(handle,new Float32Array(),0,0,true);assert.deepEqual(trail.buffer.updateRanges,[]);
  assert.equal(trail.mesh.geometry.instanceCount,0);registry.unregister(handle);
});
