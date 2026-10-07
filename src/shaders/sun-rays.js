// Sky depth samples define illuminated gaps around the real sun. The finished
// shafts composite over foreground surfaces, as screen-space light scatter should.
export const SUN_RAYS_FRAGMENT = `
varying vec2 vUv;
uniform sampler2D tDepth;
uniform sampler2D tSunVisibility;
uniform vec2 sunUv;
uniform vec3 sunColor;
uniform float decay,density,exposure,aspect,visibility;
float mask(vec2 uv){
  if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))return 0.0;
  vec2 delta=(uv-sunUv)*vec2(aspect,1.0);
  return step(0.999999,texture2D(tDepth,uv).r)*exp(-dot(delta,delta)/0.0016);
}
void main(){
  vec3 sun=texture2D(tSunVisibility,vec2(0.5)).rgb;
  float rayVisibility=clamp(sun.r*0.15+sun.g*0.85,0.0,1.0)*sun.b;
  if(rayVisibility<0.001){gl_FragColor=vec4(0.0);return;}
  vec2 uv=sunUv,stepUv=(vUv-sunUv)*density/32.0;
  float sum=0.0,weight=1.0;
  for(int i=0;i<32;i++){uv+=stepUv;sum+=mask(uv)*weight;weight*=decay;}
  float normalizer=max(1.0-pow(decay,32.0),0.001);
  float shaft=sum/normalizer*rayVisibility*visibility*exposure;
  gl_FragColor=vec4(sunColor*shaft,1.0);
}`;
