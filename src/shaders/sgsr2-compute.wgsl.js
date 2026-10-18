/*! Copyright (c) 2024, Qualcomm Innovation Center, Inc. All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * WGSL port of pinned SGSR2 v2 glsl_2_pass_cs Convert/Upscale.
 * Full license: src/vendor/sgsr2/LICENSE and THIRD_PARTY_NOTICES.md.
 */
export const COMPUTE_PARAMS = `
struct Params {
 renderSize:vec2<u32>, displaySize:vec2<u32>,
 renderRcp:vec2f,displayRcp:vec2f,jitter:vec2f,
 preExposure:f32,cameraFov:f32,minLerp:f32,still:u32,reset:u32,valid:u32,
 jitterUV:vec4f,
};
@group(0) @binding(0) var<uniform> p:Params;
`;
export const SGSR2_CONVERT_WGSL =
  COMPUTE_PARAMS +
  `
@group(0) @binding(1) var color:texture_2d<f32>;
@group(0) @binding(2) var depth:texture_depth_2d;
@group(0) @binding(3) var velocity:texture_2d<f32>;
@group(0) @binding(4) var previousGeometry:texture_2d<f32>;
@group(0) @binding(5) var converted:texture_storage_2d<rgba16float,write>;
@group(0) @binding(6) var ycocg:texture_storage_2d<r32uint,write>;
@group(0) @binding(7) var rejection:texture_storage_2d<r32float,write>;
fn bounded(c:vec2i)->vec2i{return clamp(c,vec2i(0),vec2i(p.renderSize)-1);}
fn D(c:vec2i)->f32{return textureLoad(depth,bounded(c),0);}
fn gather(c:vec2i)->vec4f{return vec4f(D(c+vec2i(0,1)),D(c+vec2i(1,1)),D(c+vec2i(1,0)),D(c));}
fn minimum(v:vec4f)->f32{return min(min(v.x,v.y),min(v.z,v.w));}
fn rejectHistory(uv:vec2f,v:vec4f)->f32{
 let oldUV=uv-p.jitterUV.xy+vec2f(-v.x,v.y)*0.5+p.jitterUV.zw;
 // Geometry history is in the old jittered raster grid. A subpixel lookup
 // straddles texel centres: nearest-only depth/coverage can select the other
 // side of a stationary silhouette as the jitter changes. Test the actual
 // bilinear footprint for a compatible surface rather than rejecting that
 // stable colour history on alternating phases.
 let position=oldUV*vec2f(p.renderSize)-0.5;
 let at=vec2i(floor(position));let fraction=fract(position);
 let movingAt=vec2i(floor(oldUV*vec2f(p.renderSize)));
 var moving=0.0;
 for(var y=-1;y<=1;y++){for(var x=-1;x<=1;x++){
   moving=max(moving,textureLoad(previousGeometry,bounded(movingAt+vec2i(x,y)),0).b);
 }}
 // Finite differences replace fragment derivatives in a compute invocation.
 let dx=abs(textureLoad(velocity,bounded(vec2i(uv*vec2f(p.renderSize))+vec2i(1,0)),0).w-v.w);
 let dy=abs(textureLoad(velocity,bounded(vec2i(uv*vec2f(p.renderSize))+vec2i(0,1)),0).w-v.w);
 let tolerance=max(0.03,max(v.w*0.015,2.0*max(dx,dy)));
 let car=v.z>0.5;
 var compatible=false;
 for(var y=0;y<=1;y++){for(var x=0;x<=1;x++){
   let old=textureLoad(previousGeometry,bounded(at+vec2i(x,y)),0);
   let weight=select(1.0-fraction.x,fraction.x,x==1)*select(1.0-fraction.y,fraction.y,y==1);
   compatible=compatible||(weight>0.0&&old.a>0.5&&abs(old.r-v.w)<=tolerance&&((old.g>0.5)==car));
 }}
 let outside=any(oldUV<vec2f(0))||any(oldUV>=vec2f(1));
 let reject=p.valid==0u||outside||!compatible||(!car&&moving>0.5)||v.z>2.5;
 return select(0.0,1.0,reject);
}
@compute @workgroup_size(8,8,1)
fn main(@builtin(global_invocation_id) id:vec3u){
 if(any(id.xy>=p.renderSize)){return;}
 let at=vec2i(id.xy);let uv=(vec2f(id.xy)+0.5)*p.renderRcp;
 // Exact upstream gather component order and nearest-depth/local clip math.
 let a=gather(at-1);let b=gather(at+vec2i(1,-1));
 let c=gather(at+vec2i(-1,1));let d=gather(at+1);
 let maxC=min(min(a.y,b.x),min(c.z,d.w));
 var clip=0.0;
 if(maxC<1.0-1.0e-5){
   let sep=1.37e-5*p.cameraFov*length(vec2f(p.renderSize))*(1.0-maxC);
   let weights=clamp(vec4f(sep)/(abs(vec4f(maxC)-vec4f(minimum(a),minimum(b),minimum(c),minimum(d)))+1.19e-7),vec4f(0),vec4f(1));
   clip=clamp(1.0-dot(weights,vec4f(0.25)),0.0,1.0);
 }
 let motion=textureLoad(velocity,at,0);
 var rgb=textureLoad(color,at,0).rgb;
 let colorMax=max(max(rgb.r,rgb.g),rgb.b)+p.preExposure;
 rgb/=colorMax;
 let Y=0.25*(rgb.r+2.0*rgb.g+rgb.b);
 let Co=clamp(0.5*rgb.r+0.5-0.5*rgb.b,0.0,1.0);
 let Cg=clamp(Y+Co-rgb.r,0.0,1.0);
 let packed=(u32(Y*2047.5)<<21u)|(u32(Co*2047.5)<<10u)|u32(Cg*1023.5);
 textureStore(ycocg,at,vec4u(packed));
 textureStore(converted,at,vec4f(motion.xy,clip,colorMax));
 textureStore(rejection,at,vec4f(rejectHistory(uv,motion),0,0,0));
}
`;
export const SGSR2_UPSCALE_WGSL =
  COMPUTE_PARAMS +
  `
@group(0) @binding(1) var history:texture_2d<f32>;
@group(0) @binding(2) var converted:texture_2d<f32>;
@group(0) @binding(3) var ycocg:texture_2d<u32>;
@group(0) @binding(4) var rejection:texture_2d<f32>;
@group(0) @binding(5) var output:texture_storage_2d<rgba16float,write>;
@group(0) @binding(6) var historyOut:texture_storage_2d<rgba16float,write>;
@group(0) @binding(7) var linearSampler:sampler;
// Neighboring output pixels repeatedly decode the same 3x3 source footprint.
// At every supported upscale ratio, an 8x8 output tile plus that footprint is
// at most 10x10 source texels. Decode each packed texel once per workgroup and
// reuse it. The source coordinates, filtering weights and accumulation order
// below remain unchanged.
var<workgroup> sourceTile:array<vec3f,100>;
var<workgroup> sourceOrigin:vec2i;
var<workgroup> sourceExtent:vec2u;
fn decode(c:vec2i)->vec3f{
 let v=textureLoad(ycocg,clamp(c,vec2i(0),vec2i(p.renderSize)-1),0).x;
 return vec3f(f32(v>>21u)/2047.5,f32(v&(2047u<<10u))*4.76953602e-7-0.5,f32(v&1023u)/1023.5-0.5);
}
fn decodeCached(c:vec2i)->vec3f{
 let at=clamp(c,vec2i(0),vec2i(p.renderSize)-1)-sourceOrigin;
 return sourceTile[u32(at.y)*sourceExtent.x+u32(at.x)];
}
fn lanczos(base:f32)->f32{let y=base-1.0;let y2=y*y;return (0.75*y+y2)*y2;}
@compute @workgroup_size(8,8,1)
fn main(@builtin(global_invocation_id) id:vec3u,@builtin(local_invocation_id) local:vec3u,@builtin(workgroup_id) group:vec3u){
 let first=group.xy*8u;let last=min(first+vec2u(7),p.displaySize-1u);
 let firstHR=(vec2f(first)+0.5)*p.displayRcp;let lastHR=(vec2f(last)+0.5)*p.displayRcp;
 let firstJUV=clamp(firstHR+p.jitter*p.renderRcp,vec2f(0),vec2f(1));
 let lastJUV=clamp(lastHR+p.jitter*p.renderRcp,vec2f(0),vec2f(1));
 if(local.x==0u&&local.y==0u){
   let firstAt=vec2i(firstJUV*vec2f(p.renderSize));let lastAt=vec2i(lastJUV*vec2f(p.renderSize));
   sourceOrigin=firstAt-vec2i(1);sourceExtent=vec2u(lastAt-firstAt+vec2i(3));
 }
 workgroupBarrier();
 let linear=local.y*8u+local.x;let tileCount=sourceExtent.x*sourceExtent.y;
 for(var i=linear;i<tileCount;i+=64u){
   let x=i%sourceExtent.x;let y=i/sourceExtent.x;
   let at=clamp(sourceOrigin+vec2i(i32(x),i32(y)),vec2i(0),vec2i(p.renderSize)-1);
   sourceTile[i]=decode(at);
 }
 workgroupBarrier();
 if(any(id.xy>=p.displaySize)){return;}
 let hr=(vec2f(id.xy)+0.5)*p.displayRcp;
 let juv=clamp(hr+p.jitter*p.renderRcp,vec2f(0),vec2f(1));
 let at=vec2i(juv*vec2f(p.renderSize));
 let mda=textureSampleLevel(converted,linearSampler,juv,0);
 let motion=mda.xy;
 let prev=clamp(hr+vec2f(-motion.x,motion.y)*0.5,vec2f(0),vec2f(1));
 let h=textureSampleLevel(history,linearSampler,prev,0);
 var old=h.rgb;
 let wf=clamp(abs(h.a),0.0,1.0);
 let biasMax=min(f32(p.displaySize.x)/f32(p.renderSize.x),1.99);
 let scale=min(20.0,pow((f32(p.displaySize.x)/f32(p.renderSize.x))*(f32(p.displaySize.y)/f32(p.renderSize.y)),3.0));
 let kernelFactor=clamp(wf+f32(p.reset),0.0,1.0);
 let maxBias=biasMax-biasMax*kernelFactor;
 let minBias=max(1.0,0.3+0.3*maxBias);
 let kernel=mix(maxBias,minBias,max(0.25*mda.z,kernelFactor))*0.5;
 let distance=length(motion*vec2f(p.displaySize));
 let curve=mix(-2.0,-3.0,clamp(distance*0.02,0.0,1.0));
 let src=vec2f(at)+0.5-p.jitter-hr*vec2f(p.renderSize);
 let offsets=array<vec2i,9>(vec2i(0,1),vec2i(1,0),vec2i(-1,0),vec2i(0,0),vec2i(0,-1),vec2i(1,1),vec2i(-1,1),vec2i(1,-1),vec2i(-1,-1));
 var sum=vec4f(0);var center=vec3f(0);var variance=vec3f(0);var boxWeight=0.0;
 var lo=vec3f(1.0e10);var hi=vec3f(-1.0e10);
 let count=select(5u,9u,p.still!=0u);
 for(var i=0u;i<count;i++){
   let sample=decodeCached(at+offsets[i]);let offset=src+vec2f(offsets[i]);let radius=dot(offset,offset);
   let weight=lanczos(clamp(radius*kernel*kernel,0.0,1.0));
   sum+=vec4f(sample*weight,weight);
   let bw=exp(radius*curve);center+=sample*bw;variance+=sample*sample*bw;boxWeight+=bw;
   lo=min(lo,sample);hi=max(hi,sample);
 }
 center/=boxWeight;variance=sqrt(abs(variance/boxWeight-center*center));
 // Lanczos has signed lobes. Clamping a negative weight sum to +epsilon
 // destroys constant-colour invariance and creates a checkerboard. Preserve
 // the upstream signed division (guard only a genuinely zero denominator).
 let divisor=select(sum.a,select(-1.192e-7,1.192e-7,sum.a>=0.0),abs(sum.a)<1.192e-7);
 var current=clamp(sum.rgb/divisor,lo-0.05,hi+0.05);
 let sampleWeight=sum.a/3.0;
 var base=(1.0-wf)*(1.0-mda.z);
 base=min(base,mix(base,sampleWeight*10.0,clamp(10.0*distance,0.0,1.0)));
 base=min(base,mix(base,sampleWeight,clamp(distance*0.05,0.0,1.0)));
 let boxSize=mix(scale,1.0,max(mda.z,clamp(distance*0.05,0.0,1.0)));
 hi=min(hi,center+variance*boxSize);lo=max(lo,center-variance*boxSize);
 var start=p.minLerp;if(abs(motion.x)+abs(motion.y)>0.000001){start=0.0;}
 let contribution=select(1.0,start,any(old<lo)||any(old>hi));
 old=mix(clamp(old,lo,hi),old,clamp(contribution,0.0,1.0));
 base=mix(min(base,0.1),base,clamp(contribution,0.0,1.0));
 // PolyShade's independent rejection texture preserves SGSR's ColorMax alpha.
 let reject=textureLoad(rejection,clamp(at,vec2i(0),vec2i(p.renderSize)-1),0).r;
 let upstreamAlpha=clamp(sampleWeight/max(1.192e-7,base+sampleWeight)+f32(p.reset),0.0,1.0);
 let alpha=select(upstreamAlpha,1.0,reject>0.5);
 current=mix(old,current,alpha);
 textureStore(historyOut,vec2i(id.xy),vec4f(current,wf));
 let xz=current.x-current.z;
 let rgb=clamp(vec3f(xz+current.y,current.x+current.z,xz-current.y),vec3f(0),vec3f(1));
 let maximum=max(max(rgb.r,rgb.g),rgb.b);
 var exposure=p.preExposure/((1.0+600.0/65504.0)-maximum);
 if(mda.w>4000.0){exposure=mda.w;}
 textureStore(output,vec2i(id.xy),vec4f(rgb*exposure,sampleWeight));
}
`;
