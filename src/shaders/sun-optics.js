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
if(flareStrength<=0.0)return vec3(0.0);
vec3 mask=texture2D(tSunVisibility,vec2(0.5)).rgb;
float visible=clamp(mask.r+mask.g*0.2,0.0,1.0)*mix(mask.b,1.0,0.18)*sunVisibility;
if(flareStrength<=0.0||visible<0.001)return vec3(0.0);
vec2 delta=(uv-sunUv)*vec2(aspect,1.0);float r=length(delta);
float sky=step(0.999999,texture2D(tDepth,uv).r);
float cloudDiffusion=4.0*mask.b*(1.0-mask.b);
vec3 f=sunColor*(exp(-r*r/0.00042)*0.62+exp(-r*r/0.0035)*cloudDiffusion*0.055)*sky;
for(int i=0;i<4;i++){
float axis=i==0?0.22:(i==1?0.63:(i==2?1.12:1.64));
vec2 center=sunUv+(vec2(0.5)-sunUv)*axis;
float d=length((uv-center)*vec2(aspect,1.0));
// Different lens elements produce differently sized, softly coloured ghosts.
float radius=i==0?0.010:(i==1?0.027:(i==2?0.051:0.016));
float width=0.0025+radius*0.11;
float dispersion=iridescence*radius*0.14;
vec3 ringDistance=(vec3(d)-radius+vec3(-0.65,0.0,0.65)*dispersion)/width;
vec3 ring=exp(-ringDistance*ringDistance);
float mono=dot(ring,vec3(0.333));
float core=(1.0-smoothstep(radius*0.2,radius*0.9,d))*0.08;
float weight=i==0?0.37:(i==1?0.30:(i==2?0.15:0.24));
f+=(mix(sunColor*vec3(0.72,0.8,0.9)*mono,ring,iridescence*0.62)+sunColor*core)*ghostStrength*weight;
}
f+=sunColor*exp(-abs(delta.x)*8.0-delta.y*delta.y/0.000008)*streakStrength*0.2*sky;
return f*flareStrength*visible;}`;
