// Offline port of the pinned AMD FG/OF source. Runtime never compiles HLSL.
import {cp,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {translate,nagaVersion} from 'naga-wasm';
import {createHash} from 'node:crypto';
import {bufferImages} from './adapt-resources.mjs';
import {inlineComputeInputs,uniformSceneChange} from './wgsl-inputs.mjs';
const stage=join(tmpdir(),'polyshade-framegen-source');
await cp(resolve('vendor/fidelityfx'),stage,{recursive:true});
const base=join(stage,'Kits/FidelityFX/framegeneration/fsr3');
const include=join(base,'include/gpu');
const output=resolve(process.env.FG_GENERATED_OUTPUT??'src/rendering/framegen/generated');
await mkdir(output,{recursive:true});
const core=join(stage,'Kits/FidelityFX/api/internal/gpu/ffx_core_hlsl.h');
// Elect is absent from Naga's SPIR-V reader; first lane is equivalently lane 0
// for these full, converged AMD wave reductions.
await writeFile(core,(await readFile(core,'utf8')).replace('return WaveIsFirstLane();','return WaveGetLaneIndex() == 0;'));
for(const spd of [join(stage,'Kits/FidelityFX/upscalers/fsr3/include/gpu/spd/ffx_spd.h'),join(include,'spd/ffx_spd.h')]) {
await writeFile(spd,(await readFile(spd,'utf8')).replace(
  '    // increase the global atomic counter for the given slice and check if it\'s the last remaining thread group:',
  '    return; // WebGPU: ordered dispatch boundary before mip 6.\n    // increase the global atomic counter for the given slice and check if it\'s the last remaining thread group:'));
}
for(const family of ['frameinterpolation','opticalflow']) {
  const path=join(include,family,`ffx_${family}_callbacks_hlsl.h`);
  let code=(await readFile(path,'utf8')).replaceAll('globallycoherent ','');
  // PolyShade's pre-present surface is linear scRGB. Specialize the official
  // transfer-function permutation; min/max luminance (0,80) gives identity.
  code=code.replace('return backBufferTransferFunction;','return 2;')
    .replace('return backbufferTransferFunction;','return 2;');
  if(family==='frameinterpolation')code=code
    .replace('RWTexture2D<FfxFloat32x3> rw_output','RWTexture2D<FfxFloat32x4> rw_output')
    .replace('FfxFloat32x4(rw_output[iPxPos], rw_inpainting_mask[iPxPos])','FfxFloat32x4(rw_output[iPxPos].rgb, rw_inpainting_mask[iPxPos])')
    .replace('rw_output[iPxPos] = val.rgb;','rw_output[iPxPos] = FfxFloat32x4(val.rgb, 1.0f);')
    .replace('return HUDLessAttachedFactor;','return 0;');
  if(family==='frameinterpolation') {
    const input=`#ifdef POLYSHADE_INPAINT_INPUT\nTexture2D<float4> r_polyshade_inpaint_color : register(t14);\nTexture2D<float> r_polyshade_inpaint_mask : register(t15);\n#endif\n`;
    code=code.replace('SamplerState s_LinearClamp',input+'SamplerState s_LinearClamp');
    code=code.replace('return FfxFloat32x4(rw_output[iPxPos].rgb, rw_inpainting_mask[iPxPos]);',
      '#ifdef POLYSHADE_INPAINT_INPUT\nreturn FfxFloat32x4(r_polyshade_inpaint_color[iPxPos].rgb, r_polyshade_inpaint_mask[iPxPos]);\n#else\nreturn FfxFloat32x4(rw_output[iPxPos].rgb, rw_inpainting_mask[iPxPos]);\n#endif');
  }
  await writeFile(path,bufferImages(code,family));
}
const inpainting=join(include,'frameinterpolation/ffx_frameinterpolation_inpainting.h');
await writeFile(inpainting,(await readFile(inpainting,'utf8')).replace(
  'if (bWriteColor)\n    {\n        StoreFrameinterpolationOutput(iPxPos, FfxFloat32x4(fInterpolatedColor.rgb, 1.0f));',
  'if (true)\n    {\n        StoreFrameinterpolationOutput(iPxPos, FfxFloat32x4(fInterpolatedColor.rgb, bWriteColor ? 1.0f : fInterpolatedColor.w));'));
const names=process.argv.slice(2);
if(!names.length)names.push(...(await readdir(join(base,'internal/shaders')))
  .filter(name=>name.startsWith('ffx_')&&name.endsWith('.hlsl')).map(name=>name.slice(4,-5)));
if(process.argv.length===2)names.push('frameinterpolation_compute_inpainting_pyramid_pass_tail',
  'frameinterpolation_compute_game_vector_field_inpainting_pyramid_pass_tail');
const dxc=process.env.DXC??join(tmpdir(),'polyshade-fg-tools/dxc/bin/x64/dxc.exe');
const half=process.env.FG_HALF==='1';
for(const name of names) {
  const spv=join(stage,name+'.spv');
  let input=join(base,'internal/shaders','ffx_'+name.replace(/_tail$/,'')+'.hlsl');
  if(name.endsWith('_tail')) {
    let tail=await readFile(input,'utf8');
    tail=tail.replace(/computeFrameinterpolation\w*Pyramid\(WorkGroupId, LocalThreadIndex\);/,
      `uint2 xy = ffxRemapForWaveReduction(LocalThreadIndex % 64);\nuint x = xy.x + 8 * ((LocalThreadIndex >> 6) % 2);\nuint y = xy.y + 8 * (LocalThreadIndex >> 7);\nSpdDownsampleMips_6_7(x, y, NumMips(), 0);\nSpdDownsampleNextFour(x, y, uint2(0,0), LocalThreadIndex, 8, NumMips(), 0);`);
    input=join(stage,name+'.hlsl');await writeFile(input,tail);
  }
  const args=['-spirv','-T','cs_6_2','-E','CS','-fspv-target-env=vulkan1.1',
    ...(half?['-enable-16bit-types']:[]),
    ...(process.env.FG_DXC_OPT_LEVEL?[process.env.FG_DXC_OPT_LEVEL]:name==='opticalflow_generate_scd_histogram_pass'?['-Od']:[]),
    ...(name==='frameinterpolation_inpainting_pass'?['-D','POLYSHADE_INPAINT_INPUT=1']:[]),
    '-fvk-t-shift','8','0','-fvk-u-shift','32','0','-fvk-s-shift','64','0',
    '-D','FFX_HLSL=1','-D','FFX_GPU=1','-D',`FFX_HALF=${half?1:0}`,'-D','FFX_SPD_NO_WAVE_OPERATIONS=1',
    '-D','FFX_FRAMEINTERPOLATION_OPTION_LOW_RES_MOTION_VECTORS=1',
    '-D','FFX_FRAMEINTERPOLATION_OPTION_JITTERED_MOTION_VECTORS=0',
    '-D','FFX_FRAMEINTERPOLATION_OPTION_INVERTED_DEPTH=0',
    '-I',include,'-I',join(stage,'Kits/FidelityFX/upscalers/fsr3/include/gpu'),
    '-Fc',join(stage,name+'.spvasm'),'-Fo',spv,input];
  try {
    execFileSync(dxc,args,{stdio:['ignore','pipe','pipe']});
    let code=translate({from:'spirv',to:'wgsl',source:await readFile(spv)});
    if(name==='opticalflow_compute_optical_flow_advanced_pass_v5'||name==='opticalflow_scale_optical_flow_advanced_pass_v5')
      code=uniformSceneChange(inlineComputeInputs(code));
    if(code.includes('subgroup'))code='enable subgroups;\n'+code;
    if(/\bf16\b/.test(code))code='enable f16;\n'+code;
    const formats={rw_output:'rgba16float',rw_inpainting_mask:'rgba8unorm',rw_disocclusion_mask:'rgba8unorm',
      rw_dilated_motion_vectors:'rgba16float',rw_dilated_depth:'r32float',rw_optical_flow_input:'r32uint',
      rw_optical_flow_scd_previous_histogram:'r32float'};
    for(let i=0;i<13;i++)formats['rw_inpainting_pyramid'+i]='rgba16float';
    for(let i=1;i<=6;i++)formats['rw_optical_flow_input_level_'+i]='r32uint';
    for(const [variable,format]of Object.entries(formats)) {
      const actual=code.match(new RegExp(`var (${variable}_?): texture_storage_2d<[^>]+>;`))?.[1];
      if(!actual)continue;
      const loads=code.includes(`textureLoad(${actual},`),stores=code.includes(`textureStore(${actual},`);
      if(loads&&!stores) {
        code=code.replace(new RegExp(`var ${actual}: texture_storage_2d<[^>]+>;`),`var ${actual}: texture_2d<${format.endsWith('uint')?'u32':'f32'}>;`);
        code=code.replace(new RegExp(`textureLoad\\(${actual}, ([^\\n;]+)\\)`,'g'),`textureLoad(${actual}, $1, 0)`);
      } else if(stores&&!loads)code=code.replace(new RegExp(`var ${actual}: texture_storage_2d<[^>]+>;`),`var ${actual}: texture_storage_2d<${format},write>;`);
      else if(loads&&stores&&format!=='r32float')throw Error(`Unadapted read/write ${name}/${actual}`);
    }
    if(code.includes('var r_input_depth: texture_2d<f32>')) {
      code=code.replace('var r_input_depth: texture_2d<f32>','var r_input_depth: texture_depth_2d');
      code=code.replaceAll('textureLoad(r_input_depth, ','polyshadeLoadDepth(')
        .replace(/polyshadeLoadDepth\((\w+), ([^)]+)\)/g,'polyshadeLoadDepth(vec2<i32>($1), i32($2))');
      code+='\nfn polyshadeLoadDepth(p:vec2<i32>,lod:i32)->vec4f{return vec4f(textureLoad(r_input_depth,p,lod),0,0,0);}\n';
    }
    code=code.replaceAll('340282350000000000000000000000000000000f','0x1.fffffep+127f');
    const header=`// AMD FidelityFX SDK v2.3.0, Frame Interpolation 3.1.6.\n// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt\n// DXC -> SPIR-V -> Naga ${nagaVersion} -> WGSL; scripts/fg/compile.mjs.\n`;
    await writeFile(join(output,name+'.wgsl'),header+code);
    await writeFile(join(output,name+'.wgsl.js'),header+'export default String.raw`'+code+'`;\n');
    console.log(name,code.length,createHash('sha256').update(code).digest('hex').slice(0,16));
  } catch(error) {
    console.error(name,error.stderr?.toString()??error.formatted??error.message);
    process.exitCode=1;
  }
}
