// AMD FidelityFX SDK v2.3.0, Frame Interpolation 3.1.6.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL; scripts/fg/compile.mjs.
struct type_u002e_cbPolyShadeFG {
    polyFlowSize: vec2<i32>,
    polyPreviousFlowSize: vec2<i32>,
    polyNextFlowSize: vec2<i32>,
    polyReserved: vec2<i32>,
}

struct type_u002e_StructuredBuffer_u002e_v2int {
    member: array<vec2<i32>>,
}

struct type_u002e_RWStructuredBuffer_u002e_v2int {
    member: array<vec2<i32>>,
}

@group(0) @binding(2) 
var<uniform> cbPolyShadeFG: type_u002e_cbPolyShadeFG;
@group(0) @binding(8) 
var<storage> r_optical_flow_previous: type_u002e_StructuredBuffer_u002e_v2int;
@group(0) @binding(32) 
var<storage, read_write> rw_optical_flow: type_u002e_RWStructuredBuffer_u002e_v2int;
var<private> global: vec3<i32>;

fn CS_1() {
    var local: array<vec2<i32>, 9>;
    var phi_49_: i32;
    var phi_52_: i32;
    var phi_53_: i32;
    var phi_60_: i32;
    var phi_77_: bool;
    var phi_89_: vec2<i32>;
    var phi_92_: u32;
    var phi_95_: i32;
    var phi_101_: u32;
    var phi_104_: i32;
    var local_1: u32;
    var local_2: u32;
    var phi_134_: bool;
    var local_3: i32;
    var local_4: i32;
    var local_5: u32;

    let _e21 = global;
    let _e22 = _e21.xy;
    phi_49_ = -1i;
    phi_52_ = 0i;
    loop {
        let _e24 = phi_49_;
        let _e26 = phi_52_;
        if (_e24 < 2i) {
            phi_53_ = _e26;
            phi_60_ = -1i;
            loop {
                let _e29 = phi_53_;
                let _e31 = phi_60_;
                local_3 = _e29;
                if (_e31 < 2i) {
                    let _e34 = (_e22 + vec2<i32>(_e24, _e31));
                    switch bitcast<i32>(0u) {
                        default: {
                            phi_77_ = false;
                            if all((_e34 >= vec2<i32>(0i, 0i))) {
                                let _e39 = cbPolyShadeFG.polyPreviousFlowSize;
                                phi_77_ = all((_e34 < _e39));
                            }
                            let _e43 = phi_77_;
                            if _e43 {
                                let _e47 = cbPolyShadeFG.polyPreviousFlowSize[0i];
                                let _e54 = r_optical_flow_previous.member[bitcast<u32>(((_e34.y * _e47) + _e34.x))];
                                phi_89_ = _e54;
                                break;
                            }
                            phi_89_ = vec2<i32>(0i, 0i);
                            break;
                        }
                    }
                    let _e56 = phi_89_;
                    local[_e29] = _e56;
                    local_4 = (_e29 + 1i);
                    continue;
                } else {
                    break;
                }
                continuing {
                    let _e123 = local_4;
                    phi_53_ = _e123;
                    phi_60_ = (_e31 + 1i);
                }
            }
            continue;
        } else {
            break;
        }
        continuing {
            phi_49_ = (_e24 + 1i);
            let _e120 = local_3;
            phi_52_ = _e120;
        }
    }
    phi_92_ = 4294967295u;
    phi_95_ = 0i;
    loop {
        let _e62 = phi_92_;
        let _e64 = phi_95_;
        local_2 = _e62;
        if (_e64 < 9i) {
            phi_101_ = 0u;
            phi_104_ = 0i;
            loop {
                let _e67 = phi_101_;
                let _e69 = phi_104_;
                local_1 = _e67;
                if (_e69 < 9i) {
                    continue;
                } else {
                    break;
                }
                continuing {
                    let _e72 = local[_e64];
                    let _e74 = local[_e69];
                    let _e75 = (_e72 - _e74);
                    phi_101_ = (bitcast<u32>((_e75.x * _e75.x)) + (bitcast<u32>((_e75.y * _e75.y)) + _e67));
                    phi_104_ = (_e69 + 1i);
                }
            }
            let _e86 = local_1;
            local_5 = min(((_e86 << bitcast<u32>(4u)) | bitcast<u32>(_e64)), _e62);
            continue;
        } else {
            break;
        }
        continuing {
            let _e129 = local_5;
            phi_92_ = _e129;
            phi_95_ = (_e64 + 1i);
        }
    }
    let _e94 = local_2;
    let _e97 = local[(_e94 & 15u)];
    phi_134_ = false;
    if all((_e22 >= vec2<i32>(0i, 0i))) {
        let _e101 = cbPolyShadeFG.polyFlowSize;
        phi_134_ = all((_e22 < _e101));
    }
    let _e105 = phi_134_;
    if _e105 {
        let _e110 = cbPolyShadeFG.polyFlowSize[0i];
        rw_optical_flow.member[bitcast<u32>(((_e21.y * _e110) + _e21.x))] = clamp(_e97, vec2<i32>(-32768i, -32768i), vec2<i32>(32767i, 32767i));
    }
    return;
}

@compute @workgroup_size(16, 4, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>) {
    global = vec3<i32>(param);
    CS_1();
}
