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
@group(0) @binding(8) 
var r_dilated_motion_vectors: texture_2d<f32>;
@group(0) @binding(9) 
var r_dilated_depth: texture_2d<f32>;
@group(0) @binding(11) 
var r_input_distortion_field: texture_2d<f32>;
@group(0) @binding(32) 
var<storage, read_write> rw_reconstructed_depth_interpolated_frame: type_u002e_RWStructuredBuffer_u002e_uint_1;
var<private> global: vec3<i32>;

fn CS_1() {
    var local: array<f32, 4>;
    var local_1: array<vec2<i32>, 4>;
    var phi_103_: i32;
    var phi_132_: bool;

    let _e27 = global;
    let _e28 = _e27.xy;
    let _e32 = cbFI.renderSize;
    let _e33 = vec2<f32>(_e32);
    let _e34 = ((vec2<f32>(_e28) + vec2<f32>(0.5f, 0.5f)) / _e33);
    let _e35 = textureSampleLevel(r_input_distortion_field, s_LinearClamp, _e34, 0f);
    let _e40 = bitcast<vec2<u32>>((_e28 + vec2<i32>((_e35.xy * _e33))));
    let _e41 = textureLoad(r_dilated_motion_vectors, _e40, 0u);
    let _e43 = textureLoad(r_dilated_depth, _e40, 0u);
    let _e48 = (((_e34 + (_e41.xy * 0.5f)) * _e33) - vec2<f32>(0.5f, 0.5f));
    let _e49 = floor(_e48);
    let _e51 = (_e48 - _e49);
    let _e53 = (1f - _e51.x);
    let _e55 = (1f - _e51.y);
    local_1 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
    local = array<f32, 4>((_e53 * _e55), (_e51.x * _e55), (_e53 * _e51.y), (_e51.x * _e51.y));
    phi_103_ = 0i;
    loop {
        let _e62 = phi_103_;
        if (_e62 < 4i) {
            let _e65 = local_1[_e62];
            let _e66 = (vec2<i32>(_e49) + _e65);
            let _e68 = local[_e62];
            if (_e68 > 0.001f) {
                if all((bitcast<vec2<u32>>(_e66) < bitcast<vec2<u32>>(_e32))) {
                    phi_132_ = false;
                    if all((_e66 >= vec2<i32>(0i, 0i))) {
                        let _e78 = cbFI.maxRenderSize;
                        phi_132_ = all((_e66 < _e78));
                    }
                    let _e82 = phi_132_;
                    if _e82 {
                        let _e85 = cbFI.maxRenderSize;
                        let _e93 = atomicMin((&rw_reconstructed_depth_interpolated_frame.member[bitcast<u32>(((_e66.y * _e85.x) + _e66.x))]), bitcast<u32>(_e43.x));
                    }
                }
            }
            continue;
        } else {
            break;
        }
        continuing {
            phi_103_ = (_e62 + 1i);
        }
    }
    return;
}

@compute @workgroup_size(8, 8, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>) {
    global = vec3<i32>(param);
    CS_1();
}
