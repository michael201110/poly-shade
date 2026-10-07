import { DEPTH_HELPERS } from "./atmosphere.js";
// Integrate a few deterministic camera-ray slices, testing sunlight against
// the scene depth at two distances along the same view-space sun direction.
// This is a screen-space approximation: unknown offscreen occluders attenuate
// rather than inventing illumination. No world fog or temporal history is added.
export const VOLUMETRIC_FRAGMENT = `varying vec2 vUv;${DEPTH_HELPERS}
uniform sampler2D tSunVisibility;uniform mat4 cameraProjection;
uniform vec3 sunViewDirection,sunColor;
uniform float volumeDensity,volumeDecay,volumeMaxDistance;uniform int volumeSamples;
float sunlit(vec3 p,float distance){
 vec3 q=p+sunViewDirection*distance;if(q.z>=-0.01)return 0.0;
 vec4 clip=cameraProjection*vec4(q,1.0);vec2 uv=clip.xy/max(clip.w,0.001)*0.5+0.5;
 if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))return 0.0;
 float edge=min(min(uv.x,uv.y),min(1.0-uv.x,1.0-uv.y));
 return smoothstep(-0.75,0.75,viewDistance(uv)+0.08+q.z)*smoothstep(0.0,0.03,edge);
}
void main(){
 vec3 surface=viewPosition(vUv);float end=min(length(surface),volumeMaxDistance);
 vec3 ray=normalize(surface);vec3 vis=texture2D(tSunVisibility,vec2(0.5)).rgb;
 float cloudPartial=4.0*vis.b*(1.0-vis.b);
 float gate=(vis.g*0.85+vis.r*(0.08+cloudPartial*0.3))*vis.b;
 float total=0.0,stepLength=end/float(volumeSamples);
 if(gate>0.001){for(int i=0;i<16;i++){if(i>=volumeSamples)break;
 float distance=(float(i)+0.5)*stepLength;vec3 p=ray*distance;
 float light=min(sunlit(p,min(volumeMaxDistance*0.15,12.0)),sunlit(p,min(volumeMaxDistance*1.5,160.0)));
 total+=light*volumeDensity*stepLength*exp(-volumeDensity*distance)*pow(volumeDecay,float(i));}}
 float phase=0.12+0.88*pow(max(dot(ray,sunViewDirection),0.0),4.0);
 gl_FragColor=vec4(sunColor*total*phase*gate,end/volumeMaxDistance);
}`;

export const VOLUME_COMPOSITE = `
uniform sampler2D tVolume;uniform vec2 volumeTexel;
uniform float volumeStrength,volumeMaxDistance;
vec3 volumeComposite(vec2 uv){
 if(volumeStrength<=0.0)return vec3(0.0);
 float depth=min(length(viewPosition(uv)),volumeMaxDistance)/volumeMaxDistance;
 vec3 sum=vec3(0.0);float weights=0.0;
 for(int i=0;i<4;i++){
 vec2 offset=vec2(mod(float(i),2.0)-0.5,floor(float(i)/2.0)-0.5)*volumeTexel;
 vec4 sampleValue=texture2D(tVolume,uv+offset);
 float w=exp(-abs(sampleValue.a-depth)*volumeMaxDistance*0.7);
 sum+=sampleValue.rgb*w;weights+=w;}
 return sum/max(weights,0.0001)*volumeStrength;
}`;
