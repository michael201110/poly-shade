import { DEPTH_HELPERS, ATMOSPHERE_HELPERS } from "./atmosphere.js";
export const GRADE_FRAGMENT = `varying vec2 vUv;${DEPTH_HELPERS}${ATMOSPHERE_HELPERS}
uniform sampler2D tInput,tAO,tBloom,tRays;
uniform float aoActive,bloomStrength,rayStrength,atmosphereActive,gradeActive,exposure,contrast,saturation,vibrance,temperature,tint,shadowLift,highlightCompression,blackLevel,whiteLevel,vignetteStrength,vignetteSoftness;
uniform int debugView;
vec3 shoulder(vec3 c){return clamp((c*(2.51*c+0.03))/(c*(2.43*c+0.59)+0.14),0.0,1.0);}
void main(){
 vec3 c=texture2D(tInput,vUv).rgb;
 if(aoActive>0.5)c*=texture2D(tAO,vUv).r;
 if(atmosphereActive>0.5)c=aerial(c,vUv);
 c+=texture2D(tBloom,vUv).rgb*bloomStrength;
 c+=texture2D(tRays,vUv).rgb*rayStrength;
 if(gradeActive>0.5){
 c*=vec3(1.0+temperature,1.0+tint,1.0-temperature);
 float l=dot(c,vec3(0.2126,0.7152,0.0722));
 float sat=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b));
 c=mix(vec3(l),c,saturation+vibrance*(1.0-clamp(sat/max(l,0.01),0.0,1.0)));
 c+=shadowLift*pow(1.0-clamp(l,0.0,1.0),3.0);
 c=max(c-blackLevel,0.0)/whiteLevel;
 c*=pow(max(c,vec3(0.001))/0.18,vec3(contrast-1.0));
 c/=1.0+highlightCompression*max(c-1.0,0.0);}
 c=shoulder(max(c,0.0)*exposure);
 float corners=length(vUv-0.5)*1.4142;c*=1.0-vignetteStrength*smoothstep(vignetteSoftness,1.0,corners);
 if(debugView==1)c=vec3(clamp(viewDistance(vUv)/100.0,0.0,1.0));
 if(debugView==2)c=aoActive>0.5?texture2D(tAO,vUv).rgb:vec3(1.0);
 if(debugView==3)c=shoulder(texture2D(tBloom,vUv).rgb);
 gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);
}`;
