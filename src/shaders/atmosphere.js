export const DEPTH_HELPERS = `
uniform sampler2D tDepth;uniform mat4 inverseProjection;uniform vec2 nearFar;
vec3 viewPosition(vec2 uv){float d=texture2D(tDepth,uv).x;vec4 p=inverseProjection*vec4(uv*2.0-1.0,d*2.0-1.0,1.0);return p.xyz/max(abs(p.w),1e-6)*sign(p.w);}
float viewDistance(vec2 uv){float z=texture2D(tDepth,uv).x*2.0-1.0;return -(inverseProjection[2][2]*z+inverseProjection[3][2])/(inverseProjection[2][3]*z+inverseProjection[3][3]);}
`;
export const ATMOSPHERE_HELPERS = `
uniform mat4 cameraWorld;uniform vec3 horizon,sunDirection,sunColor;
uniform float atmosphereStrength,atmosphereStart,atmosphereSunWarmth;
vec3 aerial(vec3 c,vec2 uv){
 float rawDepth=texture2D(tDepth,uv).r;if(rawDepth>=0.999999)return c;
 vec3 p=viewPosition(uv);float distance=length(p);
 vec3 dir=normalize((cameraWorld*vec4(normalize(p),0.0)).xyz);
 float haze=1.0-exp(-max(distance-atmosphereStart,0.0)*atmosphereStrength*0.0015);
 haze*=0.5+0.5*pow(1.0-abs(dir.y),2.0);
 vec3 tint=mix(horizon,sunColor,max(dot(dir,sunDirection),0.0)*atmosphereSunWarmth);
 return mix(c,tint,clamp(haze,0.0,0.5));
}`;
