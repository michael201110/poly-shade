export const GPU_POST_COMMON = `
struct Params {
 inverseProjection:mat4x4f,cameraWorld:mat4x4f,inverseVP:mat4x4f,previousVP:mat4x4f,previousInverseProjection:mat4x4f,projection:mat4x4f,
 size:vec4f,jitter:vec4f,sunUV:vec4f,sunDirection:vec4f,horizon:vec4f,sunColor:vec4f,cfg:array<vec4f,16>,
};
@group(0) @binding(0) var<uniform> p:Params;
@group(0) @binding(1) var inputColor:texture_2d<f32>;
@group(0) @binding(2) var depth:texture_depth_2d;
@group(0) @binding(3) var velocity:texture_2d<f32>;
@group(0) @binding(4) var ao:texture_2d<f32>;
@group(0) @binding(5) var bloom:texture_2d<f32>;
@group(0) @binding(6) var rays:texture_2d<f32>;
@group(0) @binding(7) var linearSampler:sampler;
@group(0) @binding(8) var volume:texture_2d<f32>;
@group(0) @binding(9) var sunVisibility:texture_2d<f32>;
@group(0) @binding(10) var rejection:texture_2d<f32>;
@group(0) @binding(11) var apertureMask:texture_2d<f32>;
struct Vertex { @builtin(position) position:vec4f,@location(0) uv:vec2f };
@vertex fn vertex(@builtin(vertex_index) id:u32)->Vertex{
 let xy=vec2f(f32((id<<1u)&2u),f32(id&2u));var out:Vertex;out.position=vec4f(xy*2.-1.,0,1);out.uv=vec2f(xy.x,1.-xy.y);return out;
}
fn D(uv:vec2f)->f32{return textureLoad(depth,clamp(vec2i(uv*vec2f(textureDimensions(depth))),vec2i(0),vec2i(textureDimensions(depth))-1),0);}
fn viewPosition(uv:vec2f)->vec3f{let size=vec2f(textureDimensions(depth));let pixel=clamp(floor(uv*size),vec2f(0),size-1.);let center=(pixel+.5)/size;let q=p.inverseProjection*vec4f(center*vec2f(2,-2)+vec2f(-1,1),D(center),1);return q.xyz/max(q.w,1./65000.);}
fn previousDepth(clip:vec4f)->f32{let q=p.previousInverseProjection*clip;return clamp(-q.z/max(q.w,1e-6),0.,65000.);}
fn sampleColor(uv:vec2f)->vec3f{return textureSampleLevel(inputColor,linearSampler,uv,0).rgb;}
fn shoulder(c:vec3f)->vec3f{return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),vec3f(0),vec3f(1));}
fn hash(q:vec2f)->f32{return fract(sin(dot(q,vec2f(127.1,311.7)))*43758.5453);}
fn noise(q:vec2f)->f32{let i=floor(q);var f=fract(q);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2f(1,0)),f.x),mix(hash(i+vec2f(0,1)),hash(i+vec2f(1,1)),f.x),f.y);}
fn cloudTransmission()->f32{let d=p.sunDirection.xyz;let q=d.xz/max(d.y+.35,.1)*2.+vec2f(p.cfg[10].y*.001,0.);let n=noise(q)*.78+noise(q*1.9)*.22;let cloud=smoothstep(1.-p.cfg[10].x,1.-p.cfg[10].x+.14,n)*smoothstep(.02,.25,d.y);return 1.-cloud*.55;}
`;
export const STATIC_VELOCITY = `
@fragment fn fragment(v:Vertex)->@location(0) vec4f{
 let uv=v.uv;let d=D(uv);var world=p.inverseVP*vec4f(uv*vec2f(2,-2)+vec2f(-1,1),d,1);world/=max(world.w,1e-6);
 if(d>=.9999999){world=vec4f(world.xyz-p.cameraWorld[3].xyz,0);}
 let old=p.previousVP*world;
 let currentNDC=(uv-p.jitter.xy)*vec2f(2,-2)+vec2f(-1,1);
 let previousNDC=old.xy/max(old.w,1e-6)-p.jitter.zw*vec2f(2,-2);
 return vec4f(select(vec2f(0),currentNDC-previousNDC,p.cfg[9].w>.5),0,previousDepth(old));
}`;
export const GEOMETRY_HISTORY = `
@fragment fn fragment(v:Vertex)->@location(0) vec4f{let m=textureLoad(velocity,vec2i(v.position.xy),0);let z=select(clamp(-viewPosition(v.uv).z,0.,65000.),65000.,D(v.uv)>=.9999999);return vec4f(z,select(0.,1.,m.z>.5),select(0.,1.,m.z>1.5),1);}`;
export const SUN_VISIBILITY = `
@fragment fn fragment(v:Vertex)->@location(0) vec4f{
 var clear=0.;for(var i=0;i<16;i++){let a=f32(i)*.392699;let uv=p.sunUV.xy+vec2f(cos(a)/p.sunUV.z,sin(a))*.012;clear+=select(0.,1.,D(uv)>.999999&&all(uv>=vec2f(0))&&all(uv<=vec2f(1)));}clear/=16.;return vec4f(clear,4.*clear*(1.-clear),cloudTransmission(),1);
}`;
export const AO = `
@fragment fn fragment(v:Vertex)->@location(0) vec4f{
 let uv=v.uv;let pos=viewPosition(uv);var normal=cross(dpdx(pos),dpdy(pos));let normalLength=length(normal);
 if(D(uv)>.999999||-pos.z>120.||normalLength<1e-6){return vec4f(1);}
 normal/=normalLength;if(dot(normal,-pos)<0.){normal=-normal;}
 let screenRadius=clamp(p.cfg[3].y*p.projection[1][1]*.5/max(-pos.z,.1),.0001,.12);
 var occ=0.;let count=i32(p.cfg[3].w);for(var i=0;i<16;i++){if(i>=count){break;}let angle=f32(i)*2.3999632;
 let offset=vec2f(cos(angle),sin(angle))*screenRadius*sqrt((f32(i)+.5)/f32(count));let at=uv+offset;
 if(any(at<vec2f(0))||any(at>vec2f(1))){continue;}let diff=viewPosition(at)-pos;let dist=length(diff);
 occ+=max(0.,dot(normal,diff)/max(dist,.001)-p.cfg[3].z)*(1.-smoothstep(p.cfg[3].y*.4,p.cfg[3].y,dist));}
 let fade=1.-smoothstep(80.,120.,-pos.z);return vec4f(vec3f(clamp(1.-occ/f32(count)*p.cfg[3].x*fade*3.,.55,1.)),1);
}`;
export const BLOOM = `
@fragment fn fragment(v:Vertex)->@location(0) vec4f{let c=sampleColor(v.uv);let bright=max(max(c.r,c.g),c.b);let threshold=p.cfg[4].x;let soft=smoothstep(threshold*.8,threshold*1.2,bright);return vec4f(c*max(bright-threshold,0.)/max(bright,.001)*soft,1);}`;
const aoBlur = (axis) => `
@fragment fn fragment(v:Vertex)->@location(0) vec4f{let stepUV=vec2f(${axis})/vec2f(textureDimensions(inputColor));let center=-viewPosition(v.uv).z;var sum=0.;var weights=0.;for(var i=-2;i<=2;i++){let at=v.uv+stepUV*f32(i);let d=-viewPosition(at).z;let weight=exp(-abs(d-center)/max(.05,center*.002))*exp(-f32(i*i)*.4);sum+=sampleColor(at).r*weight;weights+=weight;}return vec4f(vec3f(sum/max(weights,.001)),1);}`;
export const AO_BLUR_HORIZONTAL = aoBlur('1,0');
export const AO_BLUR_VERTICAL = aoBlur('0,1');
const bloomBlur = (multiplier) => `
@fragment fn fragment(v:Vertex)->@location(0) vec4f{let t=p.cfg[4].z*${multiplier}/vec2f(textureDimensions(inputColor));return vec4f((sampleColor(v.uv-t)+sampleColor(v.uv+t)+sampleColor(v.uv+vec2f(t.x,-t.y))+sampleColor(v.uv+vec2f(-t.x,t.y)))*.25,1);}`;
export const BLOOM_BLUR = bloomBlur('1.');
export const BLOOM_BLUR_WIDE = bloomBlur('p.cfg[13].x');
export const SUN_MASK = `
fn skyCoverage(uv:vec2f)->f32{return select(0.,1.,D(uv)>.999999&&all(uv>=vec2f(0))&&all(uv<=vec2f(1)));}
@fragment fn fragment(v:Vertex)->@location(0) vec4f{
 let uv=p.sunUV.xy+(v.uv-.5)*vec2f(.24/p.sunUV.z,.24);let t=.35/p.size.xy;
 let coverage=(skyCoverage(uv+t)+skyCoverage(uv-t)+skyCoverage(uv+vec2f(t.x,-t.y))+skyCoverage(uv+vec2f(-t.x,t.y)))*.25;
 let delta=(uv-p.sunUV.xy)*vec2f(p.sunUV.z,1);return vec4f(vec3f(coverage*exp(-dot(delta,delta)/.0016)),1);
}`;
export const RAYS = `
@fragment fn fragment(v:Vertex)->@location(0) vec4f{
 let vis=textureLoad(sunVisibility,vec2i(0),0).rgb;let gate=(vis.r*.15+vis.g*.85)*vis.b*p.sunUV.w;if(gate<.001){return vec4f(0);}
 var uv=vec2f(.5);let stepUV=(v.uv-p.sunUV.xy)/vec2f(.24/p.sunUV.z,.24)*p.cfg[5].z/64.;
 var sum=0.;var weight=1.;for(var i=0;i<64;i++){uv+=stepUV;if(any(uv<vec2f(0))||any(uv>vec2f(1))){break;}sum+=textureSampleLevel(apertureMask,linearSampler,uv,0).r*weight;weight*=p.cfg[12].x;}
 return vec4f(p.sunColor.rgb*sum*.75/p.cfg[12].y*gate*p.cfg[5].w,1);
}`;
export const VOLUME = `
fn sunlit(pos:vec3f,distance:f32)->f32{
 let direction=(transpose(p.cameraWorld)*vec4f(p.sunDirection.xyz,0)).xyz;
 let q=pos+direction*distance;if(q.z>=-.01){return 0.;}let clip=p.projection*vec4f(q,1);let uv=clip.xy/max(clip.w,.001)*vec2f(.5,-.5)+.5;
 if(any(uv<vec2f(0))||any(uv>vec2f(1))){return 0.;}let edge=min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y));let t=.75/p.size.xy;
 return (smoothstep(-.45,.45,-viewPosition(uv+t).z+.08+q.z)+smoothstep(-.45,.45,-viewPosition(uv-t).z+.08+q.z))*.5*smoothstep(0.,.03,edge);
}
@fragment fn fragment(v:Vertex)->@location(0) vec4f{
 let surface=viewPosition(v.uv);let end=min(length(surface),p.cfg[7].x);let ray=normalize(surface);let vis=textureLoad(sunVisibility,vec2i(0),0).rgb;let partial=4.*vis.b*(1.-vis.b);
 let gate=(vis.g*.82+vis.r*(.14+partial*.25))*mix(vis.b,1.,partial*.25)*p.sunUV.w;
 var total=0.;let stepLength=end/max(p.cfg[6].w,1.);var attenuation=exp(-p.cfg[6].y*stepLength*.5);let attenuationStep=exp(-p.cfg[6].y*stepLength)*p.cfg[6].z;
 if(gate>.001){for(var i=0;i<16;i++){if(f32(i)>=p.cfg[6].w){break;}let pos=ray*(f32(i)+.5)*stepLength;let light=min(sunlit(pos,min(p.cfg[7].x*.15,12.)),sunlit(pos,min(p.cfg[7].x*1.5,160.)));total+=light*p.cfg[6].y*stepLength*attenuation;attenuation*=attenuationStep;}}
 let sd=(transpose(p.cameraWorld)*vec4f(p.sunDirection.xyz,0)).xyz;let phase=.1+.9*pow(max(dot(ray,sd),0.),2.);return vec4f(p.sunColor.rgb*total*phase*gate,end/p.cfg[7].x);
}`;
export const GRADE = `
fn softenedRays(uv:vec2f)->vec3f{let t=1.1/vec2f(textureDimensions(rays));var c=textureSampleLevel(rays,linearSampler,uv,0).rgb*4.;for(var i=0;i<4;i++){let o=array<vec2f,4>(vec2f(1,0),vec2f(-1,0),vec2f(0,1),vec2f(0,-1))[i]*t;c+=textureSampleLevel(rays,linearSampler,uv+o,0).rgb;}c+=(textureSampleLevel(rays,linearSampler,uv+t,0).rgb+textureSampleLevel(rays,linearSampler,uv-t,0).rgb+textureSampleLevel(rays,linearSampler,uv+vec2f(t.x,-t.y),0).rgb+textureSampleLevel(rays,linearSampler,uv+vec2f(-t.x,t.y),0).rgb)*.5;return c/10.;}
fn motionBlur(uv:vec2f)->vec3f{
 let center=sampleColor(uv);if(p.cfg[9].x==0.){return center;}let m=textureLoad(velocity,clamp(vec2i(uv*p.size.xy),vec2i(0),vec2i(p.size.xy)-1),0);
 var delta=m.xy*vec2f(.5,-.5)*p.cfg[9].x/max(p.cfg[9].z,1.);let pixels=length(delta*p.size.xy);if(pixels<.5){return center;}delta*=min(1.,p.cfg[9].y/max(pixels,.001));
 let count=i32(clamp(ceil(min(pixels,p.cfg[9].y)*.5),4.,16.));var sum=center;var total=1.;let inverse=1./max(-viewPosition(uv).z,.0001);let t=1./p.size.xy;
 let slope=vec2f(1./max(-viewPosition(uv+vec2f(t.x,0)).z,.0001)-inverse,1./max(-viewPosition(uv+vec2f(0,t.y)).z,.0001)-inverse);let tolerance=max(inverse*.025,dot(abs(slope),vec2f(.75)));
 for(var i=0;i<16;i++){if(i>=count){break;}let at=uv+delta*((f32(i)+.5)/f32(count)-.5);if(any(at<vec2f(0))||any(at>vec2f(1))){continue;}
 let other=textureLoad(velocity,clamp(vec2i(at*p.size.xy),vec2i(0),vec2i(p.size.xy)-1),0);if((other.z>.5)!=(m.z>.5)){continue;}
 if(abs(1./max(-viewPosition(at).z,.0001)-inverse-dot(slope,(at-uv)*p.size.xy))>tolerance){continue;}sum+=sampleColor(at);total+=1.;}return mix(center,sum/total,smoothstep(.5,1.5,pixels));
}
fn lens(uv:vec2f)->vec3f{
 if(p.cfg[8].x<=0.){return vec3f(0);}let mask=textureLoad(sunVisibility,vec2i(0),0).rgb;let visible=clamp(mask.r+mask.g*.2,0.,1.)*mix(mask.b,1.,.18)*p.sunUV.w;
 if(visible<=0.){return vec3f(0);}
 let delta=(uv-p.sunUV.xy)*vec2f(p.sunUV.z,1);let r=length(delta);let sky=select(0.,1.,D(uv)>.999999);var f=p.sunColor.rgb*(exp(-r*r/.00042)*.62+exp(-r*r/.0035)*4.*mask.b*(1.-mask.b)*.055)*sky;
 for(var i=0;i<4;i++){let axis=array<f32,4>(.22,.63,1.12,1.64)[i];let radius=array<f32,4>(.010,.027,.051,.016)[i];let weight=array<f32,4>(.37,.30,.15,.24)[i];let center=p.sunUV.xy+(vec2f(.5)-p.sunUV.xy)*axis;let d=length((uv-center)*vec2f(p.sunUV.z,1));let width=.0025+radius*.11;let rd=(vec3f(d-radius)+vec3f(-.65,0,.65)*p.cfg[8].z*radius*.14)/width;let ring=exp(-rd*rd);let core=(1.-smoothstep(radius*.2,radius*.9,d))*.08;f+=(mix(p.sunColor.rgb*vec3f(.72,.8,.9)*dot(ring,vec3f(.333)),ring,p.cfg[8].z*.62)+p.sunColor.rgb*core)*p.cfg[8].y*weight;}
 f+=p.sunColor.rgb*exp(-abs(delta.x)*8.-delta.y*delta.y/.000008)*p.cfg[8].w*.2*sky;return f*p.cfg[8].x*visible;
}
@fragment fn fragment(v:Vertex)->@location(0) vec4f{
 let uv=v.uv;var c=motionBlur(uv);
 if(p.cfg[4].w>.5){c*=clamp(textureSampleLevel(ao,linearSampler,uv,0).r,.55,1.);}
 if(p.cfg[7].y>0.&&D(uv)<.999999){let pos=viewPosition(uv);let direction=normalize((p.cameraWorld*vec4f(normalize(pos),0)).xyz);let haze=(1.-exp(-max(length(pos)-p.cfg[7].z,0.)*p.cfg[7].y*.0015))*(.5+.5*pow(1.-abs(direction.y),2.));let tint=mix(p.horizon.rgb,p.sunColor.rgb,max(dot(direction,p.sunDirection.xyz),0.)*p.cfg[7].w);c=mix(c,tint,clamp(haze,0.,.5));}
 var shafts=vec3f(0);if(p.cfg[5].x!=0.&&p.sunUV.w>0.){shafts=softenedRays(uv)*p.cfg[5].x;}
 c+=textureSampleLevel(bloom,linearSampler,uv,0).rgb*p.cfg[4].y+shafts+lens(uv);
 if(p.cfg[6].x>0.&&p.sunUV.w>0.){let z=min(length(viewPosition(uv)),p.cfg[7].x)/p.cfg[7].x;let texel=.65/vec2f(textureDimensions(volume));var sum=vec3f(0);var total=0.;for(var i=0;i<5;i++){let at=uv+array<vec2f,5>(vec2f(0),vec2f(1,0),vec2f(-1,0),vec2f(0,1),vec2f(0,-1))[i]*texel;let sample=textureSampleLevel(volume,linearSampler,at,0);let weight=select(1.,4.,i==0)*exp(-abs(sample.a-z)*p.cfg[7].x*.7);sum+=sample.rgb*weight;total+=weight;}c+=sum/max(total,.0001)*p.cfg[6].x;}
 if(p.cfg[11].x>.5){c*=vec3f(1.+p.cfg[1].x,1.+p.cfg[1].y,1.-p.cfg[1].x);let l=dot(c,vec3f(.2126,.7152,.0722));let sat=max(max(c.r,c.g),c.b)-min(min(c.r,c.g),c.b);c=mix(vec3f(l),c,p.cfg[0].z+p.cfg[0].w*(1.-clamp(sat/max(l,.01),0.,1.)));c+=p.cfg[1].z*pow(1.-clamp(l,0.,1.),3.);c=max(c-p.cfg[2].x,vec3f(0))/max(p.cfg[2].y,.001);let pivot=max(dot(c,vec3f(.2126,.7152,.0722)),.001);c*=pow(pivot/.18,p.cfg[0].y-1.);c/=1.+p.cfg[1].w*max(c-1.,vec3f(0));}
 c=shoulder(max(c,vec3f(0))*p.cfg[0].x);if(p.cfg[11].x>.5){c*=1.-p.cfg[2].z*smoothstep(p.cfg[2].w,1.,length(uv-.5)*1.4142);}return vec4f(c,1);
}`;
export const FINISH = `
@fragment fn fragment(v:Vertex)->@location(0) vec4f{
 var c=sampleColor(v.uv);if(p.cfg[11].w>.5||p.cfg[11].z!=0.){let t=1./vec2f(textureDimensions(inputColor));let n=sampleColor(v.uv+vec2f(0,t.y));let s=sampleColor(v.uv-vec2f(0,t.y));let e=sampleColor(v.uv+vec2f(t.x,0));let w=sampleColor(v.uv-vec2f(t.x,0));let lo=min(c,min(min(n,s),min(e,w)));let hi=max(c,max(max(n,s),max(e,w)));
 if(p.cfg[11].w>.5&&dot(hi-lo,vec3f(.2126,.7152,.0722))>max(.03,dot(hi,vec3f(.2126,.7152,.0722))*.12)){let grad=vec2f(dot(n-s,vec3f(.2126,.7152,.0722)),dot(w-e,vec3f(.2126,.7152,.0722)));let dir=grad/max(length(grad),.001)*t;c=mix(c,(sampleColor(v.uv+dir*.5)+sampleColor(v.uv-dir*.5))*.5,.55);}
 c=clamp(c+p.cfg[11].z*(4.*c-n-s-e-w),lo,hi);}
 let debug=i32(p.cfg[11].y);let m=textureLoad(velocity,clamp(vec2i(v.uv*p.size.xy),vec2i(0),vec2i(p.size.xy)-1),0);
 if(debug==2){c=vec3f(clamp(-viewPosition(v.uv).z/100.,0.,1.));}
 if(debug>=3&&debug<=5){c=vec3f(.5+m.x*16.,.5-m.y*16.,.5);if(debug==4&&m.z<.5){c=vec3f(.5);}}
 if(debug==6){c=vec3f(.5+p.jitter.xy*p.size.xy,0);}
 if(debug==7){c=select(vec3f(1,0,0),vec3f(0,1,0),p.cfg[9].w>.5);}
 if(debug==8){c=vec3f(textureLoad(rejection,clamp(vec2i(v.uv*vec2f(textureDimensions(rejection))),vec2i(0),vec2i(textureDimensions(rejection))-1),0).r);}
 if(debug==9){let xz=c.x-c.z;c=clamp(vec3f(xz+c.y,c.x+c.z,xz-c.y),vec3f(0),vec3f(1));c/=((1.+600./65504.)-max(max(c.r,c.g),c.b));}
 let srgb=select(c*12.92,1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-.055,c>vec3f(.0031308));return vec4f(srgb,1);
}`;
