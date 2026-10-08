// Sky depth samples define illuminated gaps around the real sun. The finished
// shafts composite over foreground surfaces, as screen-space light scatter should.
// Resolve the small sun aperture once. Filtering this mask avoids marching
// nearest-filtered, binary scene depth and repeating exp() across the screen.
export const SUN_MASK_FRAGMENT = `
varying vec2 vUv;
uniform sampler2D tDepth;
uniform vec2 sunUv,sunMaskExtent,depthTexel;
uniform float aspect;
float sky(vec2 uv){
 if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))return 0.0;
 return step(0.999999,texture2D(tDepth,uv).r);
}
void main(){
 vec2 uv=sunUv+(vUv-0.5)*sunMaskExtent;
 vec2 t=depthTexel*0.35;
 float coverage=(sky(uv+t)+sky(uv-t)+sky(uv+vec2(t.x,-t.y))+sky(uv+vec2(-t.x,t.y)))*0.25;
 vec2 delta=(uv-sunUv)*vec2(aspect,1.0);
 gl_FragColor=vec4(vec3(coverage*exp(-dot(delta,delta)/0.0016)),1.0);
}`;

export const SUN_RAYS_FRAGMENT = `
varying vec2 vUv;
uniform sampler2D tSunMask;
uniform sampler2D tSunVisibility;
uniform vec2 sunUv,sunMaskScale;
uniform vec3 sunColor;
uniform float decay,density,exposure,aspect,visibility;
void main(){
  vec3 sun=texture2D(tSunVisibility,vec2(0.5)).rgb;
  float rayVisibility=clamp(sun.r*0.15+sun.g*0.85,0.0,1.0)*sun.b;
  if(rayVisibility<0.001){gl_FragColor=vec4(0.0);return;}
  vec2 uv=vec2(0.5),stepUv=(vUv-sunUv)*sunMaskScale*density/48.0;
  float sum=0.0,weight=1.0;
  for(int i=0;i<48;i++){
    uv+=stepUv;
    // Beyond this aperture the original Gaussian contributes less than 0.00013.
    // The ray travels monotonically away from the centre, so it cannot re-enter.
    if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))break;
    sum+=texture2D(tSunMask,uv).r*weight;weight*=decay;
  }
  float normalizer=max(1.0-pow(decay,48.0),0.001);
  float shaft=sum/normalizer*rayVisibility*visibility*exposure;
  gl_FragColor=vec4(sunColor*shaft,1.0);
}`;
