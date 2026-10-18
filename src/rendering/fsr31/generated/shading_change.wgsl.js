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
@group(0) @binding(8) 
var r_spd_mips: texture_2d<f32>;
@group(0) @binding(32) 
var rw_shading_change: texture_storage_2d<rgba8unorm,write>;
var<private> global: vec3<i32>;

fn CS_1() {
    var phi_103_: f32;
    var phi_108_: f32;
    var phi_113_: f32;

    let _e13 = global;
    let _e14 = _e13.xy;
    let _e16 = cbFSR3Upscaler.iRenderSize;
    let _e17 = vec2<f32>(_e16);
    let _e19 = vec2<i32>((_e17 * 0.5f));
    let _e20 = bitcast<vec2<u32>>(_e14);
    if all((_e20 < bitcast<vec2<u32>>(_e19))) {
        let _e26 = vec2<f32>(_e19);
        let _e29 = cbFSR3Upscaler.fJitter;
        let _e32 = textureDimensions(r_spd_mips, 0u);
        let _e43 = (max(vec2<f32>(0.5f, 0.5f), min(((((vec2<f32>(_e14) + vec2<f32>(0.5f, 0.5f)) / _e26) + (_e29 / _e17)) * _e26), (_e26 - vec2<f32>(0.5f, 0.5f)))) / vec2<f32>(vec2<i32>(bitcast<i32>(_e32.x), bitcast<i32>(_e32.y))));
        let _e44 = textureSampleLevel(r_spd_mips, s_LinearClamp, _e43, 0f);
        let _e48 = abs((_e44.x * _e44.y));
        let _e49 = textureSampleLevel(r_spd_mips, s_LinearClamp, _e43, 1f);
        let _e53 = abs((_e49.x * _e49.y));
        let _e54 = textureSampleLevel(r_spd_mips, s_LinearClamp, _e43, 2f);
        let _e58 = abs((_e54.x * _e54.y));
        phi_103_ = 0f;
        if (_e48 > 0f) {
            phi_103_ = max(0f, _e48);
        }
        let _e62 = phi_103_;
        phi_108_ = _e62;
        if (_e53 > 0f) {
            phi_108_ = max(_e62, _e53);
        }
        let _e66 = phi_108_;
        phi_113_ = _e66;
        if (_e58 > 0f) {
            phi_113_ = max(_e66, _e58);
        }
        let _e70 = phi_113_;
        textureStore(rw_shading_change, _e20, vec4(clamp(_e70, 0f, 1f)));
    }
    return;
}

@compute @workgroup_size(8, 8, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>) {
    global = vec3<i32>(param);
    CS_1();
}
`;
