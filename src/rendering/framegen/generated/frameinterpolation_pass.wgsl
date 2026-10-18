// AMD FidelityFX SDK v2.3.0, Frame Interpolation 3.1.6.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL; scripts/fg/compile.mjs.
struct type_u002e_cbFI {
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
@group(0) @binding(12) 
var r_previous_interpolation_source: texture_2d<f32>;
@group(0) @binding(13) 
var r_current_interpolation_source: texture_2d<f32>;
@group(0) @binding(14) 
var r_disocclusion_mask: texture_2d<f32>;
@group(0) @binding(8) 
var<storage> r_game_motion_vector_field_x: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(9) 
var<storage> r_game_motion_vector_field_y: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(10) 
var<storage> r_optical_flow_motion_vector_field_x: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(11) 
var<storage> r_optical_flow_motion_vector_field_y: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(15) 
var r_inpainting_pyramid: texture_2d<f32>;
@group(0) @binding(16) 
var<storage> r_counters: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(32) 
var rw_output: texture_storage_2d<rgba16float,write>;
@group(0) @binding(33) 
var rw_inpainting_mask: texture_storage_2d<rgba8unorm,write>;
var<private> global: vec3<i32>;

fn CS_1() {
    var local: array<f32, 4>;
    var local_1: array<vec2<i32>, 4>;
    var local_2: array<f32, 4>;
    var local_3: array<vec2<i32>, 4>;
    var local_4: array<f32, 4>;
    var local_5: array<vec2<i32>, 4>;
    var local_6: array<f32, 4>;
    var local_7: array<vec2<i32>, 4>;
    var local_8: array<f32, 4>;
    var local_9: array<vec2<i32>, 4>;
    var local_10: array<f32, 4>;
    var local_11: array<vec2<i32>, 4>;
    var phi_118_: bool;
    var phi_124_: bool;
    var phi_132_: bool;
    var phi_138_: bool;
    var phi_174_: bool;
    var phi_185_: u32;
    var local_12: bool;
    var phi_192_: bool;
    var phi_203_: u32;
    var phi_219_: vec2<i32>;
    var phi_222_: vec4<f32>;
    var phi_224_: i32;
    var phi_233_: bool;
    var phi_251_: vec4<f32>;
    var phi_254_: f32;
    var phi_256_: i32;
    var phi_252_: vec4<f32>;
    var phi_255_: f32;
    var local_13: f32;
    var local_14: f32;
    var local_15: vec4<f32>;
    var local_16: vec4<f32>;
    var local_17: vec4<f32>;
    var phi_287_: vec2<f32>;
    var phi_294_: bool;
    var phi_302_: bool;
    var phi_303_: bool;
    var phi_310_: bool;
    var phi_318_: bool;
    var phi_319_: bool;
    var phi_349_: vec2<f32>;
    var phi_352_: f32;
    var phi_354_: i32;
    var phi_378_: bool;
    var phi_389_: u32;
    var local_18: bool;
    var phi_396_: bool;
    var phi_407_: u32;
    var phi_350_: vec2<f32>;
    var phi_353_: f32;
    var local_19: f32;
    var local_20: f32;
    var local_21: f32;
    var local_22: vec2<f32>;
    var phi_423_: vec2<f32>;
    var phi_449_: vec3<f32>;
    var phi_452_: f32;
    var phi_454_: i32;
    var phi_469_: bool;
    var phi_475_: bool;
    var phi_483_: bool;
    var phi_450_: vec3<f32>;
    var phi_453_: f32;
    var local_23: f32;
    var local_24: f32;
    var local_25: f32;
    var local_26: f32;
    var local_27: vec3<f32>;
    var phi_501_: vec3<f32>;
    var phi_520_: vec3<f32>;
    var phi_523_: f32;
    var phi_525_: i32;
    var phi_540_: bool;
    var phi_546_: bool;
    var phi_554_: bool;
    var phi_521_: vec3<f32>;
    var phi_524_: f32;
    var local_28: f32;
    var local_29: f32;
    var local_30: f32;
    var local_31: f32;
    var local_32: vec3<f32>;
    var phi_572_: vec3<f32>;
    var phi_590_: vec3<f32>;
    var phi_593_: f32;
    var phi_595_: i32;
    var phi_610_: bool;
    var phi_616_: bool;
    var phi_624_: bool;
    var phi_591_: vec3<f32>;
    var phi_594_: f32;
    var local_33: f32;
    var local_34: f32;
    var local_35: f32;
    var local_36: f32;
    var local_37: vec3<f32>;
    var phi_642_: vec3<f32>;
    var phi_661_: vec3<f32>;
    var phi_664_: f32;
    var phi_666_: i32;
    var phi_681_: bool;
    var phi_687_: bool;
    var phi_695_: bool;
    var phi_662_: vec3<f32>;
    var phi_665_: f32;
    var local_38: f32;
    var local_39: f32;
    var local_40: f32;
    var local_41: f32;
    var local_42: vec3<f32>;
    var phi_713_: vec3<f32>;
    var local_43: f32;
    var local_44: f32;
    var phi_745_: vec3<f32>;
    var local_45: f32;
    var phi_749_: bool;
    var local_46: f32;
    var local_47: f32;
    var phi_755_: bool;
    var phi_760_: f32;
    var phi_774_: f32;
    var phi_786_: f32;
    var phi_806_: f32;
    var phi_807_: vec3<f32>;
    var local_48: vec2<i32>;
    var local_49: vec4<f32>;
    var local_50: vec4<f32>;
    var local_51: f32;
    var local_52: vec2<f32>;
    var local_53: f32;
    var local_54: vec2<f32>;
    var local_55: vec3<f32>;
    var local_56: f32;
    var local_57: vec3<f32>;
    var local_58: f32;
    var local_59: vec3<f32>;
    var local_60: f32;
    var local_61: vec3<f32>;
    var local_62: f32;

    let _e61 = global;
    let _e62 = _e61.xy;
    let _e64 = cbFI.interpolationRectBase;
    let _e66 = cbFI.interpolationRectSize;
    phi_118_ = false;
    if (_e61.x >= _e64.x) {
        phi_118_ = (_e61.x < (_e66.x + _e64.x));
    }
    let _e74 = phi_118_;
    phi_124_ = false;
    if _e74 {
        phi_124_ = (_e61.y >= _e64.y);
    }
    let _e79 = phi_124_;
    phi_132_ = false;
    if _e79 {
        phi_132_ = (_e61.y < (_e66.y + _e64.y));
    }
    let _e86 = phi_132_;
    phi_138_ = true;
    if _e86 {
        let _e89 = r_counters.member[1u];
        phi_138_ = (_e89 == 0u);
    }
    let _e92 = phi_138_;
    if _e92 {
        let _e765 = textureLoad(r_current_interpolation_source, bitcast<vec2<u32>>(_e62), 0u);
        phi_806_ = 0f;
        phi_807_ = _e765.xyz;
    } else {
        let _e93 = bitcast<vec2<u32>>(_e62);
        let _e98 = vec2<f32>(_e66);
        let _e99 = ((vec2<f32>((_e93 - bitcast<vec2<u32>>(_e64))) + vec2<f32>(0.5f, 0.5f)) / _e98);
        let _e103 = cbFI.displaySize;
        let _e104 = vec2<f32>(_e103);
        let _e105 = ((vec2<f32>(_e93) + vec2<f32>(0.5f, 0.5f)) / _e104);
        let _e107 = cbFI.renderSize;
        let _e108 = vec2<f32>(_e107);
        let _e110 = cbFI.maxRenderSize;
        let _e114 = (_e98 / _e104);
        let _e116 = vec2<i32>((_e99 * _e108));
        switch bitcast<i32>(0u) {
            default: {
                let _e119 = all((_e116 >= vec2<i32>(0i, 0i)));
                phi_174_ = false;
                local_12 = _e119;
                if _e119 {
                    phi_174_ = all((_e116 < _e110));
                }
                let _e123 = phi_174_;
                if _e123 {
                    let _e132 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e116.y * _e110.x) + _e116.x))];
                    phi_185_ = _e132;
                    break;
                }
                phi_185_ = 0u;
                break;
            }
        }
        let _e134 = phi_185_;
        switch bitcast<i32>(0u) {
            default: {
                let _e137 = local_12;
                phi_192_ = false;
                if _e137 {
                    phi_192_ = all((_e116 < _e110));
                }
                let _e141 = phi_192_;
                if _e141 {
                    let _e150 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e116.y * _e110.x) + _e116.x))];
                    phi_203_ = _e150;
                    break;
                }
                phi_203_ = 0u;
                break;
            }
        }
        let _e152 = phi_203_;
        phi_287_ = vec2<f32>(unpack2x16float((_e134 & 65535u)).x, unpack2x16float((_e152 & 65535u)).x);
        if ((f32(((_e134 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f) <= 0f) {
            phi_219_ = _e107;
            phi_222_ = vec4<f32>(0f, 0f, 0f, 0f);
            phi_224_ = 0i;
            loop {
                let _e167 = phi_219_;
                let _e169 = phi_222_;
                let _e171 = phi_224_;
                local_16 = _e169;
                local_17 = _e169;
                phi_233_ = false;
                if (_e171 < 11i) {
                    phi_233_ = (_e169.w == 0f);
                }
                let _e176 = phi_233_;
                if _e176 {
                    let _e177 = (_e167 / vec2<i32>(2i, 2i));
                    let _e180 = ((_e99 * vec2<f32>(_e177)) - vec2<f32>(0.5f, 0.5f));
                    let _e181 = floor(_e180);
                    let _e183 = (_e180 - _e181);
                    let _e185 = (1f - _e183.x);
                    let _e187 = (1f - _e183.y);
                    local_1 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
                    local = array<f32, 4>((_e185 * _e187), (_e183.x * _e187), (_e185 * _e183.y), (_e183.x * _e183.y));
                    local_48 = _e177;
                    phi_251_ = vec4<f32>(0f, 0f, 0f, 0f);
                    phi_254_ = 0f;
                    phi_256_ = 0i;
                    loop {
                        let _e194 = phi_251_;
                        let _e196 = phi_254_;
                        let _e198 = phi_256_;
                        local_13 = _e196;
                        local_14 = _e196;
                        local_15 = _e194;
                        if (_e198 < 4i) {
                            let _e201 = local_1[_e198];
                            let _e203 = bitcast<vec2<u32>>((vec2<i32>(_e181) + _e201));
                            phi_252_ = _e194;
                            phi_255_ = _e196;
                            if all((_e203 < bitcast<vec2<u32>>(_e177))) {
                                let _e208 = textureLoad(r_inpainting_pyramid, _e203, bitcast<u32>(_e171));
                                let _e213 = local[_e198];
                                let _e215 = ((_e213 * select(0f, 1f, (_e208.z > 0f))) * _e208.z);
                                phi_252_ = (_e194 + (_e208 * _e215));
                                phi_255_ = (_e196 + _e215);
                            }
                            let _e220 = phi_252_;
                            let _e222 = phi_255_;
                            local_50 = _e220;
                            local_51 = _e222;
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e796 = local_50;
                            phi_251_ = _e796;
                            let _e799 = local_51;
                            phi_254_ = _e799;
                            phi_256_ = (_e198 + 1i);
                        }
                    }
                    let _e225 = local_13;
                    let _e228 = local_14;
                    let _e232 = local_15;
                    local_49 = (_e232 / vec4(select(1f, _e228, (_e225 > 0f))));
                    continue;
                } else {
                    break;
                }
                continuing {
                    let _e788 = local_48;
                    phi_219_ = _e788;
                    let _e791 = local_49;
                    phi_222_ = _e791;
                    phi_224_ = (_e171 + 1i);
                }
            }
            let _e236 = local_16;
            phi_287_ = _e236.xy;
        }
        let _e241 = phi_287_;
        let _e242 = (_e99 - _e241);
        phi_294_ = false;
        if (_e242.x > 0f) {
            phi_294_ = (_e242.x < 1f);
        }
        let _e247 = phi_294_;
        phi_303_ = false;
        if _e247 {
            phi_302_ = false;
            if (_e242.y > 0f) {
                phi_302_ = (_e242.y < 1f);
            }
            let _e252 = phi_302_;
            phi_303_ = _e252;
        }
        let _e254 = phi_303_;
        let _e255 = (_e99 + _e241);
        phi_310_ = false;
        if (_e255.x > 0f) {
            phi_310_ = (_e255.x < 1f);
        }
        let _e260 = phi_310_;
        phi_319_ = false;
        if _e260 {
            phi_318_ = false;
            if (_e255.y > 0f) {
                phi_318_ = (_e255.y < 1f);
            }
            let _e265 = phi_318_;
            phi_319_ = _e265;
        }
        let _e267 = phi_319_;
        let _e269 = cbFI.opticalFlowScale;
        let _e272 = cbFI.opticalFlowBlockSize;
        let _e280 = vec2<i32>((vec2<f32>((vec2<i32>(((vec2<f32>(1f, 1f) / _e269) / vec2<f32>(vec2(_e272)))) * vec2<i32>(1i, 1i))) * 1f));
        let _e283 = ((_e105 * vec2<f32>(_e280)) - vec2<f32>(0.5f, 0.5f));
        let _e284 = floor(_e283);
        let _e286 = (_e283 - _e284);
        let _e288 = (1f - _e286.x);
        let _e290 = (1f - _e286.y);
        local_3 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
        local_2 = array<f32, 4>((_e288 * _e290), (_e286.x * _e290), (_e288 * _e286.y), (_e286.x * _e286.y));
        phi_349_ = vec2<f32>(0f, 0f);
        phi_352_ = 0f;
        phi_354_ = 0i;
        loop {
            let _e297 = phi_349_;
            let _e299 = phi_352_;
            let _e301 = phi_354_;
            local_19 = _e299;
            local_20 = _e299;
            local_21 = _e299;
            local_22 = _e297;
            local_54 = _e297;
            if (_e301 < 4i) {
                let _e304 = local_3[_e301];
                let _e305 = (vec2<i32>(_e284) + _e304);
                phi_350_ = _e297;
                phi_353_ = _e299;
                if all((bitcast<vec2<u32>>(_e305) < bitcast<vec2<u32>>(_e280))) {
                    let _e311 = local_2[_e301];
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e314 = all((_e305 >= vec2<i32>(0i, 0i)));
                            phi_378_ = false;
                            local_18 = _e314;
                            if _e314 {
                                phi_378_ = all((_e305 < _e110));
                            }
                            let _e318 = phi_378_;
                            if _e318 {
                                let _e327 = r_optical_flow_motion_vector_field_x.member[bitcast<u32>(((_e305.y * _e110.x) + _e305.x))];
                                phi_389_ = _e327;
                                break;
                            }
                            phi_389_ = 0u;
                            break;
                        }
                    }
                    let _e329 = phi_389_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e332 = local_18;
                            phi_396_ = false;
                            if _e332 {
                                phi_396_ = all((_e305 < _e110));
                            }
                            let _e336 = phi_396_;
                            if _e336 {
                                let _e345 = r_optical_flow_motion_vector_field_y.member[bitcast<u32>(((_e305.y * _e110.x) + _e305.x))];
                                phi_407_ = _e345;
                                break;
                            }
                            phi_407_ = 0u;
                            break;
                        }
                    }
                    let _e347 = phi_407_;
                    phi_350_ = (_e297 + (vec2<f32>(unpack2x16float((_e329 & 65535u)).x, unpack2x16float((_e347 & 65535u)).x) * _e311));
                    phi_353_ = (_e299 + _e311);
                }
                let _e359 = phi_350_;
                let _e361 = phi_353_;
                local_52 = _e359;
                local_53 = _e361;
                continue;
            } else {
                break;
            }
            continuing {
                let _e817 = local_52;
                phi_349_ = _e817;
                let _e820 = local_53;
                phi_352_ = _e820;
                phi_354_ = (_e301 + 1i);
            }
        }
        let _e364 = local_19;
        let _e835 = local_54;
        phi_423_ = _e835;
        if (_e364 > 0f) {
            let _e367 = local_20;
            let _e369 = local_21;
            let _e372 = local_22;
            phi_423_ = (_e372 / vec2<f32>(_e367, _e369));
        }
        let _e375 = phi_423_;
        let _e376 = textureSampleLevel(r_disocclusion_mask, s_LinearClamp, (_e99 * (_e108 / vec2<f32>(_e110))), 0f);
        let _e380 = select(vec2<f32>(0f, 0f), vec2<f32>(1f, 1f), (clamp(_e376.xy, vec2<f32>(0f, 0f), vec2<f32>(1f, 1f)) == vec2<f32>(1f, 1f)));
        let _e384 = (((_e105 + (_e241 * _e114)) * _e104) - vec2<f32>(0.5f, 0.5f));
        let _e385 = floor(_e384);
        let _e387 = (_e384 - _e385);
        let _e389 = (1f - _e387.x);
        let _e391 = (1f - _e387.y);
        local_5 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
        local_4 = array<f32, 4>((_e389 * _e391), (_e387.x * _e391), (_e389 * _e387.y), (_e387.x * _e387.y));
        phi_449_ = vec3<f32>(0f, 0f, 0f);
        phi_452_ = 0f;
        phi_454_ = 0i;
        loop {
            let _e398 = phi_449_;
            let _e400 = phi_452_;
            let _e402 = phi_454_;
            local_23 = _e400;
            local_24 = _e400;
            local_25 = _e400;
            local_26 = _e400;
            local_27 = _e398;
            local_43 = _e400;
            if (_e402 < 4i) {
                let _e405 = local_5[_e402];
                let _e406 = (vec2<i32>(_e385) + _e405);
                phi_469_ = false;
                if (_e406.x >= _e64.x) {
                    phi_469_ = (_e406.x < (_e66.x + _e64.x));
                }
                let _e413 = phi_469_;
                phi_475_ = false;
                if _e413 {
                    phi_475_ = (_e406.y >= _e64.y);
                }
                let _e418 = phi_475_;
                phi_483_ = false;
                if _e418 {
                    phi_483_ = (_e406.y < (_e66.y + _e64.y));
                }
                let _e425 = phi_483_;
                phi_450_ = _e398;
                phi_453_ = _e400;
                if _e425 {
                    let _e427 = local_4[_e402];
                    let _e429 = textureLoad(r_previous_interpolation_source, bitcast<vec2<u32>>(_e406), 0u);
                    phi_450_ = (_e398 + (_e429.xyz * _e427));
                    phi_453_ = (_e400 + _e427);
                }
                let _e435 = phi_450_;
                let _e437 = phi_453_;
                local_55 = _e435;
                local_56 = _e437;
                continue;
            } else {
                break;
            }
            continuing {
                let _e838 = local_55;
                phi_449_ = _e838;
                let _e841 = local_56;
                phi_452_ = _e841;
                phi_454_ = (_e402 + 1i);
            }
        }
        let _e440 = local_23;
        if (_e440 != 0f) {
            let _e443 = local_24;
            let _e445 = local_25;
            let _e447 = local_26;
            let _e450 = local_27;
            phi_501_ = (_e450 / vec3<f32>(_e443, _e445, _e447));
        } else {
            phi_501_ = vec3<f32>(0f, 0f, 0f);
        }
        let _e453 = phi_501_;
        let _e458 = (((_e105 + (-(_e241) * _e114)) * _e104) - vec2<f32>(0.5f, 0.5f));
        let _e459 = floor(_e458);
        let _e461 = (_e458 - _e459);
        let _e463 = (1f - _e461.x);
        let _e465 = (1f - _e461.y);
        local_7 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
        local_6 = array<f32, 4>((_e463 * _e465), (_e461.x * _e465), (_e463 * _e461.y), (_e461.x * _e461.y));
        phi_520_ = vec3<f32>(0f, 0f, 0f);
        phi_523_ = 0f;
        phi_525_ = 0i;
        loop {
            let _e472 = phi_520_;
            let _e474 = phi_523_;
            let _e476 = phi_525_;
            local_28 = _e474;
            local_29 = _e474;
            local_30 = _e474;
            local_31 = _e474;
            local_32 = _e472;
            local_44 = _e474;
            local_45 = _e474;
            if (_e476 < 4i) {
                let _e479 = local_7[_e476];
                let _e480 = (vec2<i32>(_e459) + _e479);
                phi_540_ = false;
                if (_e480.x >= _e64.x) {
                    phi_540_ = (_e480.x < (_e66.x + _e64.x));
                }
                let _e487 = phi_540_;
                phi_546_ = false;
                if _e487 {
                    phi_546_ = (_e480.y >= _e64.y);
                }
                let _e492 = phi_546_;
                phi_554_ = false;
                if _e492 {
                    phi_554_ = (_e480.y < (_e66.y + _e64.y));
                }
                let _e499 = phi_554_;
                phi_521_ = _e472;
                phi_524_ = _e474;
                if _e499 {
                    let _e501 = local_6[_e476];
                    let _e503 = textureLoad(r_current_interpolation_source, bitcast<vec2<u32>>(_e480), 0u);
                    phi_521_ = (_e472 + (_e503.xyz * _e501));
                    phi_524_ = (_e474 + _e501);
                }
                let _e509 = phi_521_;
                let _e511 = phi_524_;
                local_57 = _e509;
                local_58 = _e511;
                continue;
            } else {
                break;
            }
            continuing {
                let _e856 = local_57;
                phi_520_ = _e856;
                let _e859 = local_58;
                phi_523_ = _e859;
                phi_525_ = (_e476 + 1i);
            }
        }
        let _e514 = local_28;
        if (_e514 != 0f) {
            let _e517 = local_29;
            let _e519 = local_30;
            let _e521 = local_31;
            let _e524 = local_32;
            phi_572_ = (_e524 / vec3<f32>(_e517, _e519, _e521));
        } else {
            phi_572_ = vec3<f32>(0f, 0f, 0f);
        }
        let _e527 = phi_572_;
        let _e531 = (((_e105 + (_e375 * _e114)) * _e104) - vec2<f32>(0.5f, 0.5f));
        let _e532 = floor(_e531);
        let _e534 = (_e531 - _e532);
        let _e536 = (1f - _e534.x);
        let _e538 = (1f - _e534.y);
        local_9 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
        local_8 = array<f32, 4>((_e536 * _e538), (_e534.x * _e538), (_e536 * _e534.y), (_e534.x * _e534.y));
        phi_590_ = vec3<f32>(0f, 0f, 0f);
        phi_593_ = 0f;
        phi_595_ = 0i;
        loop {
            let _e545 = phi_590_;
            let _e547 = phi_593_;
            let _e549 = phi_595_;
            local_33 = _e547;
            local_34 = _e547;
            local_35 = _e547;
            local_36 = _e547;
            local_37 = _e545;
            local_46 = _e547;
            if (_e549 < 4i) {
                let _e552 = local_9[_e549];
                let _e553 = (vec2<i32>(_e532) + _e552);
                phi_610_ = false;
                if (_e553.x >= _e64.x) {
                    phi_610_ = (_e553.x < (_e66.x + _e64.x));
                }
                let _e560 = phi_610_;
                phi_616_ = false;
                if _e560 {
                    phi_616_ = (_e553.y >= _e64.y);
                }
                let _e565 = phi_616_;
                phi_624_ = false;
                if _e565 {
                    phi_624_ = (_e553.y < (_e66.y + _e64.y));
                }
                let _e572 = phi_624_;
                phi_591_ = _e545;
                phi_594_ = _e547;
                if _e572 {
                    let _e574 = local_8[_e549];
                    let _e576 = textureLoad(r_previous_interpolation_source, bitcast<vec2<u32>>(_e553), 0u);
                    phi_591_ = (_e545 + (_e576.xyz * _e574));
                    phi_594_ = (_e547 + _e574);
                }
                let _e582 = phi_591_;
                let _e584 = phi_594_;
                local_59 = _e582;
                local_60 = _e584;
                continue;
            } else {
                break;
            }
            continuing {
                let _e874 = local_59;
                phi_590_ = _e874;
                let _e877 = local_60;
                phi_593_ = _e877;
                phi_595_ = (_e549 + 1i);
            }
        }
        let _e587 = local_33;
        if (_e587 != 0f) {
            let _e590 = local_34;
            let _e592 = local_35;
            let _e594 = local_36;
            let _e597 = local_37;
            phi_642_ = (_e597 / vec3<f32>(_e590, _e592, _e594));
        } else {
            phi_642_ = vec3<f32>(0f, 0f, 0f);
        }
        let _e600 = phi_642_;
        let _e605 = (((_e105 + (-(_e375) * _e114)) * _e104) - vec2<f32>(0.5f, 0.5f));
        let _e606 = floor(_e605);
        let _e608 = (_e605 - _e606);
        let _e610 = (1f - _e608.x);
        let _e612 = (1f - _e608.y);
        local_11 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
        local_10 = array<f32, 4>((_e610 * _e612), (_e608.x * _e612), (_e610 * _e608.y), (_e608.x * _e608.y));
        phi_661_ = vec3<f32>(0f, 0f, 0f);
        phi_664_ = 0f;
        phi_666_ = 0i;
        loop {
            let _e619 = phi_661_;
            let _e621 = phi_664_;
            let _e623 = phi_666_;
            local_38 = _e621;
            local_39 = _e621;
            local_40 = _e621;
            local_41 = _e621;
            local_42 = _e619;
            local_47 = _e621;
            if (_e623 < 4i) {
                let _e626 = local_11[_e623];
                let _e627 = (vec2<i32>(_e606) + _e626);
                phi_681_ = false;
                if (_e627.x >= _e64.x) {
                    phi_681_ = (_e627.x < (_e66.x + _e64.x));
                }
                let _e634 = phi_681_;
                phi_687_ = false;
                if _e634 {
                    phi_687_ = (_e627.y >= _e64.y);
                }
                let _e639 = phi_687_;
                phi_695_ = false;
                if _e639 {
                    phi_695_ = (_e627.y < (_e66.y + _e64.y));
                }
                let _e646 = phi_695_;
                phi_662_ = _e619;
                phi_665_ = _e621;
                if _e646 {
                    let _e648 = local_10[_e623];
                    let _e650 = textureLoad(r_current_interpolation_source, bitcast<vec2<u32>>(_e627), 0u);
                    phi_662_ = (_e619 + (_e650.xyz * _e648));
                    phi_665_ = (_e621 + _e648);
                }
                let _e656 = phi_662_;
                let _e658 = phi_665_;
                local_61 = _e656;
                local_62 = _e658;
                continue;
            } else {
                break;
            }
            continuing {
                let _e892 = local_61;
                phi_661_ = _e892;
                let _e895 = local_62;
                phi_664_ = _e895;
                phi_666_ = (_e623 + 1i);
            }
        }
        let _e661 = local_38;
        if (_e661 != 0f) {
            let _e664 = local_39;
            let _e666 = local_40;
            let _e668 = local_41;
            let _e671 = local_42;
            phi_713_ = (_e671 / vec3<f32>(_e664, _e666, _e668));
        } else {
            phi_713_ = vec3<f32>(0f, 0f, 0f);
        }
        let _e674 = phi_713_;
        let _e677 = (_e380.x * select(0f, 1f, _e267));
        let _e680 = (_e380.y * select(0f, 1f, _e254));
        let _e700 = local_43;
        let _e701 = (_e700 == 0f);
        if _e701 {
            phi_745_ = _e527;
        } else {
            let _e703 = local_44;
            phi_745_ = select(mix(_e453, _e527, vec3(clamp(((0.5f + (0.5f * (1f - _e677))) - (0.5f * (1f - _e680))), 0f, 1f))), _e453, vec3((_e703 == 0f)));
        }
        let _e708 = phi_745_;
        phi_749_ = false;
        if _e701 {
            let _e710 = local_45;
            phi_749_ = (_e710 == 0f);
        }
        let _e713 = phi_749_;
        let _e716 = local_46;
        let _e717 = (_e716 > 0f);
        phi_755_ = false;
        if _e717 {
            let _e719 = local_47;
            phi_755_ = (_e719 > 0f);
        }
        let _e722 = phi_755_;
        if _e722 {
            phi_760_ = 0.5f;
        } else {
            phi_760_ = select(1f, 0f, _e717);
        }
        let _e725 = phi_760_;
        let _e730 = max(length(_e600), length(_e674));
        if (_e730 > 0f) {
            let _e732 = vec3(_e730);
            phi_774_ = dot((_e600 / _e732), (_e674 / _e732));
        } else {
            phi_774_ = 1f;
        }
        let _e737 = phi_774_;
        let _e740 = max(length(_e453), length(_e527));
        if (_e740 > 0f) {
            let _e742 = vec3(_e740);
            phi_786_ = dot((_e453 / _e742), (_e527 / _e742));
        } else {
            phi_786_ = 1f;
        }
        let _e747 = phi_786_;
        let _e757 = r_counters.member[1u];
        phi_806_ = select(clamp(max(0f, select(0f, 1f, (length(vec2<f32>(_e677, _e680)) <= 0.001f))), 0f, 1f), 1f, _e713);
        phi_807_ = mix(mix(_e600, _e674, vec3(_e725)), _e708, vec3(clamp(mix(pow(clamp((mix(max(0.001f, _e747), 1f, clamp(clamp((1f - min(_e677, _e680)), 0f, 1f), 0f, 1f)) / max(0.001f, _e737)), 0f, 1f), 1f), 1f, select(0f, 1f, (_e757 < 10u))), 0f, 1f)));
    }
    let _e768 = phi_806_;
    let _e770 = phi_807_;
    let _e775 = bitcast<vec2<u32>>(_e62);
    textureStore(rw_output, _e775, vec4<f32>(_e770.x, _e770.y, _e770.z, 1f));
    textureStore(rw_inpainting_mask, _e775, vec4(_e768));
    return;
}

@compute @workgroup_size(8, 8, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>) {
    global = vec3<i32>(param);
    CS_1();
}
