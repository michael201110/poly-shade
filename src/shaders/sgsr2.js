import { CONVERT_REFERENCE, UPSCALE_REFERENCE } from "../vendor/sgsr2/reference.js";

export const SGSR2_VERTEX = `out vec2 texCoord;
void main(){texCoord=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;

// Port the actual two-pass FS source. Only API/input representation and bounded
// texture access change; the Lanczos kernel, depth clip, variance clamp and
// temporal weights remain the upstream code. See docs/0.3.5.md for the full diff.
function webgl(source) {
  return source
    .replace(/^#version 320 es/, "// PolyShade SGSR2: WebGL2 GLSL ES 3.00 adapter")
    .replace(/layout\(set = 0, binding = \d\) /g, "")
    .replace(/layout\(location = 0\) in highp vec2 texCoord;/, "in highp vec2 texCoord;")
    .replace(/layout\(std140, set = 0, binding = 0\) uniform(?: readonly)? Params[\s\S]*?} params;/, `
uniform mat4 clipToPrevClip;
uniform vec2 renderSize,outputSize,renderSizeRcp,outputSizeRcp,jitterOffset,scaleRatio;
uniform float cameraFovAngleHor,minLerpContribution,reset;
uniform uint bSameCamera;`)
    .replace(/params\./g, "")
    .replace(/precision mediump float;/, "precision highp float;")
    .replace(/uniform mediump sampler2D/g, "uniform highp sampler2D")
    .replace(/(\d\.\d+(?:e[+-]?\d+)?)f\b/gi, "$1");
}

// textureGather is ES 3.1, unavailable in WebGL2. Four bounded texelFetch calls
// reproduce its component order and clamp-to-edge sampler behavior exactly.
const GATHER = `
float sgsrDepth(ivec2 p){return texelFetch(InputDepth,clamp(p,ivec2(0),ivec2(renderSize)-1),0).r;}
vec4 sgsrGather(vec2 uv){
 ivec2 p=ivec2(floor(uv*renderSize-0.5));
 return vec4(sgsrDepth(p+ivec2(0,1)),sgsrDepth(p+ivec2(1,1)),sgsrDepth(p+ivec2(1,0)),sgsrDepth(p));
}
`;
// Per-pixel history validity is an integration extension, not a different
// reconstruction filter. Previous depth and rigid-car coverage are compared at
// the actual reprojected previous jittered UV. The mask resets only those pixels.
const REJECTION = `
uniform sampler2D PreviousGeometry;
uniform vec4 historyJitterUV;
uniform float temporalHistoryValid;
vec4 sgsrGeometry(ivec2 p){return texelFetch(PreviousGeometry,clamp(p,ivec2(0),ivec2(renderSize)-1),0);}
float sgsrReject(vec2 uv,vec4 velocity){
 float expected=velocity.w;
 float tolerance=max(0.03,max(expected*0.015,2.0*max(abs(dFdx(expected)),abs(dFdy(expected)))));
 vec2 previousUV=uv-historyJitterUV.xy-velocity.xy*0.5+historyJitterUV.zw;
 ivec2 pixel=ivec2(floor(previousUV*renderSize));
 vec4 old=sgsrGeometry(pixel);
 float movingCoverage=0.0;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++)
   movingCoverage=max(movingCoverage,sgsrGeometry(pixel+ivec2(x,y)).b);
 bool car=velocity.z>0.5;
 bool mismatch=abs(expected-old.r)>tolerance;
 bool revealedRoad=!car&&(old.g>0.5||movingCoverage>0.5);
 bool newCar=car&&old.g<0.5;
 bool outside=any(lessThan(previousUV,vec2(0.0)))||any(greaterThanEqual(previousUV,vec2(1.0)));
 bool objectReset=velocity.z>2.5;
 return temporalHistoryValid<0.5||old.a<0.5||outside||mismatch||revealedRoad||newCar||objectReset?1.0:0.0;
}
`;
export const SGSR2_CONVERT_FRAGMENT = webgl(CONVERT_REFERENCE)
  .replace("void main()", `${GATHER}\n${REJECTION}\nvoid main()`)
  .replace(/textureGather\(InputDepth,\s*([^,]+), 0\)/g, "sgsrGather($1)")
  // RGBA16F contains a complete signed NDC field, not UNORM-packed motion.
  // Z records car coverage/movement; W stores predicted previous view depth.
  .replace("EncodedVelocity.x > 0.0", "true")
  .replace("motion = decodeVelocityFromTexture(EncodedVelocity.xy);", "motion = EncodedVelocity.xy;")
  // The fallback uses OpenGL's [-1,1] depth, unlike Vulkan's [0,1]. The normal
  // path always receives full-frame velocity, including static world and sky.
  .replace("vec3 Position = vec3(ScreenPos, btmLeftMax9);", "vec3 Position = vec3(ScreenPos, btmLeftMax9 * 2.0 - 1.0);")
  .replace("MotionDepthClipAlphaBuffer = vec4(motion, depthclip, 0.0);", "MotionDepthClipAlphaBuffer = vec4(motion, depthclip, sgsrReject(texCoord, EncodedVelocity));");

const FETCH = `
vec3 sgsrColor(ivec2 p){return texelFetch(InputColor,clamp(p,ivec2(0),ivec2(renderSize)-1),0).xyz;}
`;
export const SGSR2_UPSCALE_FRAGMENT = webgl(UPSCALE_REFERENCE)
  .replace("void main()", `${FETCH}\nvoid main()`)
  .replace(/texelFetch\(InputColor, (InputPos \+ ivec2\([^)]*\))\s*, 0\).xyz/g, "sgsrColor($1)")
  .replace("vec3 mda = textureLod(MotionDepthClipAlphaBuffer, Jitteruv, 0.0).xyz;", "vec4 mda = textureLod(MotionDepthClipAlphaBuffer, Jitteruv, 0.0);")
  .replace("Upsampledcw.w / alphasum + reset", "Upsampledcw.w / alphasum + reset + mda.w");
