/*! AMD FidelityFX Frame Interpolation 3.1.6 WebGPU port.
 * Copyright (C) 2026 Advanced Micro Devices, Inc. MIT license:
 * vendor/fidelityfx/LICENSE.txt; full notice retained with the FSR module. */
import {FG_SHADERS} from './shaders.js';
import {shaderBindings} from '../fsr31/super-resolution.js';
import {checkedModule} from '../webgpu/passes.js';

const CLEAR_DEPTH=`@group(0) @binding(0) var<storage,read_write> a: array<atomic<u32>>;
@group(0) @binding(1) var<storage,read_write> b: array<atomic<u32>>;
@compute @workgroup_size(256)fn CS(@builtin(global_invocation_id)p:vec3u){
if(p.x<arrayLength(&a)){atomicStore(&a[p.x],0x3f800000u);atomicStore(&b[p.x],0x3f800000u);}}`;
const CAPTURE=`@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var destination: texture_storage_2d<rgba16float,write>;
@group(0) @binding(2) var linearSampler: sampler;
@compute @workgroup_size(8,8) fn CS(@builtin(global_invocation_id) p:vec3u){
let size=textureDimensions(destination);if(any(p.xy>=size)){return;}
let inputSize=textureDimensions(source);var c:vec4f;
if(all(size==inputSize)){c=textureLoad(source,vec2i(p.xy),0);}
else{c=textureSampleLevel(source,linearSampler,(vec2f(p.xy)+.5)/vec2f(size),0);}
textureStore(destination,p.xy,c);}`;
const DEBUG=`@group(0) @binding(0) var<uniform> params: vec4u;
@group(0) @binding(1) var<storage,read> flow: array<vec2i>;
@group(0) @binding(2) var motion: texture_2d<f32>;
@group(0) @binding(3) var disocclusion: texture_2d<f32>;
@group(0) @binding(4) var mask: texture_2d<f32>;
@group(0) @binding(5) var destination: texture_storage_2d<rgba16float,write>;
@compute @workgroup_size(8,8) fn CS(@builtin(global_invocation_id)p:vec3u){
let size=textureDimensions(destination);if(any(p.xy>=size)){return;}
let uv=(vec2f(p.xy)+.5)/vec2f(size);var c:vec3f;
if(params.z==0u){let q=p.xy/8u;let f=vec2f(flow[q.y*params.x+q.x]);c=vec3f(.5+f.x/64.,.5+f.y/64.,.5);}
else if(params.z==1u){let m=textureLoad(motion,vec2i(uv*vec2f(textureDimensions(motion))),0).xy;c=vec3f(.5-m.x*8.,.5+m.y*8.,.5);}
else if(params.z==2u){c=textureLoad(disocclusion,vec2i(uv*vec2f(textureDimensions(disocclusion))),0).rgb;}
else {c=vec3f(textureLoad(mask,vec2i(p.xy),0).r);}
textureStore(destination,p.xy,vec4f(clamp(c,vec3f(0),vec3f(1)),1));}`;
const BPP={rgba16float:8,rgba8unorm:4,r32float:4,r32uint:4};
const ceil=(n,d)=>Math.ceil(n/d);

