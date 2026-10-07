export const FINISH_FRAGMENT = `varying vec2 vUv;uniform sampler2D tInput;uniform vec2 texel;uniform float fxaa,sharpen;
float polyShadeLuma(vec3 c){return dot(c,vec3(0.2126,0.7152,0.0722));}
void main(){vec3 c=texture2D(tInput,vUv).rgb;
 if(fxaa>0.5||sharpen>0.0){
 vec3 n=texture2D(tInput,vUv+vec2(0,texel.y)).rgb,s=texture2D(tInput,vUv-vec2(0,texel.y)).rgb;
 vec3 e=texture2D(tInput,vUv+vec2(texel.x,0)).rgb,w=texture2D(tInput,vUv-vec2(texel.x,0)).rgb;
 vec3 lo=min(c,min(min(n,s),min(e,w))),hi=max(c,max(max(n,s),max(e,w)));
 if(fxaa>0.5){float edge=polyShadeLuma(hi)-polyShadeLuma(lo);
 if(edge>max(0.03,polyShadeLuma(hi)*0.12)){
 vec2 gradient=vec2(polyShadeLuma(n)-polyShadeLuma(s),polyShadeLuma(w)-polyShadeLuma(e));
 vec2 direction=gradient/max(length(gradient),0.001)*texel;
 c=mix(c,(texture2D(tInput,vUv+direction*0.5).rgb+texture2D(tInput,vUv-direction*0.5).rgb)*0.5,0.55);}}
 c=clamp(c+sharpen*(4.0*c-n-s-e-w),lo,hi);}
 gl_FragColor=vec4(c,1.0);
 #include <colorspace_fragment>
}`;
