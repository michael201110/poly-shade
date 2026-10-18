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

struct type_u002e_cbInpaintingPyramid {
    mips: u32,
    numWorkGroups: u32,
    workGroupOffset: vec2<u32>,
}

struct type_u002e_StructuredBuffer_u002e_uint {
    member: array<u32>,
}

@group(0) @binding(0) 
var<uniform> cbFI: type_u002e_cbFI;
@group(0) @binding(1) 
var<uniform> cbInpaintingPyramid: type_u002e_cbInpaintingPyramid;
@group(0) @binding(8) 
var<storage> r_game_motion_vector_field_x: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(9) 
var<storage> r_game_motion_vector_field_y: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(33) 
var rw_inpainting_pyramid0_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(34) 
var rw_inpainting_pyramid1_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(35) 
var rw_inpainting_pyramid2_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(36) 
var rw_inpainting_pyramid3_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(37) 
var rw_inpainting_pyramid4_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(38) 
var rw_inpainting_pyramid5_: texture_storage_2d<rgba16float,write>;
var<workgroup> spdIntermediateR: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateG: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateB: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateA: array<array<f32, 16>, 16>;
var<private> global: vec3<u32>;
var<private> global_1: u32;

fn CS_1() {
    var local: array<vec4<f32>, 4>;
    var phi_154_: bool;
    var phi_167_: u32;
    var local_1: bool;
    var phi_176_: bool;
    var phi_189_: u32;
    var phi_203_: bool;
    var phi_207_: f32;
    var phi_232_: bool;
    var phi_245_: u32;
    var local_2: bool;
    var phi_254_: bool;
    var phi_267_: u32;
    var phi_281_: bool;
    var phi_285_: f32;
    var phi_305_: bool;
    var phi_318_: u32;
    var local_3: bool;
    var phi_327_: bool;
    var phi_340_: u32;
    var phi_354_: bool;
    var phi_358_: f32;
    var phi_378_: bool;
    var phi_391_: u32;
    var local_4: bool;
    var phi_400_: bool;
    var phi_413_: u32;
    var phi_427_: bool;
    var phi_431_: f32;
    var phi_492_: bool;
    var phi_505_: u32;
    var local_5: bool;
    var phi_514_: bool;
    var phi_527_: u32;
    var phi_541_: bool;
    var phi_545_: f32;
    var phi_565_: bool;
    var phi_578_: u32;
    var local_6: bool;
    var phi_587_: bool;
    var phi_600_: u32;
    var phi_614_: bool;
    var phi_618_: f32;
    var phi_638_: bool;
    var phi_651_: u32;
    var local_7: bool;
    var phi_660_: bool;
    var phi_673_: u32;
    var phi_687_: bool;
    var phi_691_: f32;
    var phi_711_: bool;
    var phi_724_: u32;
    var local_8: bool;
    var phi_733_: bool;
    var phi_746_: u32;
    var phi_760_: bool;
    var phi_764_: f32;
    var phi_825_: bool;
    var phi_838_: u32;
    var local_9: bool;
    var phi_847_: bool;
    var phi_860_: u32;
    var phi_874_: bool;
    var phi_878_: f32;
    var phi_898_: bool;
    var phi_911_: u32;
    var local_10: bool;
    var phi_920_: bool;
    var phi_933_: u32;
    var phi_947_: bool;
    var phi_951_: f32;
    var phi_971_: bool;
    var phi_984_: u32;
    var local_11: bool;
    var phi_993_: bool;
    var phi_1006_: u32;
    var phi_1020_: bool;
    var phi_1024_: f32;
    var phi_1044_: bool;
    var phi_1057_: u32;
    var local_12: bool;
    var phi_1066_: bool;
    var phi_1079_: u32;
    var phi_1093_: bool;
    var phi_1097_: f32;
    var phi_1154_: bool;
    var phi_1167_: u32;
    var local_13: bool;
    var phi_1176_: bool;
    var phi_1189_: u32;
    var phi_1203_: bool;
    var phi_1207_: f32;
    var phi_1227_: bool;
    var phi_1240_: u32;
    var local_14: bool;
    var phi_1249_: bool;
    var phi_1262_: u32;
    var phi_1276_: bool;
    var phi_1280_: f32;
    var phi_1300_: bool;
    var phi_1313_: u32;
    var local_15: bool;
    var phi_1322_: bool;
    var phi_1335_: u32;
    var phi_1349_: bool;
    var phi_1353_: f32;
    var phi_1373_: bool;
    var phi_1386_: u32;
    var local_16: bool;
    var phi_1395_: bool;
    var phi_1408_: u32;
    var phi_1422_: bool;
    var phi_1426_: f32;
    var phi_1469_: u32;
    var local_17: u32;
    var local_18: u32;
    var local_19: u32;
    var local_20: u32;
    var local_21: u32;
    var local_22: u32;
    var local_23: u32;
    var local_24: u32;
    var local_25: u32;
    var local_26: u32;
    var local_27: u32;
    var local_28: u32;
    var local_29: u32;
    var local_30: u32;
    var local_31: u32;
    var local_32: u32;
    var local_33: u32;
    var local_34: u32;
    var local_35: vec2<i32>;
    var local_36: u32;
    var local_37: u32;
    var local_38: u32;
    var local_39: u32;
    var local_40: u32;
    var local_41: vec2<i32>;
    var local_42: u32;
    var local_43: u32;
    var local_44: u32;
    var local_45: u32;
    var local_46: vec2<i32>;
    var local_47: u32;

    let _e56 = global;
    let _e57 = global_1;
    let _e62 = cbInpaintingPyramid.mips;
    let _e64 = cbInpaintingPyramid.workGroupOffset;
    let _e65 = (bitcast<vec2<u32>>(bitcast<vec3<i32>>(_e56).xy) + _e64);
    switch bitcast<i32>(0u) {
        default: {
            let _e67 = (_e57 % 64u);
            let _e84 = (((_e67 & 1u) | ((_e67 >> bitcast<u32>(2u)) & 6u)) + (8u * ((_e57 >> bitcast<u32>(6u)) % 2u)));
            let _e88 = ((((_e67 >> bitcast<u32>(1u)) & 3u) | ((_e67 >> bitcast<u32>(3u)) & 4u)) + (8u * (_e57 >> bitcast<u32>(7u))));
            switch bitcast<i32>(0u) {
                default: {
                    let _e91 = bitcast<vec2<i32>>((_e65 * vec2<u32>(64u, 64u)));
                    let _e92 = (_e84 * 2u);
                    let _e93 = bitcast<i32>(_e92);
                    let _e94 = (_e88 * 2u);
                    let _e95 = bitcast<i32>(_e94);
                    let _e97 = (_e91 + vec2<i32>(_e93, _e95));
                    let _e99 = bitcast<vec2<i32>>((_e65 * vec2<u32>(32u, 32u)));
                    let _e100 = bitcast<i32>(_e84);
                    let _e101 = bitcast<i32>(_e88);
                    let _e102 = vec2<i32>(_e100, _e101);
                    let _e104 = bitcast<vec2<u32>>(_e97);
                    local_17 = _e92;
                    local_18 = _e94;
                    local_19 = _e92;
                    local_20 = _e94;
                    local_21 = _e92;
                    local_22 = _e94;
                    local_23 = _e92;
                    local_24 = _e94;
                    local_25 = _e92;
                    local_26 = _e94;
                    local_27 = _e94;
                    local_28 = _e94;
                    local_29 = _e94;
                    local_30 = _e94;
                    local_31 = _e92;
                    local_32 = _e92;
                    local_33 = _e92;
                    local_34 = _e92;
                    local_35 = _e102;
                    local_36 = _e92;
                    local_37 = _e94;
                    local_38 = _e94;
                    local_39 = _e94;
                    local_40 = _e94;
                    local_41 = _e102;
                    local_42 = _e94;
                    local_43 = _e94;
                    local_44 = _e94;
                    local_45 = _e94;
                    local_46 = _e102;
                    local_47 = _e94;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e110 = all((_e97 >= vec2<i32>(0i, 0i)));
                            phi_154_ = false;
                            local_1 = _e110;
                            if _e110 {
                                let _e112 = cbFI.maxRenderSize;
                                phi_154_ = all((_e97 < _e112));
                            }
                            let _e116 = phi_154_;
                            if _e116 {
                                let _e119 = cbFI.maxRenderSize;
                                let _e127 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e97.y * _e119.x) + _e97.x))];
                                phi_167_ = _e127;
                                break;
                            }
                            phi_167_ = 0u;
                            break;
                        }
                    }
                    let _e129 = phi_167_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e132 = local_1;
                            phi_176_ = false;
                            if _e132 {
                                let _e134 = cbFI.maxRenderSize;
                                phi_176_ = all((_e97 < _e134));
                            }
                            let _e138 = phi_176_;
                            if _e138 {
                                let _e141 = cbFI.maxRenderSize;
                                let _e149 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e97.y * _e141.x) + _e97.x))];
                                phi_189_ = _e149;
                                break;
                            }
                            phi_189_ = 0u;
                            break;
                        }
                    }
                    let _e151 = phi_189_;
                    let _e156 = (f32(((_e129 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f);
                    phi_203_ = false;
                    if (_e156 > 0f) {
                        phi_203_ = ((_e129 & 2147483648u) == 0u);
                    }
                    let _e166 = phi_203_;
                    phi_207_ = _e156;
                    if _e166 {
                        phi_207_ = (1f - _e156);
                    }
                    let _e169 = phi_207_;
                    let _e178 = cbFI.displaySize;
                    let _e181 = select(0f, 1f, (_e178.x > 0i));
                    let _e182 = (vec4<f32>(unpack2x16float((_e129 & 65535u)).x, unpack2x16float((_e151 & 65535u)).x, _e169, (f32(((_e129 >> bitcast<u32>(16u)) & 31u)) * 0.032258064f)) * _e181);
                    let _e183 = bitcast<vec2<i32>>((_e104 + vec2<u32>(0u, 1u)));
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e186 = all((_e183 >= vec2<i32>(0i, 0i)));
                            phi_232_ = false;
                            local_2 = _e186;
                            if _e186 {
                                let _e188 = cbFI.maxRenderSize;
                                phi_232_ = all((_e183 < _e188));
                            }
                            let _e192 = phi_232_;
                            if _e192 {
                                let _e195 = cbFI.maxRenderSize;
                                let _e203 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e183.y * _e195.x) + _e183.x))];
                                phi_245_ = _e203;
                                break;
                            }
                            phi_245_ = 0u;
                            break;
                        }
                    }
                    let _e205 = phi_245_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e208 = local_2;
                            phi_254_ = false;
                            if _e208 {
                                let _e210 = cbFI.maxRenderSize;
                                phi_254_ = all((_e183 < _e210));
                            }
                            let _e214 = phi_254_;
                            if _e214 {
                                let _e217 = cbFI.maxRenderSize;
                                let _e225 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e183.y * _e217.x) + _e183.x))];
                                phi_267_ = _e225;
                                break;
                            }
                            phi_267_ = 0u;
                            break;
                        }
                    }
                    let _e227 = phi_267_;
                    let _e232 = (f32(((_e205 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f);
                    phi_281_ = false;
                    if (_e232 > 0f) {
                        phi_281_ = ((_e205 & 2147483648u) == 0u);
                    }
                    let _e242 = phi_281_;
                    phi_285_ = _e232;
                    if _e242 {
                        phi_285_ = (1f - _e232);
                    }
                    let _e245 = phi_285_;
                    let _e253 = (vec4<f32>(unpack2x16float((_e205 & 65535u)).x, unpack2x16float((_e227 & 65535u)).x, _e245, (f32(((_e205 >> bitcast<u32>(16u)) & 31u)) * 0.032258064f)) * _e181);
                    let _e254 = bitcast<vec2<i32>>((_e104 + vec2<u32>(1u, 0u)));
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e257 = all((_e254 >= vec2<i32>(0i, 0i)));
                            phi_305_ = false;
                            local_3 = _e257;
                            if _e257 {
                                let _e259 = cbFI.maxRenderSize;
                                phi_305_ = all((_e254 < _e259));
                            }
                            let _e263 = phi_305_;
                            if _e263 {
                                let _e266 = cbFI.maxRenderSize;
                                let _e274 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e254.y * _e266.x) + _e254.x))];
                                phi_318_ = _e274;
                                break;
                            }
                            phi_318_ = 0u;
                            break;
                        }
                    }
                    let _e276 = phi_318_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e279 = local_3;
                            phi_327_ = false;
                            if _e279 {
                                let _e281 = cbFI.maxRenderSize;
                                phi_327_ = all((_e254 < _e281));
                            }
                            let _e285 = phi_327_;
                            if _e285 {
                                let _e288 = cbFI.maxRenderSize;
                                let _e296 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e254.y * _e288.x) + _e254.x))];
                                phi_340_ = _e296;
                                break;
                            }
                            phi_340_ = 0u;
                            break;
                        }
                    }
                    let _e298 = phi_340_;
                    let _e303 = (f32(((_e276 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f);
                    phi_354_ = false;
                    if (_e303 > 0f) {
                        phi_354_ = ((_e276 & 2147483648u) == 0u);
                    }
                    let _e313 = phi_354_;
                    phi_358_ = _e303;
                    if _e313 {
                        phi_358_ = (1f - _e303);
                    }
                    let _e316 = phi_358_;
                    let _e324 = (vec4<f32>(unpack2x16float((_e276 & 65535u)).x, unpack2x16float((_e298 & 65535u)).x, _e316, (f32(((_e276 >> bitcast<u32>(16u)) & 31u)) * 0.032258064f)) * _e181);
                    let _e325 = bitcast<vec2<i32>>((_e104 + vec2<u32>(1u, 1u)));
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e328 = all((_e325 >= vec2<i32>(0i, 0i)));
                            phi_378_ = false;
                            local_4 = _e328;
                            if _e328 {
                                let _e330 = cbFI.maxRenderSize;
                                phi_378_ = all((_e325 < _e330));
                            }
                            let _e334 = phi_378_;
                            if _e334 {
                                let _e337 = cbFI.maxRenderSize;
                                let _e345 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e325.y * _e337.x) + _e325.x))];
                                phi_391_ = _e345;
                                break;
                            }
                            phi_391_ = 0u;
                            break;
                        }
                    }
                    let _e347 = phi_391_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e350 = local_4;
                            phi_400_ = false;
                            if _e350 {
                                let _e352 = cbFI.maxRenderSize;
                                phi_400_ = all((_e325 < _e352));
                            }
                            let _e356 = phi_400_;
                            if _e356 {
                                let _e359 = cbFI.maxRenderSize;
                                let _e367 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e325.y * _e359.x) + _e325.x))];
                                phi_413_ = _e367;
                                break;
                            }
                            phi_413_ = 0u;
                            break;
                        }
                    }
                    let _e369 = phi_413_;
                    let _e374 = (f32(((_e347 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f);
                    phi_427_ = false;
                    if (_e374 > 0f) {
                        phi_427_ = ((_e347 & 2147483648u) == 0u);
                    }
                    let _e384 = phi_427_;
                    phi_431_ = _e374;
                    if _e384 {
                        phi_431_ = (1f - _e374);
                    }
                    let _e387 = phi_431_;
                    let _e395 = (vec4<f32>(unpack2x16float((_e347 & 65535u)).x, unpack2x16float((_e369 & 65535u)).x, _e387, (f32(((_e347 >> bitcast<u32>(16u)) & 31u)) * 0.032258064f)) * _e181);
                    let _e398 = select(0f, 1f, (_e182.z > 0f));
                    let _e402 = select(0f, 1f, (_e253.z > 0f));
                    let _e408 = select(0f, 1f, (_e324.z > 0f));
                    let _e414 = select(0f, 1f, (_e395.z > 0f));
                    let _e417 = (((_e398 + _e402) + _e408) + _e414);
                    local[0i] = (((((_e182 * _e398) + (_e253 * _e402)) + (_e324 * _e408)) + (_e395 * _e414)) / vec4(select(1f, _e417, (_e417 > 0.001f))));
                    let _e423 = local[0i];
                    textureStore(rw_inpainting_pyramid0_, bitcast<vec2<u32>>((_e99 + _e102)), _e423);
                    let _e426 = bitcast<i32>((_e92 + 32u));
                    let _e428 = (_e91 + vec2<i32>(_e426, _e95));
                    let _e430 = bitcast<i32>((_e84 + 16u));
                    let _e433 = bitcast<vec2<u32>>(_e428);
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e439 = all((_e428 >= vec2<i32>(0i, 0i)));
                            phi_492_ = false;
                            local_5 = _e439;
                            if _e439 {
                                let _e441 = cbFI.maxRenderSize;
                                phi_492_ = all((_e428 < _e441));
                            }
                            let _e445 = phi_492_;
                            if _e445 {
                                let _e448 = cbFI.maxRenderSize;
                                let _e456 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e428.y * _e448.x) + _e428.x))];
                                phi_505_ = _e456;
                                break;
                            }
                            phi_505_ = 0u;
                            break;
                        }
                    }
                    let _e458 = phi_505_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e461 = local_5;
                            phi_514_ = false;
                            if _e461 {
                                let _e463 = cbFI.maxRenderSize;
                                phi_514_ = all((_e428 < _e463));
                            }
                            let _e467 = phi_514_;
                            if _e467 {
                                let _e470 = cbFI.maxRenderSize;
                                let _e478 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e428.y * _e470.x) + _e428.x))];
                                phi_527_ = _e478;
                                break;
                            }
                            phi_527_ = 0u;
                            break;
                        }
                    }
                    let _e480 = phi_527_;
                    let _e485 = (f32(((_e458 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f);
                    phi_541_ = false;
                    if (_e485 > 0f) {
                        phi_541_ = ((_e458 & 2147483648u) == 0u);
                    }
                    let _e495 = phi_541_;
                    phi_545_ = _e485;
                    if _e495 {
                        phi_545_ = (1f - _e485);
                    }
                    let _e498 = phi_545_;
                    let _e506 = (vec4<f32>(unpack2x16float((_e458 & 65535u)).x, unpack2x16float((_e480 & 65535u)).x, _e498, (f32(((_e458 >> bitcast<u32>(16u)) & 31u)) * 0.032258064f)) * _e181);
                    let _e507 = bitcast<vec2<i32>>((_e433 + vec2<u32>(0u, 1u)));
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e510 = all((_e507 >= vec2<i32>(0i, 0i)));
                            phi_565_ = false;
                            local_6 = _e510;
                            if _e510 {
                                let _e512 = cbFI.maxRenderSize;
                                phi_565_ = all((_e507 < _e512));
                            }
                            let _e516 = phi_565_;
                            if _e516 {
                                let _e519 = cbFI.maxRenderSize;
                                let _e527 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e507.y * _e519.x) + _e507.x))];
                                phi_578_ = _e527;
                                break;
                            }
                            phi_578_ = 0u;
                            break;
                        }
                    }
                    let _e529 = phi_578_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e532 = local_6;
                            phi_587_ = false;
                            if _e532 {
                                let _e534 = cbFI.maxRenderSize;
                                phi_587_ = all((_e507 < _e534));
                            }
                            let _e538 = phi_587_;
                            if _e538 {
                                let _e541 = cbFI.maxRenderSize;
                                let _e549 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e507.y * _e541.x) + _e507.x))];
                                phi_600_ = _e549;
                                break;
                            }
                            phi_600_ = 0u;
                            break;
                        }
                    }
                    let _e551 = phi_600_;
                    let _e556 = (f32(((_e529 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f);
                    phi_614_ = false;
                    if (_e556 > 0f) {
                        phi_614_ = ((_e529 & 2147483648u) == 0u);
                    }
                    let _e566 = phi_614_;
                    phi_618_ = _e556;
                    if _e566 {
                        phi_618_ = (1f - _e556);
                    }
                    let _e569 = phi_618_;
                    let _e577 = (vec4<f32>(unpack2x16float((_e529 & 65535u)).x, unpack2x16float((_e551 & 65535u)).x, _e569, (f32(((_e529 >> bitcast<u32>(16u)) & 31u)) * 0.032258064f)) * _e181);
                    let _e578 = bitcast<vec2<i32>>((_e433 + vec2<u32>(1u, 0u)));
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e581 = all((_e578 >= vec2<i32>(0i, 0i)));
                            phi_638_ = false;
                            local_7 = _e581;
                            if _e581 {
                                let _e583 = cbFI.maxRenderSize;
                                phi_638_ = all((_e578 < _e583));
                            }
                            let _e587 = phi_638_;
                            if _e587 {
                                let _e590 = cbFI.maxRenderSize;
                                let _e598 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e578.y * _e590.x) + _e578.x))];
                                phi_651_ = _e598;
                                break;
                            }
                            phi_651_ = 0u;
                            break;
                        }
                    }
                    let _e600 = phi_651_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e603 = local_7;
                            phi_660_ = false;
                            if _e603 {
                                let _e605 = cbFI.maxRenderSize;
                                phi_660_ = all((_e578 < _e605));
                            }
                            let _e609 = phi_660_;
                            if _e609 {
                                let _e612 = cbFI.maxRenderSize;
                                let _e620 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e578.y * _e612.x) + _e578.x))];
                                phi_673_ = _e620;
                                break;
                            }
                            phi_673_ = 0u;
                            break;
                        }
                    }
                    let _e622 = phi_673_;
                    let _e627 = (f32(((_e600 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f);
                    phi_687_ = false;
                    if (_e627 > 0f) {
                        phi_687_ = ((_e600 & 2147483648u) == 0u);
                    }
                    let _e637 = phi_687_;
                    phi_691_ = _e627;
                    if _e637 {
                        phi_691_ = (1f - _e627);
                    }
                    let _e640 = phi_691_;
                    let _e648 = (vec4<f32>(unpack2x16float((_e600 & 65535u)).x, unpack2x16float((_e622 & 65535u)).x, _e640, (f32(((_e600 >> bitcast<u32>(16u)) & 31u)) * 0.032258064f)) * _e181);
                    let _e649 = bitcast<vec2<i32>>((_e433 + vec2<u32>(1u, 1u)));
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e652 = all((_e649 >= vec2<i32>(0i, 0i)));
                            phi_711_ = false;
                            local_8 = _e652;
                            if _e652 {
                                let _e654 = cbFI.maxRenderSize;
                                phi_711_ = all((_e649 < _e654));
                            }
                            let _e658 = phi_711_;
                            if _e658 {
                                let _e661 = cbFI.maxRenderSize;
                                let _e669 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e649.y * _e661.x) + _e649.x))];
                                phi_724_ = _e669;
                                break;
                            }
                            phi_724_ = 0u;
                            break;
                        }
                    }
                    let _e671 = phi_724_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e674 = local_8;
                            phi_733_ = false;
                            if _e674 {
                                let _e676 = cbFI.maxRenderSize;
                                phi_733_ = all((_e649 < _e676));
                            }
                            let _e680 = phi_733_;
                            if _e680 {
                                let _e683 = cbFI.maxRenderSize;
                                let _e691 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e649.y * _e683.x) + _e649.x))];
                                phi_746_ = _e691;
                                break;
                            }
                            phi_746_ = 0u;
                            break;
                        }
                    }
                    let _e693 = phi_746_;
                    let _e698 = (f32(((_e671 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f);
                    phi_760_ = false;
                    if (_e698 > 0f) {
                        phi_760_ = ((_e671 & 2147483648u) == 0u);
                    }
                    let _e708 = phi_760_;
                    phi_764_ = _e698;
                    if _e708 {
                        phi_764_ = (1f - _e698);
                    }
                    let _e711 = phi_764_;
                    let _e719 = (vec4<f32>(unpack2x16float((_e671 & 65535u)).x, unpack2x16float((_e693 & 65535u)).x, _e711, (f32(((_e671 >> bitcast<u32>(16u)) & 31u)) * 0.032258064f)) * _e181);
                    let _e722 = select(0f, 1f, (_e506.z > 0f));
                    let _e726 = select(0f, 1f, (_e577.z > 0f));
                    let _e732 = select(0f, 1f, (_e648.z > 0f));
                    let _e738 = select(0f, 1f, (_e719.z > 0f));
                    let _e741 = (((_e722 + _e726) + _e732) + _e738);
                    local[1i] = (((((_e506 * _e722) + (_e577 * _e726)) + (_e648 * _e732)) + (_e719 * _e738)) / vec4(select(1f, _e741, (_e741 > 0.001f))));
                    let _e747 = local[1i];
                    textureStore(rw_inpainting_pyramid0_, bitcast<vec2<u32>>((_e99 + vec2<i32>(_e430, _e101))), _e747);
                    let _e750 = bitcast<i32>((_e94 + 32u));
                    let _e752 = (_e91 + vec2<i32>(_e93, _e750));
                    let _e754 = bitcast<i32>((_e88 + 16u));
                    let _e757 = bitcast<vec2<u32>>(_e752);
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e763 = all((_e752 >= vec2<i32>(0i, 0i)));
                            phi_825_ = false;
                            local_9 = _e763;
                            if _e763 {
                                let _e765 = cbFI.maxRenderSize;
                                phi_825_ = all((_e752 < _e765));
                            }
                            let _e769 = phi_825_;
                            if _e769 {
                                let _e772 = cbFI.maxRenderSize;
                                let _e780 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e752.y * _e772.x) + _e752.x))];
                                phi_838_ = _e780;
                                break;
                            }
                            phi_838_ = 0u;
                            break;
                        }
                    }
                    let _e782 = phi_838_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e785 = local_9;
                            phi_847_ = false;
                            if _e785 {
                                let _e787 = cbFI.maxRenderSize;
                                phi_847_ = all((_e752 < _e787));
                            }
                            let _e791 = phi_847_;
                            if _e791 {
                                let _e794 = cbFI.maxRenderSize;
                                let _e802 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e752.y * _e794.x) + _e752.x))];
                                phi_860_ = _e802;
                                break;
                            }
                            phi_860_ = 0u;
                            break;
                        }
                    }
                    let _e804 = phi_860_;
                    let _e809 = (f32(((_e782 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f);
                    phi_874_ = false;
                    if (_e809 > 0f) {
                        phi_874_ = ((_e782 & 2147483648u) == 0u);
                    }
                    let _e819 = phi_874_;
                    phi_878_ = _e809;
                    if _e819 {
                        phi_878_ = (1f - _e809);
                    }
                    let _e822 = phi_878_;
                    let _e830 = (vec4<f32>(unpack2x16float((_e782 & 65535u)).x, unpack2x16float((_e804 & 65535u)).x, _e822, (f32(((_e782 >> bitcast<u32>(16u)) & 31u)) * 0.032258064f)) * _e181);
                    let _e831 = bitcast<vec2<i32>>((_e757 + vec2<u32>(0u, 1u)));
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e834 = all((_e831 >= vec2<i32>(0i, 0i)));
                            phi_898_ = false;
                            local_10 = _e834;
                            if _e834 {
                                let _e836 = cbFI.maxRenderSize;
                                phi_898_ = all((_e831 < _e836));
                            }
                            let _e840 = phi_898_;
                            if _e840 {
                                let _e843 = cbFI.maxRenderSize;
                                let _e851 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e831.y * _e843.x) + _e831.x))];
                                phi_911_ = _e851;
                                break;
                            }
                            phi_911_ = 0u;
                            break;
                        }
                    }
                    let _e853 = phi_911_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e856 = local_10;
                            phi_920_ = false;
                            if _e856 {
                                let _e858 = cbFI.maxRenderSize;
                                phi_920_ = all((_e831 < _e858));
                            }
                            let _e862 = phi_920_;
                            if _e862 {
                                let _e865 = cbFI.maxRenderSize;
                                let _e873 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e831.y * _e865.x) + _e831.x))];
                                phi_933_ = _e873;
                                break;
                            }
                            phi_933_ = 0u;
                            break;
                        }
                    }
                    let _e875 = phi_933_;
                    let _e880 = (f32(((_e853 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f);
                    phi_947_ = false;
                    if (_e880 > 0f) {
                        phi_947_ = ((_e853 & 2147483648u) == 0u);
                    }
                    let _e890 = phi_947_;
                    phi_951_ = _e880;
                    if _e890 {
                        phi_951_ = (1f - _e880);
                    }
                    let _e893 = phi_951_;
                    let _e901 = (vec4<f32>(unpack2x16float((_e853 & 65535u)).x, unpack2x16float((_e875 & 65535u)).x, _e893, (f32(((_e853 >> bitcast<u32>(16u)) & 31u)) * 0.032258064f)) * _e181);
                    let _e902 = bitcast<vec2<i32>>((_e757 + vec2<u32>(1u, 0u)));
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e905 = all((_e902 >= vec2<i32>(0i, 0i)));
                            phi_971_ = false;
                            local_11 = _e905;
                            if _e905 {
                                let _e907 = cbFI.maxRenderSize;
                                phi_971_ = all((_e902 < _e907));
                            }
                            let _e911 = phi_971_;
                            if _e911 {
                                let _e914 = cbFI.maxRenderSize;
                                let _e922 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e902.y * _e914.x) + _e902.x))];
                                phi_984_ = _e922;
                                break;
                            }
                            phi_984_ = 0u;
                            break;
                        }
                    }
                    let _e924 = phi_984_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e927 = local_11;
                            phi_993_ = false;
                            if _e927 {
                                let _e929 = cbFI.maxRenderSize;
                                phi_993_ = all((_e902 < _e929));
                            }
                            let _e933 = phi_993_;
                            if _e933 {
                                let _e936 = cbFI.maxRenderSize;
                                let _e944 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e902.y * _e936.x) + _e902.x))];
                                phi_1006_ = _e944;
                                break;
                            }
                            phi_1006_ = 0u;
                            break;
                        }
                    }
                    let _e946 = phi_1006_;
                    let _e951 = (f32(((_e924 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f);
                    phi_1020_ = false;
                    if (_e951 > 0f) {
                        phi_1020_ = ((_e924 & 2147483648u) == 0u);
                    }
                    let _e961 = phi_1020_;
                    phi_1024_ = _e951;
                    if _e961 {
                        phi_1024_ = (1f - _e951);
                    }
                    let _e964 = phi_1024_;
                    let _e972 = (vec4<f32>(unpack2x16float((_e924 & 65535u)).x, unpack2x16float((_e946 & 65535u)).x, _e964, (f32(((_e924 >> bitcast<u32>(16u)) & 31u)) * 0.032258064f)) * _e181);
                    let _e973 = bitcast<vec2<i32>>((_e757 + vec2<u32>(1u, 1u)));
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e976 = all((_e973 >= vec2<i32>(0i, 0i)));
                            phi_1044_ = false;
                            local_12 = _e976;
                            if _e976 {
                                let _e978 = cbFI.maxRenderSize;
                                phi_1044_ = all((_e973 < _e978));
                            }
                            let _e982 = phi_1044_;
                            if _e982 {
                                let _e985 = cbFI.maxRenderSize;
                                let _e993 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e973.y * _e985.x) + _e973.x))];
                                phi_1057_ = _e993;
                                break;
                            }
                            phi_1057_ = 0u;
                            break;
                        }
                    }
                    let _e995 = phi_1057_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e998 = local_12;
                            phi_1066_ = false;
                            if _e998 {
                                let _e1000 = cbFI.maxRenderSize;
                                phi_1066_ = all((_e973 < _e1000));
                            }
                            let _e1004 = phi_1066_;
                            if _e1004 {
                                let _e1007 = cbFI.maxRenderSize;
                                let _e1015 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e973.y * _e1007.x) + _e973.x))];
                                phi_1079_ = _e1015;
                                break;
                            }
                            phi_1079_ = 0u;
                            break;
                        }
                    }
                    let _e1017 = phi_1079_;
                    let _e1022 = (f32(((_e995 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f);
                    phi_1093_ = false;
                    if (_e1022 > 0f) {
                        phi_1093_ = ((_e995 & 2147483648u) == 0u);
                    }
                    let _e1032 = phi_1093_;
                    phi_1097_ = _e1022;
                    if _e1032 {
                        phi_1097_ = (1f - _e1022);
                    }
                    let _e1035 = phi_1097_;
                    let _e1043 = (vec4<f32>(unpack2x16float((_e995 & 65535u)).x, unpack2x16float((_e1017 & 65535u)).x, _e1035, (f32(((_e995 >> bitcast<u32>(16u)) & 31u)) * 0.032258064f)) * _e181);
                    let _e1046 = select(0f, 1f, (_e830.z > 0f));
                    let _e1050 = select(0f, 1f, (_e901.z > 0f));
                    let _e1056 = select(0f, 1f, (_e972.z > 0f));
                    let _e1062 = select(0f, 1f, (_e1043.z > 0f));
                    let _e1065 = (((_e1046 + _e1050) + _e1056) + _e1062);
                    local[2i] = (((((_e830 * _e1046) + (_e901 * _e1050)) + (_e972 * _e1056)) + (_e1043 * _e1062)) / vec4(select(1f, _e1065, (_e1065 > 0.001f))));
                    let _e1071 = local[2i];
                    textureStore(rw_inpainting_pyramid0_, bitcast<vec2<u32>>((_e99 + vec2<i32>(_e100, _e754))), _e1071);
                    let _e1074 = (_e91 + vec2<i32>(_e426, _e750));
                    let _e1077 = bitcast<vec2<u32>>(_e1074);
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e1083 = all((_e1074 >= vec2<i32>(0i, 0i)));
                            phi_1154_ = false;
                            local_13 = _e1083;
                            if _e1083 {
                                let _e1085 = cbFI.maxRenderSize;
                                phi_1154_ = all((_e1074 < _e1085));
                            }
                            let _e1089 = phi_1154_;
                            if _e1089 {
                                let _e1092 = cbFI.maxRenderSize;
                                let _e1100 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e1074.y * _e1092.x) + _e1074.x))];
                                phi_1167_ = _e1100;
                                break;
                            }
                            phi_1167_ = 0u;
                            break;
                        }
                    }
                    let _e1102 = phi_1167_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e1105 = local_13;
                            phi_1176_ = false;
                            if _e1105 {
                                let _e1107 = cbFI.maxRenderSize;
                                phi_1176_ = all((_e1074 < _e1107));
                            }
                            let _e1111 = phi_1176_;
                            if _e1111 {
                                let _e1114 = cbFI.maxRenderSize;
                                let _e1122 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e1074.y * _e1114.x) + _e1074.x))];
                                phi_1189_ = _e1122;
                                break;
                            }
                            phi_1189_ = 0u;
                            break;
                        }
                    }
                    let _e1124 = phi_1189_;
                    let _e1129 = (f32(((_e1102 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f);
                    phi_1203_ = false;
                    if (_e1129 > 0f) {
                        phi_1203_ = ((_e1102 & 2147483648u) == 0u);
                    }
                    let _e1139 = phi_1203_;
                    phi_1207_ = _e1129;
                    if _e1139 {
                        phi_1207_ = (1f - _e1129);
                    }
                    let _e1142 = phi_1207_;
                    let _e1150 = (vec4<f32>(unpack2x16float((_e1102 & 65535u)).x, unpack2x16float((_e1124 & 65535u)).x, _e1142, (f32(((_e1102 >> bitcast<u32>(16u)) & 31u)) * 0.032258064f)) * _e181);
                    let _e1151 = bitcast<vec2<i32>>((_e1077 + vec2<u32>(0u, 1u)));
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e1154 = all((_e1151 >= vec2<i32>(0i, 0i)));
                            phi_1227_ = false;
                            local_14 = _e1154;
                            if _e1154 {
                                let _e1156 = cbFI.maxRenderSize;
                                phi_1227_ = all((_e1151 < _e1156));
                            }
                            let _e1160 = phi_1227_;
                            if _e1160 {
                                let _e1163 = cbFI.maxRenderSize;
                                let _e1171 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e1151.y * _e1163.x) + _e1151.x))];
                                phi_1240_ = _e1171;
                                break;
                            }
                            phi_1240_ = 0u;
                            break;
                        }
                    }
                    let _e1173 = phi_1240_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e1176 = local_14;
                            phi_1249_ = false;
                            if _e1176 {
                                let _e1178 = cbFI.maxRenderSize;
                                phi_1249_ = all((_e1151 < _e1178));
                            }
                            let _e1182 = phi_1249_;
                            if _e1182 {
                                let _e1185 = cbFI.maxRenderSize;
                                let _e1193 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e1151.y * _e1185.x) + _e1151.x))];
                                phi_1262_ = _e1193;
                                break;
                            }
                            phi_1262_ = 0u;
                            break;
                        }
                    }
                    let _e1195 = phi_1262_;
                    let _e1200 = (f32(((_e1173 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f);
                    phi_1276_ = false;
                    if (_e1200 > 0f) {
                        phi_1276_ = ((_e1173 & 2147483648u) == 0u);
                    }
                    let _e1210 = phi_1276_;
                    phi_1280_ = _e1200;
                    if _e1210 {
                        phi_1280_ = (1f - _e1200);
                    }
                    let _e1213 = phi_1280_;
                    let _e1221 = (vec4<f32>(unpack2x16float((_e1173 & 65535u)).x, unpack2x16float((_e1195 & 65535u)).x, _e1213, (f32(((_e1173 >> bitcast<u32>(16u)) & 31u)) * 0.032258064f)) * _e181);
                    let _e1222 = bitcast<vec2<i32>>((_e1077 + vec2<u32>(1u, 0u)));
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e1225 = all((_e1222 >= vec2<i32>(0i, 0i)));
                            phi_1300_ = false;
                            local_15 = _e1225;
                            if _e1225 {
                                let _e1227 = cbFI.maxRenderSize;
                                phi_1300_ = all((_e1222 < _e1227));
                            }
                            let _e1231 = phi_1300_;
                            if _e1231 {
                                let _e1234 = cbFI.maxRenderSize;
                                let _e1242 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e1222.y * _e1234.x) + _e1222.x))];
                                phi_1313_ = _e1242;
                                break;
                            }
                            phi_1313_ = 0u;
                            break;
                        }
                    }
                    let _e1244 = phi_1313_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e1247 = local_15;
                            phi_1322_ = false;
                            if _e1247 {
                                let _e1249 = cbFI.maxRenderSize;
                                phi_1322_ = all((_e1222 < _e1249));
                            }
                            let _e1253 = phi_1322_;
                            if _e1253 {
                                let _e1256 = cbFI.maxRenderSize;
                                let _e1264 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e1222.y * _e1256.x) + _e1222.x))];
                                phi_1335_ = _e1264;
                                break;
                            }
                            phi_1335_ = 0u;
                            break;
                        }
                    }
                    let _e1266 = phi_1335_;
                    let _e1271 = (f32(((_e1244 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f);
                    phi_1349_ = false;
                    if (_e1271 > 0f) {
                        phi_1349_ = ((_e1244 & 2147483648u) == 0u);
                    }
                    let _e1281 = phi_1349_;
                    phi_1353_ = _e1271;
                    if _e1281 {
                        phi_1353_ = (1f - _e1271);
                    }
                    let _e1284 = phi_1353_;
                    let _e1292 = (vec4<f32>(unpack2x16float((_e1244 & 65535u)).x, unpack2x16float((_e1266 & 65535u)).x, _e1284, (f32(((_e1244 >> bitcast<u32>(16u)) & 31u)) * 0.032258064f)) * _e181);
                    let _e1293 = bitcast<vec2<i32>>((_e1077 + vec2<u32>(1u, 1u)));
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e1296 = all((_e1293 >= vec2<i32>(0i, 0i)));
                            phi_1373_ = false;
                            local_16 = _e1296;
                            if _e1296 {
                                let _e1298 = cbFI.maxRenderSize;
                                phi_1373_ = all((_e1293 < _e1298));
                            }
                            let _e1302 = phi_1373_;
                            if _e1302 {
                                let _e1305 = cbFI.maxRenderSize;
                                let _e1313 = r_game_motion_vector_field_x.member[bitcast<u32>(((_e1293.y * _e1305.x) + _e1293.x))];
                                phi_1386_ = _e1313;
                                break;
                            }
                            phi_1386_ = 0u;
                            break;
                        }
                    }
                    let _e1315 = phi_1386_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e1318 = local_16;
                            phi_1395_ = false;
                            if _e1318 {
                                let _e1320 = cbFI.maxRenderSize;
                                phi_1395_ = all((_e1293 < _e1320));
                            }
                            let _e1324 = phi_1395_;
                            if _e1324 {
                                let _e1327 = cbFI.maxRenderSize;
                                let _e1335 = r_game_motion_vector_field_y.member[bitcast<u32>(((_e1293.y * _e1327.x) + _e1293.x))];
                                phi_1408_ = _e1335;
                                break;
                            }
                            phi_1408_ = 0u;
                            break;
                        }
                    }
                    let _e1337 = phi_1408_;
                    let _e1342 = (f32(((_e1315 >> bitcast<u32>(21u)) & 1023u)) * 0.0009775171f);
                    phi_1422_ = false;
                    if (_e1342 > 0f) {
                        phi_1422_ = ((_e1315 & 2147483648u) == 0u);
                    }
                    let _e1352 = phi_1422_;
                    phi_1426_ = _e1342;
                    if _e1352 {
                        phi_1426_ = (1f - _e1342);
                    }
                    let _e1355 = phi_1426_;
                    let _e1363 = (vec4<f32>(unpack2x16float((_e1315 & 65535u)).x, unpack2x16float((_e1337 & 65535u)).x, _e1355, (f32(((_e1315 >> bitcast<u32>(16u)) & 31u)) * 0.032258064f)) * _e181);
                    let _e1366 = select(0f, 1f, (_e1150.z > 0f));
                    let _e1370 = select(0f, 1f, (_e1221.z > 0f));
                    let _e1376 = select(0f, 1f, (_e1292.z > 0f));
                    let _e1382 = select(0f, 1f, (_e1363.z > 0f));
                    let _e1385 = (((_e1366 + _e1370) + _e1376) + _e1382);
                    local[3i] = (((((_e1150 * _e1366) + (_e1221 * _e1370)) + (_e1292 * _e1376)) + (_e1363 * _e1382)) / vec4(select(1f, _e1385, (_e1385 > 0.001f))));
                    let _e1391 = local[3i];
                    textureStore(rw_inpainting_pyramid0_, bitcast<vec2<u32>>((_e99 + vec2<i32>(_e430, _e754))), _e1391);
                    if (_e62 <= 1u) {
                        break;
                    }
                    phi_1469_ = 0u;
                    loop {
                        let _e1395 = phi_1469_;
                        if (_e1395 < 4u) {
                            let _e1398 = local[_e1395];
                            spdIntermediateR[_e84][_e88] = _e1398.x;
                            spdIntermediateG[_e84][_e88] = _e1398.y;
                            spdIntermediateB[_e84][_e88] = _e1398.z;
                            spdIntermediateA[_e84][_e88] = _e1398.w;
                            workgroupBarrier();
                            if (_e57 < 64u) {
                                let _e1412 = (_e92 + 1u);
                                let _e1413 = (_e94 + 1u);
                                let _e1416 = spdIntermediateR[_e92][_e94];
                                let _e1419 = spdIntermediateG[_e92][_e94];
                                let _e1422 = spdIntermediateB[_e92][_e94];
                                let _e1425 = spdIntermediateA[_e92][_e94];
                                let _e1429 = spdIntermediateR[_e1412][_e94];
                                let _e1432 = spdIntermediateG[_e1412][_e94];
                                let _e1435 = spdIntermediateB[_e1412][_e94];
                                let _e1438 = spdIntermediateA[_e1412][_e94];
                                let _e1442 = spdIntermediateR[_e92][_e1413];
                                let _e1445 = spdIntermediateG[_e92][_e1413];
                                let _e1448 = spdIntermediateB[_e92][_e1413];
                                let _e1451 = spdIntermediateA[_e92][_e1413];
                                let _e1455 = spdIntermediateR[_e1412][_e1413];
                                let _e1458 = spdIntermediateG[_e1412][_e1413];
                                let _e1461 = spdIntermediateB[_e1412][_e1413];
                                let _e1464 = spdIntermediateA[_e1412][_e1413];
                                let _e1467 = select(0f, 1f, (_e1422 > 0f));
                                let _e1470 = select(0f, 1f, (_e1435 > 0f));
                                let _e1475 = select(0f, 1f, (_e1448 > 0f));
                                let _e1480 = select(0f, 1f, (_e1461 > 0f));
                                let _e1483 = (((_e1467 + _e1470) + _e1475) + _e1480);
                                local[_e1395] = (((((vec4<f32>(_e1416, _e1419, _e1422, _e1425) * _e1467) + (vec4<f32>(_e1429, _e1432, _e1435, _e1438) * _e1470)) + (vec4<f32>(_e1442, _e1445, _e1448, _e1451) * _e1475)) + (vec4<f32>(_e1455, _e1458, _e1461, _e1464) * _e1480)) / vec4(select(1f, _e1483, (_e1483 > 0.001f))));
                                let _e1500 = local[_e1395];
                                textureStore(rw_inpainting_pyramid1_, bitcast<vec2<u32>>((bitcast<vec2<i32>>((_e65 * vec2<u32>(16u, 16u))) + vec2<i32>(bitcast<i32>((_e84 + ((_e1395 % 2u) * 8u))), bitcast<i32>((_e88 + ((_e1395 / 2u) * 8u)))))), _e1500);
                            }
                            workgroupBarrier();
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            phi_1469_ = (_e1395 + 1u);
                        }
                    }
                    if (_e57 < 64u) {
                        let _e1504 = local[0i];
                        spdIntermediateR[_e84][_e88] = _e1504.x;
                        spdIntermediateG[_e84][_e88] = _e1504.y;
                        spdIntermediateB[_e84][_e88] = _e1504.z;
                        spdIntermediateA[_e84][_e88] = _e1504.w;
                        let _e1517 = (_e84 + 8u);
                        let _e1518 = local[1i];
                        spdIntermediateR[_e1517][_e88] = _e1518.x;
                        spdIntermediateG[_e1517][_e88] = _e1518.y;
                        spdIntermediateB[_e1517][_e88] = _e1518.z;
                        spdIntermediateA[_e1517][_e88] = _e1518.w;
                        let _e1531 = (_e88 + 8u);
                        let _e1532 = local[2i];
                        spdIntermediateR[_e84][_e1531] = _e1532.x;
                        spdIntermediateG[_e84][_e1531] = _e1532.y;
                        spdIntermediateB[_e84][_e1531] = _e1532.z;
                        spdIntermediateA[_e84][_e1531] = _e1532.w;
                        let _e1545 = local[3i];
                        spdIntermediateR[_e1517][_e1531] = _e1545.x;
                        spdIntermediateG[_e1517][_e1531] = _e1545.y;
                        spdIntermediateB[_e1517][_e1531] = _e1545.z;
                        spdIntermediateA[_e1517][_e1531] = _e1545.w;
                    }
                    break;
                }
            }
            switch bitcast<i32>(0u) {
                default: {
                    if (_e62 <= 2u) {
                        break;
                    }
                    workgroupBarrier();
                    if (_e57 < 64u) {
                        let _e1562 = local_17;
                        let _e1563 = (_e1562 + 1u);
                        let _e1565 = local_18;
                        let _e1566 = (_e1565 + 1u);
                        let _e1568 = local_19;
                        let _e1571 = local_20;
                        let _e1573 = spdIntermediateR[_e1568][_e1571];
                        let _e1575 = local_21;
                        let _e1578 = local_22;
                        let _e1580 = spdIntermediateG[_e1575][_e1578];
                        let _e1582 = local_23;
                        let _e1585 = local_24;
                        let _e1587 = spdIntermediateB[_e1582][_e1585];
                        let _e1589 = local_25;
                        let _e1592 = local_26;
                        let _e1594 = spdIntermediateA[_e1589][_e1592];
                        let _e1598 = local_27;
                        let _e1600 = spdIntermediateR[_e1563][_e1598];
                        let _e1603 = local_28;
                        let _e1605 = spdIntermediateG[_e1563][_e1603];
                        let _e1608 = local_29;
                        let _e1610 = spdIntermediateB[_e1563][_e1608];
                        let _e1613 = local_30;
                        let _e1615 = spdIntermediateA[_e1563][_e1613];
                        let _e1618 = local_31;
                        let _e1621 = spdIntermediateR[_e1618][_e1566];
                        let _e1623 = local_32;
                        let _e1626 = spdIntermediateG[_e1623][_e1566];
                        let _e1628 = local_33;
                        let _e1631 = spdIntermediateB[_e1628][_e1566];
                        let _e1633 = local_34;
                        let _e1636 = spdIntermediateA[_e1633][_e1566];
                        let _e1640 = spdIntermediateR[_e1563][_e1566];
                        let _e1643 = spdIntermediateG[_e1563][_e1566];
                        let _e1646 = spdIntermediateB[_e1563][_e1566];
                        let _e1649 = spdIntermediateA[_e1563][_e1566];
                        let _e1652 = select(0f, 1f, (_e1587 > 0f));
                        let _e1655 = select(0f, 1f, (_e1610 > 0f));
                        let _e1660 = select(0f, 1f, (_e1631 > 0f));
                        let _e1665 = select(0f, 1f, (_e1646 > 0f));
                        let _e1668 = (((_e1652 + _e1655) + _e1660) + _e1665);
                        let _e1672 = (((((vec4<f32>(_e1573, _e1580, _e1587, _e1594) * _e1652) + (vec4<f32>(_e1600, _e1605, _e1610, _e1615) * _e1655)) + (vec4<f32>(_e1621, _e1626, _e1631, _e1636) * _e1660)) + (vec4<f32>(_e1640, _e1643, _e1646, _e1649) * _e1665)) / vec4(select(1f, _e1668, (_e1668 > 0.001f))));
                        let _e1676 = local_35;
                        textureStore(rw_inpainting_pyramid2_, bitcast<vec2<u32>>((bitcast<vec2<i32>>((_e65 * vec2<u32>(8u, 8u))) + _e1676)), _e1672);
                        let _e1681 = local_36;
                        let _e1682 = (_e1681 + (_e88 % 2u));
                        let _e1686 = local_37;
                        spdIntermediateR[_e1682][_e1686] = _e1672.x;
                        let _e1691 = local_38;
                        spdIntermediateG[_e1682][_e1691] = _e1672.y;
                        let _e1696 = local_39;
                        spdIntermediateB[_e1682][_e1696] = _e1672.z;
                        let _e1701 = local_40;
                        spdIntermediateA[_e1682][_e1701] = _e1672.w;
                    }
                    if (_e62 <= 3u) {
                        break;
                    }
                    workgroupBarrier();
                    if (_e57 < 16u) {
                        let _e1705 = (_e84 * 4u);
                        let _e1706 = (_e88 * 4u);
                        let _e1707 = (_e1705 + 2u);
                        let _e1708 = (_e1705 + 1u);
                        let _e1709 = (_e1706 + 2u);
                        let _e1710 = (_e1705 + 3u);
                        let _e1713 = spdIntermediateR[_e1705][_e1706];
                        let _e1716 = spdIntermediateG[_e1705][_e1706];
                        let _e1719 = spdIntermediateB[_e1705][_e1706];
                        let _e1722 = spdIntermediateA[_e1705][_e1706];
                        let _e1726 = spdIntermediateR[_e1707][_e1706];
                        let _e1729 = spdIntermediateG[_e1707][_e1706];
                        let _e1732 = spdIntermediateB[_e1707][_e1706];
                        let _e1735 = spdIntermediateA[_e1707][_e1706];
                        let _e1739 = spdIntermediateR[_e1708][_e1709];
                        let _e1742 = spdIntermediateG[_e1708][_e1709];
                        let _e1745 = spdIntermediateB[_e1708][_e1709];
                        let _e1748 = spdIntermediateA[_e1708][_e1709];
                        let _e1752 = spdIntermediateR[_e1710][_e1709];
                        let _e1755 = spdIntermediateG[_e1710][_e1709];
                        let _e1758 = spdIntermediateB[_e1710][_e1709];
                        let _e1761 = spdIntermediateA[_e1710][_e1709];
                        let _e1764 = select(0f, 1f, (_e1719 > 0f));
                        let _e1767 = select(0f, 1f, (_e1732 > 0f));
                        let _e1772 = select(0f, 1f, (_e1745 > 0f));
                        let _e1777 = select(0f, 1f, (_e1758 > 0f));
                        let _e1780 = (((_e1764 + _e1767) + _e1772) + _e1777);
                        let _e1784 = (((((vec4<f32>(_e1713, _e1716, _e1719, _e1722) * _e1764) + (vec4<f32>(_e1726, _e1729, _e1732, _e1735) * _e1767)) + (vec4<f32>(_e1739, _e1742, _e1745, _e1748) * _e1772)) + (vec4<f32>(_e1752, _e1755, _e1758, _e1761) * _e1777)) / vec4(select(1f, _e1780, (_e1780 > 0.001f))));
                        let _e1788 = local_41;
                        textureStore(rw_inpainting_pyramid3_, bitcast<vec2<u32>>((bitcast<vec2<i32>>((_e65 * vec2<u32>(4u, 4u))) + _e1788)), _e1784);
                        let _e1791 = (_e1705 + _e88);
                        spdIntermediateR[_e1791][_e1706] = _e1784.x;
                        spdIntermediateG[_e1791][_e1706] = _e1784.y;
                        spdIntermediateB[_e1791][_e1706] = _e1784.z;
                        spdIntermediateA[_e1791][_e1706] = _e1784.w;
                    }
                    if (_e62 <= 4u) {
                        break;
                    }
                    workgroupBarrier();
                    if (_e57 < 4u) {
                        let _e1806 = (_e84 * 8u);
                        let _e1808 = local_42;
                        let _e1809 = (_e1806 + _e1808);
                        let _e1810 = (_e88 * 8u);
                        let _e1813 = local_43;
                        let _e1814 = ((_e1806 + 4u) + _e1813);
                        let _e1817 = local_44;
                        let _e1818 = ((_e1806 + 1u) + _e1817);
                        let _e1819 = (_e1810 + 4u);
                        let _e1822 = local_45;
                        let _e1823 = ((_e1806 + 5u) + _e1822);
                        let _e1826 = spdIntermediateR[_e1809][_e1810];
                        let _e1829 = spdIntermediateG[_e1809][_e1810];
                        let _e1832 = spdIntermediateB[_e1809][_e1810];
                        let _e1835 = spdIntermediateA[_e1809][_e1810];
                        let _e1839 = spdIntermediateR[_e1814][_e1810];
                        let _e1842 = spdIntermediateG[_e1814][_e1810];
                        let _e1845 = spdIntermediateB[_e1814][_e1810];
                        let _e1848 = spdIntermediateA[_e1814][_e1810];
                        let _e1852 = spdIntermediateR[_e1818][_e1819];
                        let _e1855 = spdIntermediateG[_e1818][_e1819];
                        let _e1858 = spdIntermediateB[_e1818][_e1819];
                        let _e1861 = spdIntermediateA[_e1818][_e1819];
                        let _e1865 = spdIntermediateR[_e1823][_e1819];
                        let _e1868 = spdIntermediateG[_e1823][_e1819];
                        let _e1871 = spdIntermediateB[_e1823][_e1819];
                        let _e1874 = spdIntermediateA[_e1823][_e1819];
                        let _e1877 = select(0f, 1f, (_e1832 > 0f));
                        let _e1880 = select(0f, 1f, (_e1845 > 0f));
                        let _e1885 = select(0f, 1f, (_e1858 > 0f));
                        let _e1890 = select(0f, 1f, (_e1871 > 0f));
                        let _e1893 = (((_e1877 + _e1880) + _e1885) + _e1890);
                        let _e1897 = (((((vec4<f32>(_e1826, _e1829, _e1832, _e1835) * _e1877) + (vec4<f32>(_e1839, _e1842, _e1845, _e1848) * _e1880)) + (vec4<f32>(_e1852, _e1855, _e1858, _e1861) * _e1885)) + (vec4<f32>(_e1865, _e1868, _e1871, _e1874) * _e1890)) / vec4(select(1f, _e1893, (_e1893 > 0.001f))));
                        let _e1901 = local_46;
                        textureStore(rw_inpainting_pyramid4_, bitcast<vec2<u32>>((bitcast<vec2<i32>>((_e65 * vec2<u32>(2u, 2u))) + _e1901)), _e1897);
                        let _e1905 = local_47;
                        let _e1906 = (_e84 + _e1905);
                        spdIntermediateR[_e1906][0u] = _e1897.x;
                        spdIntermediateG[_e1906][0u] = _e1897.y;
                        spdIntermediateB[_e1906][0u] = _e1897.z;
                        spdIntermediateA[_e1906][0u] = _e1897.w;
                    }
                    if (_e62 <= 5u) {
                        break;
                    }
                    workgroupBarrier();
                    if (_e57 < 1u) {
                        let _e1923 = spdIntermediateR[0u][0u];
                        let _e1926 = spdIntermediateG[0u][0u];
                        let _e1929 = spdIntermediateB[0u][0u];
                        let _e1932 = spdIntermediateA[0u][0u];
                        let _e1936 = spdIntermediateR[1u][0u];
                        let _e1939 = spdIntermediateG[1u][0u];
                        let _e1942 = spdIntermediateB[1u][0u];
                        let _e1945 = spdIntermediateA[1u][0u];
                        let _e1949 = spdIntermediateR[2u][0u];
                        let _e1952 = spdIntermediateG[2u][0u];
                        let _e1955 = spdIntermediateB[2u][0u];
                        let _e1958 = spdIntermediateA[2u][0u];
                        let _e1962 = spdIntermediateR[3u][0u];
                        let _e1965 = spdIntermediateG[3u][0u];
                        let _e1968 = spdIntermediateB[3u][0u];
                        let _e1971 = spdIntermediateA[3u][0u];
                        let _e1974 = select(0f, 1f, (_e1929 > 0f));
                        let _e1977 = select(0f, 1f, (_e1942 > 0f));
                        let _e1982 = select(0f, 1f, (_e1955 > 0f));
                        let _e1987 = select(0f, 1f, (_e1968 > 0f));
                        let _e1990 = (((_e1974 + _e1977) + _e1982) + _e1987);
                        textureStore(rw_inpainting_pyramid5_, _e65, (((((vec4<f32>(_e1923, _e1926, _e1929, _e1932) * _e1974) + (vec4<f32>(_e1936, _e1939, _e1942, _e1945) * _e1977)) + (vec4<f32>(_e1949, _e1952, _e1955, _e1958) * _e1982)) + (vec4<f32>(_e1962, _e1965, _e1968, _e1971) * _e1987)) / vec4(select(1f, _e1990, (_e1990 > 0.001f)))));
                    }
                    break;
                }
            }
            if (_e62 <= 6u) {
                break;
            }
            break;
        }
    }
    return;
}

@compute @workgroup_size(256, 1, 1) 
fn CS(@builtin(workgroup_id) param: vec3<u32>, @builtin(local_invocation_index) param_1: u32) {
    global = param;
    global_1 = param_1;
    CS_1();
}
`;
