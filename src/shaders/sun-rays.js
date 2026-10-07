// A depth mask around the projected procedural sun provides radial shafts.
// Fully clear and fully hidden suns fade out; foreground surfaces reject shafts.
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
  float partial=texture2D(tSunVisibility,vec2(0.5)).g;
  if(partial<0.001){gl_FragColor=vec4(0.0);return;}
  vec2 uv=vUv,stepUv=(vUv-sunUv)*density/32.0;
  float sum=0.0,weight=1.0;
  for(int i=0;i<32;i++){uv-=stepUv;sum+=mask(uv)*weight;weight*=decay;}
  float foreground=step(0.999999,texture2D(tDepth,vUv).r);
  float shaft=sum/32.0*partial*visibility*foreground*exposure;
  gl_FragColor=vec4(sunColor*shaft,1.0);
}`;
