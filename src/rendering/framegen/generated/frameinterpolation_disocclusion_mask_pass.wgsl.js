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

@group(0) @binding(0) 
var<uniform> cbFI: type_u002e_cbFI;
@group(0) @binding(64) 
var s_LinearClamp: sampler;
@group(0) @binding(11) 
var r_dilated_depth: texture_2d<f32>;
@group(0) @binding(10) 
var<storage> r_reconstructed_depth_previous_frame: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(12) 
var<storage> r_reconstructed_depth_interpolated_frame: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(8) 
var<storage> r_game_motion_vector_field_x: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(9) 
var<storage> r_game_motion_vector_field_y: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(13) 
var r_inpainting_pyramid: texture_2d<f32>;
@group(0) @binding(14) 
var r_input_distortion_field: texture_2d<f32>;
@group(0) @binding(32) 
var rw_disocclusion_mask: texture_storage_2d<rgba8unorm,write>;
var<private> global: vec3<i32>;

fn CS_1() {
    var local: array<f32, 4>;
    var local_1: array<vec2<i32>, 4>;
    var local_2: array<f32, 4>;
    var local_3: array<vec2<i32>, 4>;
    var local_4: array<f32, 4>;
    var local_5: array<vec2<i32>, 4>;
    var phi_103_: bool;
    var phi_116_: u32;
    var phi_135_: bool;
    var phi_148_: u32;
    var local_6: bool;
    var phi_157_: bool;
    var phi_170_: u32;
    var phi_186_: vec2<i32>;
    var phi_189_: vec4<f32>;
    var phi_191_: i32;
    var phi_200_: bool;
    var phi_218_: vec4<f32>;
    var phi_221_: f32;
    var phi_223_: i32;
    var phi_219_: vec4<f32>;
    var phi_222_: f32;
    var local_7: f32;
    var local_8: f32;
    var local_9: vec4<f32>;
    var local_10: vec4<f32>;
    var local_11: vec4<f32>;
    var phi_254_: vec2<f32>;
    var phi_277_: f32;
    var phi_280_: f32;
    var phi_282_: i32;
    var phi_322_: bool;
    var phi_335_: u32;
    var phi_379_: f32;
    var phi_380_: f32;
    var phi_381_: f32;
    var phi_382_: f32;
    var phi_278_: f32;
    var phi_281_: f32;
    var local_12: f32;
    var local_13: f32;
    var local_14: f32;
    var phi_390_: f32;
    var phi_408_: f32;
    var phi_411_: f32;
    var phi_413_: i32;
    var phi_489_: f32;
    var phi_490_: f32;
    var phi_491_: f32;
    var phi_492_: f32;
    var phi_409_: f32;
    var phi_412_: f32;
    var local_15: f32;
    var local_16: f32;
    var local_17: f32;
    var phi_500_: f32;
    var local_18: vec2<i32>;
    var local_19: vec4<f32>;
    var local_20: vec4<f32>;
    var local_21: f32;
    var local_22: f32;
    var local_23: f32;
    var local_24: f32;
    var local_25: f32;

    let _e52 = global;
    let _e53 = _e52.xy;
    switch bitcast<i32>(0u) {
        default: {
            phi_103_ = false;
            if all((_e53 >= vec2<i32>(0i, 0i))) {
                let _e58 = cbFI.maxRenderSize;
                phi_103_ = all((_e53 < _e58));
            }
            let _e62 = phi_103_;
            if _e62 {
                let _e65 = cbFI.maxRenderSize;
                let _e73 = r_reconstructed_depth_interpolated_frame.member[bitcast<u32>(((_e52.y * _e65.x) + _e52.x))];
                phi_116_ = _e73;
                break;
            }
            phi_116_ = 0u;
            break;
        }
    }
    let _e75 = phi_116_;
    let _e76 = bitcast<f32>(_e75);
    let _e78 = (vec2<f32>(_e53) + vec2<f32>(0.5f, 0.5f));
    let _e80 = cbFI.renderSize;
    let _e81 = vec2<f32>(_e80);
    let _e82 = (_e78 / _e81);
    let _e83 = vec2<i32>(_e78);
    switch bitcast<i32>(0u) {
        default: {
            let _e86 = all((_e83 >= vec2<i32>(0i, 0i)));
            phi_135_ = false;
            local_6 = _e86;
            if _e86 {
                let _e88 = cbFI.maxRenderSize;
                phi_135_ = all((_e83 < _e88));
            }
            let _e92 = phi_135_;
            if _e92 {
                let _e95 = cbFI.maxRenderSize;
                let _e103 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e83.y * _e95.x) + _e83.x))];
                phi_148_ = _e103;
                break;
            }
            phi_148_ = 0u;
            break;
        }
    }
    let _e105 = phi_148_;
    switch bitcast<i32>(0u) {
        default: {
            let _e108 = local_6;
            phi_157_ = false;
            if _e108 {
                let _e110 = cbFI.maxRenderSize;
                phi_157_ = all((_e83 < _e110));
            }
            let _e114 = phi_157_;
            if _e114 {
                let _e117 = cbFI.maxRenderSize;
                let _e125 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e83.y * _e117.x) + _e83.x))];
                phi_170_ = _e125;
                break;
            }
            phi_170_ = 0u;
            break;
        }
    }
    let _e127 = phi_170_;
    phi_254_ = vec2<f32>(unpack2x16float((_e105 & 65535u)).x, unpack2x16float((_e127 & 65535u)).x);
    if ((f32(((_e105 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f) <= 0f) {
        phi_186_ = _e80;
        phi_189_ = vec4<f32>(0f, 0f, 0f, 0f);
        phi_191_ = 0i;
        loop {
            let _e142 = phi_186_;
            let _e144 = phi_189_;
            let _e146 = phi_191_;
            local_10 = _e144;
            local_11 = _e144;
            phi_200_ = false;
            if (_e146 < 11i) {
                phi_200_ = (_e144.w == 0f);
            }
            let _e151 = phi_200_;
            if _e151 {
                let _e152 = (_e142 / vec2<i32>(2i, 2i));
                let _e155 = ((_e82 * vec2<f32>(_e152)) - vec2<f32>(0.5f, 0.5f));
                let _e156 = floor(_e155);
                let _e158 = (_e155 - _e156);
                let _e160 = (1f - _e158.x);
                let _e162 = (1f - _e158.y);
                local_1 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
                local = array<f32, 4>((_e160 * _e162), (_e158.x * _e162), (_e160 * _e158.y), (_e158.x * _e158.y));
                local_18 = _e152;
                phi_218_ = vec4<f32>(0f, 0f, 0f, 0f);
                phi_221_ = 0f;
                phi_223_ = 0i;
                loop {
                    let _e169 = phi_218_;
                    let _e171 = phi_221_;
                    let _e173 = phi_223_;
                    local_7 = _e171;
                    local_8 = _e171;
                    local_9 = _e169;
                    if (_e173 < 4i) {
                        let _e176 = local_1[_e173];
                        let _e178 = bitcast<vec2<u32>>((vec2<i32>(_e156) + _e176));
                        phi_219_ = _e169;
                        phi_222_ = _e171;
                        if all((_e178 < bitcast<vec2<u32>>(_e152))) {
                            let _e183 = textureLoad(r_inpainting_pyramid, _e178, bitcast<u32>(_e146));
                            let _e188 = local[_e173];
                            let _e190 = ((_e188 * select(0f, 1f, (_e183.z > 0f))) * _e183.z);
                            phi_219_ = (_e169 + (_e183 * _e190));
                            phi_222_ = (_e171 + _e190);
                        }
                        let _e195 = phi_219_;
                        let _e197 = phi_222_;
                        local_20 = _e195;
                        local_21 = _e197;
                        continue;
                    } else {
                        break;
                    }
                    continuing {
                        let _e508 = local_20;
                        phi_218_ = _e508;
                        let _e511 = local_21;
                        phi_221_ = _e511;
                        phi_223_ = (_e173 + 1i);
                    }
                }
                let _e200 = local_7;
                let _e203 = local_8;
                let _e207 = local_9;
                local_19 = (_e207 / vec4(select(1f, _e203, (_e200 > 0f))));
                continue;
            } else {
                break;
            }
            continuing {
                let _e500 = local_18;
                phi_186_ = _e500;
                let _e503 = local_19;
                phi_189_ = _e503;
                phi_191_ = (_e146 + 1i);
            }
        }
        let _e211 = local_10;
        phi_254_ = _e211.xy;
    }
    let _e216 = phi_254_;
    let _e219 = cbFI.fDeviceToViewDepth;
    let _e223 = (_e219.y / (_e76 - _e219.x));
    let _e225 = (((_e82 + _e216) * _e81) - vec2<f32>(0.5f, 0.5f));
    let _e226 = floor(_e225);
    let _e228 = (_e225 - _e226);
    let _e230 = (1f - _e228.x);
    let _e232 = (1f - _e228.y);
    local_3 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
    local_2 = array<f32, 4>((_e230 * _e232), (_e228.x * _e232), (_e230 * _e228.y), (_e228.x * _e228.y));
    phi_277_ = 0f;
    phi_280_ = 0f;
    phi_282_ = 0i;
    loop {
        let _e239 = phi_277_;
        let _e241 = phi_280_;
        let _e243 = phi_282_;
        local_12 = _e241;
        local_13 = _e239;
        local_14 = _e241;
        if (_e243 < 4i) {
            let _e246 = local_3[_e243];
            let _e247 = (vec2<i32>(_e226) + _e246);
            phi_278_ = _e239;
            phi_281_ = _e241;
            if all((bitcast<vec2<u32>>(_e247) < bitcast<vec2<u32>>(_e80))) {
                let _e253 = local_2[_e243];
                phi_381_ = _e239;
                phi_382_ = _e241;
                if (_e253 > 0.001f) {
                    let _e258 = textureSampleLevel(r_input_distortion_field, s_LinearClamp, ((vec2<f32>(_e247) + vec2<f32>(0.5f, 0.5f)) / _e81), 0f);
                    let _e262 = (_e247 + vec2<i32>((_e258.xy * _e81)));
                    switch bitcast<i32>(0u) {
                        default: {
                            phi_322_ = false;
                            if all((_e262 >= vec2<i32>(0i, 0i))) {
                                let _e267 = cbFI.maxRenderSize;
                                phi_322_ = all((_e262 < _e267));
                            }
                            let _e271 = phi_322_;
                            if _e271 {
                                let _e274 = cbFI.maxRenderSize;
                                let _e282 = r_reconstructed_depth_previous_frame.member[bitcast<u32>(((_e262.y * _e274.x) + _e262.x))];
                                phi_335_ = _e282;
                                break;
                            }
                            phi_335_ = 0u;
                            break;
                        }
                    }
                    let _e284 = phi_335_;
                    let _e285 = bitcast<f32>(_e284);
                    let _e287 = (_e219.y / (_e285 - _e219.x));
                    let _e288 = (_e223 - _e287);
                    phi_379_ = _e239;
                    phi_380_ = _e241;
                    if (_e288 > 0f) {
                        let _e294 = (_e219.y / (max(_e285, _e76) - _e219.x));
                        let _e298 = (((vec2<f32>(vec2<i32>((_e81 * 0.5f))) / _e81) * vec2<f32>(2f, -2f)) + vec2<f32>(-1f, 1f));
                        phi_379_ = (_e239 + (select(0f, 1f, (((((0.0000137f * (length(vec3<f32>(((_e219.z * -1f) * _e294), (_e219.w * _e294), _e294)) / length(vec3<f32>(((_e219.z * _e298.x) * _e294), ((_e219.w * _e298.y) * _e294), _e294)))) * length(_e81)) * min(_e223, _e287)) / _e288) >= 1f)) * _e253));
                        phi_380_ = (_e241 + _e253);
                    }
                    let _e327 = phi_379_;
                    let _e329 = phi_380_;
                    phi_381_ = _e327;
                    phi_382_ = _e329;
                }
                let _e331 = phi_381_;
                let _e333 = phi_382_;
                phi_278_ = _e331;
                phi_281_ = _e333;
            }
            let _e335 = phi_278_;
            let _e337 = phi_281_;
            local_22 = _e335;
            local_23 = _e337;
            continue;
        } else {
            break;
        }
        continuing {
            let _e523 = local_22;
            phi_277_ = _e523;
            let _e526 = local_23;
            phi_280_ = _e526;
            phi_282_ = (_e243 + 1i);
        }
    }
    let _e340 = local_12;
    if (_e340 > 0f) {
        let _e343 = local_13;
        let _e345 = local_14;
        phi_390_ = clamp((1f - (_e343 / _e345)), 0f, 1f);
    } else {
        phi_390_ = 0f;
    }
    let _e350 = phi_390_;
    let _e354 = (((_e82 - _e216) * _e81) - vec2<f32>(0.5f, 0.5f));
    let _e355 = floor(_e354);
    let _e357 = (_e354 - _e355);
    let _e359 = (1f - _e357.x);
    let _e361 = (1f - _e357.y);
    local_5 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
    local_4 = array<f32, 4>((_e359 * _e361), (_e357.x * _e361), (_e359 * _e357.y), (_e357.x * _e357.y));
    phi_408_ = 0f;
    phi_411_ = 0f;
    phi_413_ = 0i;
    loop {
        let _e368 = phi_408_;
        let _e370 = phi_411_;
        let _e372 = phi_413_;
        local_15 = _e370;
        local_16 = _e368;
        local_17 = _e370;
        if (_e372 < 4i) {
            let _e375 = local_5[_e372];
            let _e376 = (vec2<i32>(_e355) + _e375);
            phi_409_ = _e368;
            phi_412_ = _e370;
            if all((bitcast<vec2<u32>>(_e376) < bitcast<vec2<u32>>(_e80))) {
                let _e382 = local_4[_e372];
                phi_491_ = _e368;
                phi_492_ = _e370;
                if (_e382 > 0.001f) {
                    let _e387 = textureSampleLevel(r_input_distortion_field, s_LinearClamp, ((vec2<f32>(_e376) + vec2<f32>(0.5f, 0.5f)) / _e81), 0f);
                    let _e393 = textureLoad(r_dilated_depth, bitcast<vec2<u32>>((_e376 + vec2<i32>((_e387.xy * _e81)))), 0u);
                    let _e396 = (_e219.y / (_e393.x - _e219.x));
                    let _e397 = (_e223 - _e396);
                    phi_489_ = _e368;
                    phi_490_ = _e370;
                    if (_e397 > 0f) {
                        let _e403 = (_e219.y / (max(_e393.x, _e76) - _e219.x));
                        let _e407 = (((vec2<f32>(vec2<i32>((_e81 * 0.5f))) / _e81) * vec2<f32>(2f, -2f)) + vec2<f32>(-1f, 1f));
                        phi_489_ = (_e368 + (select(0f, 1f, (((((0.0000137f * (length(vec3<f32>(((_e219.z * -1f) * _e403), (_e219.w * _e403), _e403)) / length(vec3<f32>(((_e219.z * _e407.x) * _e403), ((_e219.w * _e407.y) * _e403), _e403)))) * length(_e81)) * min(_e223, _e396)) / _e397) >= 1f)) * _e382));
                        phi_490_ = (_e370 + _e382);
                    }
                    let _e436 = phi_489_;
                    let _e438 = phi_490_;
                    phi_491_ = _e436;
                    phi_492_ = _e438;
                }
                let _e440 = phi_491_;
                let _e442 = phi_492_;
                phi_409_ = _e440;
                phi_412_ = _e442;
            }
            let _e444 = phi_409_;
            let _e446 = phi_412_;
            local_24 = _e444;
            local_25 = _e446;
            continue;
        } else {
            break;
        }
        continuing {
            let _e542 = local_24;
            phi_408_ = _e542;
            let _e545 = local_25;
            phi_411_ = _e545;
            phi_413_ = (_e372 + 1i);
        }
    }
    let _e449 = local_15;
    if (_e449 > 0f) {
        let _e452 = local_16;
        let _e454 = local_17;
        phi_500_ = clamp((1f - (_e452 / _e454)), 0f, 1f);
    } else {
        phi_500_ = 0f;
    }
    let _e459 = phi_500_;
    let _e463 = select(vec2<f32>(0f, 0f), vec2<f32>(1f, 1f), (vec2<f32>((1f - _e350), (1f - _e459)) >= vec2<f32>(0.001f, 0.001f)));
    let _e464 = (_e216 * 2f);
    let _e470 = bitcast<vec2<u32>>(_e80);
    textureStore(rw_disocclusion_mask, bitcast<vec2<u32>>(_e53), vec2<f32>(clamp((_e463.x + select(0f, 1f, !(all((bitcast<vec2<u32>>(vec2<i32>(((_e82 + _e464) * _e81))) < _e470))))), 0f, 1f), clamp((_e463.y + select(0f, 1f, !(all((bitcast<vec2<u32>>(vec2<i32>(((_e82 - _e464) * _e81))) < _e470))))), 0f, 1f)).xyyy);
    return;
}

@compute @workgroup_size(8, 8, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>) {
    global = vec3<i32>(param);
    CS_1();
}
`;
