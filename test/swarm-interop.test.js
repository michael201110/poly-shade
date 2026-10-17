import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three/src/Three.WebGPU.js';
import {SwarmInstances,createSwarmInterop} from '../src/rendering/swarm-interop.js';

function fixture(kind=0) {
  const mirror={scene:new T.Scene(),topologyVersion:0};mirror.swarms=new SwarmInstances(mirror);
  const group={kind,name:'Main',paintMode:1,positions:new Float32Array([0,0,0,1,0,0,0,1,0]),
    normals:new Float32Array([0,0,1,0,0,1,0,0,1]),colour:new Float32Array([1,1,1])};
  if(kind===2)group.morphs=Array.from({length:4},()=>new Float32Array(9));
  return {mirror,group};
}
function packet(count) {
  const data=new Float32Array(32+count*24);
  for(let i=0;i<count;i++){const at=32+i*24;data[at]=data[at+5]=data[at+10]=data[at+15]=1;
    data[at+12]=i;data[at+17]=1;data[at+19]=1;}
  return data;
}
test('packed swarm uploads share one material/mesh for 100 and 500 bodies',()=>{
  for(const count of [1,25,50,100,250,500]){
    const {mirror,group}=fixture(),handle=mirror.swarms.register({version:1,maxCars:count,groups:[group]});
    mirror.swarms.update(handle,packet(count),[32],[count]);
    const [row]=mirror.swarms.sources.get(handle).groups;
    assert.equal(mirror.scene.children.length,1);assert.equal(row.mesh.count,count);
    assert.equal(row.mesh.instanceColor.array[1],1);assert.equal(row.mesh.instanceColor.array[0],0);
    const matrices=row.mesh.instanceMatrix.array;
    mirror.swarms.update(handle,packet(count),[32],[count]);assert.equal(row.mesh.instanceMatrix.array,matrices);
    assert.equal(mirror.swarms.report().colourDraws,1);
    mirror.swarms.unregister(handle);assert.equal(mirror.scene.children.length,0);
  }
});
test('mirrored wheels bake winding once and receive positive determinant matrices',()=>{
  const {mirror,group}=fixture(1),handle=mirror.swarms.register({version:1,maxCars:1,groups:[group]});
  const data=packet(4);data[32+24]=data[32+72]=-1;
  mirror.swarms.update(handle,data,[32],[4]);const rows=mirror.swarms.sources.get(handle).groups;
  assert.equal(rows.length,2);assert.ok(rows.every(g=>g.mesh.count===2));
  assert.ok(rows.every(g=>g.mesh.instanceMatrix.array[0]===1));
  assert.equal(rows[1].mesh.geometry.attributes.position.array[6],-1);
  mirror.swarms.clear();
});
test('morphs, fade alpha and track cleanup use shared GPU attributes',async()=>{
  const {mirror,group}=fixture(2);let reason;
  const h=mirror.swarms.register({version:1,maxCars:2,groups:[group],onUnavailable:r=>reason=r});
  const data=packet(2);data[32+20]=.4;data[32+24+20]=.7;data[32+19]=.5;
  mirror.swarms.update(h,data,[32],[2]);const row=mirror.swarms.sources.get(h).groups[0];
  assert.equal(row.parameters.array[0],Math.fround(.4));assert.equal(row.parameters.array[4],Math.fround(.7));
  assert.equal(row.alpha.array[0],.5);assert.equal(row.mesh.material.transparent,true);
  assert.ok(row.mesh.material.geometryNode);mirror.swarms.clear('track changed');await Promise.resolve();
  assert.equal(reason,'track changed');assert.equal(mirror.scene.children.length,0);
});
test('optional capability API refuses unavailable backends without dependencies',()=>{
  const api=createSwarmInterop(()=>null);assert.equal(api.capabilities().ready,false);
  assert.throws(()=>api.registerSwarmSource({}),/unavailable/);
});
test('protocol rejects malformed registration and oversized uploads',()=>{
  const {mirror,group}=fixture();assert.throws(()=>mirror.swarms.register({version:2,maxCars:1,groups:[group]}));
  const h=mirror.swarms.register({version:1,maxCars:1,groups:[group]});
  assert.throws(()=>mirror.swarms.update(h,packet(2),[32],[2]),/capacity/);
  assert.throws(()=>mirror.swarms.update(h,packet(1),[32],[-1]),/capacity/);mirror.swarms.clear();
});


test('native Standard and Physical materials retain flat shading and surface properties',()=>{
  for(const type of ['MeshStandardMaterial','MeshPhysicalMaterial']){
    const {mirror,group}=fixture();
    Object.assign(group,{materialType:type,flatShading:true,roughness:.8285714387893677,
      metalness:0,envMapIntensity:1,clearcoat:.2,clearcoatRoughness:.3});
    const handle=mirror.swarms.register({version:1,maxCars:100,groups:[group]});
    const material=mirror.swarms.sources.get(handle).groups[0].mesh.material;
    assert.equal(material.type,type.replace('Material','NodeMaterial'));
    assert.equal(material.flatShading,true);assert.equal(material.roughness,group.roughness);
    assert.equal(material.metalness,0);assert.equal(material.envMapIntensity,1);
    if(type==='MeshPhysicalMaterial'){assert.equal(material.clearcoat,.2);assert.equal(material.clearcoatRoughness,.3);}
    mirror.swarms.clear();
  }
});

test('skid ring updates replace existing slots and reset without retaining stale strips',()=>{
  const {mirror,group}=fixture(),handle=mirror.swarms.register({version:1,maxCars:1,groups:[group]});
  const packet=new Float32Array([0,1,2,3,4,5,6,7,8,9,10,11,12]);
  mirror.swarms.updateTrails(handle,packet,0,1,false);
  let trail=mirror.swarms.sources.get(handle).trails;
  assert.equal(trail.count,1);assert.equal(trail.array[0],1);
  packet[1]=20;mirror.swarms.updateTrails(handle,packet,0,1,false);
  assert.equal(trail.count,1);assert.equal(trail.array[0],20);
  mirror.swarms.updateTrails(handle,packet,0,0,true);
  assert.equal(trail.count,0);assert.equal(trail.mesh.visible,false);
  mirror.swarms.clear();assert.equal(mirror.scene.children.length,0);
});
