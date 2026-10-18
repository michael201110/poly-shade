// AMD FidelityFX SDK v2.3.0, Frame Interpolation 3.1.6.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL; scripts/fg/compile.mjs.
export default String.raw`struct type_u002e_cbPolyShadeFG {
    polyFlowSize: vec2<i32>,
    polyPreviousFlowSize: vec2<i32>,
    polyNextFlowSize: vec2<i32>,
    polyReserved: vec2<i32>,
}

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

struct type_u002e_StructuredBuffer_u002e_v2int {
    member: array<vec2<i32>>,
}

struct type_u002e_RWStructuredBuffer_u002e_uint {
    member: array<u32>,
}

struct type_u002e_RWStructuredBuffer_u002e_uint_1 {
    member: array<atomic<u32>>,
}

@group(0) @binding(2) 
var<uniform> cbPolyShadeFG: type_u002e_cbPolyShadeFG;
@group(0) @binding(0) 
var<uniform> cbFI: type_u002e_cbFI;
@group(0) @binding(64) 
var s_LinearClamp: sampler;
@group(0) @binding(11) 
var r_previous_interpolation_source: texture_2d<f32>;
@group(0) @binding(12) 
var r_current_interpolation_source: texture_2d<f32>;
@group(0) @binding(8) 
var<storage> r_optical_flow: type_u002e_StructuredBuffer_u002e_v2int;
@group(0) @binding(32) 
var<storage, read_write> rw_optical_flow_motion_vector_field_x: type_u002e_RWStructuredBuffer_u002e_uint_1;
@group(0) @binding(33) 
var<storage, read_write> rw_optical_flow_motion_vector_field_y: type_u002e_RWStructuredBuffer_u002e_uint_1;
var<private> global: vec3<i32>;

fn CS_1() {
    var local: array<vec2<i32>, 4>;
    var phi_94_: vec2<f32>;
    var phi_97_: f32;
    var phi_99_: i32;
    var phi_98_: f32;
    var phi_95_: vec2<f32>;
    var phi_108_: i32;
    var phi_125_: bool;
    var phi_137_: vec2<i32>;
    var local_1: f32;
    var local_2: f32;
    var local_3: vec2<f32>;
    var phi_156_: vec2<f32>;
    var phi_159_: f32;
    var phi_161_: i32;
    var phi_160_: f32;
    var phi_157_: vec2<f32>;
    var phi_170_: i32;
    var phi_187_: bool;
    var phi_199_: vec2<i32>;
    var local_4: f32;
    var local_5: f32;
    var local_6: f32;
    var local_7: vec2<f32>;
    var phi_224_: vec2<f32>;
    var phi_293_: f32;
    var phi_303_: bool;
    var phi_311_: bool;
    var phi_312_: bool;
    var phi_335_: i32;
    var phi_358_: bool;
    var phi_377_: bool;
    var local_8: vec2<f32>;
    var local_9: f32;
    var local_10: f32;
    var local_11: vec2<f32>;
    var local_12: vec2<f32>;
    var local_13: f32;
    var local_14: f32;
    var local_15: vec2<f32>;
    var local_16: vec2<f32>;

    let _e50 = global;
    let _e51 = _e50.xy;
    phi_94_ = vec2<f32>(0f, 0f);
    phi_97_ = 0f;
    phi_99_ = -1i;
    loop {
        let _e53 = phi_94_;
        let _e55 = phi_97_;
        let _e57 = phi_99_;
        local_1 = _e55;
        local_2 = _e55;
        local_3 = _e53;
        if (_e57 <= 1i) {
            phi_98_ = _e55;
            phi_95_ = _e53;
            phi_108_ = -1i;
            loop {
                let _e60 = phi_98_;
                let _e62 = phi_95_;
                let _e64 = phi_108_;
                local_8 = _e62;
                local_9 = _e60;
                if (_e64 <= 1i) {
                    let _e67 = (_e51 + vec2<i32>(_e64, _e57));
                    switch bitcast<i32>(0u) {
                        default: {
                            phi_125_ = false;
                            if all((_e67 >= vec2<i32>(0i, 0i))) {
                                let _e72 = cbPolyShadeFG.polyFlowSize;
                                phi_125_ = all((_e67 < _e72));
                            }
                            let _e76 = phi_125_;
                            if _e76 {
                                let _e80 = cbPolyShadeFG.polyFlowSize[0i];
                                let _e87 = r_optical_flow.member[bitcast<u32>(((_e67.y * _e80) + _e67.x))];
                                phi_137_ = _e87;
                                break;
                            }
                            phi_137_ = vec2<i32>(0i, 0i);
                            break;
                        }
                    }
                    let _e89 = phi_137_;
                    let _e92 = cbFI.opticalFlowScale;
                    let _e93 = (vec2<f32>(_e89) * _e92);
                    let _e95 = cbFI.interpolationRectSize;
                    let _e98 = length((_e93 * vec2<f32>(_e95)));
                    let _e103 = (max(0f, (512f - _e98)) * select(0f, 1f, (_e98 > 1f)));
                    local_10 = (_e60 + _e103);
                    local_11 = (_e62 + (_e93 * _e103));
                    continue;
                } else {
                    break;
                }
                continuing {
                    let _e347 = local_10;
                    phi_98_ = _e347;
                    let _e350 = local_11;
                    phi_95_ = _e350;
                    phi_108_ = (_e64 + 1i);
                }
            }
            continue;
        } else {
            break;
        }
        continuing {
            let _e340 = local_8;
            phi_94_ = _e340;
            let _e343 = local_9;
            phi_97_ = _e343;
            phi_99_ = (_e57 + 1i);
        }
    }
    let _e110 = local_1;
    let _e112 = local_2;
    let _e115 = local_3;
    phi_156_ = vec2<f32>(0f, 0f);
    phi_159_ = 0f;
    phi_161_ = -1i;
    loop {
        let _e118 = phi_156_;
        let _e120 = phi_159_;
        let _e122 = phi_161_;
        local_4 = _e120;
        local_5 = _e120;
        local_6 = _e120;
        local_7 = _e118;
        local_16 = _e118;
        if (_e122 <= 1i) {
            phi_160_ = _e120;
            phi_157_ = _e118;
            phi_170_ = -1i;
            loop {
                let _e125 = phi_160_;
                let _e127 = phi_157_;
                let _e129 = phi_170_;
                local_12 = _e127;
                local_13 = _e125;
                if (_e129 <= 1i) {
                    let _e132 = (_e51 + vec2<i32>(_e129, _e122));
                    switch bitcast<i32>(0u) {
                        default: {
                            phi_187_ = false;
                            if all((_e132 >= vec2<i32>(0i, 0i))) {
                                let _e137 = cbPolyShadeFG.polyFlowSize;
                                phi_187_ = all((_e132 < _e137));
                            }
                            let _e141 = phi_187_;
                            if _e141 {
                                let _e145 = cbPolyShadeFG.polyFlowSize[0i];
                                let _e152 = r_optical_flow.member[bitcast<u32>(((_e132.y * _e145) + _e132.x))];
                                phi_199_ = _e152;
                                break;
                            }
                            phi_199_ = vec2<i32>(0i, 0i);
                            break;
                        }
                    }
                    let _e154 = phi_199_;
                    let _e157 = cbFI.opticalFlowScale;
                    let _e158 = (vec2<f32>(_e154) * _e157);
                    let _e160 = cbFI.interpolationRectSize;
                    let _e163 = length((_e158 * vec2<f32>(_e160)));
                    let _e172 = (max(0f, pow(dot((_e115 / vec2<f32>(_e110, _e112)), _e158), 1.25f)) * (max(0f, (512f - _e163)) * select(0f, 1f, (_e163 > 1f))));
                    local_14 = (_e125 + _e172);
                    local_15 = (_e127 + (_e158 * _e172));
                    continue;
                } else {
                    break;
                }
                continuing {
                    let _e366 = local_14;
                    phi_160_ = _e366;
                    let _e369 = local_15;
                    phi_157_ = _e369;
                    phi_170_ = (_e129 + 1i);
                }
            }
            continue;
        } else {
            break;
        }
        continuing {
            let _e359 = local_12;
            phi_156_ = _e359;
            let _e362 = local_13;
            phi_159_ = _e362;
            phi_161_ = (_e122 + 1i);
        }
    }
    let _e179 = local_4;
    let _e379 = local_16;
    phi_224_ = _e379;
    if (_e179 > 0.001f) {
        let _e182 = local_5;
        let _e184 = local_6;
        let _e187 = local_7;
        phi_224_ = (_e187 / vec2<f32>(_e182, _e184));
    }
    let _e190 = phi_224_;
    let _e195 = cbFI.opticalFlowScale;
    let _e198 = cbFI.opticalFlowBlockSize;
    let _e203 = (vec2<i32>(((vec2<f32>(1f, 1f) / _e195) / vec2<f32>(vec2(_e198)))) * vec2<i32>(1i, 1i));
    let _e204 = vec2<f32>(_e203);
    let _e205 = ((vec2<f32>(bitcast<vec2<u32>>(_e51)) + vec2<f32>(0.5f, 0.5f)) / _e204);
    let _e206 = (_e190 * 0.5f);
    let _e207 = (_e205 + _e190);
    let _e208 = textureSampleLevel(r_previous_interpolation_source, s_LinearClamp, _e207, 0f);
    let _e210 = textureSampleLevel(r_current_interpolation_source, s_LinearClamp, _e205, 0f);
    let _e214 = cbFI.minMaxLuminance[0u];
    let _e217 = cbFI.minMaxLuminance[1u];
    let _e219 = vec3((_e214 * 0.0125f));
    let _e223 = vec3(((_e217 - _e214) * 0.0125f));
    let _e226 = (0.001f + dot(((_e208.xyz - _e219) / _e223), vec3<f32>(0.2126f, 0.7152f, 0.0722f)));
    let _e230 = (0.001f + dot(((_e210.xyz - _e219) / _e223), vec3<f32>(0.2126f, 0.7152f, 0.0722f)));
    let _e232 = cbFI.interpolationRectSize;
    let _e233 = vec2<f32>(_e232);
    let _e235 = length((_e190 * _e233));
    let _e244 = (select(0u, 1u, (_e235 > 1f)) * u32((clamp((_e235 / length((_e233 * 0.05f))), 0f, 1f) * 1023f)));
    if (_e244 > 0u) {
        let _e246 = max(_e226, _e230);
        if (_e246 != 0f) {
            phi_293_ = (min(_e226, _e230) / _e246);
        } else {
            phi_293_ = 0f;
        }
        let _e251 = phi_293_;
        phi_303_ = false;
        if (_e207.x > 0f) {
            phi_303_ = (_e207.x < 1f);
        }
        let _e260 = phi_303_;
        phi_312_ = false;
        if _e260 {
            phi_311_ = false;
            if (_e207.y > 0f) {
                phi_311_ = (_e207.y < 1f);
            }
            let _e265 = phi_311_;
            phi_312_ = _e265;
        }
        let _e267 = phi_312_;
        let _e277 = ((2147483648u | ((_e244 & 1023u) << bitcast<u32>(21u))) | (((u32(round((pow(_e251, 1f) * 31f))) * select(0u, 1u, _e267)) & 31u) << bitcast<u32>(16u)));
        local = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
        phi_335_ = 0i;
        loop {
            let _e292 = phi_335_;
            if (_e292 < 4i) {
                let _e295 = local[_e292];
                let _e296 = (vec2<i32>(floor((((_e205 + _e206) * _e204) - vec2<f32>(0.5f, 0.5f)))) + _e295);
                if all((bitcast<vec2<u32>>(_e296) < bitcast<vec2<u32>>(_e203))) {
                    let _e302 = all((_e296 >= vec2<i32>(0i, 0i)));
                    phi_358_ = false;
                    if _e302 {
                        let _e304 = cbFI.maxRenderSize;
                        phi_358_ = all((_e296 < _e304));
                    }
                    let _e308 = phi_358_;
                    if _e308 {
                        let _e311 = cbFI.maxRenderSize;
                        let _e319 = atomicMax((&rw_optical_flow_motion_vector_field_x.member[bitcast<u32>(((_e296.y * _e311.x) + _e296.x))]), (_e277 | pack2x16float(vec2<f32>(_e206.x, 0f))));
                    }
                    phi_377_ = false;
                    if _e302 {
                        let _e321 = cbFI.maxRenderSize;
                        phi_377_ = all((_e296 < _e321));
                    }
                    let _e325 = phi_377_;
                    if _e325 {
                        let _e328 = cbFI.maxRenderSize;
                        let _e336 = atomicMax((&rw_optical_flow_motion_vector_field_y.member[bitcast<u32>(((_e296.y * _e328.x) + _e296.x))]), (_e277 | pack2x16float(vec2<f32>(_e206.y, 0f))));
                    }
                }
                continue;
            } else {
                break;
            }
            continuing {
                phi_335_ = (_e292 + 1i);
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
`;
