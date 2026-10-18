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

struct type_u002e_RWStructuredBuffer_u002e_uint {
    member: array<u32>,
}

struct type_u002e_RWStructuredBuffer_u002e_uint_1 {
    member: array<atomic<u32>>,
}

@group(0) @binding(0) 
var<uniform> cbFI: type_u002e_cbFI;
@group(0) @binding(64) 
var s_LinearClamp: sampler;
@group(0) @binding(10) 
var r_previous_interpolation_source: texture_2d<f32>;
@group(0) @binding(11) 
var r_current_interpolation_source: texture_2d<f32>;
@group(0) @binding(8) 
var r_dilated_motion_vectors: texture_2d<f32>;
@group(0) @binding(9) 
var r_dilated_depth: texture_2d<f32>;
@group(0) @binding(12) 
var r_input_distortion_field: texture_2d<f32>;
@group(0) @binding(32) 
var<storage, read_write> rw_game_motion_vector_field_x: type_u002e_RWStructuredBuffer_u002e_uint_1;
@group(0) @binding(33) 
var<storage, read_write> rw_game_motion_vector_field_y: type_u002e_RWStructuredBuffer_u002e_uint_1;
var<private> global: vec3<i32>;

fn CS_1() {
    var local: array<vec2<i32>, 4>;
    var local_1: array<vec2<i32>, 4>;
    var phi_173_: f32;
    var phi_183_: bool;
    var phi_191_: bool;
    var phi_192_: bool;
    var phi_214_: i32;
    var phi_237_: bool;
    var phi_256_: bool;
    var phi_281_: bool;
    var phi_284_: f32;
    var phi_286_: u32;
    var phi_287_: u32;
    var phi_282_: bool;
    var phi_317_: i32;
    var phi_331_: bool;
    var phi_342_: bool;
    var phi_356_: u32;
    var phi_363_: bool;
    var phi_377_: u32;
    var phi_386_: bool;
    var phi_314_: u32;
    var phi_316_: bool;
    var local_2: bool;
    var local_3: u32;
    var local_4: u32;
    var local_5: bool;

    let _e50 = global;
    let _e51 = _e50.xy;
    let _e55 = cbFI.renderSize;
    let _e56 = vec2<f32>(_e55);
    let _e57 = ((vec2<f32>(_e51) + vec2<f32>(0.5f, 0.5f)) / _e56);
    let _e58 = textureSampleLevel(r_input_distortion_field, s_LinearClamp, _e57, 0f);
    let _e63 = cbFI.interpolationRectBase;
    let _e66 = cbFI.displaySize;
    let _e67 = vec2<f32>(_e66);
    let _e70 = cbFI.interpolationRectSize;
    let _e72 = (vec2<f32>(_e70) / _e67);
    let _e74 = ((vec2<f32>(_e63) / _e67) + (_e57 * _e72));
    let _e76 = bitcast<vec2<u32>>((_e51 + vec2<i32>((_e58.xy * _e56))));
    let _e77 = textureLoad(r_dilated_depth, _e76, 0u);
    let _e79 = textureLoad(r_dilated_motion_vectors, _e76, 0u);
    let _e80 = _e79.xy;
    let _e81 = (_e80 * 0.5f);
    let _e82 = (_e57 + _e81);
    let _e84 = cbFI.fDeviceToViewDepth;
    let _e89 = pow((_e84.y / (_e77.x - _e84.x)), 0.33f);
    let _e96 = max(1u, u32(((1f - (_e89 * (1f / (1f + _e89)))) * 1023f)));
    let _e98 = (_e74 + (_e80 * _e72));
    let _e99 = textureSampleLevel(r_previous_interpolation_source, s_LinearClamp, _e98, 0f);
    let _e101 = textureSampleLevel(r_current_interpolation_source, s_LinearClamp, _e74, 0f);
    let _e105 = cbFI.minMaxLuminance[0u];
    let _e108 = cbFI.minMaxLuminance[1u];
    let _e110 = vec3((_e105 * 0.0125f));
    let _e114 = vec3(((_e108 - _e105) * 0.0125f));
    let _e117 = (0.001f + dot(((_e99.xyz - _e110) / _e114), vec3<f32>(0.2126f, 0.7152f, 0.0722f)));
    let _e121 = (0.001f + dot(((_e101.xyz - _e110) / _e114), vec3<f32>(0.2126f, 0.7152f, 0.0722f)));
    let _e122 = max(_e117, _e121);
    if (_e122 != 0f) {
        phi_173_ = (min(_e117, _e121) / _e122);
    } else {
        phi_173_ = 0f;
    }
    let _e127 = phi_173_;
    phi_183_ = false;
    if (_e98.x > 0f) {
        phi_183_ = (_e98.x < 1f);
    }
    let _e136 = phi_183_;
    phi_192_ = false;
    if _e136 {
        phi_191_ = false;
        if (_e98.y > 0f) {
            phi_191_ = (_e98.y < 1f);
        }
        let _e141 = phi_191_;
        phi_192_ = _e141;
    }
    let _e143 = phi_192_;
    let _e153 = ((2147483648u | ((_e96 & 1023u) << bitcast<u32>(21u))) | (((u32(round((pow(_e127, 1f) * 31f))) * select(0u, 1u, _e143)) & 31u) << bitcast<u32>(16u)));
    let _e156 = pack2x16float(vec2<f32>(_e81.x, 0f));
    let _e160 = pack2x16float(vec2<f32>(_e81.y, 0f));
    local_1 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
    phi_214_ = 0i;
    loop {
        let _e167 = phi_214_;
        if (_e167 < 4i) {
            let _e170 = local_1[_e167];
            let _e171 = (vec2<i32>(floor(((_e82 * _e56) - vec2<f32>(0.5f, 0.5f)))) + _e170);
            if all((bitcast<vec2<u32>>(_e171) < bitcast<vec2<u32>>(_e55))) {
                let _e177 = all((_e171 >= vec2<i32>(0i, 0i)));
                phi_237_ = false;
                if _e177 {
                    let _e179 = cbFI.maxRenderSize;
                    phi_237_ = all((_e171 < _e179));
                }
                let _e183 = phi_237_;
                if _e183 {
                    let _e186 = cbFI.maxRenderSize;
                    let _e194 = atomicMax((&rw_game_motion_vector_field_x.member[bitcast<u32>(((_e171.y * _e186.x) + _e171.x))]), (_e153 | _e156));
                }
                phi_256_ = false;
                if _e177 {
                    let _e196 = cbFI.maxRenderSize;
                    phi_256_ = all((_e171 < _e196));
                }
                let _e200 = phi_256_;
                if _e200 {
                    let _e203 = cbFI.maxRenderSize;
                    let _e211 = atomicMax((&rw_game_motion_vector_field_y.member[bitcast<u32>(((_e171.y * _e203.x) + _e171.x))]), (_e153 | _e160));
                }
            }
            continue;
        } else {
            break;
        }
        continuing {
            phi_214_ = (_e167 + 1i);
        }
    }
    if (length((_e81 * _e56)) > 0.001f) {
        let _e217 = length((vec2<f32>(1f, 1f) / _e56));
        let _e218 = normalize(_e80);
        phi_281_ = true;
        phi_284_ = _e217;
        phi_286_ = 0u;
        loop {
            let _e223 = phi_281_;
            let _e225 = phi_284_;
            let _e227 = phi_286_;
            if select(false, _e223, (_e225 <= min(length(_e81), length(vec2<f32>(0.5f, 0.5f))))) {
                let _e231 = (_e82 - (_e218 * _e225));
                local = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
                let _e250 = (((max(1u, (1023u - _e96)) & 1023u) << bitcast<u32>(21u)) | ((u32((max(0f, dot(normalize((vec2<f32>(0.5f, 0.5f) - _e231)), _e218)) * 31f)) & 31u) << bitcast<u32>(16u)));
                phi_287_ = _e227;
                phi_282_ = _e223;
                phi_317_ = 0i;
                loop {
                    let _e254 = phi_287_;
                    let _e256 = phi_282_;
                    let _e258 = phi_317_;
                    local_2 = _e256;
                    local_3 = _e254;
                    if (_e258 < 1i) {
                        let _e261 = local[_e258];
                        let _e262 = (vec2<i32>(floor(((_e231 * _e56) - vec2<f32>(0.5f, 0.5f)))) + _e261);
                        phi_331_ = false;
                        if _e256 {
                            phi_331_ = all((bitcast<vec2<u32>>(_e262) < bitcast<vec2<u32>>(_e55)));
                        }
                        let _e268 = phi_331_;
                        phi_314_ = _e254;
                        phi_316_ = _e268;
                        if _e268 {
                            let _e270 = all((_e262 >= vec2<i32>(0i, 0i)));
                            phi_342_ = false;
                            if _e270 {
                                let _e272 = cbFI.maxRenderSize;
                                phi_342_ = all((_e262 < _e272));
                            }
                            let _e276 = phi_342_;
                            if _e276 {
                                let _e279 = cbFI.maxRenderSize;
                                let _e287 = atomicMax((&rw_game_motion_vector_field_x.member[bitcast<u32>(((_e262.y * _e279.x) + _e262.x))]), (_e250 | _e156));
                                phi_356_ = _e287;
                            } else {
                                phi_356_ = 0u;
                            }
                            let _e289 = phi_356_;
                            phi_363_ = false;
                            if _e270 {
                                let _e291 = cbFI.maxRenderSize;
                                phi_363_ = all((_e262 < _e291));
                            }
                            let _e295 = phi_363_;
                            if _e295 {
                                let _e298 = cbFI.maxRenderSize;
                                let _e306 = atomicMax((&rw_game_motion_vector_field_y.member[bitcast<u32>(((_e262.y * _e298.x) + _e262.x))]), (_e250 | _e160));
                                phi_377_ = _e306;
                            } else {
                                phi_377_ = 0u;
                            }
                            let _e308 = phi_377_;
                            let _e313 = (_e254 + select(0u, 1u, ((max(_e289, _e308) & 2147483648u) != 0u)));
                            phi_386_ = false;
                            if _e268 {
                                phi_386_ = (_e313 <= 3u);
                            }
                            let _e316 = phi_386_;
                            phi_314_ = _e313;
                            phi_316_ = _e316;
                        }
                        let _e318 = phi_314_;
                        let _e320 = phi_316_;
                        local_4 = _e318;
                        local_5 = _e320;
                        continue;
                    } else {
                        break;
                    }
                    continuing {
                        let _e339 = local_4;
                        phi_287_ = _e339;
                        let _e342 = local_5;
                        phi_282_ = _e342;
                        phi_317_ = (_e258 + 1i);
                    }
                }
                continue;
            } else {
                break;
            }
            continuing {
                let _e332 = local_2;
                phi_281_ = _e332;
                phi_284_ = (_e225 + _e217);
                let _e336 = local_3;
                phi_286_ = _e336;
            }
        }
    }
    return;
}

@compute @workgroup_size(8, 8, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>) {
    global = vec3<i32>(param);
    CS_1();
}
