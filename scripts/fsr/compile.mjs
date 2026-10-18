// Offline only. Generated WGSL ships with the experimental build; no runtime compiler.
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { translate, nagaVersion } from 'naga-wasm';

const root = resolve('vendor/fidelityfx');
const stage = join(tmpdir(), 'polyshade-fsr31-source');
await cp(root, stage, { recursive: true });
const base = 'Kits/FidelityFX/upscalers/fsr3';
const callbacks = join(stage, base, 'include/gpu/fsr3upscaler/ffx_fsr3upscaler_callbacks_hlsl.h');
let source = await readFile(callbacks, 'utf8');
// WebGPU has integer storage-buffer atomics, but no image atomics. Retain the
// same per-pixel u32 bit pattern, addressing and atomicMin/Max operation.
source = source.replace('Texture2D<FfxUInt32> r_reconstructed_previous_nearest_depth',
  'StructuredBuffer<FfxUInt32> r_reconstructed_previous_nearest_depth');
source = source.replace('RWTexture2D<FfxUInt32> rw_reconstructed_previous_nearest_depth',
  'RWStructuredBuffer<FfxUInt32> rw_reconstructed_previous_nearest_depth');
source = source.replaceAll('r_reconstructed_previous_nearest_depth[iPxPos]',
  'r_reconstructed_previous_nearest_depth[iPxPos.y * iMaxRenderSize.x + iPxPos.x]');
source = source.replaceAll('rw_reconstructed_previous_nearest_depth[iPxSample]',
  'rw_reconstructed_previous_nearest_depth[iPxSample.y * iMaxRenderSize.x + iPxSample.x]');
source = source.replace('globallycoherent RWTexture2D<FfxUInt32>   rw_spd_global_atomic',
  'globallycoherent RWStructuredBuffer<FfxUInt32> rw_spd_global_atomic');
source = source.replaceAll('rw_spd_global_atomic[FfxInt32x2(0, 0)]', 'rw_spd_global_atomic[0]');
// R8_UNORM read/write image loads become an R32F carrier. Quantize writes at
// the same boundary so locks retain their reference 8-bit values.
source = source.replace('rw_new_locks[iPxPos] = newLock;',
  'rw_new_locks[iPxPos] = round(saturate(newLock) * 255.0f) / 255.0f;');
// D3D12 on this adapter cannot load all typed UAV formats. A 16-byte storage
// buffer preserves all four f32 values of AMD's 1x1 frame-info resource.
source = source.replace('RWTexture2D<FfxFloat32x4> rw_frame_info', 'RWStructuredBuffer<FfxFloat32x4> rw_frame_info');
source = source.replace('Texture2D<FfxFloat32x4> r_frame_info', 'StructuredBuffer<FfxFloat32x4> r_frame_info');
source = source.replaceAll('rw_frame_info[FfxInt32x2(0, 0)]', 'rw_frame_info[0]');
source = source.replaceAll('r_frame_info[FfxInt32x2(0, 0)]', 'r_frame_info[0]');
await writeFile(callbacks, source);
// SPD's last-workgroup election requires device-scope visibility of image UAVs,
// which WebGPU cannot express. Keep AMD's reduction kernels and their operation
// order, but end dispatch A at mip 5 and run the tail in a separate dispatch.
const spdFile = join(stage, base, 'include/gpu/spd/ffx_spd.h');
let spd = await readFile(spdFile, 'utf8');
spd = spd.replace('    // increase the global atomic counter for the given slice and check if it\'s the last remaining thread group:',
  '    return; // WebGPU dispatch boundary replaces the device-scope election.\n    // increase the global atomic counter for the given slice and check if it\'s the last remaining thread group:');
await writeFile(spdFile, spd);
// Coherency is provided by the dispatch boundary, not by unsupported decorations.
await writeFile(callbacks, source.replaceAll('globallycoherent ', ''));
const output = resolve(process.env.FSR_GENERATED_OUTPUT ?? 'src/rendering/fsr31/generated');
if (process.env.FSR_NO_UNROLL === '1') {
  const core = join(stage, 'Kits/FidelityFX/api/internal/gpu/ffx_core_hlsl.h');
  const code = await readFile(core, 'utf8');
  if (!code.includes('#define FFX_UNROLL [unroll]')) throw new Error('Unknown AMD loop annotation');
  await writeFile(core, code.replace('#define FFX_UNROLL [unroll]', '#define FFX_UNROLL [loop]'));
}
await mkdir(output, { recursive: true });
const dxc = process.env.DXC ?? join(tmpdir(), 'polyshade-fg-tools/dxc/bin/x64/dxc.exe');
const passes = process.argv.slice(2);
if (!passes.length) passes.push('prepare_inputs', 'prepare_reactivity', 'shading_change',
  'luma_instability', 'accumulate', 'accumulate_sharpen', 'rcas', 'autogen_reactive', 'luma_pyramid', 'luma_pyramid_tail', 'shading_change_pyramid');
