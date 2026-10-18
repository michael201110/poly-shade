// Generated from AMD FidelityFX SDK v2.3.0, SR 3.1.5.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL. See scripts/fsr/compile.mjs.
struct type_u002e_cbGenerateReactive {
    gen_reactive_scale: f32,
    gen_reactive_threshold: f32,
    gen_reactive_binaryValue: f32,
    gen_reactive_flags: u32,
}

@group(0) @binding(1) 
var<uniform> cbGenerateReactive: type_u002e_cbGenerateReactive;
@group(0) @binding(9) 
var r_input_color_jittered: texture_2d<f32>;
@group(0) @binding(8) 
var r_input_opaque_only: texture_2d<f32>;
@group(0) @binding(32) 
var rw_output_autoreactive: texture_storage_2d<rgba8unorm,write>;
var<private> global: vec3<u32>;
var<private> global_1: vec3<u32>;

fn CS_1() {
    var phi_78_: vec3<f32>;
    var phi_79_: vec3<f32>;
    var phi_102_: vec3<f32>;
    var phi_103_: vec3<f32>;
    var phi_117_: f32;
    var phi_134_: f32;
    var phi_135_: f32;

    let _e19 = global;
    let _e21 = global_1;
    let _e24 = ((_e19.xy * vec2<u32>(8u, 8u)) + _e21.xy);
    let _e25 = textureLoad(r_input_opaque_only, _e24, 0u);
    let _e26 = _e25.xyz;
    let _e27 = textureLoad(r_input_color_jittered, _e24, 0u);
    let _e28 = _e27.xyz;
    let _e30 = cbGenerateReactive.gen_reactive_flags;
    phi_78_ = _e28;
    phi_79_ = _e26;
    if ((_e30 & 1u) != 0u) {
        phi_78_ = (_e28 / vec3((max(max(0f, _e27.x), max(_e27.y, _e27.z)) + 1f)));
        phi_79_ = (_e26 / vec3((max(max(0f, _e25.x), max(_e25.y, _e25.z)) + 1f)));
    }
    let _e52 = phi_78_;
    let _e54 = phi_79_;
    phi_102_ = _e54;
    phi_103_ = _e52;
    if ((_e30 & 2u) != 0u) {
        phi_102_ = (_e54 / vec3(max(0.000061f, (1f - max(_e54.x, max(_e54.y, _e54.z))))));
        phi_103_ = (_e52 / vec3(max(0.000061f, (1f - max(_e52.x, max(_e52.y, _e52.z))))));
    }
    let _e76 = phi_102_;
    let _e78 = phi_103_;
    let _e80 = abs((_e78 - _e76));
    if ((_e30 & 8u) != 0u) {
        phi_117_ = max(_e80.x, max(_e80.y, _e80.z));
    } else {
        phi_117_ = length(_e80);
    }
    let _e90 = phi_117_;
    let _e92 = cbGenerateReactive.gen_reactive_scale;
    let _e93 = (_e90 * _e92);
    if ((_e30 & 4u) != 0u) {
        let _e97 = cbGenerateReactive.gen_reactive_threshold;
        if (_e93 < _e97) {
            phi_134_ = 0f;
        } else {
            let _e100 = cbGenerateReactive.gen_reactive_binaryValue;
            phi_134_ = _e100;
        }
        let _e102 = phi_134_;
        phi_135_ = _e102;
    } else {
        phi_135_ = _e93;
    }
    let _e104 = phi_135_;
    textureStore(rw_output_autoreactive, _e24, vec4(_e104));
    return;
}

@compute @workgroup_size(8, 8, 1) 
fn CS(@builtin(workgroup_id) param: vec3<u32>, @builtin(local_invocation_id) param_1: vec3<u32>) {
    global = param;
    global_1 = param_1;
    CS_1();
}
