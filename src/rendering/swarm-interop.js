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
    const handle=this.next++,source={groups:[],onUnavailable:description.onUnavailable,bytes:0,updates:0};
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
          const material=new T.MeshPhongNodeMaterial({color:g.paintMode===1?0xffffff:new T.Color().fromArray(g.colour),
            shininess:g.shininess??65,specular:new T.Color().fromArray(g.specular??[.067,.067,.067]),
            reflectivity:g.reflectivity??.4,side:T.FrontSide});
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
  release(source){for(const g of source.groups){this.mirror.scene.remove(g.mesh);g.mesh.dispose();g.mesh.geometry.dispose();g.mesh.material.dispose();}source.groups.length=0;}
  unregister(handle){const source=this.sources.get(handle);if(!source)return;this.sources.delete(handle);this.release(source);this.mirror.topologyVersion++;}
  clear(reason){for(const [handle,source]of this.sources){this.unregister(handle);if(reason)queueMicrotask(()=>source.onUnavailable?.(reason));}}
  report(){let draws=0,triangles=0,bytes=0,uploadMs=0;
    for(const s of this.sources.values()){draws+=s.groups.filter(g=>g.mesh.visible).length;triangles+=s.triangles||0;bytes+=s.bytes;uploadMs+=s.uploadMs||0;}
    return {sources:this.sources.size,colourDraws:draws,triangles,bytes,uploadMs};}
}

export function createSwarmInterop(getController) {
  function backend(){const c=getController();if(!c?.resolveSettings().enabled||!c.backends?.gpu?.ready||c.backends.failure)
    throw Error('PolyShade WebGPU backend unavailable');return c.backends.gpu;}
  const registrations=new Map();let next=1;
  return Object.freeze({apiVersion:1,
    capabilities(){try{backend();return {version:1,ready:true,backend:'PolyShade WebGPU',maxCars:500};}catch{return {version:1,ready:false};}},
    registerSwarmSource(description){const b=backend(),mirror=b.scene;
      if(description.scene&&description.scene!==getController().activeScene)throw Error('swarm belongs to another track');
      const id=next++,handle=mirror.swarms.register({...description,onUnavailable:reason=>{registrations.delete(id);description.onUnavailable?.(reason);}});registrations.set(id,{mirror,handle});return id;},
    updateSwarmInstances(id,data,offsets,counts){backend();const r=registrations.get(id);if(!r)throw Error('unknown swarm handle');return r.mirror.swarms.update(r.handle,data,offsets,counts);},
    unregisterSwarmSource(id){const r=registrations.get(id);if(r){r.mirror.swarms.unregister(r.handle);registrations.delete(id);}},
    diagnostics(){try{return backend().scene.swarms.report();}catch{return {sources:0,unavailable:true};}},
    dispose(){for(const id of registrations.keys())this.unregisterSwarmSource(id);}
  });
}
