import { DEPTH_HELPERS } from "./atmosphere.js";
export const SSAO_FRAGMENT = `varying vec2 vUv;${DEPTH_HELPERS}
uniform float radius,strength,bias;uniform int samples;uniform float projectionScale;
void main(){
 if(texture2D(tDepth,vUv).r>=0.999999){gl_FragColor=vec4(1.0);return;}
 vec3 p=viewPosition(vUv);vec3 normal=normalize(cross(dFdx(p),dFdy(p)));
 if(dot(normal,-p)<0.0)normal=-normal;
 float occ=0.0;float screenRadius=clamp(radius*projectionScale/max(-p.z,0.1),0.0001,0.12);
 for(int i=0;i<16;i++){if(i>=samples)break;float f=(float(i)+0.5)/float(samples);
 float angle=float(i)*2.3999632;vec2 offset=vec2(cos(angle),sin(angle))*screenRadius*sqrt(f);
 vec2 uv=vUv+offset;if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))continue;
 vec3 q=viewPosition(uv);vec3 delta=q-p;float len=length(delta);
 float contribution=max(dot(normal,delta)/max(len,0.001)-bias,0.0);
 occ+=contribution*(1.0-smoothstep(radius*0.4,radius,len));}
 float ao=clamp(1.0-occ/float(samples)*strength*3.0,0.55,1.0);gl_FragColor=vec4(vec3(ao),1.0);
}`;
export const AO_BLUR_FRAGMENT = `varying vec2 vUv;${DEPTH_HELPERS}
uniform sampler2D tInput;uniform vec2 stepUv;
void main(){float center=viewDistance(vUv);float sum=0.0,weightSum=0.0;
 for(int i=-2;i<=2;i++){vec2 uv=vUv+stepUv*float(i);float d=viewDistance(uv);
 float w=exp(-abs(d-center)/max(0.05,center*0.002))*exp(-float(i*i)*0.4);
 sum+=texture2D(tInput,uv).r*w;weightSum+=w;}
 gl_FragColor=vec4(vec3(sum/max(weightSum,0.001)),1.0);}`;
