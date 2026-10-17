import {checkedModule} from './passes.js';

// One instanced motion draw per shared geometry/material batch. Stable worker
// slots preserve car/wheel identity across culling and temporal history.
const SHADER=`
struct Params{vp:mat4x4f,oldVP:mat4x4f,oldInverse:mat4x4f,jitter:vec4f,flags:vec4f};
struct Instance{matrix:mat4x4f,oldMatrix:mat4x4f,weights:vec4f,oldWeights:vec4f};
@group(0) @binding(0)var<uniform> p:Params;
@group(0) @binding(1)var depth:texture_depth_2d;
@group(0) @binding(2)var<storage,read> instances:array<Instance>;
@group(0) @binding(3)var<storage,read> morphs:array<vec4f>;
struct V{@builtin(position)position:vec4f,@location(0)previous:vec4f,@location(1)valid:f32};
@vertex fn vertex(@location(0)position:vec3f,@builtin(vertex_index)index:u32,@builtin(instance_index)instance:u32)->V{
 let i=instances[instance];var current=position;var old=position;
 if(p.flags.z>0.){let count=u32(p.flags.w);for(var m=0u;m<4u;m++){let delta=morphs[m*count+index].xyz;current+=delta*i.weights[m];old+=delta*i.oldWeights[m];}}
 let valid=p.flags.x>0.&&distance(i.matrix[3].xyz,i.oldMatrix[3].xyz)<8.;
 var v:V;v.position=p.vp*i.matrix*vec4f(current,1.);var oldMatrix=i.matrix;if(valid){oldMatrix=i.oldMatrix;}v.previous=p.oldVP*oldMatrix*vec4f(old,1.);v.valid=select(0.,1.,valid);return v;}
@fragment fn fragment(v:V)->@location(0)vec4f{
 let uv=v.position.xy/vec2f(textureDimensions(depth));let d=textureLoad(depth,vec2i(v.position.xy),0);
 if(abs(v.position.z-d)>max(.0000002,fwidth(v.position.z)*.5)){discard;}
 let delta=(uv-p.jitter.xy)*vec2f(2,-2)+vec2f(-1,1)-v.previous.xy/max(v.previous.w,1e-6)+p.jitter.zw*vec2f(2,-2);
 let old=p.oldInverse*v.previous;return vec4f(delta,2.+2.*(1.-v.valid),clamp(-old.z/max(old.w,1e-6),0.,65000.));}
`;
export class SwarmMotion {
  constructor(device){this.device=device;this.entries=new Map();this.data=new Float32Array(56);this.live=new Set();}
  async init(){const module=await checkedModule(this.device,SHADER,'Instanced swarm velocity');
    this.pipeline=await this.device.createRenderPipelineAsync({label:'Instanced swarm velocity',layout:'auto',
      vertex:{module,entryPoint:'vertex',buffers:[{arrayStride:12,attributes:[{shaderLocation:0,offset:0,format:'float32x3'}]}]},
      fragment:{module,entryPoint:'fragment',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list',cullMode:'none'}});

  }
  entry(row){let e=this.entries.get(row.mesh);if(e)return e;
    const geometry=row.mesh.geometry,attribute=geometry.attributes.position,capacity=row.mesh.instanceMatrix.count;
    const p=new Float32Array(attribute.count*3);
    for(let i=0;i<attribute.count;i++){p[i*3]=attribute.getX(i);p[i*3+1]=attribute.getY(i);p[i*3+2]=attribute.getZ(i);}
    const create=(size,usage)=>this.device.createBuffer({size:Math.max(16,size),usage:usage|GPUBufferUsage.COPY_DST});
    e={row,geometry,vertices:create(p.byteLength,GPUBufferUsage.VERTEX),instances:create(capacity*160,GPUBufferUsage.STORAGE),
      morphs:create(row.kind===2?p.length/3*4*16:16,GPUBufferUsage.STORAGE),packed:new Float32Array(capacity*40),previous:new Float32Array(capacity*20),fresh:true};
    this.device.queue.writeBuffer(e.vertices,0,p);
    if(row.kind===2){const data=new Float32Array(p.length/3*4*4);
      for(let m=0;m<4;m++){const a=geometry.attributes[`swarmMorph${m}`];
        for(let j=0;j<a.count;j++){const o=(m*a.count+j)*4;data[o]=a.getX(j);data[o+1]=a.getY(j);data[o+2]=a.getZ(j);}}
      this.device.queue.writeBuffer(e.morphs,0,data);}
    this.entries.set(row.mesh,e);return e;
  }
  render(encoder,target,depth,registry,temporal,profiler){if(!this.pipeline)return;
    const live=this.live;live.clear();for(const source of registry.sources.values())for(const row of source.groups)live.add(row.mesh);
    for(const [mesh,e]of this.entries)if(!live.has(mesh)){e.vertices.destroy();e.instances.destroy();e.morphs.destroy();e.uniform?.destroy();this.entries.delete(mesh);}
    if(!live.size)return;
    this.data.set(temporal.currentJitteredVP.elements);this.data.set(temporal.previousJitteredVP.elements,16);
    this.data.set(temporal.previousInverseProjection.elements,32);
    this.data[48]=temporal.jitterUV.x;this.data[49]=temporal.jitterUV.y;this.data[50]=temporal.jitterUV.z;this.data[51]=temporal.jitterUV.w;
    const pass=encoder.beginRenderPass({label:'Swarm velocity',colorAttachments:[{view:target.view,loadOp:'load',storeOp:'store'}],...profiler?.descriptor('swarm-velocity')});
    pass.setPipeline(this.pipeline);
    for(const source of registry.sources.values())for(const row of source.groups){const mesh=row.mesh;if(!mesh.visible||!mesh.count)continue;
      const e=this.entry(row),matrices=mesh.instanceMatrix.array,weights=row.parameters.array;
      for(let i=0;i<mesh.count;i++){const o=i*40,prev=i*20;
        for(let j=0;j<16;j++){e.packed[o+j]=matrices[i*16+j];e.packed[o+16+j]=e.fresh?matrices[i*16+j]:e.previous[prev+j];e.previous[prev+j]=matrices[i*16+j];}
        for(let j=0;j<4;j++){e.packed[o+32+j]=weights[i*4+j];e.packed[o+36+j]=e.fresh?weights[i*4+j]:e.previous[prev+16+j];e.previous[prev+16+j]=weights[i*4+j];}}
      this.data[52]=temporal.valid&&!e.fresh?1:0;this.data[53]=0;this.data[54]=row.kind===2?1:0;this.data[55]=e.geometry.attributes.position.count;
      // Distinct uniform allocation is necessary within one command buffer:
      // queue.writeBuffer on a shared uniform would make every draw see the
      // final batch's flags. Keep a persistent per-batch uniform/bind group.
      e.uniform??=this.device.createBuffer({size:224,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      this.device.queue.writeBuffer(e.uniform,0,this.data);this.device.queue.writeBuffer(e.instances,0,e.packed,0,mesh.count*40);
      if(e.depth!==depth){e.depth=depth;e.bind=this.device.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[
        {binding:0,resource:{buffer:e.uniform}},{binding:1,resource:depth.createView()},{binding:2,resource:{buffer:e.instances}},{binding:3,resource:{buffer:e.morphs}}]});}
      pass.setBindGroup(0,e.bind);pass.setVertexBuffer(0,e.vertices);pass.draw(e.geometry.attributes.position.count,mesh.count);e.fresh=false;
    }
    pass.end();
  }
  dispose(){for(const e of this.entries.values()){e.vertices.destroy();e.instances.destroy();e.morphs.destroy();e.uniform?.destroy();}this.entries.clear();this.uniform?.destroy();}
}
