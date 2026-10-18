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

struct type_u002e_cbSPD {
    mips: u32,
    numWorkGroups: u32,
    workGroupOffset: vec2<u32>,
    renderSize: vec2<u32>,
}

struct type_u002e_RWStructuredBuffer_u002e_v4float {
    member: array<vec4<f32>>,
}

@group(0) @binding(0) 
var<uniform> cbFSR3Upscaler: type_u002e_cbFSR3Upscaler;
@group(0) @binding(1) 
var<uniform> cbSPD: type_u002e_cbSPD;
@group(0) @binding(9) 
var r_farthest_depth: texture_2d<f32>;
@group(0) @binding(40) 
var rw_farthest_depth_mip1_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(8) 
var r_current_luma: texture_2d<f32>;
@group(0) @binding(33) 
var<storage, read_write> rw_frame_info: type_u002e_RWStructuredBuffer_u002e_v4float;
@group(0) @binding(39) 
var rw_spd_mip5_: texture_storage_2d<rgba16float,write>;
var<workgroup> spdIntermediateR: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateG: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateB: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateA: array<array<f32, 16>, 16>;
var<private> global: vec3<u32>;
var<private> global_1: u32;

fn CS_1() {
    var local: array<vec4<f32>, 4>;
    var phi_269_: f32;
    var phi_409_: f32;
    var phi_549_: f32;
    var phi_685_: f32;
    var phi_698_: u32;
    var phi_796_: f32;
    var local_1: u32;
    var local_2: u32;
    var local_3: u32;
    var local_4: u32;
    var local_5: u32;
    var local_6: u32;
    var local_7: u32;
    var local_8: u32;
    var local_9: u32;
    var local_10: u32;
    var local_11: u32;
    var local_12: u32;
    var local_13: u32;
    var local_14: u32;
    var local_15: u32;
    var local_16: u32;
    var local_17: u32;
    var local_18: u32;
    var local_19: vec2<i32>;
    var local_20: u32;
    var phi_923_: f32;
    var local_21: u32;
    var local_22: u32;
    var local_23: u32;
    var local_24: u32;
    var local_25: u32;
    var local_26: vec2<i32>;
    var local_27: u32;
    var phi_1021_: f32;
    var local_28: u32;
    var local_29: u32;
    var local_30: u32;
    var local_31: u32;
    var local_32: vec2<i32>;
    var local_33: u32;
    var phi_1122_: f32;
    var local_34: u32;
    var local_35: u32;
    var phi_1197_: f32;

    let _e52 = global;
    let _e53 = global_1;
    let _e56 = cbSPD.mips;
    let _e58 = cbSPD.workGroupOffset;
    let _e59 = (_e52.xy + _e58);
    switch bitcast<i32>(0u) {
        default: {
            let _e61 = (_e53 % 64u);
            let _e78 = (((_e61 & 1u) | ((_e61 >> bitcast<u32>(2u)) & 6u)) + (8u * ((_e53 >> bitcast<u32>(6u)) % 2u)));
            let _e82 = ((((_e61 >> bitcast<u32>(1u)) & 3u) | ((_e61 >> bitcast<u32>(3u)) & 4u)) + (8u * (_e53 >> bitcast<u32>(7u))));
            switch bitcast<i32>(0u) {
                default: {
                    let _e85 = bitcast<vec2<i32>>((_e59 * vec2<u32>(64u, 64u)));
                    let _e86 = (_e78 * 2u);
                    let _e87 = bitcast<i32>(_e86);
                    let _e88 = (_e82 * 2u);
                    let _e89 = bitcast<i32>(_e88);
                    let _e91 = (_e85 + vec2<i32>(_e87, _e89));
                    let _e93 = bitcast<vec2<i32>>((_e59 * vec2<u32>(32u, 32u)));
                    let _e94 = bitcast<i32>(_e78);
                    let _e95 = bitcast<i32>(_e82);
                    let _e96 = vec2<i32>(_e94, _e95);
                    let _e97 = (_e93 + _e96);
                    let _e98 = bitcast<vec2<u32>>(_e91);
                    let _e103 = vec2<i32>(vec2<f32>(_e91));
                    let _e105 = cbFSR3Upscaler.iRenderSize;
                    let _e108 = (_e105.x - 1i);
                    let _e113 = (_e105.y - 1i);
                    let _e117 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e103.x, _e108)), max(0i, min(_e103.y, _e113))));
                    let _e118 = textureLoad(r_current_luma, _e117, 0u);
                    let _e122 = textureLoad(r_farthest_depth, _e117, 0u);
                    let _e128 = vec4<f32>(max(0.000061f, log(_e118.x)), vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    let _e133 = vec4<f32>(_e128.x, _e118.x, _e128.z, _e128.w);
                    let _e141 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e98 + vec2<u32>(0u, 1u)))));
                    let _e149 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e141.x, _e108)), max(0i, min(_e141.y, _e113))));
                    let _e150 = textureLoad(r_current_luma, _e149, 0u);
                    let _e154 = textureLoad(r_farthest_depth, _e149, 0u);
                    let _e160 = vec4<f32>(max(0.000061f, log(_e150.x)), vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    let _e165 = vec4<f32>(_e160.x, _e150.x, _e160.z, _e160.w);
                    let _e173 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e98 + vec2<u32>(1u, 0u)))));
                    let _e181 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e173.x, _e108)), max(0i, min(_e173.y, _e113))));
                    let _e182 = textureLoad(r_current_luma, _e181, 0u);
                    let _e186 = textureLoad(r_farthest_depth, _e181, 0u);
                    let _e192 = vec4<f32>(max(0.000061f, log(_e182.x)), vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    let _e197 = vec4<f32>(_e192.x, _e182.x, _e192.z, _e192.w);
                    let _e205 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e98 + vec2<u32>(1u, 1u)))));
                    let _e213 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e205.x, _e108)), max(0i, min(_e205.y, _e113))));
                    let _e214 = textureLoad(r_current_luma, _e213, 0u);
                    let _e218 = textureLoad(r_farthest_depth, _e213, 0u);
                    let _e224 = vec4<f32>(max(0.000061f, log(_e214.x)), vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    let _e229 = vec4<f32>(_e224.x, _e214.x, _e224.z, _e224.w);
                    local[0i] = ((((vec4<f32>(_e133.x, _e133.y, _e122.x, _e133.w) + vec4<f32>(_e165.x, _e165.y, _e154.x, _e165.w)) + vec4<f32>(_e197.x, _e197.y, _e186.x, _e197.w)) + vec4<f32>(_e229.x, _e229.y, _e218.x, _e229.w)) * 0.25f);
                    let _e240 = local[0i];
                    textureStore(rw_farthest_depth_mip1_, bitcast<vec2<u32>>(_e97), vec4(_e240.z));
                    let _e244 = (_e56 - 1u);
                    let _e245 = (0u == _e244);
                    local_1 = _e86;
                    local_2 = _e88;
                    local_3 = _e86;
                    local_4 = _e88;
                    local_5 = _e86;
                    local_6 = _e88;
                    local_7 = _e86;
                    local_8 = _e88;
                    local_9 = _e86;
                    local_10 = _e88;
                    local_11 = _e88;
                    local_12 = _e88;
                    local_13 = _e88;
                    local_14 = _e88;
                    local_15 = _e86;
                    local_16 = _e86;
                    local_17 = _e86;
                    local_18 = _e86;
                    local_19 = _e96;
                    local_20 = _e244;
                    local_21 = _e86;
                    local_22 = _e88;
                    local_23 = _e88;
                    local_24 = _e88;
                    local_25 = _e88;
                    local_26 = _e96;
                    local_27 = _e244;
                    local_28 = _e88;
                    local_29 = _e88;
                    local_30 = _e88;
                    local_31 = _e88;
                    local_32 = _e96;
                    local_33 = _e244;
                    local_34 = _e88;
                    local_35 = _e244;
                    if _e245 {
                        if all((_e97 == vec2<i32>(0i, 0i))) {
                            let _e250 = rw_frame_info.member[0u];
                            phi_269_ = _e240.x;
                            if (_e250.y < 10000f) {
                                let _e257 = cbFSR3Upscaler.fDeltaTime;
                                phi_269_ = max(0f, (_e250.y + ((_e240.x - _e250.y) * (1f - exp(-(_e257))))));
                            }
                            let _e265 = phi_269_;
                            let _e275 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e265) * 8f)))), _e250.y, _e250.z, _e250.w);
                            let _e280 = vec4<f32>(_e275.x, _e265, _e275.z, _e275.w);
                            rw_frame_info.member[0u] = vec4<f32>(_e280.x, _e280.y, _e240.y, _e280.w);
                        }
                    }
                    let _e287 = bitcast<i32>((_e86 + 32u));
                    let _e289 = (_e85 + vec2<i32>(_e287, _e89));
                    let _e291 = bitcast<i32>((_e78 + 16u));
                    let _e293 = (_e93 + vec2<i32>(_e291, _e95));
                    let _e294 = bitcast<vec2<u32>>(_e289);
                    let _e299 = vec2<i32>(vec2<f32>(_e289));
                    let _e307 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e299.x, _e108)), max(0i, min(_e299.y, _e113))));
                    let _e308 = textureLoad(r_current_luma, _e307, 0u);
                    let _e312 = textureLoad(r_farthest_depth, _e307, 0u);
                    let _e318 = vec4<f32>(max(0.000061f, log(_e308.x)), vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    let _e323 = vec4<f32>(_e318.x, _e308.x, _e318.z, _e318.w);
                    let _e331 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e294 + vec2<u32>(0u, 1u)))));
                    let _e339 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e331.x, _e108)), max(0i, min(_e331.y, _e113))));
                    let _e340 = textureLoad(r_current_luma, _e339, 0u);
                    let _e344 = textureLoad(r_farthest_depth, _e339, 0u);
                    let _e350 = vec4<f32>(max(0.000061f, log(_e340.x)), vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    let _e355 = vec4<f32>(_e350.x, _e340.x, _e350.z, _e350.w);
                    let _e363 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e294 + vec2<u32>(1u, 0u)))));
                    let _e371 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e363.x, _e108)), max(0i, min(_e363.y, _e113))));
                    let _e372 = textureLoad(r_current_luma, _e371, 0u);
                    let _e376 = textureLoad(r_farthest_depth, _e371, 0u);
                    let _e382 = vec4<f32>(max(0.000061f, log(_e372.x)), vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    let _e387 = vec4<f32>(_e382.x, _e372.x, _e382.z, _e382.w);
                    let _e395 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e294 + vec2<u32>(1u, 1u)))));
                    let _e403 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e395.x, _e108)), max(0i, min(_e395.y, _e113))));
                    let _e404 = textureLoad(r_current_luma, _e403, 0u);
                    let _e408 = textureLoad(r_farthest_depth, _e403, 0u);
                    let _e414 = vec4<f32>(max(0.000061f, log(_e404.x)), vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    let _e419 = vec4<f32>(_e414.x, _e404.x, _e414.z, _e414.w);
                    local[1i] = ((((vec4<f32>(_e323.x, _e323.y, _e312.x, _e323.w) + vec4<f32>(_e355.x, _e355.y, _e344.x, _e355.w)) + vec4<f32>(_e387.x, _e387.y, _e376.x, _e387.w)) + vec4<f32>(_e419.x, _e419.y, _e408.x, _e419.w)) * 0.25f);
                    let _e430 = local[1i];
                    textureStore(rw_farthest_depth_mip1_, bitcast<vec2<u32>>(_e293), vec4(_e430.z));
                    if _e245 {
                        if all((_e293 == vec2<i32>(0i, 0i))) {
                            let _e438 = rw_frame_info.member[0u];
                            phi_409_ = _e430.x;
                            if (_e438.y < 10000f) {
                                let _e445 = cbFSR3Upscaler.fDeltaTime;
                                phi_409_ = max(0f, (_e438.y + ((_e430.x - _e438.y) * (1f - exp(-(_e445))))));
                            }
                            let _e453 = phi_409_;
                            let _e463 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e453) * 8f)))), _e438.y, _e438.z, _e438.w);
                            let _e468 = vec4<f32>(_e463.x, _e453, _e463.z, _e463.w);
                            rw_frame_info.member[0u] = vec4<f32>(_e468.x, _e468.y, _e430.y, _e468.w);
                        }
                    }
                    let _e475 = bitcast<i32>((_e88 + 32u));
                    let _e477 = (_e85 + vec2<i32>(_e87, _e475));
                    let _e479 = bitcast<i32>((_e82 + 16u));
                    let _e481 = (_e93 + vec2<i32>(_e94, _e479));
                    let _e482 = bitcast<vec2<u32>>(_e477);
                    let _e487 = vec2<i32>(vec2<f32>(_e477));
                    let _e495 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e487.x, _e108)), max(0i, min(_e487.y, _e113))));
                    let _e496 = textureLoad(r_current_luma, _e495, 0u);
                    let _e500 = textureLoad(r_farthest_depth, _e495, 0u);
                    let _e506 = vec4<f32>(max(0.000061f, log(_e496.x)), vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    let _e511 = vec4<f32>(_e506.x, _e496.x, _e506.z, _e506.w);
                    let _e519 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e482 + vec2<u32>(0u, 1u)))));
                    let _e527 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e519.x, _e108)), max(0i, min(_e519.y, _e113))));
                    let _e528 = textureLoad(r_current_luma, _e527, 0u);
                    let _e532 = textureLoad(r_farthest_depth, _e527, 0u);
                    let _e538 = vec4<f32>(max(0.000061f, log(_e528.x)), vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    let _e543 = vec4<f32>(_e538.x, _e528.x, _e538.z, _e538.w);
                    let _e551 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e482 + vec2<u32>(1u, 0u)))));
                    let _e559 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e551.x, _e108)), max(0i, min(_e551.y, _e113))));
                    let _e560 = textureLoad(r_current_luma, _e559, 0u);
                    let _e564 = textureLoad(r_farthest_depth, _e559, 0u);
                    let _e570 = vec4<f32>(max(0.000061f, log(_e560.x)), vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    let _e575 = vec4<f32>(_e570.x, _e560.x, _e570.z, _e570.w);
                    let _e583 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e482 + vec2<u32>(1u, 1u)))));
                    let _e591 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e583.x, _e108)), max(0i, min(_e583.y, _e113))));
                    let _e592 = textureLoad(r_current_luma, _e591, 0u);
                    let _e596 = textureLoad(r_farthest_depth, _e591, 0u);
                    let _e602 = vec4<f32>(max(0.000061f, log(_e592.x)), vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    let _e607 = vec4<f32>(_e602.x, _e592.x, _e602.z, _e602.w);
                    local[2i] = ((((vec4<f32>(_e511.x, _e511.y, _e500.x, _e511.w) + vec4<f32>(_e543.x, _e543.y, _e532.x, _e543.w)) + vec4<f32>(_e575.x, _e575.y, _e564.x, _e575.w)) + vec4<f32>(_e607.x, _e607.y, _e596.x, _e607.w)) * 0.25f);
                    let _e618 = local[2i];
                    textureStore(rw_farthest_depth_mip1_, bitcast<vec2<u32>>(_e481), vec4(_e618.z));
                    if _e245 {
                        if all((_e481 == vec2<i32>(0i, 0i))) {
                            let _e626 = rw_frame_info.member[0u];
                            phi_549_ = _e618.x;
                            if (_e626.y < 10000f) {
                                let _e633 = cbFSR3Upscaler.fDeltaTime;
                                phi_549_ = max(0f, (_e626.y + ((_e618.x - _e626.y) * (1f - exp(-(_e633))))));
                            }
                            let _e641 = phi_549_;
                            let _e651 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e641) * 8f)))), _e626.y, _e626.z, _e626.w);
                            let _e656 = vec4<f32>(_e651.x, _e641, _e651.z, _e651.w);
                            rw_frame_info.member[0u] = vec4<f32>(_e656.x, _e656.y, _e618.y, _e656.w);
                        }
                    }
                    let _e663 = (_e85 + vec2<i32>(_e287, _e475));
                    let _e665 = (_e93 + vec2<i32>(_e291, _e479));
                    let _e666 = bitcast<vec2<u32>>(_e663);
                    let _e671 = vec2<i32>(vec2<f32>(_e663));
                    let _e679 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e671.x, _e108)), max(0i, min(_e671.y, _e113))));
                    let _e680 = textureLoad(r_current_luma, _e679, 0u);
                    let _e684 = textureLoad(r_farthest_depth, _e679, 0u);
                    let _e690 = vec4<f32>(max(0.000061f, log(_e680.x)), vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    let _e695 = vec4<f32>(_e690.x, _e680.x, _e690.z, _e690.w);
                    let _e703 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e666 + vec2<u32>(0u, 1u)))));
                    let _e711 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e703.x, _e108)), max(0i, min(_e703.y, _e113))));
                    let _e712 = textureLoad(r_current_luma, _e711, 0u);
                    let _e716 = textureLoad(r_farthest_depth, _e711, 0u);
                    let _e722 = vec4<f32>(max(0.000061f, log(_e712.x)), vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    let _e727 = vec4<f32>(_e722.x, _e712.x, _e722.z, _e722.w);
                    let _e735 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e666 + vec2<u32>(1u, 0u)))));
                    let _e743 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e735.x, _e108)), max(0i, min(_e735.y, _e113))));
                    let _e744 = textureLoad(r_current_luma, _e743, 0u);
                    let _e748 = textureLoad(r_farthest_depth, _e743, 0u);
                    let _e754 = vec4<f32>(max(0.000061f, log(_e744.x)), vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    let _e759 = vec4<f32>(_e754.x, _e744.x, _e754.z, _e754.w);
                    let _e767 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e666 + vec2<u32>(1u, 1u)))));
                    let _e775 = bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e767.x, _e108)), max(0i, min(_e767.y, _e113))));
                    let _e776 = textureLoad(r_current_luma, _e775, 0u);
                    let _e780 = textureLoad(r_farthest_depth, _e775, 0u);
                    let _e786 = vec4<f32>(max(0.000061f, log(_e776.x)), vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    let _e791 = vec4<f32>(_e786.x, _e776.x, _e786.z, _e786.w);
                    local[3i] = ((((vec4<f32>(_e695.x, _e695.y, _e684.x, _e695.w) + vec4<f32>(_e727.x, _e727.y, _e716.x, _e727.w)) + vec4<f32>(_e759.x, _e759.y, _e748.x, _e759.w)) + vec4<f32>(_e791.x, _e791.y, _e780.x, _e791.w)) * 0.25f);
                    let _e802 = local[3i];
                    textureStore(rw_farthest_depth_mip1_, bitcast<vec2<u32>>(_e665), vec4(_e802.z));
                    if _e245 {
                        if all((_e665 == vec2<i32>(0i, 0i))) {
                            let _e810 = rw_frame_info.member[0u];
                            phi_685_ = _e802.x;
                            if (_e810.y < 10000f) {
                                let _e817 = cbFSR3Upscaler.fDeltaTime;
                                phi_685_ = max(0f, (_e810.y + ((_e802.x - _e810.y) * (1f - exp(-(_e817))))));
                            }
                            let _e825 = phi_685_;
                            let _e835 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e825) * 8f)))), _e810.y, _e810.z, _e810.w);
                            let _e840 = vec4<f32>(_e835.x, _e825, _e835.z, _e835.w);
                            rw_frame_info.member[0u] = vec4<f32>(_e840.x, _e840.y, _e802.y, _e840.w);
                        }
                    }
                    if (_e56 <= 1u) {
                        break;
                    }
                    phi_698_ = 0u;
                    loop {
                        let _e848 = phi_698_;
                        if (_e848 < 4u) {
                            let _e851 = local[_e848];
                            spdIntermediateR[_e78][_e82] = _e851.x;
                            spdIntermediateG[_e78][_e82] = _e851.y;
                            spdIntermediateB[_e78][_e82] = _e851.z;
                            spdIntermediateA[_e78][_e82] = _e851.w;
                            workgroupBarrier();
                            if (_e53 < 64u) {
                                let _e865 = (_e86 + 1u);
                                let _e866 = (_e88 + 1u);
                                let _e869 = spdIntermediateR[_e86][_e88];
                                let _e872 = spdIntermediateG[_e86][_e88];
                                let _e875 = spdIntermediateB[_e86][_e88];
                                let _e878 = spdIntermediateA[_e86][_e88];
                                let _e882 = spdIntermediateR[_e865][_e88];
                                let _e885 = spdIntermediateG[_e865][_e88];
                                let _e888 = spdIntermediateB[_e865][_e88];
                                let _e891 = spdIntermediateA[_e865][_e88];
                                let _e895 = spdIntermediateR[_e86][_e866];
                                let _e898 = spdIntermediateG[_e86][_e866];
                                let _e901 = spdIntermediateB[_e86][_e866];
                                let _e904 = spdIntermediateA[_e86][_e866];
                                let _e908 = spdIntermediateR[_e865][_e866];
                                let _e911 = spdIntermediateG[_e865][_e866];
                                let _e914 = spdIntermediateB[_e865][_e866];
                                let _e917 = spdIntermediateA[_e865][_e866];
                                local[_e848] = ((((vec4<f32>(_e869, _e872, _e875, _e878) + vec4<f32>(_e882, _e885, _e888, _e891)) + vec4<f32>(_e895, _e898, _e901, _e904)) + vec4<f32>(_e908, _e911, _e914, _e917)) * 0.25f);
                                let _e935 = local[_e848];
                                if (1u == _e244) {
                                    if all(((bitcast<vec2<i32>>((_e59 * vec2<u32>(16u, 16u))) + vec2<i32>(bitcast<i32>((_e78 + ((_e848 % 2u) * 8u))), bitcast<i32>((_e82 + ((_e848 / 2u) * 8u))))) == vec2<i32>(0i, 0i))) {
                                        let _e941 = rw_frame_info.member[0u];
                                        phi_796_ = _e935.x;
                                        if (_e941.y < 10000f) {
                                            let _e948 = cbFSR3Upscaler.fDeltaTime;
                                            phi_796_ = max(0f, (_e941.y + ((_e935.x - _e941.y) * (1f - exp(-(_e948))))));
                                        }
                                        let _e956 = phi_796_;
                                        let _e966 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e956) * 8f)))), _e941.y, _e941.z, _e941.w);
                                        let _e971 = vec4<f32>(_e966.x, _e956, _e966.z, _e966.w);
                                        rw_frame_info.member[0u] = vec4<f32>(_e971.x, _e971.y, _e935.y, _e971.w);
                                    }
                                }
                            }
                            workgroupBarrier();
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            phi_698_ = (_e848 + 1u);
                        }
                    }
                    if (_e53 < 64u) {
                        let _e979 = local[0i];
                        spdIntermediateR[_e78][_e82] = _e979.x;
                        spdIntermediateG[_e78][_e82] = _e979.y;
                        spdIntermediateB[_e78][_e82] = _e979.z;
                        spdIntermediateA[_e78][_e82] = _e979.w;
                        let _e992 = (_e78 + 8u);
                        let _e993 = local[1i];
                        spdIntermediateR[_e992][_e82] = _e993.x;
                        spdIntermediateG[_e992][_e82] = _e993.y;
                        spdIntermediateB[_e992][_e82] = _e993.z;
                        spdIntermediateA[_e992][_e82] = _e993.w;
                        let _e1006 = (_e82 + 8u);
                        let _e1007 = local[2i];
                        spdIntermediateR[_e78][_e1006] = _e1007.x;
                        spdIntermediateG[_e78][_e1006] = _e1007.y;
                        spdIntermediateB[_e78][_e1006] = _e1007.z;
                        spdIntermediateA[_e78][_e1006] = _e1007.w;
                        let _e1020 = local[3i];
                        spdIntermediateR[_e992][_e1006] = _e1020.x;
                        spdIntermediateG[_e992][_e1006] = _e1020.y;
                        spdIntermediateB[_e992][_e1006] = _e1020.z;
                        spdIntermediateA[_e992][_e1006] = _e1020.w;
                    }
                    break;
                }
            }
            switch bitcast<i32>(0u) {
                default: {
                    if (_e56 <= 2u) {
                        break;
                    }
                    workgroupBarrier();
                    if (_e53 < 64u) {
                        let _e1037 = local_1;
                        let _e1038 = (_e1037 + 1u);
                        let _e1040 = local_2;
                        let _e1041 = (_e1040 + 1u);
                        let _e1043 = local_3;
                        let _e1046 = local_4;
                        let _e1048 = spdIntermediateR[_e1043][_e1046];
                        let _e1050 = local_5;
                        let _e1053 = local_6;
                        let _e1055 = spdIntermediateG[_e1050][_e1053];
                        let _e1057 = local_7;
                        let _e1060 = local_8;
                        let _e1062 = spdIntermediateB[_e1057][_e1060];
                        let _e1064 = local_9;
                        let _e1067 = local_10;
                        let _e1069 = spdIntermediateA[_e1064][_e1067];
                        let _e1073 = local_11;
                        let _e1075 = spdIntermediateR[_e1038][_e1073];
                        let _e1078 = local_12;
                        let _e1080 = spdIntermediateG[_e1038][_e1078];
                        let _e1083 = local_13;
                        let _e1085 = spdIntermediateB[_e1038][_e1083];
                        let _e1088 = local_14;
                        let _e1090 = spdIntermediateA[_e1038][_e1088];
                        let _e1093 = local_15;
                        let _e1096 = spdIntermediateR[_e1093][_e1041];
                        let _e1098 = local_16;
                        let _e1101 = spdIntermediateG[_e1098][_e1041];
                        let _e1103 = local_17;
                        let _e1106 = spdIntermediateB[_e1103][_e1041];
                        let _e1108 = local_18;
                        let _e1111 = spdIntermediateA[_e1108][_e1041];
                        let _e1115 = spdIntermediateR[_e1038][_e1041];
                        let _e1118 = spdIntermediateG[_e1038][_e1041];
                        let _e1121 = spdIntermediateB[_e1038][_e1041];
                        let _e1124 = spdIntermediateA[_e1038][_e1041];
                        let _e1129 = ((((vec4<f32>(_e1048, _e1055, _e1062, _e1069) + vec4<f32>(_e1075, _e1080, _e1085, _e1090)) + vec4<f32>(_e1096, _e1101, _e1106, _e1111)) + vec4<f32>(_e1115, _e1118, _e1121, _e1124)) * 0.25f);
                        let _e1133 = local_19;
                        let _e1136 = local_20;
                        if (2u == _e1136) {
                            if all(((bitcast<vec2<i32>>((_e59 * vec2<u32>(8u, 8u))) + _e1133) == vec2<i32>(0i, 0i))) {
                                let _e1142 = rw_frame_info.member[0u];
                                phi_923_ = _e1129.x;
                                if (_e1142.y < 10000f) {
                                    let _e1149 = cbFSR3Upscaler.fDeltaTime;
                                    phi_923_ = max(0f, (_e1142.y + ((_e1129.x - _e1142.y) * (1f - exp(-(_e1149))))));
                                }
                                let _e1157 = phi_923_;
                                let _e1167 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e1157) * 8f)))), _e1142.y, _e1142.z, _e1142.w);
                                let _e1172 = vec4<f32>(_e1167.x, _e1157, _e1167.z, _e1167.w);
                                rw_frame_info.member[0u] = vec4<f32>(_e1172.x, _e1172.y, _e1129.y, _e1172.w);
                            }
                        }
                        let _e1180 = local_21;
                        let _e1181 = (_e1180 + (_e82 % 2u));
                        let _e1185 = local_22;
                        spdIntermediateR[_e1181][_e1185] = _e1129.x;
                        let _e1190 = local_23;
                        spdIntermediateG[_e1181][_e1190] = _e1129.y;
                        let _e1195 = local_24;
                        spdIntermediateB[_e1181][_e1195] = _e1129.z;
                        let _e1200 = local_25;
                        spdIntermediateA[_e1181][_e1200] = _e1129.w;
                    }
                    if (_e56 <= 3u) {
                        break;
                    }
                    workgroupBarrier();
                    if (_e53 < 16u) {
                        let _e1204 = (_e78 * 4u);
                        let _e1205 = (_e82 * 4u);
                        let _e1206 = (_e1204 + 2u);
                        let _e1207 = (_e1204 + 1u);
                        let _e1208 = (_e1205 + 2u);
                        let _e1209 = (_e1204 + 3u);
                        let _e1212 = spdIntermediateR[_e1204][_e1205];
                        let _e1215 = spdIntermediateG[_e1204][_e1205];
                        let _e1218 = spdIntermediateB[_e1204][_e1205];
                        let _e1221 = spdIntermediateA[_e1204][_e1205];
                        let _e1225 = spdIntermediateR[_e1206][_e1205];
                        let _e1228 = spdIntermediateG[_e1206][_e1205];
                        let _e1231 = spdIntermediateB[_e1206][_e1205];
                        let _e1234 = spdIntermediateA[_e1206][_e1205];
                        let _e1238 = spdIntermediateR[_e1207][_e1208];
                        let _e1241 = spdIntermediateG[_e1207][_e1208];
                        let _e1244 = spdIntermediateB[_e1207][_e1208];
                        let _e1247 = spdIntermediateA[_e1207][_e1208];
                        let _e1251 = spdIntermediateR[_e1209][_e1208];
                        let _e1254 = spdIntermediateG[_e1209][_e1208];
                        let _e1257 = spdIntermediateB[_e1209][_e1208];
                        let _e1260 = spdIntermediateA[_e1209][_e1208];
                        let _e1265 = ((((vec4<f32>(_e1212, _e1215, _e1218, _e1221) + vec4<f32>(_e1225, _e1228, _e1231, _e1234)) + vec4<f32>(_e1238, _e1241, _e1244, _e1247)) + vec4<f32>(_e1251, _e1254, _e1257, _e1260)) * 0.25f);
                        let _e1269 = local_26;
                        let _e1272 = local_27;
                        if (3u == _e1272) {
                            if all(((bitcast<vec2<i32>>((_e59 * vec2<u32>(4u, 4u))) + _e1269) == vec2<i32>(0i, 0i))) {
                                let _e1278 = rw_frame_info.member[0u];
                                phi_1021_ = _e1265.x;
                                if (_e1278.y < 10000f) {
                                    let _e1285 = cbFSR3Upscaler.fDeltaTime;
                                    phi_1021_ = max(0f, (_e1278.y + ((_e1265.x - _e1278.y) * (1f - exp(-(_e1285))))));
                                }
                                let _e1293 = phi_1021_;
                                let _e1303 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e1293) * 8f)))), _e1278.y, _e1278.z, _e1278.w);
                                let _e1308 = vec4<f32>(_e1303.x, _e1293, _e1303.z, _e1303.w);
                                rw_frame_info.member[0u] = vec4<f32>(_e1308.x, _e1308.y, _e1265.y, _e1308.w);
                            }
                        }
                        let _e1314 = (_e1204 + _e82);
                        spdIntermediateR[_e1314][_e1205] = _e1265.x;
                        spdIntermediateG[_e1314][_e1205] = _e1265.y;
                        spdIntermediateB[_e1314][_e1205] = _e1265.z;
                        spdIntermediateA[_e1314][_e1205] = _e1265.w;
                    }
                    if (_e56 <= 4u) {
                        break;
                    }
                    workgroupBarrier();
                    if (_e53 < 4u) {
                        let _e1329 = (_e78 * 8u);
                        let _e1331 = local_28;
                        let _e1332 = (_e1329 + _e1331);
                        let _e1333 = (_e82 * 8u);
                        let _e1336 = local_29;
                        let _e1337 = ((_e1329 + 4u) + _e1336);
                        let _e1340 = local_30;
                        let _e1341 = ((_e1329 + 1u) + _e1340);
                        let _e1342 = (_e1333 + 4u);
                        let _e1345 = local_31;
                        let _e1346 = ((_e1329 + 5u) + _e1345);
                        let _e1349 = spdIntermediateR[_e1332][_e1333];
                        let _e1352 = spdIntermediateG[_e1332][_e1333];
                        let _e1355 = spdIntermediateB[_e1332][_e1333];
                        let _e1358 = spdIntermediateA[_e1332][_e1333];
                        let _e1362 = spdIntermediateR[_e1337][_e1333];
                        let _e1365 = spdIntermediateG[_e1337][_e1333];
                        let _e1368 = spdIntermediateB[_e1337][_e1333];
                        let _e1371 = spdIntermediateA[_e1337][_e1333];
                        let _e1375 = spdIntermediateR[_e1341][_e1342];
                        let _e1378 = spdIntermediateG[_e1341][_e1342];
                        let _e1381 = spdIntermediateB[_e1341][_e1342];
                        let _e1384 = spdIntermediateA[_e1341][_e1342];
                        let _e1388 = spdIntermediateR[_e1346][_e1342];
                        let _e1391 = spdIntermediateG[_e1346][_e1342];
                        let _e1394 = spdIntermediateB[_e1346][_e1342];
                        let _e1397 = spdIntermediateA[_e1346][_e1342];
                        let _e1402 = ((((vec4<f32>(_e1349, _e1352, _e1355, _e1358) + vec4<f32>(_e1362, _e1365, _e1368, _e1371)) + vec4<f32>(_e1375, _e1378, _e1381, _e1384)) + vec4<f32>(_e1388, _e1391, _e1394, _e1397)) * 0.25f);
                        let _e1406 = local_32;
                        let _e1409 = local_33;
                        if (4u == _e1409) {
                            if all(((bitcast<vec2<i32>>((_e59 * vec2<u32>(2u, 2u))) + _e1406) == vec2<i32>(0i, 0i))) {
                                let _e1415 = rw_frame_info.member[0u];
                                phi_1122_ = _e1402.x;
                                if (_e1415.y < 10000f) {
                                    let _e1422 = cbFSR3Upscaler.fDeltaTime;
                                    phi_1122_ = max(0f, (_e1415.y + ((_e1402.x - _e1415.y) * (1f - exp(-(_e1422))))));
                                }
                                let _e1430 = phi_1122_;
                                let _e1440 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e1430) * 8f)))), _e1415.y, _e1415.z, _e1415.w);
                                let _e1445 = vec4<f32>(_e1440.x, _e1430, _e1440.z, _e1440.w);
                                rw_frame_info.member[0u] = vec4<f32>(_e1445.x, _e1445.y, _e1402.y, _e1445.w);
                            }
                        }
                        let _e1452 = local_34;
                        let _e1453 = (_e78 + _e1452);
                        spdIntermediateR[_e1453][0u] = _e1402.x;
                        spdIntermediateG[_e1453][0u] = _e1402.y;
                        spdIntermediateB[_e1453][0u] = _e1402.z;
                        spdIntermediateA[_e1453][0u] = _e1402.w;
                    }
                    if (_e56 <= 5u) {
                        break;
                    }
                    workgroupBarrier();
                    if (_e53 < 1u) {
                        let _e1470 = spdIntermediateR[0u][0u];
                        let _e1473 = spdIntermediateG[0u][0u];
                        let _e1477 = spdIntermediateR[1u][0u];
                        let _e1480 = spdIntermediateG[1u][0u];
                        let _e1484 = spdIntermediateR[2u][0u];
                        let _e1487 = spdIntermediateG[2u][0u];
                        let _e1491 = spdIntermediateR[3u][0u];
                        let _e1494 = spdIntermediateG[3u][0u];
                        let _e1499 = ((((vec4<f32>(_e1470, _e1473, f32(), f32()) + vec4<f32>(_e1477, _e1480, f32(), f32())) + vec4<f32>(_e1484, _e1487, f32(), f32())) + vec4<f32>(_e1491, _e1494, f32(), f32())) * 0.25f);
                        textureStore(rw_spd_mip5_, _e59, _e1499.xy.xyyy);
                        let _e1504 = local_35;
                        if (5u == _e1504) {
                            if all((bitcast<vec2<i32>>(_e59) == vec2<i32>(0i, 0i))) {
                                let _e1510 = rw_frame_info.member[0u];
                                phi_1197_ = _e1499.x;
                                if (_e1510.y < 10000f) {
                                    let _e1517 = cbFSR3Upscaler.fDeltaTime;
                                    phi_1197_ = max(0f, (_e1510.y + ((_e1499.x - _e1510.y) * (1f - exp(-(_e1517))))));
                                }
                                let _e1525 = phi_1197_;
                                let _e1535 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e1525) * 8f)))), _e1510.y, _e1510.z, _e1510.w);
                                let _e1540 = vec4<f32>(_e1535.x, _e1525, _e1535.z, _e1535.w);
                                rw_frame_info.member[0u] = vec4<f32>(_e1540.x, _e1540.y, _e1499.y, _e1540.w);
                            }
                        }
                    }
                    break;
                }
            }
            if (_e56 <= 6u) {
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
