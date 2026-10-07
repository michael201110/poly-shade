export const SUN_VISIBILITY_FRAGMENT = `
varying vec2 vUv;uniform sampler2D tDepth;uniform vec2 sunUv;uniform float aspect;
uniform vec3 sunDirection;uniform float cloudAmount,cloudTime;
float opticsHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float opticsNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(opticsHash(i),opticsHash(i+vec2(1,0)),f.x),mix(opticsHash(i+vec2(0,1)),opticsHash(i+vec2(1,1)),f.x),f.y);}
void main(){float clear=0.0;
for(int i=0;i<16;i++){float a=float(i)*0.392699;
vec2 uv=sunUv+vec2(cos(a)/aspect,sin(a))*0.012;
clear+=step(0.999999,texture2D(tDepth,clamp(uv,0.0,1.0)).r);}
clear/=16.0;
float transmission=1.0;
if(cloudAmount>0.0&&sunDirection.y>0.02){vec2 p=sunDirection.xz/max(sunDirection.y+0.35,0.1)*2.0+vec2(cloudTime*0.001,0.0);
float n=opticsNoise(p)*0.78+opticsNoise(p*1.9)*0.22;
float cloud=smoothstep(1.0-cloudAmount,1.0-cloudAmount+0.14,n)*smoothstep(0.02,0.25,sunDirection.y);
transmission=1.0-cloud*0.55;}
gl_FragColor=vec4(clear,4.0*clear*(1.0-clear),transmission,1.0);}`;

export const FLARE_HELPERS = `
uniform sampler2D tSunVisibility;uniform vec2 sunUv;
uniform float flareStrength,ghostStrength,iridescence,streakStrength,sunVisibility,aspect;
vec3 lensFlare(vec2 uv){
vec3 mask=texture2D(tSunVisibility,vec2(0.5)).rgb;
float visible=mask.r*mask.b*sunVisibility;
if(flareStrength<=0.0||visible<0.001)return vec3(0.0);
vec2 delta=(uv-sunUv)*vec2(aspect,1.0);float r=length(delta);
float sky=step(0.999999,texture2D(tDepth,uv).r);
vec3 f=sunColor*exp(-r*r/0.00065)*0.16*sky;
for(int i=0;i<3;i++){
vec2 center=mix(sunUv,vec2(0.5),0.6+float(i)*0.5);
float d=length((uv-center)*vec2(aspect,1.0));
float radius=0.027+float(i)*0.015;
vec3 ring=exp(-pow((vec3(d)-radius+vec3(-1.0,0.0,1.0)*iridescence*0.003)/0.008,vec3(2.0)));
f+=mix(vec3(dot(ring,vec3(0.333))),ring,iridescence)*ghostStrength*0.12;
}
f+=sunColor*exp(-abs(delta.x)*10.0-delta.y*delta.y/0.000002)*streakStrength*0.04*sky;
return f*flareStrength*visible;}`;
