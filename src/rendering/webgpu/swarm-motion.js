import {checkedModule} from './passes.js';
import {packMotionGeometry} from './motion-geometry.js';

// One instanced motion draw per shared geometry/material batch. Stable worker
// slots preserve car/wheel identity across culling and temporal history.
const SHADER=`
struct Params{vp:mat4x4f,oldVP:mat4x4f,oldInverse:mat4x4f,jitter:vec4f,flags:vec4f};
struct Instance{matrix:mat4x4f,oldMatrix:mat4x4f,weights:vec4f,oldWeights:vec4f};
@group(0) @binding(0)var<uniform> p:Params;
@group(0) @binding(1)var depth:texture_depth_2d;
@group(0) @binding(2)var<storage,read> instances:array<vec4f>;
@group(0) @binding(3)var<storage,read> morphs:array<vec4f>;
@group(0) @binding(4)var<storage,read> previous:array<vec4f>;
struct V{@builtin(position)position:vec4f,@location(0)previous:vec4f,@location(1)valid:f32};
@vertex fn vertex(@location(0)position:vec3f,@builtin(vertex_index)index:u32,@builtin(instance_index)instance:u32)->V{
 let at=instance*4u;let weight=u32(p.flags.y)+instance;
 let i=Instance(mat4x4f(instances[at],instances[at+1u],instances[at+2u],instances[at+3u]),mat4x4f(previous[at],previous[at+1u],previous[at+2u],previous[at+3u]),instances[weight],previous[weight]);var current=position;var old=position;
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
    const geometry=row.mesh.geometry,capacity=row.mesh.instanceMatrix.count;
    const packed=packMotionGeometry(geometry,row.kind===2),p=packed.positions;
    const create=(size,usage)=>this.device.createBuffer({size:Math.max(16,size),usage:usage|GPUBufferUsage.COPY_DST});
    e={row,geometry,capacity,vertexCount:packed.vertexCount,indexCount:packed.count,indexFormat:packed.indexFormat,
      vertices:create(p.byteLength,GPUBufferUsage.VERTEX),indices:create(packed.indices.byteLength,GPUBufferUsage.INDEX),instances:create(capacity*80,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC),
      previous:create(capacity*80,GPUBufferUsage.STORAGE),morphs:create(packed.morphs.byteLength,GPUBufferUsage.STORAGE),fresh:true,copyCount:0};
    this.device.queue.writeBuffer(e.vertices,0,p);
    this.device.queue.writeBuffer(e.indices,0,packed.indices);
    this.device.queue.writeBuffer(e.morphs,0,packed.morphs);
    this.entries.set(row.mesh,e);return e;
  }
  render(encoder,target,depth,registry,temporal,profiler){if(!this.pipeline)return;
    const live=this.live;live.clear();for(const source of registry.sources.values())for(const row of source.groups)live.add(row.mesh);
    for(const [mesh,e]of this.entries){e.copyCount=0;e.copyWeights=false;if(!live.has(mesh)){e.vertices.destroy();e.indices.destroy();e.instances.destroy();e.previous.destroy();e.morphs.destroy();e.uniform?.destroy();this.entries.delete(mesh);}}
    if(!live.size)return;
    this.data.set(temporal.currentJitteredVP.elements);this.data.set(temporal.previousJitteredVP.elements,16);
    this.data.set(temporal.previousInverseProjection.elements,32);
    this.data[48]=temporal.jitterUV.x;this.data[49]=temporal.jitterUV.y;this.data[50]=temporal.jitterUV.z;this.data[51]=temporal.jitterUV.w;
    const pass=encoder.beginRenderPass({label:'Swarm velocity',colorAttachments:[{view:target.view,loadOp:'load',storeOp:'store'}],...profiler?.descriptor('swarm-velocity')});
    pass.setPipeline(this.pipeline);
    for(const source of registry.sources.values())for(const row of source.groups){const mesh=row.mesh;if(!mesh.visible||!mesh.count)continue;
      const e=this.entry(row),matrices=mesh.instanceMatrix.array,weights=row.parameters.array;
      this.data[52]=temporal.valid&&!e.fresh?1:0;this.data[53]=e.capacity*4;this.data[54]=row.kind===2?1:0;this.data[55]=e.vertexCount;
      // Distinct uniform allocation is necessary within one command buffer:
      // queue.writeBuffer on a shared uniform would make every draw see the
      // final batch's flags. Keep a persistent per-batch uniform/bind group.
      e.uniform??=this.device.createBuffer({size:224,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      this.device.queue.writeBuffer(e.uniform,0,this.data);
      this.device.queue.writeBuffer(e.instances,0,matrices,0,mesh.count*16);
      if(e.parameterVersion!==row.parameters.version||mesh.count>e.parameterCount){
        this.device.queue.writeBuffer(e.instances,e.capacity*64,weights,0,mesh.count*4);
        e.parameterVersion=row.parameters.version;e.parameterCount=mesh.count;e.copyWeights=true;
      }
      if(e.fresh){this.device.queue.writeBuffer(e.previous,0,matrices,0,mesh.count*16);this.device.queue.writeBuffer(e.previous,e.capacity*64,weights,0,mesh.count*4);}
      if(e.depth!==depth){e.depth=depth;e.bind=this.device.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[
        {binding:0,resource:{buffer:e.uniform}},{binding:1,resource:depth.createView()},{binding:2,resource:{buffer:e.instances}},{binding:3,resource:{buffer:e.morphs}},{binding:4,resource:{buffer:e.previous}}]});}
      pass.setBindGroup(0,e.bind);pass.setVertexBuffer(0,e.vertices);pass.setIndexBuffer(e.indices,e.indexFormat);pass.drawIndexed(e.indexCount,mesh.count);e.fresh=false;e.copyCount=mesh.count;
    }
    pass.end();
    // Queue-ordered GPU copies retain exactly the last rendered transforms and
    // suspension weights. No CPU repacking, readback or GPU fence is needed.
    for(const e of this.entries.values())if(e.copyCount){
      encoder.copyBufferToBuffer(e.instances,0,e.previous,0,e.copyCount*64);
      if(e.copyWeights)encoder.copyBufferToBuffer(e.instances,e.capacity*64,e.previous,e.capacity*64,e.copyCount*16);
    }
  }
  dispose(){for(const e of this.entries.values()){e.vertices.destroy();e.indices.destroy();e.instances.destroy();e.previous.destroy();e.morphs.destroy();e.uniform?.destroy();}this.entries.clear();this.uniform?.destroy();}
  report(){let sourceVertices=0,velocityVertices=0,triangles=0;
    for(const e of this.entries.values()){sourceVertices+=e.geometry.attributes.position.count;velocityVertices+=e.vertexCount;triangles+=e.indexCount/3;}
    return {batches:this.entries.size,sourceVertices,velocityVertices,triangles};}
}
