export const SKY_VERTEX = `varying vec3 vDirection;
void main(){vDirection=position;vec4 clip=projectionMatrix*mat4(mat3(viewMatrix))*vec4(position,1.0);gl_Position=clip.xyww;}`;
export const SKY_FRAGMENT = `
// PolyShade_sky
varying vec3 vDirection;
uniform vec3 zenith,horizon,sunDirection,sunColor;
uniform float intensity,warmth,turbidity,discSize,glow,cloudAmount,time;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
 vec3 d=normalize(vDirection);float h=pow(clamp(d.y,0.0,1.0),0.45+0.025*turbidity);
 vec3 c=mix(horizon,zenith,h);c=mix(c,horizon,clamp(-d.y*3.0,0.0,1.0));
 float mu=max(dot(d,sunDirection),0.0);float haze=pow(mu,mix(64.0,20.0,clamp(turbidity/8.0,0.0,1.0)));
 c+=sunColor*haze*glow*0.25;c+=zenith*0.04*(1.0+mu*mu)*(1.0-h);
 float disc=smoothstep(cos(discSize*0.0174533),cos(discSize*0.0122173),mu);
 c+=sunColor*disc*5.0;
 if(cloudAmount>0.0 && d.y>0.02){vec2 p=d.xz/max(d.y+0.35,0.1)*2.0+vec2(time*0.001,0.0);
 float n=noise(p)*0.78+noise(p*1.9)*0.22;
 float cloud=smoothstep(1.0-cloudAmount,1.0-cloudAmount+0.14,n)*smoothstep(0.02,0.25,d.y);
 c=mix(c,mix(horizon*1.2,sunColor*0.8,mu*0.16),cloud*0.55);}
 gl_FragColor=vec4(c*intensity,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
