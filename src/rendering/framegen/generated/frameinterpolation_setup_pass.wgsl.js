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

struct type_u002e_RWStructuredBuffer_u002e_uint {
    member: array<u32>,
}

@group(0) @binding(0) 
var<uniform> cbFI: type_u002e_cbFI;
@group(0) @binding(8) 
var<storage> r_optical_flow_scd: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(36) 
var rw_disocclusion_mask: texture_storage_2d<rgba8unorm,write>;
@group(0) @binding(32) 
var<storage, read_write> rw_game_motion_vector_field_x: type_u002e_RWStructuredBuffer_u002e_uint;
@group(0) @binding(33) 
var<storage, read_write> rw_game_motion_vector_field_y: type_u002e_RWStructuredBuffer_u002e_uint;
@group(0) @binding(34) 
var<storage, read_write> rw_optical_flow_motion_vector_field_x: type_u002e_RWStructuredBuffer_u002e_uint;
@group(0) @binding(35) 
var<storage, read_write> rw_optical_flow_motion_vector_field_y: type_u002e_RWStructuredBuffer_u002e_uint;
@group(0) @binding(37) 
var<storage, read_write> rw_counters: type_u002e_RWStructuredBuffer_u002e_uint;
var<private> global: vec3<i32>;

fn CS_1() {
    var phi_66_: bool;
    var phi_82_: bool;
    var phi_100_: bool;
    var phi_118_: bool;
    var phi_136_: bool;

    let _e21 = global;
    let _e22 = _e21.xy;
    rw_counters.member[0u] = 0u;
    if all((_e22 == vec2<i32>(0i, 0i))) {
        let _e28 = cbFI.reset;
        phi_66_ = true;
        if (_e28 != 1i) {
            let _e32 = r_optical_flow_scd.member[1u];
            phi_66_ = ((_e32 & 15u) != 0u);
        }
        let _e36 = phi_66_;
        if _e36 {
            rw_counters.member[1u] = 0u;
        } else {
            let _e39 = rw_counters.member[1u];
            rw_counters.member[1u] = (_e39 + 1u);
        }
    }
    let _e44 = all((_e22 >= vec2<i32>(0i, 0i)));
    phi_82_ = false;
    if _e44 {
        let _e46 = cbFI.maxRenderSize;
        phi_82_ = all((_e22 < _e46));
    }
    let _e50 = phi_82_;
    if _e50 {
        let _e53 = cbFI.maxRenderSize;
        rw_game_motion_vector_field_x.member[bitcast<u32>(((_e21.y * _e53.x) + _e21.x))] = 0u;
    }
    phi_100_ = false;
    if _e44 {
        let _e62 = cbFI.maxRenderSize;
        phi_100_ = all((_e22 < _e62));
    }
    let _e66 = phi_100_;
    if _e66 {
        let _e69 = cbFI.maxRenderSize;
        rw_game_motion_vector_field_y.member[bitcast<u32>(((_e21.y * _e69.x) + _e21.x))] = 0u;
    }
    phi_118_ = false;
    if _e44 {
        let _e78 = cbFI.maxRenderSize;
        phi_118_ = all((_e22 < _e78));
    }
    let _e82 = phi_118_;
    if _e82 {
        let _e85 = cbFI.maxRenderSize;
        rw_optical_flow_motion_vector_field_x.member[bitcast<u32>(((_e21.y * _e85.x) + _e21.x))] = 0u;
    }
    phi_136_ = false;
    if _e44 {
        let _e94 = cbFI.maxRenderSize;
        phi_136_ = all((_e22 < _e94));
    }
    let _e98 = phi_136_;
    if _e98 {
        let _e101 = cbFI.maxRenderSize;
        rw_optical_flow_motion_vector_field_y.member[bitcast<u32>(((_e21.y * _e101.x) + _e21.x))] = 0u;
    }
    textureStore(rw_disocclusion_mask, bitcast<vec2<u32>>(_e22), vec2<f32>(0f, 0f).xyyy);
    return;
}

@compute @workgroup_size(8, 8, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>) {
    global = vec3<i32>(param);
    CS_1();
}
`;
