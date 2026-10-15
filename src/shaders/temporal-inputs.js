export const STATIC_VELOCITY_FRAGMENT = `
varying vec2 vUv;
uniform sampler2D tDepth;
uniform mat4 inverseCurrentVP,previousVP,previousInverseProjection;
uniform vec4 jitterUV;
uniform float historyValid;
void main(){
 float depth=texture2D(tDepth,vUv).r;
 vec4 world=inverseCurrentVP*vec4(vUv*2.0-1.0,depth*2.0-1.0,1.0);
 // A homogeneous sky direction has no translation-induced velocity.
 if(depth>=0.9999999){
   world=inverseCurrentVP*vec4(vUv*2.0-1.0,0.0,1.0);
   vec4 nearWorld=inverseCurrentVP*vec4(vUv*2.0-1.0,-1.0,1.0);
   world=vec4(world.xyz/world.w-nearWorld.xyz/nearWorld.w,0.0);
 }
 vec4 previous=previousVP*world;
 vec2 motion=vec2(0.0);
 if(historyValid>0.5&&previous.w>0.000001)
   motion=2.0*((vUv-jitterUV.xy)-(previous.xy/previous.w*0.5+0.5-jitterUV.zw));
 // Signed RGBA16F NDC motion avoids bias from packing zero around 0.5 in FP16.
 // The SGSR2 input adapter reads this lossless-zero representation directly.
 vec4 previousView=previousInverseProjection*previous;
 float previousDepth=depth>=0.9999999?0.0:clamp(-previousView.z/max(previousView.w,0.000001),0.0,65000.0);
 gl_FragColor=vec4(motion,0.0,previousDepth);
}`;

export const TEMPORAL_DEBUG_FRAGMENT = `
varying vec2 vUv;
uniform sampler2D tInput,tDepth;
uniform int view;
uniform vec2 jitter;
uniform float historyValid;
uniform vec2 nearFar;
void main(){
 vec3 c=texture2D(tInput,vUv).rgb;
 if(view==1){
   vec4 encoded=texture2D(tInput,vUv);
   vec2 motion=encoded.rg;
   c=vec3(clamp(0.5+motion*8.0,0.0,1.0),clamp(length(motion)*8.0,0.0,1.0));
 }else if(view==2){
   float z=texture2D(tDepth,vUv).r;
   float distance=nearFar.x*nearFar.y/max(nearFar.y-z*(nearFar.y-nearFar.x),0.00001);
   c=vec3(log2(1.0+distance)/log2(1.0+nearFar.y));
 }else if(view==3){
   vec2 cell=fract(vUv*16.0)-0.5;
   float dotMask=1.0-smoothstep(0.035,0.065,length(cell-jitter*0.6));
   c=mix(vec3(0.08),vec3(jitter+0.5,0.6),dotMask);
 }else if(view==4)c=historyValid>0.5?vec3(0.08,0.65,0.2):vec3(0.85,0.08,0.04);
 else if(view==5)c=mix(vec3(0.08,0.5,0.15),vec3(1.0,0.06,0.02),texture2D(tInput,vUv).a);
 gl_FragColor=vec4(c,1.0);
 #include <colorspace_fragment>
}`;

// One low-resolution geometry history target is updated after reconstruction.
// Linear view depth retains useful relative precision in RGBA16F at distance.
export const TEMPORAL_GEOMETRY_FRAGMENT = `
varying vec2 vUv;
uniform sampler2D tDepth,tVelocity;
uniform mat4 inverseProjection;
void main(){
 float depth=texture2D(tDepth,vUv).r;
 vec4 view=inverseProjection*vec4(vUv*2.0-1.0,depth*2.0-1.0,1.0);
 float z=depth>=0.9999999?0.0:clamp(-view.z/view.w,0.0,65000.0);
 float car=texture2D(tVelocity,vUv).z;
 gl_FragColor=vec4(z,step(0.5,car),step(1.5,car),1.0);
}`;
