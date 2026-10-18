// Generated from AMD FidelityFX SDK v2.3.0, SR 3.1.5.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL. See scripts/fsr/compile.mjs.
struct type_u002e_cbFSR3Upscaler {
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
@group(0) @binding(33) 
var<storage, read_write> rw_frame_info: type_u002e_RWStructuredBuffer_u002e_v4float;
@group(0) @binding(39) 
var rw_spd_mip5_: texture_2d<f32>;
var<workgroup> spdIntermediateR: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateG: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateB: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateA: array<array<f32, 16>, 16>;
var<private> global: u32;

fn CS_1() {
    var phi_157_: f32;
    var phi_223_: f32;
    var phi_289_: f32;
    var phi_351_: f32;
    var phi_394_: f32;
    var local: u32;
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
    var local_19: u32;
    var local_20: u32;
    var local_21: u32;
    var local_22: u32;
    var local_23: u32;
    var local_24: u32;
    var local_25: u32;
    var local_26: u32;
    var local_27: u32;
    var local_28: u32;
    var local_29: u32;
    var local_30: u32;
    var local_31: u32;
    var local_32: u32;
    var phi_486_: f32;
    var local_33: u32;
    var local_34: u32;
    var local_35: u32;
    var local_36: u32;
    var local_37: u32;
    var local_38: u32;
    var local_39: u32;
    var local_40: u32;
    var local_41: u32;
    var local_42: u32;
    var local_43: u32;
    var local_44: u32;
    var local_45: u32;
    var local_46: u32;
    var local_47: u32;
    var local_48: u32;
    var local_49: u32;
    var local_50: u32;
    var local_51: u32;
    var local_52: u32;
    var local_53: u32;
    var local_54: u32;
    var local_55: u32;
    var local_56: u32;
    var local_57: u32;
    var local_58: u32;
    var local_59: u32;
    var local_60: u32;
    var local_61: u32;
    var local_62: u32;
    var local_63: u32;
    var local_64: u32;
    var phi_580_: f32;
    var local_65: u32;
    var local_66: u32;
    var local_67: u32;
    var local_68: u32;
    var local_69: u32;
    var local_70: u32;
    var local_71: u32;
    var local_72: u32;
    var local_73: u32;
    var local_74: u32;
    var phi_681_: f32;
    var local_75: u32;
    var local_76: u32;
    var phi_752_: f32;

    let _e40 = global;
    let _e41 = (_e40 % 64u);
    let _e58 = (((_e41 & 1u) | ((_e41 >> bitcast<u32>(2u)) & 6u)) + (8u * ((_e40 >> bitcast<u32>(6u)) % 2u)));
    let _e62 = ((((_e41 >> bitcast<u32>(1u)) & 3u) | ((_e41 >> bitcast<u32>(3u)) & 4u)) + (8u * (_e40 >> bitcast<u32>(7u))));
    let _e64 = cbSPD.mips;
    switch bitcast<i32>(0u) {
        default: {
            let _e66 = (_e58 * 4u);
            let _e67 = bitcast<i32>(_e66);
            let _e68 = (_e62 * 4u);
            let _e69 = bitcast<i32>(_e68);
            let _e71 = (_e58 * 2u);
            let _e72 = bitcast<i32>(_e71);
            let _e73 = (_e62 * 2u);
            let _e74 = bitcast<i32>(_e73);
            let _e76 = bitcast<vec2<u32>>(vec2<i32>(_e67, _e69));
            let _e80 = textureLoad(rw_spd_mip5_, _e76, 0);
            let _e84 = textureLoad(rw_spd_mip5_, (_e76 + vec2<u32>(0u, 1u)), 0);
            let _e88 = textureLoad(rw_spd_mip5_, (_e76 + vec2<u32>(1u, 0u)), 0);
            let _e92 = textureLoad(rw_spd_mip5_, (_e76 + vec2<u32>(1u, 1u)), 0);
            let _e99 = ((((vec4<f32>(_e80.x, _e80.y, 0f, 0f) + vec4<f32>(_e84.x, _e84.y, 0f, 0f)) + vec4<f32>(_e88.x, _e88.y, 0f, 0f)) + vec4<f32>(_e92.x, _e92.y, 0f, 0f)) * 0.25f);
            let _e100 = (_e64 - 1u);
            let _e101 = (6u == _e100);
            local = _e71;
            local_1 = _e73;
            local_2 = _e71;
            local_3 = _e73;
            local_4 = _e71;
            local_5 = _e73;
            local_6 = _e71;
            local_7 = _e73;
            local_9 = _e73;
            local_11 = _e73;
            local_13 = _e73;
            local_15 = _e73;
            local_16 = _e71;
            local_18 = _e71;
            local_20 = _e71;
            local_22 = _e71;
            local_32 = _e100;
            local_33 = _e71;
            local_34 = _e73;
            local_35 = _e73;
            local_36 = _e73;
            local_37 = _e73;
            local_38 = _e66;
            local_39 = _e66;
            local_40 = _e66;
            local_41 = _e68;
            local_42 = _e66;
            local_43 = _e68;
            local_44 = _e66;
            local_45 = _e68;
            local_46 = _e66;
            local_47 = _e68;
            local_49 = _e68;
            local_51 = _e68;
            local_53 = _e68;
            local_55 = _e68;
            local_64 = _e100;
            local_65 = _e66;
            local_66 = _e68;
            local_67 = _e68;
            local_68 = _e68;
            local_69 = _e68;
            local_70 = _e73;
            local_71 = _e73;
            local_72 = _e73;
            local_73 = _e73;
            local_74 = _e100;
            local_75 = _e73;
            local_76 = _e100;
            if _e101 {
                if all((vec2<i32>(_e72, _e74) == vec2<i32>(0i, 0i))) {
                    let _e106 = rw_frame_info.member[0u];
                    phi_157_ = _e99.x;
                    if (_e106.y < 10000f) {
                        let _e113 = cbFSR3Upscaler.fDeltaTime;
                        phi_157_ = max(0f, (_e106.y + ((_e99.x - _e106.y) * (1f - exp(-(_e113))))));
                    }
                    let _e121 = phi_157_;
                    let _e131 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e121) * 8f)))), _e106.y, _e106.z, _e106.w);
                    let _e136 = vec4<f32>(_e131.x, _e121, _e131.z, _e131.w);
                    rw_frame_info.member[0u] = vec4<f32>(_e136.x, _e136.y, _e99.y, _e136.w);
                }
            }
            let _e142 = (_e66 + 2u);
            let _e143 = bitcast<i32>(_e142);
            let _e145 = (_e71 + 1u);
            let _e146 = bitcast<i32>(_e145);
            let _e148 = bitcast<vec2<u32>>(vec2<i32>(_e143, _e69));
            let _e152 = textureLoad(rw_spd_mip5_, _e148, 0);
            let _e156 = textureLoad(rw_spd_mip5_, (_e148 + vec2<u32>(0u, 1u)), 0);
            let _e160 = textureLoad(rw_spd_mip5_, (_e148 + vec2<u32>(1u, 0u)), 0);
            let _e164 = textureLoad(rw_spd_mip5_, (_e148 + vec2<u32>(1u, 1u)), 0);
            let _e171 = ((((vec4<f32>(_e152.x, _e152.y, 0f, 0f) + vec4<f32>(_e156.x, _e156.y, 0f, 0f)) + vec4<f32>(_e160.x, _e160.y, 0f, 0f)) + vec4<f32>(_e164.x, _e164.y, 0f, 0f)) * 0.25f);
            local_8 = _e145;
            local_10 = _e145;
            local_12 = _e145;
            local_14 = _e145;
            local_24 = _e145;
            local_26 = _e145;
            local_28 = _e145;
            local_30 = _e145;
            local_48 = _e142;
            local_50 = _e142;
            local_52 = _e142;
            local_54 = _e142;
            if _e101 {
                if all((vec2<i32>(_e146, _e74) == vec2<i32>(0i, 0i))) {
                    let _e176 = rw_frame_info.member[0u];
                    phi_223_ = _e171.x;
                    if (_e176.y < 10000f) {
                        let _e183 = cbFSR3Upscaler.fDeltaTime;
                        phi_223_ = max(0f, (_e176.y + ((_e171.x - _e176.y) * (1f - exp(-(_e183))))));
                    }
                    let _e191 = phi_223_;
                    let _e201 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e191) * 8f)))), _e176.y, _e176.z, _e176.w);
                    let _e206 = vec4<f32>(_e201.x, _e191, _e201.z, _e201.w);
                    rw_frame_info.member[0u] = vec4<f32>(_e206.x, _e206.y, _e171.y, _e206.w);
                }
            }
            let _e212 = (_e68 + 2u);
            let _e213 = bitcast<i32>(_e212);
            let _e215 = (_e73 + 1u);
            let _e216 = bitcast<i32>(_e215);
            let _e218 = bitcast<vec2<u32>>(vec2<i32>(_e67, _e213));
            let _e222 = textureLoad(rw_spd_mip5_, _e218, 0);
            let _e226 = textureLoad(rw_spd_mip5_, (_e218 + vec2<u32>(0u, 1u)), 0);
            let _e230 = textureLoad(rw_spd_mip5_, (_e218 + vec2<u32>(1u, 0u)), 0);
            let _e234 = textureLoad(rw_spd_mip5_, (_e218 + vec2<u32>(1u, 1u)), 0);
            let _e241 = ((((vec4<f32>(_e222.x, _e222.y, 0f, 0f) + vec4<f32>(_e226.x, _e226.y, 0f, 0f)) + vec4<f32>(_e230.x, _e230.y, 0f, 0f)) + vec4<f32>(_e234.x, _e234.y, 0f, 0f)) * 0.25f);
            local_17 = _e215;
            local_19 = _e215;
            local_21 = _e215;
            local_23 = _e215;
            local_25 = _e215;
            local_27 = _e215;
            local_29 = _e215;
            local_31 = _e215;
            local_56 = _e212;
            local_57 = _e212;
            local_58 = _e212;
            local_59 = _e212;
            local_60 = _e212;
            local_61 = _e212;
            local_62 = _e212;
            local_63 = _e212;
            if _e101 {
                if all((vec2<i32>(_e72, _e216) == vec2<i32>(0i, 0i))) {
                    let _e246 = rw_frame_info.member[0u];
                    phi_289_ = _e241.x;
                    if (_e246.y < 10000f) {
                        let _e253 = cbFSR3Upscaler.fDeltaTime;
                        phi_289_ = max(0f, (_e246.y + ((_e241.x - _e246.y) * (1f - exp(-(_e253))))));
                    }
                    let _e261 = phi_289_;
                    let _e271 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e261) * 8f)))), _e246.y, _e246.z, _e246.w);
                    let _e276 = vec4<f32>(_e271.x, _e261, _e271.z, _e271.w);
                    rw_frame_info.member[0u] = vec4<f32>(_e276.x, _e276.y, _e241.y, _e276.w);
                }
            }
            let _e284 = bitcast<vec2<u32>>(vec2<i32>(_e143, _e213));
            let _e288 = textureLoad(rw_spd_mip5_, _e284, 0);
            let _e292 = textureLoad(rw_spd_mip5_, (_e284 + vec2<u32>(0u, 1u)), 0);
            let _e296 = textureLoad(rw_spd_mip5_, (_e284 + vec2<u32>(1u, 0u)), 0);
            let _e300 = textureLoad(rw_spd_mip5_, (_e284 + vec2<u32>(1u, 1u)), 0);
            let _e307 = ((((vec4<f32>(_e288.x, _e288.y, 0f, 0f) + vec4<f32>(_e292.x, _e292.y, 0f, 0f)) + vec4<f32>(_e296.x, _e296.y, 0f, 0f)) + vec4<f32>(_e300.x, _e300.y, 0f, 0f)) * 0.25f);
            if _e101 {
                if all((vec2<i32>(_e146, _e216) == vec2<i32>(0i, 0i))) {
                    let _e312 = rw_frame_info.member[0u];
                    phi_351_ = _e307.x;
                    if (_e312.y < 10000f) {
                        let _e319 = cbFSR3Upscaler.fDeltaTime;
                        phi_351_ = max(0f, (_e312.y + ((_e307.x - _e312.y) * (1f - exp(-(_e319))))));
                    }
                    let _e327 = phi_351_;
                    let _e337 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e327) * 8f)))), _e312.y, _e312.z, _e312.w);
                    let _e342 = vec4<f32>(_e337.x, _e327, _e337.z, _e337.w);
                    rw_frame_info.member[0u] = vec4<f32>(_e342.x, _e342.y, _e307.y, _e342.w);
                }
            }
            if (_e64 <= 7u) {
                break;
            }
            let _e352 = ((((_e99 + _e171) + _e241) + _e307) * 0.25f);
            if (7u == _e100) {
                if all((vec2<i32>(bitcast<i32>(_e58), bitcast<i32>(_e62)) == vec2<i32>(0i, 0i))) {
                    let _e361 = rw_frame_info.member[0u];
                    phi_394_ = _e352.x;
                    if (_e361.y < 10000f) {
                        let _e368 = cbFSR3Upscaler.fDeltaTime;
                        phi_394_ = max(0f, (_e361.y + ((_e352.x - _e361.y) * (1f - exp(-(_e368))))));
                    }
                    let _e376 = phi_394_;
                    let _e386 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e376) * 8f)))), _e361.y, _e361.z, _e361.w);
                    let _e391 = vec4<f32>(_e386.x, _e376, _e386.z, _e386.w);
                    rw_frame_info.member[0u] = vec4<f32>(_e391.x, _e391.y, _e352.y, _e391.w);
                }
            }
            spdIntermediateR[_e58][_e62] = _e352.x;
            spdIntermediateG[_e58][_e62] = _e352.y;
            spdIntermediateB[_e58][_e62] = _e352.z;
            spdIntermediateA[_e58][_e62] = _e352.w;
            break;
        }
    }
    switch bitcast<i32>(0u) {
        default: {
            if (_e64 <= 8u) {
                break;
            }
            workgroupBarrier();
            if (_e40 < 64u) {
                let _e413 = local;
                let _e416 = local_1;
                let _e418 = spdIntermediateR[_e413][_e416];
                let _e420 = local_2;
                let _e423 = local_3;
                let _e425 = spdIntermediateG[_e420][_e423];
                let _e427 = local_4;
                let _e430 = local_5;
                let _e432 = spdIntermediateB[_e427][_e430];
                let _e434 = local_6;
                let _e437 = local_7;
                let _e439 = spdIntermediateA[_e434][_e437];
                let _e442 = local_8;
                let _e445 = local_9;
                let _e447 = spdIntermediateR[_e442][_e445];
                let _e449 = local_10;
                let _e452 = local_11;
                let _e454 = spdIntermediateG[_e449][_e452];
                let _e456 = local_12;
                let _e459 = local_13;
                let _e461 = spdIntermediateB[_e456][_e459];
                let _e463 = local_14;
                let _e466 = local_15;
                let _e468 = spdIntermediateA[_e463][_e466];
                let _e471 = local_16;
                let _e474 = local_17;
                let _e476 = spdIntermediateR[_e471][_e474];
                let _e478 = local_18;
                let _e481 = local_19;
                let _e483 = spdIntermediateG[_e478][_e481];
                let _e485 = local_20;
                let _e488 = local_21;
                let _e490 = spdIntermediateB[_e485][_e488];
                let _e492 = local_22;
                let _e495 = local_23;
                let _e497 = spdIntermediateA[_e492][_e495];
                let _e500 = local_24;
                let _e503 = local_25;
                let _e505 = spdIntermediateR[_e500][_e503];
                let _e507 = local_26;
                let _e510 = local_27;
                let _e512 = spdIntermediateG[_e507][_e510];
                let _e514 = local_28;
                let _e517 = local_29;
                let _e519 = spdIntermediateB[_e514][_e517];
                let _e521 = local_30;
                let _e524 = local_31;
                let _e526 = spdIntermediateA[_e521][_e524];
                let _e531 = ((((vec4<f32>(_e418, _e425, _e432, _e439) + vec4<f32>(_e447, _e454, _e461, _e468)) + vec4<f32>(_e476, _e483, _e490, _e497)) + vec4<f32>(_e505, _e512, _e519, _e526)) * 0.25f);
                let _e536 = local_32;
                if (8u == _e536) {
                    if all((vec2<i32>(bitcast<i32>(_e58), bitcast<i32>(_e62)) == vec2<i32>(0i, 0i))) {
                        let _e542 = rw_frame_info.member[0u];
                        phi_486_ = _e531.x;
                        if (_e542.y < 10000f) {
                            let _e549 = cbFSR3Upscaler.fDeltaTime;
                            phi_486_ = max(0f, (_e542.y + ((_e531.x - _e542.y) * (1f - exp(-(_e549))))));
                        }
                        let _e557 = phi_486_;
                        let _e567 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e557) * 8f)))), _e542.y, _e542.z, _e542.w);
                        let _e572 = vec4<f32>(_e567.x, _e557, _e567.z, _e567.w);
                        rw_frame_info.member[0u] = vec4<f32>(_e572.x, _e572.y, _e531.y, _e572.w);
                    }
                }
                let _e580 = local_33;
                let _e581 = (_e580 + (_e62 % 2u));
                let _e585 = local_34;
                spdIntermediateR[_e581][_e585] = _e531.x;
                let _e590 = local_35;
                spdIntermediateG[_e581][_e590] = _e531.y;
                let _e595 = local_36;
                spdIntermediateB[_e581][_e595] = _e531.z;
                let _e600 = local_37;
                spdIntermediateA[_e581][_e600] = _e531.w;
            }
            if (_e64 <= 9u) {
                break;
            }
            workgroupBarrier();
            if (_e40 < 16u) {
                let _e605 = local_38;
                let _e606 = (_e605 + 1u);
                let _e608 = local_39;
                let _e609 = (_e608 + 3u);
                let _e611 = local_40;
                let _e614 = local_41;
                let _e616 = spdIntermediateR[_e611][_e614];
                let _e618 = local_42;
                let _e621 = local_43;
                let _e623 = spdIntermediateG[_e618][_e621];
                let _e625 = local_44;
                let _e628 = local_45;
                let _e630 = spdIntermediateB[_e625][_e628];
                let _e632 = local_46;
                let _e635 = local_47;
                let _e637 = spdIntermediateA[_e632][_e635];
                let _e640 = local_48;
                let _e643 = local_49;
                let _e645 = spdIntermediateR[_e640][_e643];
                let _e647 = local_50;
                let _e650 = local_51;
                let _e652 = spdIntermediateG[_e647][_e650];
                let _e654 = local_52;
                let _e657 = local_53;
                let _e659 = spdIntermediateB[_e654][_e657];
                let _e661 = local_54;
                let _e664 = local_55;
                let _e666 = spdIntermediateA[_e661][_e664];
                let _e670 = local_56;
                let _e672 = spdIntermediateR[_e606][_e670];
                let _e675 = local_57;
                let _e677 = spdIntermediateG[_e606][_e675];
                let _e680 = local_58;
                let _e682 = spdIntermediateB[_e606][_e680];
                let _e685 = local_59;
                let _e687 = spdIntermediateA[_e606][_e685];
                let _e691 = local_60;
                let _e693 = spdIntermediateR[_e609][_e691];
                let _e696 = local_61;
                let _e698 = spdIntermediateG[_e609][_e696];
                let _e701 = local_62;
                let _e703 = spdIntermediateB[_e609][_e701];
                let _e706 = local_63;
                let _e708 = spdIntermediateA[_e609][_e706];
                let _e713 = ((((vec4<f32>(_e616, _e623, _e630, _e637) + vec4<f32>(_e645, _e652, _e659, _e666)) + vec4<f32>(_e672, _e677, _e682, _e687)) + vec4<f32>(_e693, _e698, _e703, _e708)) * 0.25f);
                let _e718 = local_64;
                if (9u == _e718) {
                    if all((vec2<i32>(bitcast<i32>(_e58), bitcast<i32>(_e62)) == vec2<i32>(0i, 0i))) {
                        let _e724 = rw_frame_info.member[0u];
                        phi_580_ = _e713.x;
                        if (_e724.y < 10000f) {
                            let _e731 = cbFSR3Upscaler.fDeltaTime;
                            phi_580_ = max(0f, (_e724.y + ((_e713.x - _e724.y) * (1f - exp(-(_e731))))));
                        }
                        let _e739 = phi_580_;
                        let _e749 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e739) * 8f)))), _e724.y, _e724.z, _e724.w);
                        let _e754 = vec4<f32>(_e749.x, _e739, _e749.z, _e749.w);
                        rw_frame_info.member[0u] = vec4<f32>(_e754.x, _e754.y, _e713.y, _e754.w);
                    }
                }
                let _e761 = local_65;
                let _e762 = (_e761 + _e62);
                let _e766 = local_66;
                spdIntermediateR[_e762][_e766] = _e713.x;
                let _e771 = local_67;
                spdIntermediateG[_e762][_e771] = _e713.y;
                let _e776 = local_68;
                spdIntermediateB[_e762][_e776] = _e713.z;
                let _e781 = local_69;
                spdIntermediateA[_e762][_e781] = _e713.w;
            }
            if (_e64 <= 10u) {
                break;
            }
            workgroupBarrier();
            if (_e40 < 4u) {
                let _e785 = (_e58 * 8u);
                let _e787 = local_70;
                let _e788 = (_e785 + _e787);
                let _e789 = (_e62 * 8u);
                let _e792 = local_71;
                let _e793 = ((_e785 + 4u) + _e792);
                let _e796 = local_72;
                let _e797 = ((_e785 + 1u) + _e796);
                let _e798 = (_e789 + 4u);
                let _e801 = local_73;
                let _e802 = ((_e785 + 5u) + _e801);
                let _e805 = spdIntermediateR[_e788][_e789];
                let _e808 = spdIntermediateG[_e788][_e789];
                let _e811 = spdIntermediateB[_e788][_e789];
                let _e814 = spdIntermediateA[_e788][_e789];
                let _e818 = spdIntermediateR[_e793][_e789];
                let _e821 = spdIntermediateG[_e793][_e789];
                let _e824 = spdIntermediateB[_e793][_e789];
                let _e827 = spdIntermediateA[_e793][_e789];
                let _e831 = spdIntermediateR[_e797][_e798];
                let _e834 = spdIntermediateG[_e797][_e798];
                let _e837 = spdIntermediateB[_e797][_e798];
                let _e840 = spdIntermediateA[_e797][_e798];
                let _e844 = spdIntermediateR[_e802][_e798];
                let _e847 = spdIntermediateG[_e802][_e798];
                let _e850 = spdIntermediateB[_e802][_e798];
                let _e853 = spdIntermediateA[_e802][_e798];
                let _e858 = ((((vec4<f32>(_e805, _e808, _e811, _e814) + vec4<f32>(_e818, _e821, _e824, _e827)) + vec4<f32>(_e831, _e834, _e837, _e840)) + vec4<f32>(_e844, _e847, _e850, _e853)) * 0.25f);
                let _e863 = local_74;
                if (10u == _e863) {
                    if all((vec2<i32>(bitcast<i32>(_e58), bitcast<i32>(_e62)) == vec2<i32>(0i, 0i))) {
                        let _e869 = rw_frame_info.member[0u];
                        phi_681_ = _e858.x;
                        if (_e869.y < 10000f) {
                            let _e876 = cbFSR3Upscaler.fDeltaTime;
                            phi_681_ = max(0f, (_e869.y + ((_e858.x - _e869.y) * (1f - exp(-(_e876))))));
                        }
                        let _e884 = phi_681_;
                        let _e894 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e884) * 8f)))), _e869.y, _e869.z, _e869.w);
                        let _e899 = vec4<f32>(_e894.x, _e884, _e894.z, _e894.w);
                        rw_frame_info.member[0u] = vec4<f32>(_e899.x, _e899.y, _e858.y, _e899.w);
                    }
                }
                let _e906 = local_75;
                let _e907 = (_e58 + _e906);
                spdIntermediateR[_e907][0u] = _e858.x;
                spdIntermediateG[_e907][0u] = _e858.y;
                spdIntermediateB[_e907][0u] = _e858.z;
                spdIntermediateA[_e907][0u] = _e858.w;
            }
            if (_e64 <= 11u) {
                break;
            }
            workgroupBarrier();
            if (_e40 < 1u) {
                let _e924 = spdIntermediateR[0u][0u];
                let _e927 = spdIntermediateG[0u][0u];
                let _e931 = spdIntermediateR[1u][0u];
                let _e934 = spdIntermediateG[1u][0u];
                let _e938 = spdIntermediateR[2u][0u];
                let _e941 = spdIntermediateG[2u][0u];
                let _e945 = spdIntermediateR[3u][0u];
                let _e948 = spdIntermediateG[3u][0u];
                let _e953 = ((((vec4<f32>(_e924, _e927, f32(), f32()) + vec4<f32>(_e931, _e934, f32(), f32())) + vec4<f32>(_e938, _e941, f32(), f32())) + vec4<f32>(_e945, _e948, f32(), f32())) * 0.25f);
                let _e955 = local_76;
                if (11u == _e955) {
                    if all(vec2<bool>(true, true)) {
                        let _e960 = rw_frame_info.member[0u];
                        phi_752_ = _e953.x;
                        if (_e960.y < 10000f) {
                            let _e967 = cbFSR3Upscaler.fDeltaTime;
                            phi_752_ = max(0f, (_e960.y + ((_e953.x - _e960.y) * (1f - exp(-(_e967))))));
                        }
                        let _e975 = phi_752_;
                        let _e985 = vec4<f32>((0.8333333f / pow(2f, log2((exp(_e975) * 8f)))), _e960.y, _e960.z, _e960.w);
                        let _e990 = vec4<f32>(_e985.x, _e975, _e985.z, _e985.w);
                        rw_frame_info.member[0u] = vec4<f32>(_e990.x, _e990.y, _e953.y, _e990.w);
                    }
                }
            }
            break;
        }
    }
    return;
}

@compute @workgroup_size(256, 1, 1) 
fn CS(@builtin(local_invocation_index) param: u32) {
    global = param;
    CS_1();
}
