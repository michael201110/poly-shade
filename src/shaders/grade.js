import { DEPTH_HELPERS, ATMOSPHERE_HELPERS } from "./atmosphere.js";
import { FLARE_HELPERS } from "./sun-optics.js";
import { VOLUME_COMPOSITE } from "./volumetric.js";
export const GRADE_FRAGMENT = `varying vec2 vUv;${DEPTH_HELPERS}${ATMOSPHERE_HELPERS}${FLARE_HELPERS}${VOLUME_COMPOSITE}
uniform sampler2D tInput,tAO,tBloom,tRays;
uniform vec2 rayTexel,motionTexel;
uniform mat4 previousViewProjection;
uniform float motionBlurStrength,motionBlurMaxPixels;
uniform float aoActive,bloomStrength,rayStrength,atmosphereActive,gradeActive,exposure,contrast,saturation,vibrance,temperature,tint,shadowLift,highlightCompression,blackLevel,whiteLevel,vignetteStrength,vignetteSoftness;
vec3 softenedRays(vec2 uv){vec2 t=rayTexel*1.1;return (texture2D(tRays,uv).rgb*4.0+(texture2D(tRays,uv+vec2(t.x,0.0)).rgb+texture2D(tRays,uv-vec2(t.x,0.0)).rgb+texture2D(tRays,uv+vec2(0.0,t.y)).rgb+texture2D(tRays,uv-vec2(0.0,t.y)).rgb)+(texture2D(tRays,uv+t).rgb+texture2D(tRays,uv-t).rgb+texture2D(tRays,uv+vec2(t.x,-t.y)).rgb+texture2D(tRays,uv+vec2(-t.x,t.y)).rgb)*0.5)/10.0;}
uniform int debugView;
vec3 shoulder(vec3 c){return clamp((c*(2.51*c+0.03))/(c*(2.43*c+0.59)+0.14),0.0,1.0);}
vec3 cameraMotionBlur(vec2 uv,vec3 center){
 if(motionBlurStrength<=0.0)return center;
 float d=texture2D(tDepth,uv).r;
 vec4 world=cameraWorld*vec4(viewPosition(uv),1.0);
 vec4 previous=previousViewProjection*world;
 if(previous.w<=0.00001)return center;
 vec2 previousUv=previous.xy/previous.w*0.5+0.5;
 vec2 velocity=uv-previousUv;
 float pixels=length(velocity/motionTexel);
 if(pixels<0.5||any(lessThan(previousUv,vec2(0.0)))||any(greaterThan(previousUv,vec2(1.0))))return center;
 velocity*=min(1.0,motionBlurMaxPixels/max(pixels,0.0001));
 float centerDepth=linearDepth(d),tolerance=max(0.75,centerDepth*0.08);
 vec3 sum=center*0.28;float total=0.28;
 for(int i=0;i<4;i++){
  float along=(float(i)+0.5)*0.25;
  vec2 sampleUv=uv-velocity*along;
  if(any(lessThan(sampleUv,vec2(0.0)))||any(greaterThan(sampleUv,vec2(1.0))))continue;
  float sampleDepth=linearDepth(texture2D(tDepth,sampleUv).r);
  if(abs(sampleDepth-centerDepth)>tolerance)continue;
  sum+=texture2D(tInput,sampleUv).rgb*0.18;total+=0.18;
 }
 return mix(center,sum/max(total,0.0001),clamp(motionBlurStrength,0.0,0.8));
}
void main(){
 vec3 sceneColor=texture2D(tInput,vUv).rgb;
 sceneColor=cameraMotionBlur(vUv,sceneColor);vec3 c=sceneColor;
 if(aoActive>0.5){float ao=texture2D(tAO,vUv).r;
 // Neutral AO is safer than propagating invalid depth-derived samples.
 if(ao>=0.0&&ao<=1.0)c*=max(ao,0.55);
 }
 if(atmosphereActive>0.5)c=aerial(c,vUv);
 if(bloomStrength>0.0)c+=texture2D(tBloom,vUv).rgb*bloomStrength;
 if(rayStrength>0.0)c+=softenedRays(vUv)*rayStrength;
 c+=lensFlare(vUv);
 c+=volumeComposite(vUv);
 if(gradeActive>0.5){
 c*=vec3(1.0+temperature,1.0+tint,1.0-temperature);
 float l=dot(c,vec3(0.2126,0.7152,0.0722));
 float sat=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b));
 c=mix(vec3(l),c,saturation+vibrance*(1.0-clamp(sat/max(l,0.01),0.0,1.0)));
 c+=shadowLift*pow(1.0-clamp(l,0.0,1.0),3.0);
 c=max(c-blackLevel,0.0)/whiteLevel;
 // A luminance pivot preserves hue and avoids channel-dependent contrast shifts.
 float pivotL=max(dot(c,vec3(0.2126,0.7152,0.0722)),0.001);
 c*=pow(pivotL/0.18,contrast-1.0);
 c/=1.0+highlightCompression*max(c-1.0,0.0);}
 c=shoulder(max(c,0.0)*exposure);
 if(gradeActive>0.5){float corners=length(vUv-0.5)*1.4142;c*=1.0-vignetteStrength*smoothstep(vignetteSoftness,1.0,corners);}
 if(debugView==1)c=vec3(clamp(viewDistance(vUv)/100.0,0.0,1.0));
 if(debugView==2)c=aoActive>0.5?texture2D(tAO,vUv).rgb:vec3(1.0);
 if(debugView==3)c=shoulder(texture2D(tBloom,vUv).rgb);
 if(debugView==4){float d=length((vUv-sunUv)*vec2(aspect,1.0));c=vec3(0.04,0.06,0.09);c=mix(c,vec3(0.1,0.5,1.0),1.0-smoothstep(0.04,0.18,d));c=mix(c,vec3(1.0,0.85,0.15),1.0-smoothstep(0.003,0.007,d));}
 if(debugView==5)c=texture2D(tSunVisibility,vec2(0.5)).rgb;
 if(debugView==6)c=softenedRays(vUv)*4.0;
 if(debugView==7)c=texture2D(tVolume,vUv).rgb*4.0;
 // Unordered (NaN) comparisons fail this check: preserve the lit scene if an
 // optional effect produces an invalid sample on a different GPU driver.
 if(!all(greaterThanEqual(c,vec3(0.0))))c=shoulder(max(sceneColor,0.0)*exposure);
 gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);
}`;