for (const name of passes) {
  let input = join(stage, base, `internal/shaders/ffx_fsr3upscaler_${name === 'accumulate_sharpen' ? 'accumulate' : name}_pass.hlsl`);
  if (name === 'luma_pyramid_tail') {
    let tail = await readFile(input.replace('_tail', ''), 'utf8');
    tail = tail.replace('ComputeAutoExposure(WorkGroupId, LocalThreadIndex);', `
      uint2 sub_xy = ffxRemapForWaveReduction(LocalThreadIndex % 64);
      uint x = sub_xy.x + 8 * ((LocalThreadIndex >> 6) % 2);
      uint y = sub_xy.y + 8 * (LocalThreadIndex >> 7);
      SpdDownsampleMips_6_7(x, y, MipCount(), 0);
      SpdDownsampleNextFour(x, y, uint2(0, 0), LocalThreadIndex, 8, MipCount(), 0);`);
    await writeFile(input, tail);
  }
  const spv = join(stage, name + '.spv');
  const args = ['-spirv', '-T', 'cs_6_2', '-E', 'CS', '-fspv-target-env=vulkan1.1',
    '-fvk-t-shift', '8', '0', '-fvk-u-shift', '32', '0', '-fvk-s-shift', '64', '0',
    '-D', 'FFX_HLSL=1', '-D', 'FFX_GPU=1', '-D', 'FFX_HALF=0',
    '-D', 'FFX_SPD_NO_WAVE_OPERATIONS=1',
    '-D', 'FFX_FSR3UPSCALER_OPTION_LOW_RESOLUTION_MOTION_VECTORS=1',
    '-D', 'FFX_FSR3UPSCALER_OPTION_HDR_COLOR_INPUT=1',
    '-D', 'FFX_FSR3UPSCALER_OPTION_JITTERED_MOTION_VECTORS=0',
    '-D', 'FFX_FSR3UPSCALER_OPTION_INVERTED_DEPTH=0',
    '-D', `FFX_FSR3UPSCALER_OPTION_APPLY_SHARPENING=${name === 'accumulate_sharpen' ? 1 : 0}`,
    '-I', join(stage, base, 'include/gpu'), '-Fo', spv, input];
  try {
    execFileSync(dxc, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let code = translate({ from: 'spirv', to: 'wgsl', source: await readFile(spv) });
    const formats = {
      rw_dilated_motion_vectors: 'rgba16float', rw_dilated_depth: 'r32float',
      rw_internal_upscaled_color: 'rgba16float', rw_upscaled_output: 'rgba16float',
      rw_current_luma: 'rgba16float', rw_farthest_depth: 'rgba16float',
      rw_farthest_depth_mip1_: 'rgba16float', rw_luma_instability: 'rgba16float',
      rw_shading_change: 'rgba8unorm', rw_accumulation: 'rgba8unorm',
      rw_dilated_reactive_masks: 'rgba8unorm', rw_luma_history: 'rgba16float',
      rw_output_autoreactive: 'rgba8unorm',
    };
    for (let i = 0; i < 6; i++) formats[`rw_spd_mip${i}`] = 'rgba16float';
    for (const [variable, format] of Object.entries(formats)) {
      const actual = code.match(new RegExp(`var (${variable}_?): texture_storage_2d<[^>]+>;`))?.[1];
      if (!actual) continue;
      if (code.includes(`textureLoad(${actual},`)) {
        if (name !== 'luma_pyramid_tail' || variable !== 'rw_spd_mip5')
          throw new Error(`Read/write format adapter missing: ${name}/${variable}`);
        code = code.replace(new RegExp(`var ${actual}: texture_storage_2d<[^>]+>;`),
          `var ${actual}: texture_2d<f32>;`);
        code = code.replace(new RegExp(`textureLoad\\(${actual}, ([^\\n;]+)\\)`, 'g'),
          `textureLoad(${actual}, $1, 0)`);
      } else {
        code = code.replace(new RegExp(`var ${actual}: texture_storage_2d<[^>]+>;`),
          `var ${actual}: texture_storage_2d<${format},write>;`);
      }
    }
    if (code.includes('var r_input_depth: texture_2d<f32>')) {
      code = code.replace('var r_input_depth: texture_2d<f32>', 'var r_input_depth: texture_depth_2d');
      code = code.replaceAll('textureLoad(r_input_depth, ', 'polyshadeLoadDepth(');
      code = code.replace(/polyshadeLoadDepth\((\w+), ([^)]+)\)/g,
        'polyshadeLoadDepth(vec2<i32>($1), i32($2))');
      code += '\nfn polyshadeLoadDepth(p: vec2<i32>, lod: i32) -> vec4<f32> { return vec4<f32>(textureLoad(r_input_depth, p, lod), 0.0, 0.0, 0.0); }\n';
    }
    // Naga's decimal printer rounds FLT_MAX above the exact WGSL f32 range.
    code = code.replaceAll('340282350000000000000000000000000000000f', '0x1.fffffep+127f');
    const header = `// Generated from AMD FidelityFX SDK v2.3.0, SR 3.1.5.\n// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt\n// DXC -> SPIR-V -> Naga ${nagaVersion} -> WGSL. See scripts/fsr/compile.mjs.\n`;
    await writeFile(join(output, name + '.wgsl'), header + code);
    await writeFile(join(output, name + '.wgsl.js'), `${header}export default String.raw\`${code}\`;\n`);
    console.log(name, code.length, createHash('sha256').update(code).digest('hex').slice(0, 16));
  } catch (error) {
    console.error(name, error.stderr?.toString() ?? error.formatted ?? error.message);
    process.exitCode = 1;
  }
}
