// AMD FidelityFX SDK v2.3.0, Frame Interpolation 3.1.6.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL; scripts/fg/compile.mjs.
export default String.raw`struct type_u002e_cbFI {
    renderSize: vec2<i32>,
    displaySize: vec2<i32>,
    displaySizeRcp: vec2<f32>,
    cameraNear: f32,
    cameraFar: f32,
    upscalerTargetSize: vec2<i32>,
    Mode: i32,
    reset: i32,
    fDeviceToViewDepth: vec4<f32>,
    deltaTime: f32,
    HUDLessAttachedFactor: i32,
    distortionFieldSize: vec2<i32>,
    opticalFlowScale: vec2<f32>,
    opticalFlowBlockSize: i32,
    dispatchFlags: u32,
    maxRenderSize: vec2<i32>,
    opticalFlowHalfResMode: i32,
    NumInstances: i32,
    interpolationRectBase: vec2<i32>,
    interpolationRectSize: vec2<i32>,
    debugBarColor: vec3<f32>,
    backBufferTransferFunction: u32,
    minMaxLuminance: vec2<f32>,
    fTanHalfFOV: f32,
    _pad1_: i32,
    fJitter: vec2<f32>,
    fMotionVectorScale: vec2<f32>,
}

struct type_u002e_StructuredBuffer_u002e_uint {
    member: array<u32>,
}

struct FfxFrameInterpolationDebugViewport {
    offset: vec2<i32>,
    size: vec2<i32>,
}

@group(0) @binding(0) 
var<uniform> cbFI: type_u002e_cbFI;
@group(0) @binding(64) 
var s_LinearClamp: sampler;
@group(0) @binding(15) 
var r_current_interpolation_source: texture_2d<f32>;
@group(0) @binding(12) 
var r_disocclusion_mask: texture_2d<f32>;
@group(0) @binding(8) 
var<storage> r_game_motion_vector_field_x: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(9) 
var<storage> r_game_motion_vector_field_y: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(10) 
var<storage> r_optical_flow_motion_vector_field_x: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(11) 
var<storage> r_optical_flow_motion_vector_field_y: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(14) 
var r_inpainting_pyramid: texture_2d<f32>;
@group(0) @binding(16) 
var r_input_distortion_field: texture_2d<f32>;
@group(0) @binding(32) 
var rw_output: texture_storage_2d<rgba16float,write>;
var<private> global: vec3<i32>;

fn CS_1() {
    var local: array<f32, 4>;
    var local_1: array<vec2<i32>, 4>;
    var local_2: array<f32, 4>;
    var local_3: array<vec2<i32>, 4>;
    var local_4: array<f32, 4>;
    var local_5: array<vec2<i32>, 4>;
    var local_6: array<array<FfxFrameInterpolationDebugViewport, 3>, 3>;
    var phi_107_: i32;
    var phi_114_: i32;
    var phi_135_: bool;
    var phi_145_: bool;
    var phi_146_: bool;
    var phi_172_: bool;
    var phi_185_: u32;
    var local_7: bool;
    var phi_194_: bool;
    var phi_207_: u32;
    var phi_223_: vec2<i32>;
    var phi_226_: vec4<f32>;
    var phi_228_: i32;
    var phi_237_: bool;
    var phi_255_: vec4<f32>;
    var phi_258_: f32;
    var phi_260_: i32;
    var phi_256_: vec4<f32>;
    var phi_259_: f32;
    var local_8: f32;
    var local_9: f32;
    var local_10: vec4<f32>;
    var local_11: vec4<f32>;
    var local_12: vec4<f32>;
    var phi_291_: vec2<f32>;
    var phi_311_: bool;
    var phi_321_: bool;
    var phi_322_: bool;
    var phi_348_: bool;
    var phi_361_: u32;
    var phi_371_: bool;
    var phi_375_: f32;
    var phi_380_: vec2<i32>;
    var phi_383_: vec4<f32>;
    var phi_385_: i32;
    var phi_394_: bool;
    var phi_412_: vec4<f32>;
    var phi_415_: f32;
    var phi_417_: i32;
    var phi_413_: vec4<f32>;
    var phi_416_: f32;
    var local_13: f32;
    var local_14: f32;
    var local_15: vec4<f32>;
    var local_16: vec4<f32>;
    var phi_448_: f32;
    var phi_463_: bool;
    var phi_473_: bool;
    var phi_474_: bool;
    var phi_514_: vec2<f32>;
    var phi_517_: f32;
    var phi_519_: i32;
    var phi_545_: bool;
    var phi_558_: u32;
    var local_17: bool;
    var phi_567_: bool;
    var phi_580_: u32;
    var phi_515_: vec2<f32>;
    var phi_518_: f32;
    var local_18: f32;
    var local_19: f32;
    var local_20: f32;
    var local_21: vec2<f32>;
    var phi_596_: vec2<f32>;
    var phi_616_: bool;
    var phi_626_: bool;
    var phi_627_: bool;
    var phi_668_: bool;
    var phi_678_: bool;
    var phi_679_: bool;
    var phi_711_: bool;
    var phi_721_: bool;
    var phi_722_: bool;
    var local_22: vec2<i32>;
    var local_23: vec4<f32>;
    var local_24: vec4<f32>;
    var local_25: f32;
    var local_26: vec2<i32>;
    var local_27: vec4<f32>;
    var local_28: vec4<f32>;
    var local_29: f32;
    var local_30: vec2<f32>;
    var local_31: f32;
    var local_32: vec2<f32>;

    let _e54 = global;
    let _e55 = _e54.xy;
    let _e57 = cbFI.displaySize;
    let _e58 = vec2<f32>(_e57);
    let _e60 = vec2<i32>((_e58 * vec2<f32>(0.33333334f, 0.33333334f)));
    phi_107_ = 0i;
    loop {
        let _e62 = phi_107_;
        if (_e62 < 3i) {
            phi_114_ = 0i;
            loop {
                let _e65 = phi_114_;
                if (_e65 < 3i) {
                    continue;
                } else {
                    break;
                }
                continuing {
                    local_6[_e62][_e65].offset = (_e60 * vec2<i32>(_e65, _e62));
                    local_6[_e62][_e65].size = _e60;
                    phi_114_ = (_e65 + 1i);
                }
            }
            continue;
        } else {
            break;
        }
        continuing {
            phi_107_ = (_e62 + 1i);
        }
    }
    let _e79 = local_6[0i][0i];
    let _e82 = (_e79.offset + _e79.size);
    phi_135_ = false;
    if (_e54.x >= _e79.offset.x) {
        phi_135_ = (_e54.x < _e82.x);
    }
    let _e89 = phi_135_;
    phi_146_ = false;
    if _e89 {
        phi_145_ = false;
        if (_e54.y >= _e79.offset.y) {
            phi_145_ = (_e54.y < _e82.y);
        }
        let _e96 = phi_145_;
        phi_146_ = _e96;
    }
    let _e98 = phi_146_;
    if _e98 {
        let _e99 = local_6[0i][0i];
        let _e106 = ((vec2<f32>((_e55 - _e99.offset)) + vec2<f32>(0.5f, 0.5f)) / vec2<f32>(_e99.size));
        let _e108 = cbFI.renderSize;
        let _e111 = vec2<i32>((_e106 * vec2<f32>(_e108)));
        switch bitcast<i32>(0u) {
            default: {
                let _e114 = all((_e111 >= vec2<i32>(0i, 0i)));
                phi_172_ = false;
                local_7 = _e114;
                if _e114 {
                    let _e116 = cbFI.maxRenderSize;
                    phi_172_ = all((_e111 < _e116));
                }
                let _e120 = phi_172_;
                if _e120 {
                    let _e123 = cbFI.maxRenderSize;
                    let _e131 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e111.y * _e123.x) + _e111.x))];
                    phi_185_ = _e131;
                    break;
                }
                phi_185_ = 0u;
                break;
            }
        }
        let _e133 = phi_185_;
        switch bitcast<i32>(0u) {
            default: {
                let _e136 = local_7;
                phi_194_ = false;
                if _e136 {
                    let _e138 = cbFI.maxRenderSize;
                    phi_194_ = all((_e111 < _e138));
                }
                let _e142 = phi_194_;
                if _e142 {
                    let _e145 = cbFI.maxRenderSize;
                    let _e153 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e111.y * _e145.x) + _e111.x))];
                    phi_207_ = _e153;
                    break;
                }
                phi_207_ = 0u;
                break;
            }
        }
        let _e155 = phi_207_;
        phi_291_ = vec2<f32>(unpack2x16float((_e133 & 65535u)).x, unpack2x16float((_e155 & 65535u)).x);
        if ((f32(((_e133 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f) <= 0f) {
            phi_223_ = _e108;
            phi_226_ = vec4<f32>(0f, 0f, 0f, 0f);
            phi_228_ = 0i;
            loop {
                let _e170 = phi_223_;
                let _e172 = phi_226_;
                let _e174 = phi_228_;
                local_11 = _e172;
                local_12 = _e172;
                phi_237_ = false;
                if (_e174 < 11i) {
                    phi_237_ = (_e172.w == 0f);
                }
                let _e179 = phi_237_;
                if _e179 {
                    let _e180 = (_e170 / vec2<i32>(2i, 2i));
                    let _e183 = ((_e106 * vec2<f32>(_e180)) - vec2<f32>(0.5f, 0.5f));
                    let _e184 = floor(_e183);
                    let _e186 = (_e183 - _e184);
                    let _e188 = (1f - _e186.x);
                    let _e190 = (1f - _e186.y);
                    local_1 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
                    local = array<f32, 4>((_e188 * _e190), (_e186.x * _e190), (_e188 * _e186.y), (_e186.x * _e186.y));
                    local_22 = _e180;
                    phi_255_ = vec4<f32>(0f, 0f, 0f, 0f);
                    phi_258_ = 0f;
                    phi_260_ = 0i;
                    loop {
                        let _e197 = phi_255_;
                        let _e199 = phi_258_;
                        let _e201 = phi_260_;
                        local_8 = _e199;
                        local_9 = _e199;
                        local_10 = _e197;
                        if (_e201 < 4i) {
                            let _e204 = local_1[_e201];
                            let _e206 = bitcast<vec2<u32>>((vec2<i32>(_e184) + _e204));
                            phi_256_ = _e197;
                            phi_259_ = _e199;
                            if all((_e206 < bitcast<vec2<u32>>(_e180))) {
                                let _e211 = textureLoad(r_inpainting_pyramid, _e206, bitcast<u32>(_e174));
                                let _e216 = local[_e201];
                                let _e218 = ((_e216 * select(0f, 1f, (_e211.z > 0f))) * _e211.z);
                                phi_256_ = (_e197 + (_e211 * _e218));
                                phi_259_ = (_e199 + _e218);
                            }
                            let _e223 = phi_256_;
                            let _e225 = phi_259_;
                            local_24 = _e223;
                            local_25 = _e225;
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e686 = local_24;
                            phi_255_ = _e686;
                            let _e689 = local_25;
                            phi_258_ = _e689;
                            phi_260_ = (_e201 + 1i);
                        }
                    }
                    let _e228 = local_8;
                    let _e231 = local_9;
                    let _e235 = local_10;
                    local_23 = (_e235 / vec4(select(1f, _e231, (_e228 > 0f))));
                    continue;
                } else {
                    break;
                }
                continuing {
                    let _e678 = local_22;
                    phi_223_ = _e678;
                    let _e681 = local_23;
                    phi_226_ = _e681;
                    phi_228_ = (_e174 + 1i);
                }
            }
            let _e239 = local_11;
            phi_291_ = _e239.xy;
        }
        let _e244 = phi_291_;
        let _e247 = (vec2<f32>(0.5f, 0.5f) + ((_e244 * _e58) * 0.1f));
        textureStore(rw_output, bitcast<vec2<u32>>(_e55), vec4<f32>(_e247.x, _e247.y, 0.5f, 1f));
    }
    let _e254 = local_6[0i][1i];
    let _e257 = (_e254.offset + _e254.size);
    phi_311_ = false;
    if (_e54.x >= _e254.offset.x) {
        phi_311_ = (_e54.x < _e257.x);
    }
    let _e263 = phi_311_;
    phi_322_ = false;
    if _e263 {
        phi_321_ = false;
        if (_e54.y >= _e254.offset.y) {
            phi_321_ = (_e54.y < _e257.y);
        }
        let _e270 = phi_321_;
        phi_322_ = _e270;
    }
    let _e272 = phi_322_;
    if _e272 {
        let _e273 = local_6[0i][1i];
        let _e280 = ((vec2<f32>((_e55 - _e273.offset)) + vec2<f32>(0.5f, 0.5f)) / vec2<f32>(_e273.size));
        let _e282 = cbFI.renderSize;
        let _e285 = vec2<i32>((_e280 * vec2<f32>(_e282)));
        switch bitcast<i32>(0u) {
            default: {
                phi_348_ = false;
                if all((_e285 >= vec2<i32>(0i, 0i))) {
                    let _e290 = cbFI.maxRenderSize;
                    phi_348_ = all((_e285 < _e290));
                }
                let _e294 = phi_348_;
                if _e294 {
                    let _e297 = cbFI.maxRenderSize;
                    let _e305 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e285.y * _e297.x) + _e285.x))];
                    phi_361_ = _e305;
                    break;
                }
                phi_361_ = 0u;
                break;
            }
        }
        let _e307 = phi_361_;
        let _e312 = (f32(((_e307 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f);
        let _e314 = (_e312 > 0f);
        phi_371_ = false;
        if _e314 {
            phi_371_ = ((_e307 & 2147483648u) == 0u);
        }
        let _e317 = phi_371_;
        phi_375_ = _e312;
        if _e317 {
            phi_375_ = (1f - _e312);
        }
        let _e320 = phi_375_;
        phi_448_ = _e320;
        if !(_e314) {
            phi_380_ = _e282;
            phi_383_ = vec4<f32>(0f, 0f, 0f, 0f);
            phi_385_ = 0i;
            loop {
                let _e323 = phi_380_;
                let _e325 = phi_383_;
                let _e327 = phi_385_;
                local_16 = _e325;
                phi_394_ = false;
                if (_e327 < 11i) {
                    phi_394_ = (_e325.w == 0f);
                }
                let _e332 = phi_394_;
                if _e332 {
                    let _e333 = (_e323 / vec2<i32>(2i, 2i));
                    let _e336 = ((_e280 * vec2<f32>(_e333)) - vec2<f32>(0.5f, 0.5f));
                    let _e337 = floor(_e336);
                    let _e339 = (_e336 - _e337);
                    let _e341 = (1f - _e339.x);
                    let _e343 = (1f - _e339.y);
                    local_3 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
                    local_2 = array<f32, 4>((_e341 * _e343), (_e339.x * _e343), (_e341 * _e339.y), (_e339.x * _e339.y));
                    local_26 = _e333;
                    phi_412_ = vec4<f32>(0f, 0f, 0f, 0f);
                    phi_415_ = 0f;
                    phi_417_ = 0i;
                    loop {
                        let _e350 = phi_412_;
                        let _e352 = phi_415_;
                        let _e354 = phi_417_;
                        local_13 = _e352;
                        local_14 = _e352;
                        local_15 = _e350;
                        if (_e354 < 4i) {
                            let _e357 = local_3[_e354];
                            let _e359 = bitcast<vec2<u32>>((vec2<i32>(_e337) + _e357));
                            phi_413_ = _e350;
                            phi_416_ = _e352;
                            if all((_e359 < bitcast<vec2<u32>>(_e333))) {
                                let _e364 = textureLoad(r_inpainting_pyramid, _e359, bitcast<u32>(_e327));
                                let _e369 = local_2[_e354];
                                let _e371 = ((_e369 * select(0f, 1f, (_e364.z > 0f))) * _e364.z);
                                phi_413_ = (_e350 + (_e364 * _e371));
                                phi_416_ = (_e352 + _e371);
                            }
                            let _e376 = phi_413_;
                            let _e378 = phi_416_;
                            local_28 = _e376;
                            local_29 = _e378;
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e716 = local_28;
                            phi_412_ = _e716;
                            let _e719 = local_29;
                            phi_415_ = _e719;
                            phi_417_ = (_e354 + 1i);
                        }
                    }
                    let _e381 = local_13;
                    let _e384 = local_14;
                    let _e388 = local_15;
                    local_27 = (_e388 / vec4(select(1f, _e384, (_e381 > 0f))));
                    continue;
                } else {
                    break;
                }
                continuing {
                    let _e708 = local_26;
                    phi_380_ = _e708;
                    let _e711 = local_27;
                    phi_383_ = _e711;
                    phi_385_ = (_e327 + 1i);
                }
            }
            let _e392 = local_16;
            phi_448_ = _e392.z;
        }
        let _e395 = phi_448_;
        textureStore(rw_output, bitcast<vec2<u32>>(_e55), vec4<f32>(0f, _e395, 0f, 1f));
    }
    let _e400 = local_6[0i][2i];
    let _e403 = (_e400.offset + _e400.size);
    phi_463_ = false;
    if (_e54.x >= _e400.offset.x) {
        phi_463_ = (_e54.x < _e403.x);
    }
    let _e409 = phi_463_;
    phi_474_ = false;
    if _e409 {
        phi_473_ = false;
        if (_e54.y >= _e400.offset.y) {
            phi_473_ = (_e54.y < _e403.y);
        }
        let _e416 = phi_473_;
        phi_474_ = _e416;
    }
    let _e418 = phi_474_;
    if _e418 {
        let _e419 = local_6[0i][2i];
        let _e428 = cbFI.opticalFlowScale;
        let _e431 = cbFI.opticalFlowBlockSize;
        let _e439 = vec2<i32>((vec2<f32>((vec2<i32>(((vec2<f32>(1f, 1f) / _e428) / vec2<f32>(vec2(_e431)))) * vec2<i32>(1i, 1i))) * 1f));
        let _e442 = ((((vec2<f32>((_e55 - _e419.offset)) + vec2<f32>(0.5f, 0.5f)) / vec2<f32>(_e419.size)) * vec2<f32>(_e439)) - vec2<f32>(0.5f, 0.5f));
        let _e443 = floor(_e442);
        let _e445 = (_e442 - _e443);
        let _e447 = (1f - _e445.x);
        let _e449 = (1f - _e445.y);
        local_5 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
        local_4 = array<f32, 4>((_e447 * _e449), (_e445.x * _e449), (_e447 * _e445.y), (_e445.x * _e445.y));
        phi_514_ = vec2<f32>(0f, 0f);
        phi_517_ = 0f;
        phi_519_ = 0i;
        loop {
            let _e456 = phi_514_;
            let _e458 = phi_517_;
            let _e460 = phi_519_;
            local_18 = _e458;
            local_19 = _e458;
            local_20 = _e458;
            local_21 = _e456;
            local_32 = _e456;
            if (_e460 < 4i) {
                let _e463 = local_5[_e460];
                let _e464 = (vec2<i32>(_e443) + _e463);
                phi_515_ = _e456;
                phi_518_ = _e458;
                if all((bitcast<vec2<u32>>(_e464) < bitcast<vec2<u32>>(_e439))) {
                    let _e470 = local_4[_e460];
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e473 = all((_e464 >= vec2<i32>(0i, 0i)));
                            phi_545_ = false;
                            local_17 = _e473;
                            if _e473 {
                                let _e475 = cbFI.maxRenderSize;
                                phi_545_ = all((_e464 < _e475));
                            }
                            let _e479 = phi_545_;
                            if _e479 {
                                let _e482 = cbFI.maxRenderSize;
                                let _e490 = r_optical_flow_motion_vector_field_x.member[bitcast<u32>(((_e464.y * _e482.x) + _e464.x))];
                                phi_558_ = _e490;
                                break;
                            }
                            phi_558_ = 0u;
                            break;
                        }
                    }
                    let _e492 = phi_558_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e495 = local_17;
                            phi_567_ = false;
                            if _e495 {
                                let _e497 = cbFI.maxRenderSize;
                                phi_567_ = all((_e464 < _e497));
                            }
                            let _e501 = phi_567_;
                            if _e501 {
                                let _e504 = cbFI.maxRenderSize;
                                let _e512 = r_optical_flow_motion_vector_field_y.member[bitcast<u32>(((_e464.y * _e504.x) + _e464.x))];
                                phi_580_ = _e512;
                                break;
                            }
                            phi_580_ = 0u;
                            break;
                        }
                    }
                    let _e514 = phi_580_;
                    phi_515_ = (_e456 + (vec2<f32>(unpack2x16float((_e492 & 65535u)).x, unpack2x16float((_e514 & 65535u)).x) * _e470));
                    phi_518_ = (_e458 + _e470);
                }
                let _e526 = phi_515_;
                let _e528 = phi_518_;
                local_30 = _e526;
                local_31 = _e528;
                continue;
            } else {
                break;
            }
            continuing {
                let _e733 = local_30;
                phi_514_ = _e733;
                let _e736 = local_31;
                phi_517_ = _e736;
                phi_519_ = (_e460 + 1i);
            }
        }
        let _e531 = local_18;
        let _e751 = local_32;
        phi_596_ = _e751;
        if (_e531 > 0f) {
            let _e534 = local_19;
            let _e536 = local_20;
            let _e539 = local_21;
            phi_596_ = (_e539 / vec2<f32>(_e534, _e536));
        }
        let _e542 = phi_596_;
        let _e545 = (vec2<f32>(0.5f, 0.5f) + ((_e542 * _e58) * 0.1f));
        textureStore(rw_output, bitcast<vec2<u32>>(_e55), vec4<f32>(_e545.x, _e545.y, 0.5f, 1f));
    }
    let _e552 = local_6[2i][0i];
    let _e555 = (_e552.offset + _e552.size);
    phi_616_ = false;
    if (_e54.x >= _e552.offset.x) {
        phi_616_ = (_e54.x < _e555.x);
    }
    let _e561 = phi_616_;
    phi_627_ = false;
    if _e561 {
        phi_626_ = false;
        if (_e54.y >= _e552.offset.y) {
            phi_626_ = (_e54.y < _e555.y);
        }
        let _e568 = phi_626_;
        phi_627_ = _e568;
    }
    let _e570 = phi_627_;
    if _e570 {
        let _e571 = local_6[2i][0i];
        let _e580 = cbFI.renderSize;
        let _e583 = cbFI.maxRenderSize;
        let _e587 = textureSampleLevel(r_disocclusion_mask, s_LinearClamp, (((vec2<f32>((_e55 - _e571.offset)) + vec2<f32>(0.5f, 0.5f)) / vec2<f32>(_e571.size)) * (vec2<f32>(_e580) / vec2<f32>(_e583))), 0f);
        let _e589 = clamp(_e587.xy, vec2<f32>(0f, 0f), vec2<f32>(1f, 1f));
        textureStore(rw_output, bitcast<vec2<u32>>(_e55), vec4<f32>(_e589.x, _e589.y, 0f, 1f));
    }
    let _e596 = local_6[2i][1i];
    let _e599 = (_e596.offset + _e596.size);
    phi_668_ = false;
    if (_e54.x >= _e596.offset.x) {
        phi_668_ = (_e54.x < _e599.x);
    }
    let _e605 = phi_668_;
    phi_679_ = false;
    if _e605 {
        phi_678_ = false;
        if (_e54.y >= _e596.offset.y) {
            phi_678_ = (_e54.y < _e599.y);
        }
        let _e612 = phi_678_;
        phi_679_ = _e612;
    }
    let _e614 = phi_679_;
    if _e614 {
        let _e615 = local_6[2i][1i];
        let _e623 = textureSampleLevel(r_current_interpolation_source, s_LinearClamp, ((vec2<f32>((_e55 - _e615.offset)) + vec2<f32>(0.5f, 0.5f)) / vec2<f32>(_e615.size)), 0f);
        textureStore(rw_output, bitcast<vec2<u32>>(_e55), vec4<f32>(_e623.x, _e623.y, _e623.z, 1f));
    }
    let _e631 = local_6[2i][2i];
    let _e634 = (_e631.offset + _e631.size);
    phi_711_ = false;
    if (_e54.x >= _e631.offset.x) {
        phi_711_ = (_e54.x < _e634.x);
    }
    let _e640 = phi_711_;
    phi_722_ = false;
    if _e640 {
        phi_721_ = false;
        if (_e54.y >= _e631.offset.y) {
            phi_721_ = (_e54.y < _e634.y);
        }
        let _e647 = phi_721_;
        phi_722_ = _e647;
    }
    let _e649 = phi_722_;
    if _e649 {
        let _e650 = local_6[2i][2i];
        let _e658 = textureSampleLevel(r_input_distortion_field, s_LinearClamp, ((vec2<f32>((_e55 - _e650.offset)) + vec2<f32>(0.5f, 0.5f)) / vec2<f32>(_e650.size)), 0f);
        let _e661 = (abs(_e658.xy) * 10f);
        textureStore(rw_output, bitcast<vec2<u32>>(_e55), vec4<f32>(_e661.x, _e661.y, 0f, 1f));
    }
    return;
}

@compute @workgroup_size(8, 8, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>) {
    global = vec3<i32>(param);
    CS_1();
}
`;
