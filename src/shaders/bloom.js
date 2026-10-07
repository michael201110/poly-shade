export const BLOOM_FRAGMENT = `varying vec2 vUv;uniform sampler2D tInput;uniform float threshold;
void main(){vec3 c=texture2D(tInput,vUv).rgb;float bright=max(c.r,max(c.g,c.b));
 float soft=smoothstep(threshold*0.8,threshold*1.2,bright);
 gl_FragColor=vec4(c*max(bright-threshold,0.0)/max(bright,0.001)*soft,1.0);}`;
export const BLOOM_BLUR_FRAGMENT = `varying vec2 vUv;uniform sampler2D tInput;uniform vec2 stepUv;
void main(){vec3 c=texture2D(tInput,vUv+stepUv*vec2(-1,-1)).rgb+texture2D(tInput,vUv+stepUv*vec2(1,-1)).rgb+texture2D(tInput,vUv+stepUv*vec2(-1,1)).rgb+texture2D(tInput,vUv+stepUv*vec2(1,1)).rgb;gl_FragColor=vec4(c*0.25,1.0);}`;
