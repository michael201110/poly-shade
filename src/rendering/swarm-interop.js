import * as T from 'three/src/Three.WebGPU.js';
import {attribute, positionLocal, normalLocal, vec3, mix, Fn} from 'three/src/Three.TSL.js';

// Optional renderer-only DTO boundary. No PolyBot imports, game objects, physics
// hooks, timers or per-car Object3D hierarchies enter this registry.
export class SwarmInstances {
  constructor(mirror) { this.mirror=mirror; this.sources=new Map(); this.next=1; }
  register(description) {
    const {maxCars,groups}=description;
    if(description.version!==1||!Number.isSafeInteger(maxCars)||maxCars<1||maxCars>500||
      !Array.isArray(groups)||groups.length<1||groups.length>32)throw Error('invalid swarm descriptor');
    const handle=this.next++,source={groups:[],maxCars,scene:description.scene,onUnavailable:description.onUnavailable,bytes:0,updates:0};
    try {
      for(let index=0;index<groups.length;index++){
        const g=groups[index];
        if(!(g.positions instanceof Float32Array)||!(g.normals instanceof Float32Array)||g.positions.length!==g.normals.length||g.positions.length%9)
          throw Error('swarm geometry must be packed triangle positions/normals');
        const variants=g.kind===1?2:1;
        for(let variant=0;variant<variants;variant++){
          const mirrored=g.kind===1&&variant===1,geometry=new T.BufferGeometry();
          const positions=g.positions.slice(),normals=g.normals.slice();
          if(mirrored){for(let i=0;i<positions.length;i+=3){positions[i]*=-1;normals[i]*=-1;}
            // Reflection reverses winding. Bake it once; never upload negative
            // determinant instance matrices to Three's instancing renderer.
            for(let i=0;i<positions.length;i+=9)for(let j=0;j<3;j++){
              let t=positions[i+3+j];positions[i+3+j]=positions[i+6+j];positions[i+6+j]=t;
              t=normals[i+3+j];normals[i+3+j]=normals[i+6+j];normals[i+6+j]=t;
            }}
          geometry.setAttribute('position',new T.BufferAttribute(positions,3));
          geometry.setAttribute('normal',new T.BufferAttribute(normals,3));
          const capacity=maxCars*(g.kind===1?2:1),parameters=new T.InstancedBufferAttribute(new Float32Array(capacity*4),4);
          const alpha=new T.InstancedBufferAttribute(new Float32Array(capacity).fill(1),1);
          geometry.setAttribute('swarmParameters',parameters);geometry.setAttribute('swarmOpacity',alpha);
          const Material=g.materialType==='MeshPhysicalMaterial'?T.MeshPhysicalNodeMaterial:
            g.materialType==='MeshStandardMaterial'?T.MeshStandardNodeMaterial:
            g.materialType==='MeshBasicMaterial'?T.MeshBasicNodeMaterial:T.MeshPhongNodeMaterial;
          const material=new Material();
          material.color=g.paintMode===1?new T.Color(0xffffff):new T.Color().fromArray(g.colour);
          for(const key of ['flatShading','roughness','metalness','envMapIntensity','clearcoat','clearcoatRoughness',
            'shininess','reflectivity','emissiveIntensity'])if(g[key]!==undefined)material[key]=g[key];
          if(g.specular&&material.specular)material.specular.fromArray(g.specular);
          if(g.emissive&&material.emissive)material.emissive.fromArray(g.emissive);
          material.name=`Swarm ${g.name}`;
          material.opacityNode=attribute('swarmOpacity','float');
          if(g.paintMode===2)material.colorNode=mix(vec3(.0103,0,0),vec3(1,0,0),attribute('swarmParameters','vec4').x);
          if(g.kind===2){let p=positionLocal,n=normalLocal;
            for(let i=0;i<4;i++){
              const a=g.morphs?.[i];if(!(a instanceof Float32Array)||a.length!==positions.length)throw Error('invalid suspension morphs');
              geometry.setAttribute(`swarmMorph${i}`,new T.BufferAttribute(a.slice(),3));
              const weight=attribute('swarmParameters','vec4').element(i);
              p=p.add(attribute(`swarmMorph${i}`,'vec3').mul(weight));
              if(g.normalMorphs?.[i]){geometry.setAttribute(`swarmNormal${i}`,new T.BufferAttribute(g.normalMorphs[i].slice(),3));
                n=n.add(attribute(`swarmNormal${i}`,'vec3').mul(weight));}
            }
            // Geometry node runs before native instance/model transforms and
            // is reused by the regular and shadow pipelines.
            material.geometryNode=Fn(()=>{positionLocal.assign(p);normalLocal.assign(n);})();
            // WebGPU guarantees only eight vertex-buffer bindings. Suspension
            // positions/normals + eight morph channels must share one static
            // interleaved buffer, rather than consuming ten bindings.
            const names=Object.keys(geometry.attributes).filter(name=>!geometry.attributes[name].isInstancedBufferAttribute);
            const stride=names.length*3,packed=new Float32Array(positions.length/3*stride);
            for(let vertex=0;vertex<positions.length/3;vertex++)for(let a=0;a<names.length;a++){
              const source=geometry.attributes[names[a]],offset=vertex*stride+a*3;
              packed[offset]=source.getX(vertex);packed[offset+1]=source.getY(vertex);packed[offset+2]=source.getZ(vertex);
            }
            const interleaved=new T.InterleavedBuffer(packed,stride);
            names.forEach((name,index)=>geometry.setAttribute(name,new T.InterleavedBufferAttribute(interleaved,3,index*3)));
          }
          const mesh=new T.InstancedMesh(geometry,material,capacity);
          mesh.instanceColor=new T.InstancedBufferAttribute(new Float32Array(capacity*3).fill(1),3);
          mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.instanceColor.setUsage(T.DynamicDrawUsage);
          parameters.setUsage(T.DynamicDrawUsage);alpha.setUsage(T.DynamicDrawUsage);
          mesh.count=0;mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;
          mesh.castShadow=true;mesh.receiveShadow=true;
          mesh.userData.swarmInstances=true;this.mirror.scene.add(mesh);
          source.groups.push({index,kind:g.kind,paintMode:g.paintMode,variant,mesh,parameters,alpha});
          source.bytes+=positions.byteLength+normals.byteLength+capacity*(16+3+4+1)*4;
        }
      }
      this.sources.set(handle,source);this.mirror.topologyVersion++;return handle;
    } catch(error) { this.release(source);throw error; }
  }
  update(handle,data,offsets,counts) {
    const source=this.sources.get(handle);if(!source)throw Error('swarm source no longer registered');
    if(!(data instanceof Float32Array)||counts.length!==offsets.length)throw Error('invalid instance packet');
    const start=performance.now();let triangles=0,instances=0;
    for(const g of source.groups){const count=counts[g.index],offset=offsets[g.index];
      if(!Number.isSafeInteger(count)||count<0||offset+count*24>data.length||count>(g.kind===1?g.mesh.instanceMatrix.count*2:g.mesh.instanceMatrix.count))
        throw Error('swarm packet exceeds instance capacity');
      const matrix=g.mesh.instanceMatrix.array,colours=g.mesh.instanceColor.array,parameters=g.parameters.array,alpha=g.alpha.array;
      let packed=0,translucent=false;
      for(let i=0;i<count;i++){
        // The worker preserves wheel order in each compact group: 0,1,2,3.
        if(g.kind===1&&i%2!==g.variant)continue;
        const at=offset+i*24,m=packed*16;
        for(let j=0;j<16;j++)matrix[m+j]=data[at+j]*(g.kind===1&&g.variant===1&&j<3?-1:1);
        for(let j=0;j<3;j++)colours[packed*3+j]=g.paintMode===1?data[at+16+j]:1;
        for(let j=0;j<4;j++)parameters[packed*4+j]=data[at+20+j];
        alpha[packed]=data[at+19];if(alpha[packed]<1)translucent=true;packed++;
      }
      if(g.mesh.material.transparent!==translucent){g.mesh.material.transparent=translucent;g.mesh.material.needsUpdate=true;}
      g.mesh.count=packed;g.mesh.visible=packed>0;
      g.mesh.instanceMatrix.needsUpdate=true;g.mesh.instanceColor.needsUpdate=true;g.parameters.needsUpdate=true;g.alpha.needsUpdate=true;
      triangles+=g.mesh.geometry.attributes.position.count/3*packed;instances+=packed;
    }
    source.updates++;source.uploadMs=performance.now()-start;source.triangles=triangles;source.instances=instances;
    return source.uploadMs;
  }
  updateTrails(handle,data,offset,count,reset) {
    const source=this.sources.get(handle);if(!source)throw Error('unknown swarm trail source');
    if(!Number.isSafeInteger(count)||count<0||offset+count*13>data.length)throw Error('invalid skid packet');
    if(!source.trails&&!count)return;
    if(!source.trails){
      const capacity=source.maxCars*4*999,array=new Float32Array(capacity*12),mapping=new Uint32Array(capacity).fill(0xffffffff);
      const geometry=new T.InstancedBufferGeometry();
      geometry.setAttribute('position',new T.BufferAttribute(new Float32Array([0,0,0,0,1,0,1,0,0,1,0,0,0,1,0,1,1,0]),3));
      geometry.setAttribute('normal',new T.BufferAttribute(new Float32Array([0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0]),3));
      const buffer=new T.InstancedInterleavedBuffer(array,12);buffer.setUsage(T.DynamicDrawUsage);
      for(let i=0;i<4;i++)geometry.setAttribute(`trail${i}`,new T.InterleavedBufferAttribute(buffer,3,i*3));
      const material=new T.MeshBasicNodeMaterial({color:0x010101,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:0,depthWrite:true});
      const p0=attribute('trail0','vec3'),p1=attribute('trail1','vec3'),p2=attribute('trail2','vec3'),p3=attribute('trail3','vec3');
      material.positionNode=mix(mix(p0,p2,positionLocal.x),mix(p1,p3,positionLocal.x),positionLocal.y);
      const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;geometry.instanceCount=0;
      mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;this.mirror.scene.add(mesh);
      source.trails={mesh,buffer,array,mapping,count:0};source.bytes+=array.byteLength+mapping.byteLength;
      this.mirror.topologyVersion++;
    }
    const t=source.trails;
    if(reset){t.mapping.fill(0xffffffff);t.count=0;}
    let min=Infinity,max=0;
    for(let i=0;i<count;i++){
      const at=offset+i*13,id=data[at];if(!Number.isSafeInteger(id)||id<0||id>=t.mapping.length)throw Error('invalid skid ring slot');
      let slot=t.mapping[id];if(slot===0xffffffff){slot=t.count++;t.mapping[id]=slot;}
      for(let j=0;j<12;j++)t.array[slot*12+j]=data[at+1+j];min=Math.min(min,slot);max=Math.max(max,slot);
    }
    if(count){t.buffer.clearUpdateRanges();t.buffer.addUpdateRange(min*12,(max-min+1)*12);t.buffer.needsUpdate=true;}
    t.mesh.geometry.instanceCount=t.count;t.mesh.visible=t.count>0;
  }
  release(source){for(const g of source.groups){this.mirror.scene.remove(g.mesh);g.mesh.dispose();g.mesh.geometry.dispose();g.mesh.material.dispose();}source.groups.length=0;
    if(source.trails){this.mirror.scene.remove(source.trails.mesh);source.trails.mesh.geometry.dispose();source.trails.mesh.material.dispose();source.trails=null;}}
  unregister(handle){const source=this.sources.get(handle);if(!source)return;this.sources.delete(handle);this.release(source);this.mirror.topologyVersion++;}
  clear(reason,preserveScene=null){for(const [handle,source]of this.sources){if(preserveScene&&source.scene===preserveScene)continue;
    this.unregister(handle);if(reason)queueMicrotask(()=>source.onUnavailable?.(reason));}}
  report(){let draws=0,triangles=0,bytes=0,uploadMs=0;
    let skidSegments=0;
    for(const s of this.sources.values()){draws+=s.groups.filter(g=>g.mesh.visible).length;triangles+=s.triangles||0;bytes+=s.bytes;uploadMs+=s.uploadMs||0;
      if(s.trails?.count){draws++;skidSegments+=s.trails.count;triangles+=s.trails.count*2;}}
    return {sources:this.sources.size,colourDraws:draws,triangles,bytes,uploadMs,skidSegments};}
}