export class FSR31FrameGeneration {
  constructor(device) {
    this.device=device;this.textures=new Map();this.buffers=new Map();this.pipelines=new Map();this.groups=new Map();
    this.inputViews=new WeakMap();this.frameIndex=0;this.ping=0;this.dispatches=0;
    this.fiData=new ArrayBuffer(176);this.fiI=new Int32Array(this.fiData);this.fiF=new Float32Array(this.fiData);
    this.ofData=Array.from({length:7},()=>new Uint32Array(8));
    this.linear=device.createSampler({minFilter:'linear',magFilter:'linear',mipmapFilter:'linear'});
  }
  async init() {
    if(!this.device.features.has('subgroups'))throw Error('FSR FG optical flow requires WebGPU subgroups');
    if(!this.device.features.has('float32-filterable'))throw Error('FSR FG requires float32-filterable');
    if(this.device.limits.maxStorageTexturesPerShaderStage<6)throw Error('FSR FG requires six storage images per stage');
    for(const [name,code]of Object.entries({...FG_SHADERS,clearDepth:CLEAR_DEPTH,capture:CAPTURE,debugView:DEBUG})) {
      const module=await checkedModule(this.device,code,'FSR FG '+name);
      const pipeline=await this.device.createComputePipelineAsync({label:'FSR FG '+name,layout:'auto',compute:{module,entryPoint:'CS'}});
      if(this.disposed)return;
      // DXC -Od retains an unused shape constant in the histogram module.
      // Auto layouts contain only statically accessed resources.
      this.pipelines.set(name,{pipeline,bindings:shaderBindings(code).filter(binding=>
        (code.match(new RegExp('\\b'+binding.name+'_?\\b','g'))??[]).length>1)});
    }
    this.ready=true;
  }
  buffer(name,size,uniform=false) {
    let item=this.buffers.get(name);
    if(item?.size!==size) {
      item?.buffer.destroy();this.groups.clear();
      item={name,size,uniform,buffer:this.device.createBuffer({label:'FG '+name,size,
        usage:(uniform?GPUBufferUsage.UNIFORM:GPUBufferUsage.STORAGE)|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST})};
      this.buffers.set(name,item);
    }
    return item.buffer;
  }
  texture(name,width,height,format='rgba16float',mipLevelCount=1) {
    let item=this.textures.get(name);
    if(!item) {
      const texture=this.device.createTexture({label:'FG '+name,size:[width,height],format,mipLevelCount,
        usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
      item={name,texture,view:texture.createView(),width,height,format,mipLevelCount};this.textures.set(name,item);
    }
    return item;
  }
  view(input) {
    const texture=input.texture??input;
    let value=this.inputViews.get(texture);if(!value){value={texture,view:texture.createView()};this.inputViews.set(texture,value);}
    return value;
  }
  dispatch(encoder,name,resources,x,y=1,z=1,profiler,variant='') {
    const {pipeline,bindings}=this.pipelines.get(name),key=name+':'+this.ping+':'+variant;
    let cached=this.groups.get(key);
    const changed=!cached||bindings.some((binding,i)=>resources[binding.name]!==cached.values[i]);
    if(changed) {
      const values=bindings.map(b=>resources[b.name]);
      const entries=bindings.map(({binding,name,address,type},i)=>{
        const value=values[i];if(!value)throw Error(`FG ${name}: missing ${type}`);
        return {binding,resource:address?{buffer:value}:value.view??value};
      });
      cached={values,group:this.device.createBindGroup({label:'FG '+key,layout:pipeline.getBindGroupLayout(0),entries})};this.groups.set(key,cached);
    }
    const pass=encoder.beginComputePass({label:'FG '+name,...profiler?.descriptor('fg-'+name)});
    pass.setPipeline(pipeline);pass.setBindGroup(0,cached.group);pass.dispatchWorkgroups(x,y,z);pass.end();this.dispatches++;
  }
  clearTexture(encoder,item) {
    const pass=encoder.beginRenderPass({colorAttachments:[{view:item.view,loadOp:'clear',storeOp:'store',clearValue:[0,0,0,0]}]});pass.end();
  }
  pyramid(name,width,height) {
    const count=Math.min(12,Math.floor(Math.log2(Math.max(width,height))));
    const chain=this.texture(name,Math.max(1,width>>1),Math.max(1,height>>1),'rgba16float',count);
    if(!chain.mips)chain.mips=Array.from({length:12},(_,i)=>i<count?
      {view:chain.texture.createView({baseMipLevel:i,mipLevelCount:1})}:this.texture(name+'-unused-'+i,1,1));
    return chain;
  }
  pyramidDispatch(encoder,kind,chain,width,height,resources,profiler) {
    const mips=chain.mipLevelCount,spd=this.buffer('pyramid-'+kind,16,true);
    if(!chain.spdData){chain.spdData=new Uint32Array([mips,ceil(width,64)*ceil(height,64),0,0]);this.device.queue.writeBuffer(spd,0,chain.spdData);}
    resources.cbInpaintingPyramid=spd;
    for(let i=0;i<12;i++)resources['rw_inpainting_pyramid'+i]=chain.mips[i];
    this.dispatch(encoder,kind==='game'?'fiGamePyramid':'fiColorPyramid',resources,ceil(width,64),ceil(height,64),1,profiler);
    if(mips>6)this.dispatch(encoder,kind==='game'?'fiGameTail':'fiColorTail',resources,1,1,1,profiler);
  }
  generate(encoder,color,depth,velocity,temporal,profiler) {
    if(!this.ready||this.disposed)throw Error('FSR FG is not ready');
    const {width:w,height:h,outputWidth:ow,outputHeight:oh}=temporal;
    if(Math.min(w,h)<64)throw Error('FSR FG requires at least 64 internal pixels per dimension');
    const key=`${w}x${h}:${ow}x${oh}`;
    if(this.key!==key){this.releaseImages();this.key=key;}
    const reset=!temporal.valid||this.frameIndex===0;
    if(reset){this.frameIndex=0;this.groups.clear();}
    const current=this.ping,previous=1-current;
    const real=this.texture('real-'+current,ow,oh),oldReal=this.texture('real-'+previous,ow,oh);
    // Render/storage outputs need no COPY_SRC flag or CPU transfer. Equal-sized
    // surfaces use exact loads; Reduced mode is resolved to display size here.
    this.dispatch(encoder,'capture',{source:this.view(color),destination:real,linearSampler:this.linear},ceil(ow,8),ceil(oh,8),1,profiler);
    const r={cbFI:this.buffer('fi-constants',176,true),cbPolyShadeFG:this.buffer('fi-shapes',32,true),s_LinearClamp:this.linear,
      r_input_depth:this.view(depth),r_input_motion_vectors:this.view(velocity),
      r_current_interpolation_source:real,r_previous_interpolation_source:oldReal,r_present_backbuffer:real,
      rw_counters:this.buffer('fi-counters',8),
      rw_dilated_depth:this.texture('dilated-depth',w,h,'r32float'),
      rw_dilated_motion_vectors:this.texture('dilated-motion',w,h),
      rw_disocclusion_mask:this.texture('disocclusion',w,h,'rgba8unorm'),
      rw_output:this.texture('interpolated-raw',ow,oh),rw_inpainting_mask:this.texture('inpaint-mask',ow,oh,'rgba8unorm'),
      r_optical_flow:this.buffer('flow-result',ceil(ow,8)*ceil(oh,8)*8),
      r_optical_flow_scd:this.buffer('scd-output',12),r_input_distortion_field:this.texture('zero-distortion',1,1)};
    for(const name of ['reconstructed_depth_previous_frame','reconstructed_depth_interpolated_frame',
      'game_motion_vector_field_x','game_motion_vector_field_y','optical_flow_motion_vector_field_x','optical_flow_motion_vector_field_y']) {
      r['rw_'+name]=r['r_'+name]=this.buffer(name,w*h*4);
    }
    r.r_counters=r.rw_counters;r.r_dilated_depth=r.rw_dilated_depth;r.r_dilated_motion_vectors=r.rw_dilated_motion_vectors;
    r.r_disocclusion_mask=r.rw_disocclusion_mask;r.r_output=r.rw_output;r.r_inpainting_mask=r.rw_inpainting_mask;
    const near=temporal.camera?.near??.1,far=temporal.camera?.far??1000,q=far/(near-far),p=temporal.projection.elements;
    this.fiI.set([w,h,ow,oh],0);this.fiF.set([1/ow,1/oh,near,far],4);
    this.fiI.set([ow,oh,0,reset?1:0],8);this.fiF.set([-q,q*near,1/p[0],1/p[5]],12);
    this.fiF[16]=temporal.deltaMs;this.fiI.set([0,1,1],17);
    this.fiF.set([1/ow,1/oh],20);this.fiI.set([8,0,w,h,0,1,0,0,ow,oh],22);
    this.fiF.set([0,0,0],32);this.fiI[35]=2;this.fiF.set([0,80,1/p[0],0,temporal.jitter.x,temporal.jitter.y,-.5,.5],36);
    this.device.queue.writeBuffer(r.cbFI,0,this.fiData);
    this.device.queue.writeBuffer(r.cbPolyShadeFG,0,new Int32Array([ceil(ow,8),ceil(oh,8),ceil(ow,8),ceil(oh,8),0,0,0,0]));
    if(reset)encoder.clearBuffer(r.rw_counters);
    this.opticalFlow(encoder,real,ow,oh,reset,r,profiler);
    this.dispatch(encoder,'clearDepth',{a:r.rw_reconstructed_depth_previous_frame,b:r.rw_reconstructed_depth_interpolated_frame},ceil(w*h,256),1,1,profiler);
    this.dispatch(encoder,'fiPrepare',r,ceil(w,8),ceil(h,8),1,profiler);
    this.dispatch(encoder,'fiSetup',r,ceil(w,8),ceil(h,8),1,profiler);
    const game=this.pyramid('game-pyramid',w,h),paint=this.pyramid('paint-pyramid',ow,oh);
    if(!reset) {
      this.dispatch(encoder,'fiPrevDepth',r,ceil(w,8),ceil(h,8),1,profiler);
      this.dispatch(encoder,'fiGame',r,ceil(w,8),ceil(h,8),1,profiler);
      this.pyramidDispatch(encoder,'game',game,w,h,r,profiler);r.r_inpainting_pyramid=game;
      this.dispatch(encoder,'fiFlow',r,ceil(ow/8,8),ceil(oh/8,8),1,profiler);
      this.dispatch(encoder,'fiDisocclusion',r,ceil(w,8),ceil(h,8),1,profiler);
    }
    r.r_inpainting_pyramid=game;
    this.dispatch(encoder,'fiInterpolate',r,ceil(ow,8),ceil(oh,8),1,profiler);
    this.pyramidDispatch(encoder,'color',paint,ow,oh,r,profiler);
    r.r_inpainting_pyramid=paint;r.r_polyshade_inpaint_color=r.rw_output;r.r_polyshade_inpaint_mask=r.rw_inpainting_mask;
    r.rw_output=this.texture('generated',ow,oh);r.rw_inpainting_mask=this.texture('inpaint-final-mask',ow,oh,'rgba8unorm');
    this.dispatch(encoder,'fiInpaint',r,ceil(ow,8),ceil(oh,8),1,profiler);
    this.debug={flow:r.r_optical_flow,motion:r.r_dilated_motion_vectors,disocclusion:r.r_disocclusion_mask,inpainting:r.r_inpainting_mask,gameX:r.r_game_motion_vector_field_x};
    const result={real,generated:r.rw_output,valid:!reset&&this.frameIndex>6,frameIndex:this.frameIndex};
    this.frameIndex++;this.ping=previous;this.last=result;return result;
  }
  debugView(encoder,mode,profiler) {
    const id=['optical-flow','game-motion','disocclusion','inpainting'].indexOf(mode);if(id<0)return null;
    const {width,height}=this.last.real,params=this.buffer('debug-parameters',16,true);
    this.device.queue.writeBuffer(params,0,new Uint32Array([ceil(width,8),ceil(height,8),id,0]));
    const destination=this.texture('debug-view',width,height);
    this.dispatch(encoder,'debugView',{params,flow:this.debug.flow,motion:this.debug.motion,
      disocclusion:this.debug.disocclusion,mask:this.debug.inpainting,destination},ceil(width,8),ceil(height,8),1,profiler);
    return destination;
  }
  opticalFlow(encoder,color,width,height,reset,fi,profiler) {
    const current=this.ping,previous=1-current;
    const luma=[0,1].map(ping=>Array.from({length:7},(_,level)=>this.texture(`luma-${ping}-${level}`,Math.max(1,width>>level),Math.max(1,height>>level),'r32uint')));
    const sizes=Array.from({length:7},(_,i)=>[ceil(ceil(width,8),2**i),ceil(ceil(height,8),2**i)]);
    const flows=[0,1].map(ping=>sizes.map(([w,h],level)=>this.buffer(`flow-${ping}-${level}`,w*h*8)));
    const r={r_input_color:color,cbOF:null,cbOF_SPD:this.buffer('of-spd',32,true),
      rw_optical_flow_input:luma[current][0],r_optical_flow_input:luma[current][0],
      r_optical_flow_previous_input:luma[previous][0],
      rw_optical_flow_scd_histogram:this.buffer('scd-histogram',3*3*256*4),
      rw_optical_flow_scd_previous_histogram:this.texture('scd-previous',3*3*256,1,'r32float'),
      rw_optical_flow_scd_temp:this.buffer('scd-temp',12),rw_optical_flow_scd_output:fi.r_optical_flow_scd};
    for(let level=0;level<7;level++) {
      const data=this.ofData[level];data.set([width,height,level,7,this.frameIndex,2,0,0]);new Float32Array(data.buffer)[7]=80;
      const cb=this.buffer('of-constants-'+level,32,true);this.device.queue.writeBuffer(cb,0,data);
      const shape=this.buffer('of-shapes-'+level,32,true),[w,h]=sizes[level],next=sizes[Math.max(0,level-1)];
      this.device.queue.writeBuffer(shape,0,new Int32Array([w,h,w,h,...next,0,0]));
    }
    r.cbOF=this.buffer('of-constants-0',32,true);r.cbPolyShadeFG=this.buffer('of-shapes-0',32,true);
    this.device.queue.writeBuffer(r.cbOF_SPD,0,new Uint32Array([6,ceil(width,64)*ceil(height,64),0,0,ceil(width,64)*ceil(height,64),0,0,0]));
    if(reset) {
      encoder.clearBuffer(r.rw_optical_flow_scd_histogram);encoder.clearBuffer(r.rw_optical_flow_scd_temp);encoder.clearBuffer(r.rw_optical_flow_scd_output);
      this.clearTexture(encoder,r.rw_optical_flow_scd_previous_histogram);
      for(const ring of flows)for(const flow of ring)encoder.clearBuffer(flow);
      encoder.clearBuffer(fi.r_optical_flow);
    }
    for(let i=1;i<=6;i++)r['rw_optical_flow_input_level_'+i]=luma[current][i];
    this.dispatch(encoder,'ofPrepare',r,ceil(width,32),ceil(height,32),1,profiler);
    this.dispatch(encoder,'ofPyramid',r,ceil(width,64),ceil(height,64),1,profiler);
    this.dispatch(encoder,'ofHistogram',r,ceil(Math.floor(Math.floor(width/4)/3),32),16,9,profiler);
    this.dispatch(encoder,'ofDivergence',r,9,3,1,profiler);
    for(let level=6;level>=0;level--) {
      const a=current^(level&1),b=1-a,[w,h]=sizes[level];
      r.cbOF=this.buffer('of-constants-'+level,32,true);r.cbPolyShadeFG=this.buffer('of-shapes-'+level,32,true);
      r.r_optical_flow_input=luma[current][level];r.r_optical_flow_previous_input=luma[previous][level];
      r.rw_optical_flow=flows[a][level];r.r_optical_flow_previous=flows[b][level];
      this.dispatch(encoder,'ofSearch',r,ceil(ceil(Math.max(1,width>>level),4)*16,64),ceil(Math.max(1,height>>level),16),1,profiler,String(level));
      r.r_optical_flow_previous=flows[a][level];r.rw_optical_flow=level===0?fi.r_optical_flow:flows[b][level];
      this.dispatch(encoder,'ofFilter',r,ceil(w,16),ceil(h,4),1,profiler,String(level));
      if(level>0) {
        r.r_optical_flow=flows[b][level];r.rw_optical_flow_next_level=flows[b][level-1];
        const next=sizes[level-1];this.dispatch(encoder,'ofScale',r,ceil(next[0],4),ceil(next[1],4),1,profiler,String(level));
      }
    }
  }
  releaseImages() {
    this.groups.clear();for(const t of this.textures.values())t.texture.destroy();this.textures.clear();
    for(const item of this.buffers.values())item.buffer.destroy();this.buffers.clear();
    this.inputViews=new WeakMap();this.frameIndex=0;this.ping=0;this.key=null;this.last=null;this.debug=null;
  }
  report() {
    const resources=[...this.textures.values()].map(({name,width,height,format,mipLevelCount})=>({name,width,height,format,mipLevelCount,
      estimatedBytes:Array.from({length:mipLevelCount},(_,i)=>Math.max(1,width>>i)*Math.max(1,height>>i)*BPP[format]).reduce((a,b)=>a+b,0)}));
    const buffers=[...this.buffers.values()].map(({name,size,uniform})=>({name,bytes:size,uniform}));
    return {ready:this.ready,frameIndex:this.frameIndex,dispatches:this.dispatches,resources,buffers,
      estimatedOwnedBytes:resources.reduce((a,r)=>a+r.estimatedBytes,0)+buffers.reduce((a,b)=>a+b.bytes,0)};
  }
  dispose(){if(this.disposed)return;this.disposed=true;this.ready=false;this.releaseImages();this.pipelines.clear();}
}
