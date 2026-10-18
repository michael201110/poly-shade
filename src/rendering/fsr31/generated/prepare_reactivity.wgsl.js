// Generated from AMD FidelityFX SDK v2.3.0, SR 3.1.5.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL. See scripts/fsr/compile.mjs.
export default String.raw`struct type_u002e_cbFSR3Upscaler {
    iRenderSize: vec2<i32>,
    iPreviousFrameRenderSize: vec2<i32>,
    iUpscaleSize: vec2<i32>,
    iPreviousFrameUpscaleSize: vec2<i32>,
    iMaxRenderSize: vec2<i32>,
    iMaxUpscaleSize: vec2<i32>,
    fDeviceToViewDepth: vec4<f32>,
    fJitter: vec2<f32>,
    fPreviousFrameJitter: vec2<f32>,
    fMotionVectorScale: vec2<f32>,
    fDownscaleFactor: vec2<f32>,
    fMotionVectorJitterCancellation: vec2<f32>,
    fTanHalfFOV: f32,
    fJitterSequenceLength: f32,
    fDeltaTime: f32,
    fDeltaPreExposure: f32,
    fViewSpaceToMetersFactor: f32,
    fFrameIndex: f32,
    fVelocityFactor: f32,
    fReactivenessScale: f32,
    fShadingChangeScale: f32,
    fAccumulationAddedPerFrame: f32,
    fMinDisocclusionAccumulation: f32,
}

struct type_u002e_StructuredBuffer_u002e_uint {
    member: array<u32>,
}

@group(0) @binding(0) 
var<uniform> cbFSR3Upscaler: type_u002e_cbFSR3Upscaler;
@group(0) @binding(65) 
var s_LinearClamp: sampler;
@group(0) @binding(11) 
var r_reactive_mask: texture_2d<f32>;
@group(0) @binding(12) 
var r_transparency_and_composition_mask: texture_2d<f32>;
@group(0) @binding(13) 
var r_accumulation: texture_2d<f32>;
@group(0) @binding(34) 
var rw_accumulation: texture_storage_2d<rgba8unorm,write>;
@group(0) @binding(14) 
var r_shading_change: texture_2d<f32>;
@group(0) @binding(15) 
var r_current_luma: texture_2d<f32>;
@group(0) @binding(33) 
var rw_new_locks: texture_storage_2d<r32float,read_write>;
@group(0) @binding(8) 
var<storage> r_reconstructed_previous_nearest_depth: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(9) 
var r_dilated_motion_vectors: texture_2d<f32>;
@group(0) @binding(10) 
var r_dilated_depth: texture_2d<f32>;
@group(0) @binding(16) 
var r_input_exposure: texture_2d<f32>;
@group(0) @binding(32) 
var rw_dilated_reactive_masks: texture_storage_2d<rgba8unorm,write>;
var<private> global: vec3<i32>;

fn CS_1() {
    var local: array<f32, 4>;
    var local_1: array<vec2<i32>, 4>;
    var local_2: array<u32, 4>;
    var phi_176_: f32;
    var phi_179_: f32;
    var phi_181_: bool;
    var phi_183_: i32;
    var phi_230_: bool;
    var phi_243_: f32;
    var phi_244_: f32;
    var phi_245_: f32;
    var phi_246_: f32;
    var phi_247_: bool;
    var phi_177_: f32;
    var phi_180_: f32;
    var phi_182_: bool;
    var local_3: bool;
    var local_4: f32;
    var phi_251_: bool;
    var local_5: f32;
    var local_6: f32;
    var phi_258_: f32;
    var phi_440_: f32;
    var phi_471_: bool;
    var phi_479_: bool;
    var phi_480_: bool;
    var phi_497_: f32;
    var phi_626_: f32;
    var phi_627_: f32;
    var phi_641_: u32;
    var phi_642_: f32;
    var phi_643_: f32;
    var phi_654_: u32;
    var phi_655_: f32;
    var phi_656_: f32;
    var phi_667_: u32;
    var phi_668_: f32;
    var phi_669_: f32;
    var phi_680_: u32;
    var phi_681_: f32;
    var phi_682_: f32;
    var phi_693_: u32;
    var phi_694_: f32;
    var phi_695_: f32;
    var phi_706_: u32;
    var phi_707_: f32;
    var phi_708_: f32;
    var phi_719_: u32;
    var phi_720_: f32;
    var phi_721_: f32;
    var phi_726_: bool;
    var phi_731_: i32;
    var phi_745_: f32;
    var phi_746_: bool;
    var phi_750_: f32;
    var local_7: f32;
    var local_8: f32;
    var local_9: bool;

    let _e81 = global;
    let _e82 = _e81.xy;
    let _e84 = (vec2<f32>(_e82) + vec2<f32>(0.5f, 0.5f));
    let _e86 = cbFSR3Upscaler.iRenderSize;
    let _e87 = vec2<f32>(_e86);
    let _e88 = (_e84 / _e87);
    let _e89 = bitcast<vec2<u32>>(_e82);
    let _e90 = textureLoad(r_dilated_motion_vectors, _e89, 0u);
    let _e91 = _e90.xy;
    let _e92 = textureLoad(r_dilated_depth, _e89, 0u);
    let _e95 = cbFSR3Upscaler.fDeviceToViewDepth;
    let _e99 = (_e95.y / (_e92.x - _e95.x));
    let _e101 = cbFSR3Upscaler.fViewSpaceToMetersFactor;
    let _e102 = (_e99 * _e101);
    let _e108 = length((_e91 * vec2<f32>(3840f, 2160f)));
    let _e114 = (((_e88 + (_e91 * select(0f, 1f, (_e108 > mix(0.25f, 0.75f, clamp((min(_e102, 65504f) * 0.01f), 0f, 1f)))))) * _e87) - vec2<f32>(0.5f, 0.5f));
    let _e115 = floor(_e114);
    let _e117 = (_e114 - _e115);
    let _e119 = (1f - _e117.x);
    let _e121 = (1f - _e117.y);
    local_1 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
    local = array<f32, 4>((_e119 * _e121), (_e117.x * _e121), (_e119 * _e117.y), (_e117.x * _e117.y));
    phi_176_ = 0f;
    phi_179_ = 0f;
    phi_181_ = true;
    phi_183_ = 0i;
    loop {
        let _e128 = phi_176_;
        let _e130 = phi_179_;
        let _e132 = phi_181_;
        let _e134 = phi_183_;
        local_3 = _e132;
        local_4 = _e130;
        local_5 = _e128;
        local_6 = _e130;
        if select(false, _e132, (_e134 < 4i)) {
            let _e138 = local_1[_e134];
            let _e139 = (vec2<i32>(_e115) + _e138);
            let _e151 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e139.x, (_e86.x - 1i))), max(0i, min(_e139.y, (_e86.y - 1i)))));
            phi_177_ = _e128;
            phi_180_ = _e130;
            phi_182_ = _e132;
            if all((_e151 < bitcast<vec2<u32>>(_e86))) {
                let _e156 = local[_e134];
                phi_245_ = _e128;
                phi_246_ = _e130;
                phi_247_ = _e132;
                if (_e156 > 0.00061f) {
                    let _e161 = cbFSR3Upscaler.iMaxRenderSize[0i];
                    let _e168 = r_reconstructed_previous_nearest_depth.member[((_e151.y * bitcast<u32>(_e161)) + _e151.x)];
                    let _e171 = (_e95.y / (bitcast<f32>(_e168) - _e95.x));
                    let _e172 = (_e99 - _e171);
                    phi_230_ = false;
                    if _e132 {
                        phi_230_ = (_e172 > 0.000000000000000000000000000000000000011754944f);
                    }
                    let _e175 = phi_230_;
                    phi_243_ = _e128;
                    phi_244_ = _e130;
                    if _e175 {
                        phi_243_ = (_e128 + (clamp((((0.0000137f * length((_e87 * 0.5f))) * max(_e99, _e171)) / _e172), 0f, 1f) * _e156));
                        phi_244_ = (_e130 + _e156);
                    }
                    let _e187 = phi_243_;
                    let _e189 = phi_244_;
                    phi_245_ = _e187;
                    phi_246_ = _e189;
                    phi_247_ = _e175;
                }
                let _e191 = phi_245_;
                let _e193 = phi_246_;
                let _e195 = phi_247_;
                phi_177_ = _e191;
                phi_180_ = _e193;
                phi_182_ = _e195;
            }
            let _e197 = phi_177_;
            let _e199 = phi_180_;
            let _e201 = phi_182_;
            local_7 = _e197;
            local_8 = _e199;
            local_9 = _e201;
            continue;
        } else {
            break;
        }
        continuing {
            let _e672 = local_7;
            phi_176_ = _e672;
            let _e675 = local_8;
            phi_179_ = _e675;
            let _e678 = local_9;
            phi_181_ = _e678;
            phi_183_ = (_e134 + 1i);
        }
    }
    let _e204 = local_3;
    phi_251_ = false;
    if _e204 {
        let _e206 = local_4;
        phi_251_ = (_e206 > 0f);
    }
    let _e209 = phi_251_;
    if _e209 {
        let _e211 = local_5;
        let _e213 = local_6;
        phi_258_ = clamp((1f - (_e211 / _e213)), 0f, 1f);
    } else {
        phi_258_ = 0f;
    }
    let _e218 = phi_258_;
    let _e219 = (_e82 + vec2<i32>(-1i, -1i));
    let _e222 = (_e86.x - 1i);
    let _e227 = (_e86.y - 1i);
    let _e231 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e219.x, _e222)), max(0i, min(_e219.y, _e227))));
    let _e232 = textureLoad(r_reactive_mask, _e231, 0u);
    let _e235 = cbFSR3Upscaler.fReactivenessScale;
    let _e238 = (_e82 + vec2<i32>(0i, -1i));
    let _e246 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e238.x, _e222)), max(0i, min(_e238.y, _e227))));
    let _e247 = textureLoad(r_reactive_mask, _e246, 0u);
    let _e251 = (_e82 + vec2<i32>(1i, -1i));
    let _e259 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e251.x, _e222)), max(0i, min(_e251.y, _e227))));
    let _e260 = textureLoad(r_reactive_mask, _e259, 0u);
    let _e264 = (_e82 + vec2<i32>(-1i, 0i));
    let _e272 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e264.x, _e222)), max(0i, min(_e264.y, _e227))));
    let _e273 = textureLoad(r_reactive_mask, _e272, 0u);
    let _e284 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e81.x, _e222)), max(0i, min(_e81.y, _e227))));
    let _e285 = textureLoad(r_reactive_mask, _e284, 0u);
    let _e289 = (_e82 + vec2<i32>(1i, 0i));
    let _e297 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e289.x, _e222)), max(0i, min(_e289.y, _e227))));
    let _e298 = textureLoad(r_reactive_mask, _e297, 0u);
    let _e302 = (_e82 + vec2<i32>(-1i, 1i));
    let _e310 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e302.x, _e222)), max(0i, min(_e302.y, _e227))));
    let _e311 = textureLoad(r_reactive_mask, _e310, 0u);
    let _e315 = (_e82 + vec2<i32>(0i, 1i));
    let _e323 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e315.x, _e222)), max(0i, min(_e315.y, _e227))));
    let _e324 = textureLoad(r_reactive_mask, _e323, 0u);
    let _e328 = (_e82 + vec2<i32>(1i, 1i));
    let _e336 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e328.x, _e222)), max(0i, min(_e328.y, _e227))));
    let _e337 = textureLoad(r_reactive_mask, _e336, 0u);
    let _e342 = cbFSR3Upscaler.fJitter;
    let _e348 = cbFSR3Upscaler.iMaxRenderSize;
    let _e349 = vec2<f32>(_e348);
    let _e352 = vec2<f32>(vec2<i32>((_e87 * 0.5f)));
    let _e359 = textureSampleLevel(r_shading_change, s_LinearClamp, (max(vec2<f32>(0.5f, 0.5f), min(((_e88 - (_e342 / _e87)) * _e352), (_e352 - vec2<f32>(0.5f, 0.5f)))) / vec2<f32>(vec2<i32>((_e349 * 0.5f)))), 0f);
    let _e362 = cbFSR3Upscaler.fShadingChangeScale;
    let _e365 = max(max(max(max(max(max(max(max(max(max(0f, (_e232.x * _e235)), (_e247.x * _e235)), (_e260.x * _e235)), (_e273.x * _e235)), (_e285.x * _e235)), (_e298.x * _e235)), (_e311.x * _e235)), (_e324.x * _e235)), (_e337.x * _e235)), clamp((_e359.x * _e362), 0f, 1f));
    let _e366 = (_e88 + _e91);
    let _e369 = bitcast<vec2<u32>>(vec2<i32>((_e366 * _e87)));
    let _e370 = textureLoad(r_dilated_depth, _e369, 0u);
    let _e372 = textureLoad(r_dilated_motion_vectors, _e369, 0u);
    let _e378 = ((_e95.y / (_e370.x - _e95.x)) * _e101);
    let _e379 = max(_e378, _e102);
    if (_e379 != 0f) {
        phi_440_ = (min(_e378, _e102) / _e379);
    } else {
        phi_440_ = 0f;
    }
    let _e384 = phi_440_;
    let _e392 = textureDimensions(r_transparency_and_composition_mask, 0i);
    let _e403 = textureSampleLevel(r_transparency_and_composition_mask, s_LinearClamp, (max(vec2<f32>(0.5f, 0.5f), min(_e84, (_e87 - vec2<f32>(0.5f, 0.5f)))) / vec2<f32>(vec2<i32>(bitcast<i32>(_e392.x), bitcast<i32>(_e392.y)))), 0f);
    phi_471_ = false;
    if (_e366.x >= 0f) {
        phi_471_ = (_e366.x <= 1f);
    }
    let _e410 = phi_471_;
    phi_480_ = false;
    if _e410 {
        phi_479_ = false;
        if (_e366.y >= 0f) {
            phi_479_ = (_e366.y <= 1f);
        }
        let _e415 = phi_479_;
        phi_480_ = _e415;
    }
    let _e417 = phi_480_;
    phi_497_ = 0f;
    if _e417 {
        let _e419 = cbFSR3Upscaler.iPreviousFrameRenderSize;
        let _e420 = vec2<f32>(_e419);
        let _e426 = textureSampleLevel(r_accumulation, s_LinearClamp, (max(vec2<f32>(0.5f, 0.5f), min((_e366 * _e420), (_e420 - vec2<f32>(0.5f, 0.5f)))) / _e349), 0f);
        phi_497_ = clamp(_e426.x, 0f, 1f);
    }
    let _e430 = phi_497_;
    let _e432 = cbFSR3Upscaler.fAccumulationAddedPerFrame;
    let _e433 = mix(_e430, 0f, _e365);
    let _e435 = cbFSR3Upscaler.fMinDisocclusionAccumulation;
    let _e437 = mix(_e433, min(_e435, _e433), _e218);
    let _e442 = (_e437 * select(0f, 1f, (round((_e437 * 100f)) > 1f)));
    textureStore(rw_accumulation, _e89, vec4(clamp((_e442 + _e432), 0f, 1f)));
    textureStore(rw_dilated_reactive_masks, _e89, vec4<f32>(max((((1f - clamp((length((_e372.xy * vec2<f32>(3840f, 2160f))) / _e108), 0f, 1f)) * _e384) * clamp((_e108 * 0.1f), 0f, 1f)), _e403.x), _e218, _e365, _e442));
    switch bitcast<i32>(0u) {
        default: {
            let _e448 = textureLoad(r_current_luma, _e284, 0u);
            let _e450 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
            let _e454 = (_e448.x * select(_e450.x, 1f, (_e450.x == 0f)));
            let _e457 = textureLoad(r_current_luma, _e231, 0u);
            let _e459 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
            let _e463 = (_e457.x * select(_e459.x, 1f, (_e459.x == 0f)));
            let _e466 = textureLoad(r_current_luma, _e246, 0u);
            let _e468 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
            let _e472 = (_e466.x * select(_e468.x, 1f, (_e468.x == 0f)));
            let _e475 = textureLoad(r_current_luma, _e259, 0u);
            let _e477 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
            let _e481 = (_e475.x * select(_e477.x, 1f, (_e477.x == 0f)));
            let _e484 = textureLoad(r_current_luma, _e272, 0u);
            let _e486 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
            let _e490 = (_e484.x * select(_e486.x, 1f, (_e486.x == 0f)));
            let _e493 = textureLoad(r_current_luma, _e297, 0u);
            let _e495 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
            let _e499 = (_e493.x * select(_e495.x, 1f, (_e495.x == 0f)));
            let _e502 = textureLoad(r_current_luma, _e310, 0u);
            let _e504 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
            let _e508 = (_e502.x * select(_e504.x, 1f, (_e504.x == 0f)));
            let _e511 = textureLoad(r_current_luma, _e323, 0u);
            let _e513 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
            let _e517 = (_e511.x * select(_e513.x, 1f, (_e513.x == 0f)));
            let _e520 = textureLoad(r_current_luma, _e336, 0u);
            let _e522 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
            let _e526 = (_e520.x * select(_e522.x, 1f, (_e522.x == 0f)));
            let _e527 = min(min(min(min(min(min(min(min(min(0x1.fffffep+127f, _e454), _e463), _e472), _e481), _e490), _e499), _e508), _e517), _e526);
            let _e528 = max(max(max(max(max(max(max(max(max(0.000000000000000000000000000000000000011754944f, _e454), _e463), _e472), _e481), _e490), _e499), _e508), _e517), _e526);
            local_2 = array<u32, 4>(23u, 45u, 209u, 417u);
            let _e531 = (_e528 - _e527);
            let _e533 = ((abs((_e463 - _e454)) / _e531) < 0.9f);
            if _e533 {
                phi_626_ = 0x1.fffffep+127f;
                phi_627_ = 0f;
            } else {
                phi_626_ = min(0x1.fffffep+127f, _e463);
                phi_627_ = max(0f, _e463);
            }
            let _e537 = phi_626_;
            let _e539 = phi_627_;
            if ((abs((_e472 - _e454)) / _e531) < 0.9f) {
                phi_641_ = select(5u, 7u, _e533);
                phi_642_ = _e537;
                phi_643_ = _e539;
            } else {
                phi_641_ = select(1u, 3u, _e533);
                phi_642_ = min(_e537, _e472);
                phi_643_ = max(_e539, _e472);
            }
            let _e549 = phi_641_;
            let _e551 = phi_642_;
            let _e553 = phi_643_;
            if ((abs((_e481 - _e454)) / _e531) < 0.9f) {
                phi_654_ = (_e549 | 8u);
                phi_655_ = _e551;
                phi_656_ = _e553;
            } else {
                phi_654_ = _e549;
                phi_655_ = min(_e551, _e481);
                phi_656_ = max(_e553, _e481);
            }
            let _e562 = phi_654_;
            let _e564 = phi_655_;
            let _e566 = phi_656_;
            if ((abs((_e490 - _e454)) / _e531) < 0.9f) {
                phi_667_ = (_e562 | 16u);
                phi_668_ = _e564;
                phi_669_ = _e566;
            } else {
                phi_667_ = _e562;
                phi_668_ = min(_e564, _e490);
                phi_669_ = max(_e566, _e490);
            }
            let _e575 = phi_667_;
            let _e577 = phi_668_;
            let _e579 = phi_669_;
            if ((abs((_e499 - _e454)) / _e531) < 0.9f) {
                phi_680_ = (_e575 | 32u);
                phi_681_ = _e577;
                phi_682_ = _e579;
            } else {
                phi_680_ = _e575;
                phi_681_ = min(_e577, _e499);
                phi_682_ = max(_e579, _e499);
            }
            let _e588 = phi_680_;
            let _e590 = phi_681_;
            let _e592 = phi_682_;
            if ((abs((_e508 - _e454)) / _e531) < 0.9f) {
                phi_693_ = (_e588 | 64u);
                phi_694_ = _e590;
                phi_695_ = _e592;
            } else {
                phi_693_ = _e588;
                phi_694_ = min(_e590, _e508);
                phi_695_ = max(_e592, _e508);
            }
            let _e601 = phi_693_;
            let _e603 = phi_694_;
            let _e605 = phi_695_;
            if ((abs((_e517 - _e454)) / _e531) < 0.9f) {
                phi_706_ = (_e601 | 128u);
                phi_707_ = _e603;
                phi_708_ = _e605;
            } else {
                phi_706_ = _e601;
                phi_707_ = min(_e603, _e517);
                phi_708_ = max(_e605, _e517);
            }
            let _e614 = phi_706_;
            let _e616 = phi_707_;
            let _e618 = phi_708_;
            if ((abs((_e526 - _e454)) / _e531) < 0.9f) {
                phi_719_ = (_e614 | 256u);
                phi_720_ = _e616;
                phi_721_ = _e618;
            } else {
                phi_719_ = _e614;
                phi_720_ = min(_e616, _e526);
                phi_721_ = max(_e618, _e526);
            }
            let _e627 = phi_719_;
            let _e629 = phi_720_;
            let _e631 = phi_721_;
            phi_726_ = true;
            if (_e454 <= _e631) {
                phi_726_ = (_e454 < _e629);
            }
            let _e635 = phi_726_;
            if !(_e635) {
                phi_750_ = 0f;
                break;
            }
            phi_731_ = 0i;
            loop {
                let _e638 = phi_731_;
                phi_745_ = f32();
                phi_746_ = false;
                if (bitcast<u32>(_e638) < 4u) {
                    let _e642 = local_2[_e638];
                    let _e644 = local_2[_e638];
                    if ((_e627 & _e642) == _e644) {
                        phi_745_ = 0f;
                        phi_746_ = true;
                        break;
                    }
                    continue;
                } else {
                    break;
                }
                continuing {
                    phi_731_ = (_e638 + 1i);
                }
            }
            let _e648 = phi_745_;
            let _e650 = phi_746_;
            phi_750_ = _e648;
            if _e650 {
                break;
            }
            phi_750_ = (1f - (_e527 / _e528));
            break;
        }
    }
    let _e654 = phi_750_;
    if (_e654 > 0.01f) {
        let _e659 = cbFSR3Upscaler.iUpscaleSize;
        textureStore(rw_new_locks, bitcast<vec2<u32>>(vec2<i32>(floor((((_e84 - _e342) / _e87) * vec2<f32>(_e659))))), vec4((round((clamp(_e654, 0f, 1f) * 255f)) * 0.003921569f)));
    }
    return;
}

@compute @workgroup_size(8, 8, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>) {
    global = vec3<i32>(param);
    CS_1();
}
`;