export function createSwarmInterop(getController) {
  function backend(){const c=getController();if(!c?.resolveSettings().enabled||!c.backends?.gpu?.ready||c.backends.failure)
    throw Error('PolyShade WebGPU backend unavailable');return c.backends.gpu;}
  const registrations=new Map();let next=1;
  return Object.freeze({apiVersion:1,
    capabilities(){try{backend();return {version:1,ready:true,backend:'PolyShade WebGPU',maxCars:500};}catch{return {version:1,ready:false};}},
    registerSwarmSource(description){const b=backend(),mirror=b.scene;
      if(description.scene&&description.scene!==getController().activeScene)throw Error('swarm belongs to another track');
      const id=next++,handle=mirror.swarms.register({...description,scene:description.scene||getController().activeScene,onUnavailable:reason=>{registrations.delete(id);description.onUnavailable?.(reason);}});registrations.set(id,{mirror,handle});return id;},
    updateSwarmInstances(id,data,offsets,counts){backend();const r=registrations.get(id);if(!r)throw Error('unknown swarm handle');return r.mirror.swarms.update(r.handle,data,offsets,counts);},
    updateSwarmTrails(id,data,offset,count,reset){backend();const r=registrations.get(id);if(!r)throw Error('unknown swarm handle');return r.mirror.swarms.updateTrails(r.handle,data,offset,count,reset);},
    unregisterSwarmSource(id){const r=registrations.get(id);if(r){r.mirror.swarms.unregister(r.handle);registrations.delete(id);}},
    diagnostics(){try{const b=backend();return {...b.scene.swarms.report(),sceneDrawCalls:b.lastSceneDraws,
      sceneTriangles:b.lastSceneTriangles,gpu:b.profiler.report().passes};}catch{return {sources:0,unavailable:true};}},
    dispose(){for(const id of registrations.keys())this.unregisterSwarmSource(id);}
  });
}
