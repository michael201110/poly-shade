// Generated from AMD FidelityFX SDK v2.3.0, SR 3.1.5.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL. See scripts/fsr/compile.mjs.
export default String.raw`struct type_u002e_cbFSR3Upscaler {
    iRenderSize: vec2<i32>,
    iPreviousFrameRenderSize: vec2<i32>,
    iUpscaleSize: vec2<i32>,
    iPreviousFrameUpscaleSize: vec2<i32>,
    iMaxRenderSize: vec2<i32>,
    iMaxUpscaleSize: vec2<i32>,
    fDeviceToViewDepth: vec4<f32>,
    fJitter: vec2<f32>,
    fPreviousFrameJitter: vec2<f32>,
    fMotionVectorScale: vec2<f32>,
    fDownscaleFactor: vec2<f32>,
    fMotionVectorJitterCancellation: vec2<f32>,
    fTanHalfFOV: f32,
    fJitterSequenceLength: f32,
    fDeltaTime: f32,
    fDeltaPreExposure: f32,
    fViewSpaceToMetersFactor: f32,
    fFrameIndex: f32,
    fVelocityFactor: f32,
    fReactivenessScale: f32,
    fShadingChangeScale: f32,
    fAccumulationAddedPerFrame: f32,
    fMinDisocclusionAccumulation: f32,
}

@group(0) @binding(0) 
var<uniform> cbFSR3Upscaler: type_u002e_cbFSR3Upscaler;
@group(0) @binding(65) 
var s_LinearClamp: sampler;
@group(0) @binding(32) 
var rw_luma_history: texture_storage_2d<rgba16float,write>;
@group(0) @binding(12) 
var r_luma_history: texture_2d<f32>;
@group(0) @binding(14) 
var r_current_luma: texture_2d<f32>;
@group(0) @binding(33) 
var rw_luma_instability: texture_storage_2d<rgba16float,write>;
@group(0) @binding(10) 
var r_dilated_motion_vectors: texture_2d<f32>;
@group(0) @binding(8) 
var r_input_exposure: texture_2d<f32>;
@group(0) @binding(9) 
var r_dilated_reactive_masks: texture_2d<f32>;
var<private> global: vec3<i32>;

fn CS_1() {
    var local: vec4<f32>;
    var phi_95_: bool;
    var phi_103_: bool;
    var phi_104_: bool;
    var phi_170_: f32;
    var phi_175_: f32;
    var phi_178_: i32;
    var phi_195_: f32;
    var phi_176_: f32;
    var local_1: f32;
    var phi_206_: f32;
    var phi_237_: f32;
    var phi_238_: vec4<f32>;
    var phi_239_: f32;
    var phi_240_: vec4<f32>;
    var local_2: f32;

    let _e34 = global;
    let _e35 = _e34.xy;
    let _e36 = bitcast<vec2<u32>>(_e35);
    let _e37 = textureLoad(r_dilated_motion_vectors, _e36, 0u);
    let _e38 = _e37.xy;
    let _e42 = cbFSR3Upscaler.iRenderSize;
    let _e43 = vec2<f32>(_e42);
    let _e44 = ((vec2<f32>(_e35) + vec2<f32>(0.5f, 0.5f)) / _e43);
    let _e46 = cbFSR3Upscaler.fJitter;
    let _e50 = cbFSR3Upscaler.fPreviousFrameJitter;
    let _e52 = cbFSR3Upscaler.iPreviousFrameRenderSize;
    let _e53 = vec2<f32>(_e52);
    let _e56 = ((_e44 + (_e50 / _e53)) + _e38);
    phi_95_ = false;
    if (_e56.x >= 0f) {
        phi_95_ = (_e56.x <= 1f);
    }
    let _e61 = phi_95_;
    phi_104_ = false;
    if _e61 {
        phi_103_ = false;
        if (_e56.y >= 0f) {
            phi_103_ = (_e56.y <= 1f);
        }
        let _e66 = phi_103_;
        phi_104_ = _e66;
    }
    let _e68 = phi_104_;
    phi_239_ = 0f;
    phi_240_ = vec4<f32>(0f, 0f, 0f, 0f);
    if _e68 {
        let _e70 = cbFSR3Upscaler.iMaxRenderSize;
        let _e75 = vec2<f32>(_e70);
        let _e76 = (max(vec2<f32>(0.5f, 0.5f), min(((_e44 + (_e46 / _e43)) * _e43), (_e43 - vec2<f32>(0.5f, 0.5f)))) / _e75);
        let _e77 = textureSampleLevel(r_dilated_reactive_masks, s_LinearClamp, _e76, 0f);
        phi_237_ = 0f;
        phi_238_ = vec4<f32>(0f, 0f, 0f, 0f);
        if (clamp(_e77.w, 0f, 1f) > 0.9f) {
            let _e87 = textureSampleLevel(r_current_luma, s_LinearClamp, _e76, 0f);
            let _e89 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
            let _e93 = (_e87.x * select(_e89.x, 1f, (_e89.x == 0f)));
            let _e99 = textureSampleLevel(r_luma_history, s_LinearClamp, (max(vec2<f32>(0.5f, 0.5f), min((_e56 * _e53), (_e53 - vec2<f32>(0.5f, 0.5f)))) / _e75), 0f);
            let _e101 = cbFSR3Upscaler.fDeltaPreExposure;
            let _e103 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
            local = ((_e99 * _e101) * select(_e103.x, 1f, (_e103.x == 0f)));
            let _e109 = local[0u];
            let _e111 = local[0u];
            let _e112 = max(_e93, _e111);
            if (_e112 != 0f) {
                phi_170_ = (min(_e93, _e111) / _e112);
            } else {
                phi_170_ = 1f;
            }
            let _e117 = phi_170_;
            phi_206_ = 0f;
            if (_e117 < 1f) {
                phi_175_ = _e117;
                phi_178_ = 1i;
                loop {
                    let _e120 = phi_175_;
                    let _e122 = phi_178_;
                    local_1 = _e120;
                    if (_e122 <= 3i) {
                        let _e126 = local[bitcast<u32>(_e122)];
                        let _e128 = local[bitcast<u32>(_e122)];
                        let _e129 = max(_e93, _e128);
                        if (_e129 != 0f) {
                            phi_195_ = (min(_e93, _e128) / _e129);
                        } else {
                            phi_195_ = 0f;
                        }
                        let _e134 = phi_195_;
                        phi_176_ = _e120;
                        if (i32(sign((_e93 - _e109))) == i32(sign((_e93 - _e126)))) {
                            phi_176_ = max(_e120, _e134);
                        }
                        let _e142 = phi_176_;
                        local_2 = _e142;
                        continue;
                    } else {
                        break;
                    }
                    continuing {
                        let _e194 = local_2;
                        phi_175_ = _e194;
                        phi_178_ = (_e122 + 1i);
                    }
                }
                let _e145 = local_1;
                phi_206_ = select(0f, 1f, (_e145 > _e117));
            }
            let _e149 = phi_206_;
            let _e151 = local[2u];
            local[3u] = _e151;
            let _e154 = local[1u];
            local[2u] = _e154;
            let _e155 = local[0u];
            local[1u] = _e155;
            local[0u] = _e93;
            let _e156 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
            let _e161 = local;
            let _e162 = (_e161 / vec4(select(_e156.x, 1f, (_e156.x == 0f))));
            local = _e162;
            let _e163 = local[3u];
            phi_237_ = ((_e149 * select(0f, 1f, (_e163 != 0f))) * ((((1f - clamp((length((_e38 * vec2<f32>(3840f, 2160f))) * 0.05f), 0f, 1f)) * (1f - clamp(_e77.y, 0f, 1f))) * (1f - clamp(_e77.x, 0f, 1f))) * (1f - clamp(_e77.z, 0f, 1f))));
            phi_238_ = _e162;
        }
        let _e180 = phi_237_;
        let _e182 = phi_238_;
        phi_239_ = _e180;
        phi_240_ = _e182;
    }
    let _e184 = phi_239_;
    let _e186 = phi_240_;
    textureStore(rw_luma_history, _e36, _e186);
    textureStore(rw_luma_instability, _e36, vec4(_e184));
    return;
}

@compute @workgroup_size(8, 8, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>) {
    global = vec3<i32>(param);
    CS_1();
}
`;
