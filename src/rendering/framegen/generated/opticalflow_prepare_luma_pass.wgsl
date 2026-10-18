// AMD FidelityFX SDK v2.3.0, Frame Interpolation 3.1.6.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL; scripts/fg/compile.mjs.
struct type_u002e_cbOF {
    iInputLumaResolution: vec2<i32>,
    uOpticalFlowPyramidLevel: u32,
    uOpticalFlowPyramidLevelCount: u32,
    iFrameIndex: u32,
    backbufferTransferFunction: u32,
    minMaxLuminance: vec2<f32>,
}

@group(0) @binding(0) 
var<uniform> cbOF: type_u002e_cbOF;
@group(0) @binding(8) 
var r_input_color: texture_2d<f32>;
@group(0) @binding(32) 
var rw_optical_flow_input: texture_storage_2d<r32uint,write>;
var<private> global: vec3<i32>;

fn CS_1() {
    var phi_47_: i32;
    var phi_54_: i32;
    var phi_94_: f32;

    let _e20 = global;
    phi_47_ = 0i;
    loop {
        let _e23 = phi_47_;
        if (_e23 < 2i) {
            phi_54_ = 0i;
            loop {
                let _e26 = phi_54_;
                if (_e26 < 2i) {
                    let _e31 = bitcast<vec2<u32>>(((_e20.xy * vec2<i32>(2i, 2i)) + vec2<i32>(_e26, _e23)));
                    let _e32 = textureLoad(r_input_color, _e31, 0u);
                    let _e35 = cbOF.minMaxLuminance;
                    let _e44 = ((_e32.xyz - vec3((_e35.x * 0.0125f))) / vec3(((_e35.y - _e35.x) * 0.0125f)));
                    let _e52 = (((0.2126f * _e44.x) + (0.7152f * _e44.y)) + (0.0722f * _e44.z));
                    if (_e52 <= 0.008856452f) {
                        phi_94_ = (_e52 * 903.2963f);
                    } else {
                        phi_94_ = ((pow(_e52, 0.33333334f) * 116f) - 16f);
                    }
                    let _e59 = phi_94_;
                    textureStore(rw_optical_flow_input, _e31, vec4(u32((_e59 * 2.55f))));
                    continue;
                } else {
                    break;
                }
                continuing {
                    phi_54_ = (_e26 + 1i);
                }
            }
            continue;
        } else {
            break;
        }
        continuing {
            phi_47_ = (_e23 + 1i);
        }
    }
    return;
}

@compute @workgroup_size(16, 16, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>) {
    global = vec3<i32>(param);
    CS_1();
}
