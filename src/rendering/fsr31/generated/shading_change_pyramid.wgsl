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

@group(0) @binding(0) 
var<uniform> cbFSR3Upscaler: type_u002e_cbFSR3Upscaler;
@group(0) @binding(1) 
var<uniform> cbSPD: type_u002e_cbSPD;
@group(0) @binding(8) 
var r_current_luma: texture_2d<f32>;
@group(0) @binding(9) 
var r_previous_luma: texture_2d<f32>;
@group(0) @binding(10) 
var r_dilated_motion_vectors: texture_2d<f32>;
@group(0) @binding(11) 
var r_input_exposure: texture_2d<f32>;
@group(0) @binding(33) 
var rw_spd_mip0_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(34) 
var rw_spd_mip1_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(35) 
var rw_spd_mip2_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(36) 
var rw_spd_mip3_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(37) 
var rw_spd_mip4_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(38) 
var rw_spd_mip5_: texture_storage_2d<rgba16float,write>;
var<workgroup> spdIntermediateR: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateG: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateB: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateA: array<array<f32, 16>, 16>;
var<private> global: vec3<u32>;
var<private> global_1: u32;

fn CS_1() {
    var local: array<f32, 5>;
    var local_1: array<f32, 5>;
    var local_2: array<f32, 5>;
    var local_3: array<f32, 5>;
    var local_4: array<f32, 5>;
    var local_5: array<f32, 5>;
    var local_6: array<f32, 5>;
    var local_7: array<f32, 5>;
    var local_8: array<f32, 5>;
    var local_9: array<f32, 5>;
    var local_10: array<f32, 5>;
    var local_11: array<f32, 5>;
    var local_12: array<f32, 5>;
    var local_13: array<f32, 5>;
    var local_14: array<f32, 5>;
    var local_15: array<f32, 5>;
    var local_16: array<f32, 5>;
    var local_17: array<f32, 5>;
    var local_18: array<f32, 5>;
    var local_19: array<f32, 5>;
    var local_20: array<f32, 5>;
    var local_21: array<f32, 5>;
    var local_22: array<f32, 5>;
    var local_23: array<f32, 5>;
    var local_24: array<f32, 5>;
    var local_25: array<f32, 5>;
    var local_26: array<f32, 5>;
    var local_27: array<f32, 5>;
    var local_28: array<f32, 5>;
    var local_29: array<f32, 5>;
    var local_30: array<f32, 5>;
    var local_31: array<f32, 5>;
    var local_32: array<f32, 5>;
    var local_33: array<f32, 5>;
    var local_34: array<f32, 5>;
    var local_35: array<f32, 5>;
    var local_36: array<f32, 5>;
    var local_37: array<f32, 5>;
    var local_38: array<f32, 5>;
    var local_39: array<f32, 5>;
    var local_40: array<f32, 5>;
    var local_41: array<f32, 5>;
    var local_42: array<f32, 5>;
    var local_43: array<f32, 5>;
    var local_44: array<f32, 5>;
    var local_45: array<f32, 5>;
    var local_46: array<f32, 5>;
    var local_47: array<f32, 5>;
    var local_48: array<f32, 5>;
    var local_49: array<f32, 5>;
    var local_50: array<f32, 5>;
    var local_51: array<f32, 5>;
    var local_52: array<f32, 5>;
    var local_53: array<f32, 5>;
    var local_54: array<f32, 5>;
    var local_55: array<f32, 5>;
    var local_56: array<f32, 5>;
    var local_57: array<f32, 5>;
    var local_58: array<f32, 5>;
    var local_59: array<f32, 5>;
    var local_60: array<f32, 5>;
    var local_61: array<f32, 5>;
    var local_62: array<f32, 5>;
    var local_63: array<f32, 5>;
    var iSampleOffsets: array<vec2<i32>, 5>;
    var local_64: array<vec4<f32>, 4>;
    var phi_256_: i32;
    var phi_300_: bool;
    var phi_308_: bool;
    var phi_309_: bool;
    var phi_316_: i32;
    var phi_481_: i32;
    var phi_484_: i32;
    var phi_486_: f32;
    var phi_488_: i32;
    var phi_496_: bool;
    var phi_520_: f32;
    var phi_482_: i32;
    var phi_485_: i32;
    var phi_487_: f32;
    var phi_538_: f32;
    var phi_542_: f32;
    var phi_551_: f32;
    var phi_576_: i32;
    var phi_614_: bool;
    var phi_622_: bool;
    var phi_623_: bool;
    var phi_630_: i32;
    var phi_795_: i32;
    var phi_798_: i32;
    var phi_800_: f32;
    var phi_802_: i32;
    var phi_810_: bool;
    var phi_834_: f32;
    var phi_796_: i32;
    var phi_799_: i32;
    var phi_801_: f32;
    var phi_852_: f32;
    var phi_856_: f32;
    var phi_865_: f32;
    var phi_890_: i32;
    var phi_928_: bool;
    var phi_936_: bool;
    var phi_937_: bool;
    var phi_944_: i32;
    var phi_1109_: i32;
    var phi_1112_: i32;
    var phi_1114_: f32;
    var phi_1116_: i32;
    var phi_1124_: bool;
    var phi_1148_: f32;
    var phi_1110_: i32;
    var phi_1113_: i32;
    var phi_1115_: f32;
    var phi_1166_: f32;
    var phi_1170_: f32;
    var phi_1179_: f32;
    var phi_1204_: i32;
    var phi_1242_: bool;
    var phi_1250_: bool;
    var phi_1251_: bool;
    var phi_1258_: i32;
    var phi_1423_: i32;
    var phi_1426_: i32;
    var phi_1428_: f32;
    var phi_1430_: i32;
    var phi_1438_: bool;
    var phi_1462_: f32;
    var phi_1424_: i32;
    var phi_1427_: i32;
    var phi_1429_: f32;
    var phi_1480_: f32;
    var phi_1484_: f32;
    var phi_1493_: f32;
    var phi_1538_: i32;
    var phi_1576_: bool;
    var phi_1584_: bool;
    var phi_1585_: bool;
    var phi_1592_: i32;
    var phi_1757_: i32;
    var phi_1760_: i32;
    var phi_1762_: f32;
    var phi_1764_: i32;
    var phi_1772_: bool;
    var phi_1796_: f32;
    var phi_1758_: i32;
    var phi_1761_: i32;
    var phi_1763_: f32;
    var phi_1814_: f32;
    var phi_1818_: f32;
    var phi_1827_: f32;
    var phi_1852_: i32;
    var phi_1890_: bool;
    var phi_1898_: bool;
    var phi_1899_: bool;
    var phi_1906_: i32;
    var phi_2071_: i32;
    var phi_2074_: i32;
    var phi_2076_: f32;
    var phi_2078_: i32;
    var phi_2086_: bool;
    var phi_2110_: f32;
    var phi_2072_: i32;
    var phi_2075_: i32;
    var phi_2077_: f32;
    var phi_2128_: f32;
    var phi_2132_: f32;
    var phi_2141_: f32;
    var phi_2166_: i32;
    var phi_2204_: bool;
    var phi_2212_: bool;
    var phi_2213_: bool;
    var phi_2220_: i32;
    var phi_2385_: i32;
    var phi_2388_: i32;
    var phi_2390_: f32;
    var phi_2392_: i32;
    var phi_2400_: bool;
    var phi_2424_: f32;
    var phi_2386_: i32;
    var phi_2389_: i32;
    var phi_2391_: f32;
    var phi_2442_: f32;
    var phi_2446_: f32;
    var phi_2455_: f32;
    var phi_2480_: i32;
    var phi_2518_: bool;
    var phi_2526_: bool;
    var phi_2527_: bool;
    var phi_2534_: i32;
    var phi_2699_: i32;
    var phi_2702_: i32;
    var phi_2704_: f32;
    var phi_2706_: i32;
    var phi_2714_: bool;
    var phi_2738_: f32;
    var phi_2700_: i32;
    var phi_2703_: i32;
    var phi_2705_: f32;
    var phi_2756_: f32;
    var phi_2760_: f32;
    var phi_2769_: f32;
    var phi_2814_: i32;
    var phi_2852_: bool;
    var phi_2860_: bool;
    var phi_2861_: bool;
    var phi_2868_: i32;
    var phi_3033_: i32;
    var phi_3036_: i32;
    var phi_3038_: f32;
    var phi_3040_: i32;
    var phi_3048_: bool;
    var phi_3072_: f32;
    var phi_3034_: i32;
    var phi_3037_: i32;
    var phi_3039_: f32;
    var phi_3090_: f32;
    var phi_3094_: f32;
    var phi_3103_: f32;
    var phi_3128_: i32;
    var phi_3166_: bool;
    var phi_3174_: bool;
    var phi_3175_: bool;
    var phi_3182_: i32;
    var phi_3347_: i32;
    var phi_3350_: i32;
    var phi_3352_: f32;
    var phi_3354_: i32;
    var phi_3362_: bool;
    var phi_3386_: f32;
    var phi_3348_: i32;
    var phi_3351_: i32;
    var phi_3353_: f32;
    var phi_3404_: f32;
    var phi_3408_: f32;
    var phi_3417_: f32;
    var phi_3442_: i32;
    var phi_3480_: bool;
    var phi_3488_: bool;
    var phi_3489_: bool;
    var phi_3496_: i32;
    var phi_3661_: i32;
    var phi_3664_: i32;
    var phi_3666_: f32;
    var phi_3668_: i32;
    var phi_3676_: bool;
    var phi_3700_: f32;
    var phi_3662_: i32;
    var phi_3665_: i32;
    var phi_3667_: f32;
    var phi_3718_: f32;
    var phi_3722_: f32;
    var phi_3731_: f32;
    var phi_3756_: i32;
    var phi_3794_: bool;
    var phi_3802_: bool;
    var phi_3803_: bool;
    var phi_3810_: i32;
    var phi_3975_: i32;
    var phi_3978_: i32;
    var phi_3980_: f32;
    var phi_3982_: i32;
    var phi_3990_: bool;
    var phi_4014_: f32;
    var phi_3976_: i32;
    var phi_3979_: i32;
    var phi_3981_: f32;
    var phi_4032_: f32;
    var phi_4036_: f32;
    var phi_4045_: f32;
    var phi_4086_: i32;
    var phi_4124_: bool;
    var phi_4132_: bool;
    var phi_4133_: bool;
    var phi_4140_: i32;
    var phi_4305_: i32;
    var phi_4308_: i32;
    var phi_4310_: f32;
    var phi_4312_: i32;
    var phi_4320_: bool;
    var phi_4344_: f32;
    var phi_4306_: i32;
    var phi_4309_: i32;
    var phi_4311_: f32;
    var phi_4362_: f32;
    var phi_4366_: f32;
    var phi_4375_: f32;
    var phi_4400_: i32;
    var phi_4438_: bool;
    var phi_4446_: bool;
    var phi_4447_: bool;
    var phi_4454_: i32;
    var phi_4619_: i32;
    var phi_4622_: i32;
    var phi_4624_: f32;
    var phi_4626_: i32;
    var phi_4634_: bool;
    var phi_4658_: f32;
    var phi_4620_: i32;
    var phi_4623_: i32;
    var phi_4625_: f32;
    var phi_4676_: f32;
    var phi_4680_: f32;
    var phi_4689_: f32;
    var phi_4714_: i32;
    var phi_4752_: bool;
    var phi_4760_: bool;
    var phi_4761_: bool;
    var phi_4768_: i32;
    var phi_4933_: i32;
    var phi_4936_: i32;
    var phi_4938_: f32;
    var phi_4940_: i32;
    var phi_4948_: bool;
    var phi_4972_: f32;
    var phi_4934_: i32;
    var phi_4937_: i32;
    var phi_4939_: f32;
    var phi_4990_: f32;
    var phi_4994_: f32;
    var phi_5003_: f32;
    var phi_5028_: i32;
    var phi_5066_: bool;
    var phi_5074_: bool;
    var phi_5075_: bool;
    var phi_5082_: i32;
    var phi_5247_: i32;
    var phi_5250_: i32;
    var phi_5252_: f32;
    var phi_5254_: i32;
    var phi_5262_: bool;
    var phi_5286_: f32;
    var phi_5248_: i32;
    var phi_5251_: i32;
    var phi_5253_: f32;
    var phi_5304_: f32;
    var phi_5308_: f32;
    var phi_5317_: f32;
    var phi_5333_: u32;
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
    var local_75: u32;
    var local_76: u32;
    var local_77: u32;
    var local_78: u32;
    var local_79: u32;
    var local_80: u32;
    var local_81: u32;
    var local_82: u32;
    var local_83: vec2<i32>;
    var local_84: u32;
    var local_85: u32;
    var local_86: u32;
    var local_87: u32;
    var local_88: u32;
    var local_89: vec2<i32>;
    var local_90: u32;
    var local_91: u32;
    var local_92: u32;
    var local_93: u32;
    var local_94: vec2<i32>;
    var local_95: u32;
    var local_96: i32;
    var local_97: i32;
    var local_98: f32;
    var local_99: f32;
    var local_100: i32;
    var local_101: i32;
    var local_102: f32;
    var local_103: f32;
    var local_104: i32;
    var local_105: i32;
    var local_106: f32;
    var local_107: f32;
    var local_108: i32;
    var local_109: i32;
    var local_110: f32;
    var local_111: f32;
    var local_112: i32;
    var local_113: i32;
    var local_114: f32;
    var local_115: f32;
    var local_116: i32;
    var local_117: i32;
    var local_118: f32;
    var local_119: f32;
    var local_120: i32;
    var local_121: i32;
    var local_122: f32;
    var local_123: f32;
    var local_124: i32;
    var local_125: i32;
    var local_126: f32;
    var local_127: f32;
    var local_128: i32;
    var local_129: i32;
    var local_130: f32;
    var local_131: f32;
    var local_132: i32;
    var local_133: i32;
    var local_134: f32;
    var local_135: f32;
    var local_136: i32;
    var local_137: i32;
    var local_138: f32;
    var local_139: f32;
    var local_140: i32;
    var local_141: i32;
    var local_142: f32;
    var local_143: f32;
    var local_144: i32;
    var local_145: i32;
    var local_146: f32;
    var local_147: f32;
    var local_148: i32;
    var local_149: i32;
    var local_150: f32;
    var local_151: f32;
    var local_152: i32;
    var local_153: i32;
    var local_154: f32;
    var local_155: f32;
    var local_156: i32;
    var local_157: i32;
    var local_158: f32;
    var local_159: f32;

    iSampleOffsets = array<vec2<i32>, 5>(vec2<i32>(0i, 0i), vec2<i32>(-1i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, -1i), vec2<i32>(0i, 1i));
    let _e135 = global;
    let _e136 = global_1;
    let _e139 = cbSPD.mips;
    let _e141 = cbSPD.workGroupOffset;
    let _e142 = (_e135.xy + _e141);
    switch bitcast<i32>(0u) {
        default: {
            let _e144 = (_e136 % 64u);
            let _e161 = (((_e144 & 1u) | ((_e144 >> bitcast<u32>(2u)) & 6u)) + (8u * ((_e136 >> bitcast<u32>(6u)) % 2u)));
            let _e165 = ((((_e144 >> bitcast<u32>(1u)) & 3u) | ((_e144 >> bitcast<u32>(3u)) & 4u)) + (8u * (_e136 >> bitcast<u32>(7u))));
            switch bitcast<i32>(0u) {
                default: {
                    let _e168 = bitcast<vec2<i32>>((_e142 * vec2<u32>(64u, 64u)));
                    let _e169 = (_e161 * 2u);
                    let _e170 = bitcast<i32>(_e169);
                    let _e171 = (_e165 * 2u);
                    let _e172 = bitcast<i32>(_e171);
                    let _e174 = (_e168 + vec2<i32>(_e170, _e172));
                    let _e176 = bitcast<vec2<i32>>((_e142 * vec2<u32>(32u, 32u)));
                    let _e177 = bitcast<i32>(_e161);
                    let _e178 = bitcast<i32>(_e165);
                    let _e179 = vec2<i32>(_e177, _e178);
                    let _e181 = bitcast<vec2<u32>>(_e174);
                    let _e186 = vec2<i32>(vec2<f32>(_e174));
                    let _e188 = cbFSR3Upscaler.iRenderSize;
                    let _e191 = (_e188.x - 1i);
                    let _e196 = (_e188.y - 1i);
                    let _e199 = vec2<i32>(max(0i, min(_e186.x, _e191)), max(0i, min(_e186.y, _e196)));
                    let _e201 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(_e199), 0u);
                    let _e205 = vec2<f32>(_e188);
                    let _e206 = ((vec2<f32>(_e199) + vec2<f32>(0.5f, 0.5f)) / _e205);
                    let _e208 = cbFSR3Upscaler.fJitter;
                    let _e209 = (_e208 / _e205);
                    phi_256_ = 0i;
                    local_65 = _e169;
                    local_66 = _e171;
                    local_67 = _e169;
                    local_68 = _e171;
                    local_69 = _e169;
                    local_70 = _e171;
                    local_71 = _e169;
                    local_72 = _e171;
                    local_73 = _e169;
                    local_74 = _e171;
                    local_75 = _e171;
                    local_76 = _e171;
                    local_77 = _e171;
                    local_78 = _e171;
                    local_79 = _e169;
                    local_80 = _e169;
                    local_81 = _e169;
                    local_82 = _e169;
                    local_83 = _e179;
                    local_84 = _e169;
                    local_85 = _e171;
                    local_86 = _e171;
                    local_87 = _e171;
                    local_88 = _e171;
                    local_89 = _e179;
                    local_90 = _e171;
                    local_91 = _e171;
                    local_92 = _e171;
                    local_93 = _e171;
                    local_94 = _e179;
                    local_95 = _e171;
                    loop {
                        let _e215 = phi_256_;
                        if (_e215 < 5i) {
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e218 = iSampleOffsets[_e215];
                            let _e219 = (vec2<i32>(floor(((_e206 + _e209) * _e205))) + _e218);
                            let _e228 = textureLoad(r_current_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e219.x, _e191)), max(0i, min(_e219.y, _e196)))), 0u);
                            let _e230 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                            local_18[_e215] = (_e228.x * select(_e230.x, 1f, (_e230.x == 0f)));
                            let _e236 = local_18[_e215];
                            local_18[_e215] = pow(_e236, 1f);
                            let _e238 = local_18[_e215];
                            local_18[_e215] = max(_e238, 0.000061f);
                            phi_256_ = (_e215 + 1i);
                        }
                    }
                    let _e241 = local_18;
                    let _e243 = cbFSR3Upscaler.fPreviousFrameJitter;
                    let _e245 = cbFSR3Upscaler.iPreviousFrameRenderSize;
                    let _e246 = vec2<f32>(_e245);
                    let _e247 = (_e243 / _e246);
                    let _e249 = ((_e206 + _e247) + _e201.xy);
                    phi_300_ = false;
                    if (_e249.x >= 0f) {
                        phi_300_ = (_e249.x <= 1f);
                    }
                    let _e254 = phi_300_;
                    phi_309_ = false;
                    if _e254 {
                        phi_308_ = false;
                        if (_e249.y >= 0f) {
                            phi_308_ = (_e249.y <= 1f);
                        }
                        let _e259 = phi_308_;
                        phi_309_ = _e259;
                    }
                    let _e261 = phi_309_;
                    if _e261 {
                        phi_316_ = 0i;
                        loop {
                            let _e266 = phi_316_;
                            if (_e266 < 5i) {
                                continue;
                            } else {
                                break;
                            }
                            continuing {
                                let _e269 = iSampleOffsets[_e266];
                                let _e270 = (vec2<i32>(floor((_e249 * _e246))) + _e269);
                                let _e283 = textureLoad(r_previous_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e270.x, (_e245.x - 1i))), max(0i, min(_e270.y, (_e245.y - 1i))))), 0u);
                                let _e286 = cbFSR3Upscaler.fDeltaPreExposure;
                                let _e288 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                                local[_e266] = ((_e283.x * _e286) * select(_e288.x, 1f, (_e288.x == 0f)));
                                let _e294 = local[_e266];
                                local[_e266] = pow(_e294, 1f);
                                let _e296 = local[_e266];
                                local[_e266] = max(_e296, 0.000061f);
                                phi_316_ = (_e266 + 1i);
                            }
                        }
                    }
                    let _e299 = local;
                    phi_542_ = 0f;
                    if _e261 {
                        local_17 = _e241;
                        local_16 = _e299;
                        let _e301 = local_17[0i];
                        let _e303 = local_17[3i];
                        let _e305 = local_17[0i];
                        let _e306 = local_17[3i];
                        local_17[3i] = max(_e305, _e306);
                        local_17[0i] = min(_e301, _e303);
                        let _e309 = local_17[1i];
                        let _e311 = local_17[4i];
                        let _e313 = local_17[1i];
                        let _e314 = local_17[4i];
                        local_17[4i] = max(_e313, _e314);
                        local_17[1i] = min(_e309, _e311);
                        let _e316 = local_17[0i];
                        let _e318 = local_17[2i];
                        let _e320 = local_17[0i];
                        let _e321 = local_17[2i];
                        local_17[2i] = max(_e320, _e321);
                        local_17[0i] = min(_e316, _e318);
                        let _e323 = local_17[1i];
                        let _e324 = local_17[3i];
                        let _e326 = local_17[1i];
                        let _e327 = local_17[3i];
                        local_17[3i] = max(_e326, _e327);
                        local_17[1i] = min(_e323, _e324);
                        let _e329 = local_17[0i];
                        let _e330 = local_17[1i];
                        let _e332 = local_17[0i];
                        let _e333 = local_17[1i];
                        local_17[1i] = max(_e332, _e333);
                        local_17[0i] = min(_e329, _e330);
                        let _e335 = local_17[2i];
                        let _e336 = local_17[4i];
                        let _e338 = local_17[2i];
                        let _e339 = local_17[4i];
                        local_17[4i] = max(_e338, _e339);
                        local_17[2i] = min(_e335, _e336);
                        let _e341 = local_17[1i];
                        let _e342 = local_17[2i];
                        let _e344 = local_17[1i];
                        let _e345 = local_17[2i];
                        local_17[2i] = max(_e344, _e345);
                        local_17[1i] = min(_e341, _e342);
                        let _e347 = local_17[3i];
                        let _e348 = local_17[4i];
                        let _e350 = local_17[3i];
                        let _e351 = local_17[4i];
                        local_17[4i] = max(_e350, _e351);
                        local_17[3i] = min(_e347, _e348);
                        let _e353 = local_17[2i];
                        let _e354 = local_17[3i];
                        let _e356 = local_17[2i];
                        let _e357 = local_17[3i];
                        local_17[3i] = max(_e356, _e357);
                        local_17[2i] = min(_e353, _e354);
                        let _e360 = local_16[0i];
                        let _e362 = local_16[3i];
                        let _e364 = local_16[0i];
                        let _e365 = local_16[3i];
                        local_16[3i] = max(_e364, _e365);
                        local_16[0i] = min(_e360, _e362);
                        let _e368 = local_16[1i];
                        let _e370 = local_16[4i];
                        let _e372 = local_16[1i];
                        let _e373 = local_16[4i];
                        local_16[4i] = max(_e372, _e373);
                        local_16[1i] = min(_e368, _e370);
                        let _e375 = local_16[0i];
                        let _e377 = local_16[2i];
                        let _e379 = local_16[0i];
                        let _e380 = local_16[2i];
                        local_16[2i] = max(_e379, _e380);
                        local_16[0i] = min(_e375, _e377);
                        let _e382 = local_16[1i];
                        let _e383 = local_16[3i];
                        let _e385 = local_16[1i];
                        let _e386 = local_16[3i];
                        local_16[3i] = max(_e385, _e386);
                        local_16[1i] = min(_e382, _e383);
                        let _e388 = local_16[0i];
                        let _e389 = local_16[1i];
                        let _e391 = local_16[0i];
                        let _e392 = local_16[1i];
                        local_16[1i] = max(_e391, _e392);
                        local_16[0i] = min(_e388, _e389);
                        let _e394 = local_16[2i];
                        let _e395 = local_16[4i];
                        let _e397 = local_16[2i];
                        let _e398 = local_16[4i];
                        local_16[4i] = max(_e397, _e398);
                        local_16[2i] = min(_e394, _e395);
                        let _e400 = local_16[1i];
                        let _e401 = local_16[2i];
                        let _e403 = local_16[1i];
                        let _e404 = local_16[2i];
                        local_16[2i] = max(_e403, _e404);
                        local_16[1i] = min(_e400, _e401);
                        let _e406 = local_16[3i];
                        let _e407 = local_16[4i];
                        let _e409 = local_16[3i];
                        let _e410 = local_16[4i];
                        local_16[4i] = max(_e409, _e410);
                        local_16[3i] = min(_e406, _e407);
                        let _e412 = local_16[2i];
                        let _e413 = local_16[3i];
                        let _e415 = local_16[2i];
                        let _e416 = local_16[3i];
                        local_16[3i] = max(_e415, _e416);
                        local_16[2i] = min(_e412, _e413);
                        let _e418 = local_17[4i];
                        let _e419 = local_16[4i];
                        phi_538_ = 65503f;
                        if (min(_e418, _e419) > 0.000000000000000000000000000000000000011754944f) {
                            phi_481_ = 0i;
                            phi_484_ = 0i;
                            phi_486_ = 65503f;
                            phi_488_ = 0i;
                            loop {
                                let _e423 = phi_481_;
                                let _e425 = phi_484_;
                                let _e427 = phi_486_;
                                let _e429 = phi_488_;
                                local_99 = _e427;
                                phi_496_ = false;
                                if (_e429 < 5i) {
                                    phi_496_ = (_e427 < 65504f);
                                }
                                let _e433 = phi_496_;
                                if _e433 {
                                    let _e435 = local_17[_e425];
                                    let _e437 = local_16[_e423];
                                    let _e438 = (_e435 - _e437);
                                    if (abs(_e438) > 0.000061f) {
                                        let _e444 = local_17[_e425];
                                        let _e445 = local_16[_e423];
                                        let _e446 = max(_e444, _e445);
                                        if (_e446 != 0f) {
                                            phi_520_ = (min(_e444, _e445) / _e446);
                                        } else {
                                            phi_520_ = 0f;
                                        }
                                        let _e451 = phi_520_;
                                        let _e453 = (f32(i32(sign(_e438))) * (1f - _e451));
                                        let _e458 = local_17[_e425];
                                        let _e459 = local_16[_e423];
                                        let _e462 = (_e425 + select(0i, 1i, (_e458 < _e459)));
                                        let _e464 = local_17[_e462];
                                        let _e465 = local_16[_e423];
                                        phi_482_ = (_e423 + select(0i, 1i, (_e464 >= _e465)));
                                        phi_485_ = _e462;
                                        phi_487_ = select(_e427, _e453, (abs(_e453) < abs(_e427)));
                                    } else {
                                        phi_482_ = _e423;
                                        phi_485_ = _e425;
                                        phi_487_ = 65504f;
                                    }
                                    let _e470 = phi_482_;
                                    let _e472 = phi_485_;
                                    let _e474 = phi_487_;
                                    local_96 = _e470;
                                    local_97 = _e472;
                                    local_98 = _e474;
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    let _e5635 = local_96;
                                    phi_481_ = _e5635;
                                    let _e5638 = local_97;
                                    phi_484_ = _e5638;
                                    let _e5641 = local_98;
                                    phi_486_ = _e5641;
                                    phi_488_ = (_e429 + 1i);
                                }
                            }
                            let _e5650 = local_99;
                            phi_538_ = _e5650;
                        }
                        let _e477 = phi_538_;
                        phi_542_ = (_e477 * select(0f, 1f, (_e477 < 65503f)));
                    }
                    let _e482 = phi_542_;
                    let _e487 = vec4<f32>(_e482, vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    if (_e482 != 0f) {
                        phi_551_ = f32(i32(sign(_e482)));
                    } else {
                        phi_551_ = 0f;
                    }
                    let _e493 = phi_551_;
                    let _e498 = vec4<f32>(_e487.x, _e493, _e487.z, _e487.w);
                    let _e506 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e181 + vec2<u32>(0u, 1u)))));
                    let _e513 = vec2<i32>(max(0i, min(_e506.x, _e191)), max(0i, min(_e506.y, _e196)));
                    let _e515 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(_e513), 0u);
                    let _e519 = ((vec2<f32>(_e513) + vec2<f32>(0.5f, 0.5f)) / _e205);
                    phi_576_ = 0i;
                    loop {
                        let _e525 = phi_576_;
                        if (_e525 < 5i) {
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e528 = iSampleOffsets[_e525];
                            let _e529 = (vec2<i32>(floor(((_e519 + _e209) * _e205))) + _e528);
                            let _e538 = textureLoad(r_current_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e529.x, _e191)), max(0i, min(_e529.y, _e196)))), 0u);
                            let _e540 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                            local_21[_e525] = (_e538.x * select(_e540.x, 1f, (_e540.x == 0f)));
                            let _e546 = local_21[_e525];
                            local_21[_e525] = pow(_e546, 1f);
                            let _e548 = local_21[_e525];
                            local_21[_e525] = max(_e548, 0.000061f);
                            phi_576_ = (_e525 + 1i);
                        }
                    }
                    let _e551 = local_21;
                    let _e553 = ((_e519 + _e247) + _e515.xy);
                    phi_614_ = false;
                    if (_e553.x >= 0f) {
                        phi_614_ = (_e553.x <= 1f);
                    }
                    let _e558 = phi_614_;
                    phi_623_ = false;
                    if _e558 {
                        phi_622_ = false;
                        if (_e553.y >= 0f) {
                            phi_622_ = (_e553.y <= 1f);
                        }
                        let _e563 = phi_622_;
                        phi_623_ = _e563;
                    }
                    let _e565 = phi_623_;
                    if _e565 {
                        phi_630_ = 0i;
                        loop {
                            let _e570 = phi_630_;
                            if (_e570 < 5i) {
                                continue;
                            } else {
                                break;
                            }
                            continuing {
                                let _e573 = iSampleOffsets[_e570];
                                let _e574 = (vec2<i32>(floor((_e553 * _e246))) + _e573);
                                let _e587 = textureLoad(r_previous_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e574.x, (_e245.x - 1i))), max(0i, min(_e574.y, (_e245.y - 1i))))), 0u);
                                let _e590 = cbFSR3Upscaler.fDeltaPreExposure;
                                let _e592 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                                local_1[_e570] = ((_e587.x * _e590) * select(_e592.x, 1f, (_e592.x == 0f)));
                                let _e598 = local_1[_e570];
                                local_1[_e570] = pow(_e598, 1f);
                                let _e600 = local_1[_e570];
                                local_1[_e570] = max(_e600, 0.000061f);
                                phi_630_ = (_e570 + 1i);
                            }
                        }
                    }
                    let _e603 = local_1;
                    phi_856_ = 0f;
                    if _e565 {
                        local_20 = _e551;
                        local_19 = _e603;
                        let _e605 = local_20[0i];
                        let _e607 = local_20[3i];
                        let _e609 = local_20[0i];
                        let _e610 = local_20[3i];
                        local_20[3i] = max(_e609, _e610);
                        local_20[0i] = min(_e605, _e607);
                        let _e613 = local_20[1i];
                        let _e615 = local_20[4i];
                        let _e617 = local_20[1i];
                        let _e618 = local_20[4i];
                        local_20[4i] = max(_e617, _e618);
                        local_20[1i] = min(_e613, _e615);
                        let _e620 = local_20[0i];
                        let _e622 = local_20[2i];
                        let _e624 = local_20[0i];
                        let _e625 = local_20[2i];
                        local_20[2i] = max(_e624, _e625);
                        local_20[0i] = min(_e620, _e622);
                        let _e627 = local_20[1i];
                        let _e628 = local_20[3i];
                        let _e630 = local_20[1i];
                        let _e631 = local_20[3i];
                        local_20[3i] = max(_e630, _e631);
                        local_20[1i] = min(_e627, _e628);
                        let _e633 = local_20[0i];
                        let _e634 = local_20[1i];
                        let _e636 = local_20[0i];
                        let _e637 = local_20[1i];
                        local_20[1i] = max(_e636, _e637);
                        local_20[0i] = min(_e633, _e634);
                        let _e639 = local_20[2i];
                        let _e640 = local_20[4i];
                        let _e642 = local_20[2i];
                        let _e643 = local_20[4i];
                        local_20[4i] = max(_e642, _e643);
                        local_20[2i] = min(_e639, _e640);
                        let _e645 = local_20[1i];
                        let _e646 = local_20[2i];
                        let _e648 = local_20[1i];
                        let _e649 = local_20[2i];
                        local_20[2i] = max(_e648, _e649);
                        local_20[1i] = min(_e645, _e646);
                        let _e651 = local_20[3i];
                        let _e652 = local_20[4i];
                        let _e654 = local_20[3i];
                        let _e655 = local_20[4i];
                        local_20[4i] = max(_e654, _e655);
                        local_20[3i] = min(_e651, _e652);
                        let _e657 = local_20[2i];
                        let _e658 = local_20[3i];
                        let _e660 = local_20[2i];
                        let _e661 = local_20[3i];
                        local_20[3i] = max(_e660, _e661);
                        local_20[2i] = min(_e657, _e658);
                        let _e664 = local_19[0i];
                        let _e666 = local_19[3i];
                        let _e668 = local_19[0i];
                        let _e669 = local_19[3i];
                        local_19[3i] = max(_e668, _e669);
                        local_19[0i] = min(_e664, _e666);
                        let _e672 = local_19[1i];
                        let _e674 = local_19[4i];
                        let _e676 = local_19[1i];
                        let _e677 = local_19[4i];
                        local_19[4i] = max(_e676, _e677);
                        local_19[1i] = min(_e672, _e674);
                        let _e679 = local_19[0i];
                        let _e681 = local_19[2i];
                        let _e683 = local_19[0i];
                        let _e684 = local_19[2i];
                        local_19[2i] = max(_e683, _e684);
                        local_19[0i] = min(_e679, _e681);
                        let _e686 = local_19[1i];
                        let _e687 = local_19[3i];
                        let _e689 = local_19[1i];
                        let _e690 = local_19[3i];
                        local_19[3i] = max(_e689, _e690);
                        local_19[1i] = min(_e686, _e687);
                        let _e692 = local_19[0i];
                        let _e693 = local_19[1i];
                        let _e695 = local_19[0i];
                        let _e696 = local_19[1i];
                        local_19[1i] = max(_e695, _e696);
                        local_19[0i] = min(_e692, _e693);
                        let _e698 = local_19[2i];
                        let _e699 = local_19[4i];
                        let _e701 = local_19[2i];
                        let _e702 = local_19[4i];
                        local_19[4i] = max(_e701, _e702);
                        local_19[2i] = min(_e698, _e699);
                        let _e704 = local_19[1i];
                        let _e705 = local_19[2i];
                        let _e707 = local_19[1i];
                        let _e708 = local_19[2i];
                        local_19[2i] = max(_e707, _e708);
                        local_19[1i] = min(_e704, _e705);
                        let _e710 = local_19[3i];
                        let _e711 = local_19[4i];
                        let _e713 = local_19[3i];
                        let _e714 = local_19[4i];
                        local_19[4i] = max(_e713, _e714);
                        local_19[3i] = min(_e710, _e711);
                        let _e716 = local_19[2i];
                        let _e717 = local_19[3i];
                        let _e719 = local_19[2i];
                        let _e720 = local_19[3i];
                        local_19[3i] = max(_e719, _e720);
                        local_19[2i] = min(_e716, _e717);
                        let _e722 = local_20[4i];
                        let _e723 = local_19[4i];
                        phi_852_ = 65503f;
                        if (min(_e722, _e723) > 0.000000000000000000000000000000000000011754944f) {
                            phi_795_ = 0i;
                            phi_798_ = 0i;
                            phi_800_ = 65503f;
                            phi_802_ = 0i;
                            loop {
                                let _e727 = phi_795_;
                                let _e729 = phi_798_;
                                let _e731 = phi_800_;
                                let _e733 = phi_802_;
                                local_103 = _e731;
                                phi_810_ = false;
                                if (_e733 < 5i) {
                                    phi_810_ = (_e731 < 65504f);
                                }
                                let _e737 = phi_810_;
                                if _e737 {
                                    let _e739 = local_20[_e729];
                                    let _e741 = local_19[_e727];
                                    let _e742 = (_e739 - _e741);
                                    if (abs(_e742) > 0.000061f) {
                                        let _e748 = local_20[_e729];
                                        let _e749 = local_19[_e727];
                                        let _e750 = max(_e748, _e749);
                                        if (_e750 != 0f) {
                                            phi_834_ = (min(_e748, _e749) / _e750);
                                        } else {
                                            phi_834_ = 0f;
                                        }
                                        let _e755 = phi_834_;
                                        let _e757 = (f32(i32(sign(_e742))) * (1f - _e755));
                                        let _e762 = local_20[_e729];
                                        let _e763 = local_19[_e727];
                                        let _e766 = (_e729 + select(0i, 1i, (_e762 < _e763)));
                                        let _e768 = local_20[_e766];
                                        let _e769 = local_19[_e727];
                                        phi_796_ = (_e727 + select(0i, 1i, (_e768 >= _e769)));
                                        phi_799_ = _e766;
                                        phi_801_ = select(_e731, _e757, (abs(_e757) < abs(_e731)));
                                    } else {
                                        phi_796_ = _e727;
                                        phi_799_ = _e729;
                                        phi_801_ = 65504f;
                                    }
                                    let _e774 = phi_796_;
                                    let _e776 = phi_799_;
                                    let _e778 = phi_801_;
                                    local_100 = _e774;
                                    local_101 = _e776;
                                    local_102 = _e778;
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    let _e5660 = local_100;
                                    phi_795_ = _e5660;
                                    let _e5663 = local_101;
                                    phi_798_ = _e5663;
                                    let _e5666 = local_102;
                                    phi_800_ = _e5666;
                                    phi_802_ = (_e733 + 1i);
                                }
                            }
                            let _e5675 = local_103;
                            phi_852_ = _e5675;
                        }
                        let _e781 = phi_852_;
                        phi_856_ = (_e781 * select(0f, 1f, (_e781 < 65503f)));
                    }
                    let _e786 = phi_856_;
                    let _e791 = vec4<f32>(_e786, vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    if (_e786 != 0f) {
                        phi_865_ = f32(i32(sign(_e786)));
                    } else {
                        phi_865_ = 0f;
                    }
                    let _e797 = phi_865_;
                    let _e802 = vec4<f32>(_e791.x, _e797, _e791.z, _e791.w);
                    let _e810 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e181 + vec2<u32>(1u, 0u)))));
                    let _e817 = vec2<i32>(max(0i, min(_e810.x, _e191)), max(0i, min(_e810.y, _e196)));
                    let _e819 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(_e817), 0u);
                    let _e823 = ((vec2<f32>(_e817) + vec2<f32>(0.5f, 0.5f)) / _e205);
                    phi_890_ = 0i;
                    loop {
                        let _e829 = phi_890_;
                        if (_e829 < 5i) {
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e832 = iSampleOffsets[_e829];
                            let _e833 = (vec2<i32>(floor(((_e823 + _e209) * _e205))) + _e832);
                            let _e842 = textureLoad(r_current_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e833.x, _e191)), max(0i, min(_e833.y, _e196)))), 0u);
                            let _e844 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                            local_24[_e829] = (_e842.x * select(_e844.x, 1f, (_e844.x == 0f)));
                            let _e850 = local_24[_e829];
                            local_24[_e829] = pow(_e850, 1f);
                            let _e852 = local_24[_e829];
                            local_24[_e829] = max(_e852, 0.000061f);
                            phi_890_ = (_e829 + 1i);
                        }
                    }
                    let _e855 = local_24;
                    let _e857 = ((_e823 + _e247) + _e819.xy);
                    phi_928_ = false;
                    if (_e857.x >= 0f) {
                        phi_928_ = (_e857.x <= 1f);
                    }
                    let _e862 = phi_928_;
                    phi_937_ = false;
                    if _e862 {
                        phi_936_ = false;
                        if (_e857.y >= 0f) {
                            phi_936_ = (_e857.y <= 1f);
                        }
                        let _e867 = phi_936_;
                        phi_937_ = _e867;
                    }
                    let _e869 = phi_937_;
                    if _e869 {
                        phi_944_ = 0i;
                        loop {
                            let _e874 = phi_944_;
                            if (_e874 < 5i) {
                                continue;
                            } else {
                                break;
                            }
                            continuing {
                                let _e877 = iSampleOffsets[_e874];
                                let _e878 = (vec2<i32>(floor((_e857 * _e246))) + _e877);
                                let _e891 = textureLoad(r_previous_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e878.x, (_e245.x - 1i))), max(0i, min(_e878.y, (_e245.y - 1i))))), 0u);
                                let _e894 = cbFSR3Upscaler.fDeltaPreExposure;
                                let _e896 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                                local_2[_e874] = ((_e891.x * _e894) * select(_e896.x, 1f, (_e896.x == 0f)));
                                let _e902 = local_2[_e874];
                                local_2[_e874] = pow(_e902, 1f);
                                let _e904 = local_2[_e874];
                                local_2[_e874] = max(_e904, 0.000061f);
                                phi_944_ = (_e874 + 1i);
                            }
                        }
                    }
                    let _e907 = local_2;
                    phi_1170_ = 0f;
                    if _e869 {
                        local_23 = _e855;
                        local_22 = _e907;
                        let _e909 = local_23[0i];
                        let _e911 = local_23[3i];
                        let _e913 = local_23[0i];
                        let _e914 = local_23[3i];
                        local_23[3i] = max(_e913, _e914);
                        local_23[0i] = min(_e909, _e911);
                        let _e917 = local_23[1i];
                        let _e919 = local_23[4i];
                        let _e921 = local_23[1i];
                        let _e922 = local_23[4i];
                        local_23[4i] = max(_e921, _e922);
                        local_23[1i] = min(_e917, _e919);
                        let _e924 = local_23[0i];
                        let _e926 = local_23[2i];
                        let _e928 = local_23[0i];
                        let _e929 = local_23[2i];
                        local_23[2i] = max(_e928, _e929);
                        local_23[0i] = min(_e924, _e926);
                        let _e931 = local_23[1i];
                        let _e932 = local_23[3i];
                        let _e934 = local_23[1i];
                        let _e935 = local_23[3i];
                        local_23[3i] = max(_e934, _e935);
                        local_23[1i] = min(_e931, _e932);
                        let _e937 = local_23[0i];
                        let _e938 = local_23[1i];
                        let _e940 = local_23[0i];
                        let _e941 = local_23[1i];
                        local_23[1i] = max(_e940, _e941);
                        local_23[0i] = min(_e937, _e938);
                        let _e943 = local_23[2i];
                        let _e944 = local_23[4i];
                        let _e946 = local_23[2i];
                        let _e947 = local_23[4i];
                        local_23[4i] = max(_e946, _e947);
                        local_23[2i] = min(_e943, _e944);
                        let _e949 = local_23[1i];
                        let _e950 = local_23[2i];
                        let _e952 = local_23[1i];
                        let _e953 = local_23[2i];
                        local_23[2i] = max(_e952, _e953);
                        local_23[1i] = min(_e949, _e950);
                        let _e955 = local_23[3i];
                        let _e956 = local_23[4i];
                        let _e958 = local_23[3i];
                        let _e959 = local_23[4i];
                        local_23[4i] = max(_e958, _e959);
                        local_23[3i] = min(_e955, _e956);
                        let _e961 = local_23[2i];
                        let _e962 = local_23[3i];
                        let _e964 = local_23[2i];
                        let _e965 = local_23[3i];
                        local_23[3i] = max(_e964, _e965);
                        local_23[2i] = min(_e961, _e962);
                        let _e968 = local_22[0i];
                        let _e970 = local_22[3i];
                        let _e972 = local_22[0i];
                        let _e973 = local_22[3i];
                        local_22[3i] = max(_e972, _e973);
                        local_22[0i] = min(_e968, _e970);
                        let _e976 = local_22[1i];
                        let _e978 = local_22[4i];
                        let _e980 = local_22[1i];
                        let _e981 = local_22[4i];
                        local_22[4i] = max(_e980, _e981);
                        local_22[1i] = min(_e976, _e978);
                        let _e983 = local_22[0i];
                        let _e985 = local_22[2i];
                        let _e987 = local_22[0i];
                        let _e988 = local_22[2i];
                        local_22[2i] = max(_e987, _e988);
                        local_22[0i] = min(_e983, _e985);
                        let _e990 = local_22[1i];
                        let _e991 = local_22[3i];
                        let _e993 = local_22[1i];
                        let _e994 = local_22[3i];
                        local_22[3i] = max(_e993, _e994);
                        local_22[1i] = min(_e990, _e991);
                        let _e996 = local_22[0i];
                        let _e997 = local_22[1i];
                        let _e999 = local_22[0i];
                        let _e1000 = local_22[1i];
                        local_22[1i] = max(_e999, _e1000);
                        local_22[0i] = min(_e996, _e997);
                        let _e1002 = local_22[2i];
                        let _e1003 = local_22[4i];
                        let _e1005 = local_22[2i];
                        let _e1006 = local_22[4i];
                        local_22[4i] = max(_e1005, _e1006);
                        local_22[2i] = min(_e1002, _e1003);
                        let _e1008 = local_22[1i];
                        let _e1009 = local_22[2i];
                        let _e1011 = local_22[1i];
                        let _e1012 = local_22[2i];
                        local_22[2i] = max(_e1011, _e1012);
                        local_22[1i] = min(_e1008, _e1009);
                        let _e1014 = local_22[3i];
                        let _e1015 = local_22[4i];
                        let _e1017 = local_22[3i];
                        let _e1018 = local_22[4i];
                        local_22[4i] = max(_e1017, _e1018);
                        local_22[3i] = min(_e1014, _e1015);
                        let _e1020 = local_22[2i];
                        let _e1021 = local_22[3i];
                        let _e1023 = local_22[2i];
                        let _e1024 = local_22[3i];
                        local_22[3i] = max(_e1023, _e1024);
                        local_22[2i] = min(_e1020, _e1021);
                        let _e1026 = local_23[4i];
                        let _e1027 = local_22[4i];
                        phi_1166_ = 65503f;
                        if (min(_e1026, _e1027) > 0.000000000000000000000000000000000000011754944f) {
                            phi_1109_ = 0i;
                            phi_1112_ = 0i;
                            phi_1114_ = 65503f;
                            phi_1116_ = 0i;
                            loop {
                                let _e1031 = phi_1109_;
                                let _e1033 = phi_1112_;
                                let _e1035 = phi_1114_;
                                let _e1037 = phi_1116_;
                                local_107 = _e1035;
                                phi_1124_ = false;
                                if (_e1037 < 5i) {
                                    phi_1124_ = (_e1035 < 65504f);
                                }
                                let _e1041 = phi_1124_;
                                if _e1041 {
                                    let _e1043 = local_23[_e1033];
                                    let _e1045 = local_22[_e1031];
                                    let _e1046 = (_e1043 - _e1045);
                                    if (abs(_e1046) > 0.000061f) {
                                        let _e1052 = local_23[_e1033];
                                        let _e1053 = local_22[_e1031];
                                        let _e1054 = max(_e1052, _e1053);
                                        if (_e1054 != 0f) {
                                            phi_1148_ = (min(_e1052, _e1053) / _e1054);
                                        } else {
                                            phi_1148_ = 0f;
                                        }
                                        let _e1059 = phi_1148_;
                                        let _e1061 = (f32(i32(sign(_e1046))) * (1f - _e1059));
                                        let _e1066 = local_23[_e1033];
                                        let _e1067 = local_22[_e1031];
                                        let _e1070 = (_e1033 + select(0i, 1i, (_e1066 < _e1067)));
                                        let _e1072 = local_23[_e1070];
                                        let _e1073 = local_22[_e1031];
                                        phi_1110_ = (_e1031 + select(0i, 1i, (_e1072 >= _e1073)));
                                        phi_1113_ = _e1070;
                                        phi_1115_ = select(_e1035, _e1061, (abs(_e1061) < abs(_e1035)));
                                    } else {
                                        phi_1110_ = _e1031;
                                        phi_1113_ = _e1033;
                                        phi_1115_ = 65504f;
                                    }
                                    let _e1078 = phi_1110_;
                                    let _e1080 = phi_1113_;
                                    let _e1082 = phi_1115_;
                                    local_104 = _e1078;
                                    local_105 = _e1080;
                                    local_106 = _e1082;
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    let _e5685 = local_104;
                                    phi_1109_ = _e5685;
                                    let _e5688 = local_105;
                                    phi_1112_ = _e5688;
                                    let _e5691 = local_106;
                                    phi_1114_ = _e5691;
                                    phi_1116_ = (_e1037 + 1i);
                                }
                            }
                            let _e5700 = local_107;
                            phi_1166_ = _e5700;
                        }
                        let _e1085 = phi_1166_;
                        phi_1170_ = (_e1085 * select(0f, 1f, (_e1085 < 65503f)));
                    }
                    let _e1090 = phi_1170_;
                    let _e1095 = vec4<f32>(_e1090, vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    if (_e1090 != 0f) {
                        phi_1179_ = f32(i32(sign(_e1090)));
                    } else {
                        phi_1179_ = 0f;
                    }
                    let _e1101 = phi_1179_;
                    let _e1106 = vec4<f32>(_e1095.x, _e1101, _e1095.z, _e1095.w);
                    let _e1114 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e181 + vec2<u32>(1u, 1u)))));
                    let _e1121 = vec2<i32>(max(0i, min(_e1114.x, _e191)), max(0i, min(_e1114.y, _e196)));
                    let _e1123 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(_e1121), 0u);
                    let _e1127 = ((vec2<f32>(_e1121) + vec2<f32>(0.5f, 0.5f)) / _e205);
                    phi_1204_ = 0i;
                    loop {
                        let _e1133 = phi_1204_;
                        if (_e1133 < 5i) {
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e1136 = iSampleOffsets[_e1133];
                            let _e1137 = (vec2<i32>(floor(((_e1127 + _e209) * _e205))) + _e1136);
                            let _e1146 = textureLoad(r_current_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e1137.x, _e191)), max(0i, min(_e1137.y, _e196)))), 0u);
                            let _e1148 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                            local_27[_e1133] = (_e1146.x * select(_e1148.x, 1f, (_e1148.x == 0f)));
                            let _e1154 = local_27[_e1133];
                            local_27[_e1133] = pow(_e1154, 1f);
                            let _e1156 = local_27[_e1133];
                            local_27[_e1133] = max(_e1156, 0.000061f);
                            phi_1204_ = (_e1133 + 1i);
                        }
                    }
                    let _e1159 = local_27;
                    let _e1161 = ((_e1127 + _e247) + _e1123.xy);
                    phi_1242_ = false;
                    if (_e1161.x >= 0f) {
                        phi_1242_ = (_e1161.x <= 1f);
                    }
                    let _e1166 = phi_1242_;
                    phi_1251_ = false;
                    if _e1166 {
                        phi_1250_ = false;
                        if (_e1161.y >= 0f) {
                            phi_1250_ = (_e1161.y <= 1f);
                        }
                        let _e1171 = phi_1250_;
                        phi_1251_ = _e1171;
                    }
                    let _e1173 = phi_1251_;
                    if _e1173 {
                        phi_1258_ = 0i;
                        loop {
                            let _e1178 = phi_1258_;
                            if (_e1178 < 5i) {
                                continue;
                            } else {
                                break;
                            }
                            continuing {
                                let _e1181 = iSampleOffsets[_e1178];
                                let _e1182 = (vec2<i32>(floor((_e1161 * _e246))) + _e1181);
                                let _e1195 = textureLoad(r_previous_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e1182.x, (_e245.x - 1i))), max(0i, min(_e1182.y, (_e245.y - 1i))))), 0u);
                                let _e1198 = cbFSR3Upscaler.fDeltaPreExposure;
                                let _e1200 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                                local_3[_e1178] = ((_e1195.x * _e1198) * select(_e1200.x, 1f, (_e1200.x == 0f)));
                                let _e1206 = local_3[_e1178];
                                local_3[_e1178] = pow(_e1206, 1f);
                                let _e1208 = local_3[_e1178];
                                local_3[_e1178] = max(_e1208, 0.000061f);
                                phi_1258_ = (_e1178 + 1i);
                            }
                        }
                    }
                    let _e1211 = local_3;
                    phi_1484_ = 0f;
                    if _e1173 {
                        local_26 = _e1159;
                        local_25 = _e1211;
                        let _e1213 = local_26[0i];
                        let _e1215 = local_26[3i];
                        let _e1217 = local_26[0i];
                        let _e1218 = local_26[3i];
                        local_26[3i] = max(_e1217, _e1218);
                        local_26[0i] = min(_e1213, _e1215);
                        let _e1221 = local_26[1i];
                        let _e1223 = local_26[4i];
                        let _e1225 = local_26[1i];
                        let _e1226 = local_26[4i];
                        local_26[4i] = max(_e1225, _e1226);
                        local_26[1i] = min(_e1221, _e1223);
                        let _e1228 = local_26[0i];
                        let _e1230 = local_26[2i];
                        let _e1232 = local_26[0i];
                        let _e1233 = local_26[2i];
                        local_26[2i] = max(_e1232, _e1233);
                        local_26[0i] = min(_e1228, _e1230);
                        let _e1235 = local_26[1i];
                        let _e1236 = local_26[3i];
                        let _e1238 = local_26[1i];
                        let _e1239 = local_26[3i];
                        local_26[3i] = max(_e1238, _e1239);
                        local_26[1i] = min(_e1235, _e1236);
                        let _e1241 = local_26[0i];
                        let _e1242 = local_26[1i];
                        let _e1244 = local_26[0i];
                        let _e1245 = local_26[1i];
                        local_26[1i] = max(_e1244, _e1245);
                        local_26[0i] = min(_e1241, _e1242);
                        let _e1247 = local_26[2i];
                        let _e1248 = local_26[4i];
                        let _e1250 = local_26[2i];
                        let _e1251 = local_26[4i];
                        local_26[4i] = max(_e1250, _e1251);
                        local_26[2i] = min(_e1247, _e1248);
                        let _e1253 = local_26[1i];
                        let _e1254 = local_26[2i];
                        let _e1256 = local_26[1i];
                        let _e1257 = local_26[2i];
                        local_26[2i] = max(_e1256, _e1257);
                        local_26[1i] = min(_e1253, _e1254);
                        let _e1259 = local_26[3i];
                        let _e1260 = local_26[4i];
                        let _e1262 = local_26[3i];
                        let _e1263 = local_26[4i];
                        local_26[4i] = max(_e1262, _e1263);
                        local_26[3i] = min(_e1259, _e1260);
                        let _e1265 = local_26[2i];
                        let _e1266 = local_26[3i];
                        let _e1268 = local_26[2i];
                        let _e1269 = local_26[3i];
                        local_26[3i] = max(_e1268, _e1269);
                        local_26[2i] = min(_e1265, _e1266);
                        let _e1272 = local_25[0i];
                        let _e1274 = local_25[3i];
                        let _e1276 = local_25[0i];
                        let _e1277 = local_25[3i];
                        local_25[3i] = max(_e1276, _e1277);
                        local_25[0i] = min(_e1272, _e1274);
                        let _e1280 = local_25[1i];
                        let _e1282 = local_25[4i];
                        let _e1284 = local_25[1i];
                        let _e1285 = local_25[4i];
                        local_25[4i] = max(_e1284, _e1285);
                        local_25[1i] = min(_e1280, _e1282);
                        let _e1287 = local_25[0i];
                        let _e1289 = local_25[2i];
                        let _e1291 = local_25[0i];
                        let _e1292 = local_25[2i];
                        local_25[2i] = max(_e1291, _e1292);
                        local_25[0i] = min(_e1287, _e1289);
                        let _e1294 = local_25[1i];
                        let _e1295 = local_25[3i];
                        let _e1297 = local_25[1i];
                        let _e1298 = local_25[3i];
                        local_25[3i] = max(_e1297, _e1298);
                        local_25[1i] = min(_e1294, _e1295);
                        let _e1300 = local_25[0i];
                        let _e1301 = local_25[1i];
                        let _e1303 = local_25[0i];
                        let _e1304 = local_25[1i];
                        local_25[1i] = max(_e1303, _e1304);
                        local_25[0i] = min(_e1300, _e1301);
                        let _e1306 = local_25[2i];
                        let _e1307 = local_25[4i];
                        let _e1309 = local_25[2i];
                        let _e1310 = local_25[4i];
                        local_25[4i] = max(_e1309, _e1310);
                        local_25[2i] = min(_e1306, _e1307);
                        let _e1312 = local_25[1i];
                        let _e1313 = local_25[2i];
                        let _e1315 = local_25[1i];
                        let _e1316 = local_25[2i];
                        local_25[2i] = max(_e1315, _e1316);
                        local_25[1i] = min(_e1312, _e1313);
                        let _e1318 = local_25[3i];
                        let _e1319 = local_25[4i];
                        let _e1321 = local_25[3i];
                        let _e1322 = local_25[4i];
                        local_25[4i] = max(_e1321, _e1322);
                        local_25[3i] = min(_e1318, _e1319);
                        let _e1324 = local_25[2i];
                        let _e1325 = local_25[3i];
                        let _e1327 = local_25[2i];
                        let _e1328 = local_25[3i];
                        local_25[3i] = max(_e1327, _e1328);
                        local_25[2i] = min(_e1324, _e1325);
                        let _e1330 = local_26[4i];
                        let _e1331 = local_25[4i];
                        phi_1480_ = 65503f;
                        if (min(_e1330, _e1331) > 0.000000000000000000000000000000000000011754944f) {
                            phi_1423_ = 0i;
                            phi_1426_ = 0i;
                            phi_1428_ = 65503f;
                            phi_1430_ = 0i;
                            loop {
                                let _e1335 = phi_1423_;
                                let _e1337 = phi_1426_;
                                let _e1339 = phi_1428_;
                                let _e1341 = phi_1430_;
                                local_111 = _e1339;
                                phi_1438_ = false;
                                if (_e1341 < 5i) {
                                    phi_1438_ = (_e1339 < 65504f);
                                }
                                let _e1345 = phi_1438_;
                                if _e1345 {
                                    let _e1347 = local_26[_e1337];
                                    let _e1349 = local_25[_e1335];
                                    let _e1350 = (_e1347 - _e1349);
                                    if (abs(_e1350) > 0.000061f) {
                                        let _e1356 = local_26[_e1337];
                                        let _e1357 = local_25[_e1335];
                                        let _e1358 = max(_e1356, _e1357);
                                        if (_e1358 != 0f) {
                                            phi_1462_ = (min(_e1356, _e1357) / _e1358);
                                        } else {
                                            phi_1462_ = 0f;
                                        }
                                        let _e1363 = phi_1462_;
                                        let _e1365 = (f32(i32(sign(_e1350))) * (1f - _e1363));
                                        let _e1370 = local_26[_e1337];
                                        let _e1371 = local_25[_e1335];
                                        let _e1374 = (_e1337 + select(0i, 1i, (_e1370 < _e1371)));
                                        let _e1376 = local_26[_e1374];
                                        let _e1377 = local_25[_e1335];
                                        phi_1424_ = (_e1335 + select(0i, 1i, (_e1376 >= _e1377)));
                                        phi_1427_ = _e1374;
                                        phi_1429_ = select(_e1339, _e1365, (abs(_e1365) < abs(_e1339)));
                                    } else {
                                        phi_1424_ = _e1335;
                                        phi_1427_ = _e1337;
                                        phi_1429_ = 65504f;
                                    }
                                    let _e1382 = phi_1424_;
                                    let _e1384 = phi_1427_;
                                    let _e1386 = phi_1429_;
                                    local_108 = _e1382;
                                    local_109 = _e1384;
                                    local_110 = _e1386;
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    let _e5710 = local_108;
                                    phi_1423_ = _e5710;
                                    let _e5713 = local_109;
                                    phi_1426_ = _e5713;
                                    let _e5716 = local_110;
                                    phi_1428_ = _e5716;
                                    phi_1430_ = (_e1341 + 1i);
                                }
                            }
                            let _e5725 = local_111;
                            phi_1480_ = _e5725;
                        }
                        let _e1389 = phi_1480_;
                        phi_1484_ = (_e1389 * select(0f, 1f, (_e1389 < 65503f)));
                    }
                    let _e1394 = phi_1484_;
                    let _e1399 = vec4<f32>(_e1394, vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    if (_e1394 != 0f) {
                        phi_1493_ = f32(i32(sign(_e1394)));
                    } else {
                        phi_1493_ = 0f;
                    }
                    let _e1405 = phi_1493_;
                    let _e1410 = vec4<f32>(_e1399.x, _e1405, _e1399.z, _e1399.w);
                    local_64[0i] = ((((vec4<f32>(_e498.x, _e498.y, 1f, _e498.w) + vec4<f32>(_e802.x, _e802.y, 1f, _e802.w)) + vec4<f32>(_e1106.x, _e1106.y, 1f, _e1106.w)) + vec4<f32>(_e1410.x, _e1410.y, 1f, _e1410.w)) * 0.25f);
                    let _e1421 = local_64[0i];
                    textureStore(rw_spd_mip0_, bitcast<vec2<u32>>((_e176 + _e179)), _e1421.xy.xyyy);
                    let _e1426 = bitcast<i32>((_e169 + 32u));
                    let _e1428 = (_e168 + vec2<i32>(_e1426, _e172));
                    let _e1430 = bitcast<i32>((_e161 + 16u));
                    let _e1433 = bitcast<vec2<u32>>(_e1428);
                    let _e1438 = vec2<i32>(vec2<f32>(_e1428));
                    let _e1445 = vec2<i32>(max(0i, min(_e1438.x, _e191)), max(0i, min(_e1438.y, _e196)));
                    let _e1447 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(_e1445), 0u);
                    let _e1451 = ((vec2<f32>(_e1445) + vec2<f32>(0.5f, 0.5f)) / _e205);
                    phi_1538_ = 0i;
                    loop {
                        let _e1457 = phi_1538_;
                        if (_e1457 < 5i) {
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e1460 = iSampleOffsets[_e1457];
                            let _e1461 = (vec2<i32>(floor(((_e1451 + _e209) * _e205))) + _e1460);
                            let _e1470 = textureLoad(r_current_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e1461.x, _e191)), max(0i, min(_e1461.y, _e196)))), 0u);
                            let _e1472 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                            local_30[_e1457] = (_e1470.x * select(_e1472.x, 1f, (_e1472.x == 0f)));
                            let _e1478 = local_30[_e1457];
                            local_30[_e1457] = pow(_e1478, 1f);
                            let _e1480 = local_30[_e1457];
                            local_30[_e1457] = max(_e1480, 0.000061f);
                            phi_1538_ = (_e1457 + 1i);
                        }
                    }
                    let _e1483 = local_30;
                    let _e1485 = ((_e1451 + _e247) + _e1447.xy);
                    phi_1576_ = false;
                    if (_e1485.x >= 0f) {
                        phi_1576_ = (_e1485.x <= 1f);
                    }
                    let _e1490 = phi_1576_;
                    phi_1585_ = false;
                    if _e1490 {
                        phi_1584_ = false;
                        if (_e1485.y >= 0f) {
                            phi_1584_ = (_e1485.y <= 1f);
                        }
                        let _e1495 = phi_1584_;
                        phi_1585_ = _e1495;
                    }
                    let _e1497 = phi_1585_;
                    if _e1497 {
                        phi_1592_ = 0i;
                        loop {
                            let _e1502 = phi_1592_;
                            if (_e1502 < 5i) {
                                continue;
                            } else {
                                break;
                            }
                            continuing {
                                let _e1505 = iSampleOffsets[_e1502];
                                let _e1506 = (vec2<i32>(floor((_e1485 * _e246))) + _e1505);
                                let _e1519 = textureLoad(r_previous_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e1506.x, (_e245.x - 1i))), max(0i, min(_e1506.y, (_e245.y - 1i))))), 0u);
                                let _e1522 = cbFSR3Upscaler.fDeltaPreExposure;
                                let _e1524 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                                local_4[_e1502] = ((_e1519.x * _e1522) * select(_e1524.x, 1f, (_e1524.x == 0f)));
                                let _e1530 = local_4[_e1502];
                                local_4[_e1502] = pow(_e1530, 1f);
                                let _e1532 = local_4[_e1502];
                                local_4[_e1502] = max(_e1532, 0.000061f);
                                phi_1592_ = (_e1502 + 1i);
                            }
                        }
                    }
                    let _e1535 = local_4;
                    phi_1818_ = 0f;
                    if _e1497 {
                        local_29 = _e1483;
                        local_28 = _e1535;
                        let _e1537 = local_29[0i];
                        let _e1539 = local_29[3i];
                        let _e1541 = local_29[0i];
                        let _e1542 = local_29[3i];
                        local_29[3i] = max(_e1541, _e1542);
                        local_29[0i] = min(_e1537, _e1539);
                        let _e1545 = local_29[1i];
                        let _e1547 = local_29[4i];
                        let _e1549 = local_29[1i];
                        let _e1550 = local_29[4i];
                        local_29[4i] = max(_e1549, _e1550);
                        local_29[1i] = min(_e1545, _e1547);
                        let _e1552 = local_29[0i];
                        let _e1554 = local_29[2i];
                        let _e1556 = local_29[0i];
                        let _e1557 = local_29[2i];
                        local_29[2i] = max(_e1556, _e1557);
                        local_29[0i] = min(_e1552, _e1554);
                        let _e1559 = local_29[1i];
                        let _e1560 = local_29[3i];
                        let _e1562 = local_29[1i];
                        let _e1563 = local_29[3i];
                        local_29[3i] = max(_e1562, _e1563);
                        local_29[1i] = min(_e1559, _e1560);
                        let _e1565 = local_29[0i];
                        let _e1566 = local_29[1i];
                        let _e1568 = local_29[0i];
                        let _e1569 = local_29[1i];
                        local_29[1i] = max(_e1568, _e1569);
                        local_29[0i] = min(_e1565, _e1566);
                        let _e1571 = local_29[2i];
                        let _e1572 = local_29[4i];
                        let _e1574 = local_29[2i];
                        let _e1575 = local_29[4i];
                        local_29[4i] = max(_e1574, _e1575);
                        local_29[2i] = min(_e1571, _e1572);
                        let _e1577 = local_29[1i];
                        let _e1578 = local_29[2i];
                        let _e1580 = local_29[1i];
                        let _e1581 = local_29[2i];
                        local_29[2i] = max(_e1580, _e1581);
                        local_29[1i] = min(_e1577, _e1578);
                        let _e1583 = local_29[3i];
                        let _e1584 = local_29[4i];
                        let _e1586 = local_29[3i];
                        let _e1587 = local_29[4i];
                        local_29[4i] = max(_e1586, _e1587);
                        local_29[3i] = min(_e1583, _e1584);
                        let _e1589 = local_29[2i];
                        let _e1590 = local_29[3i];
                        let _e1592 = local_29[2i];
                        let _e1593 = local_29[3i];
                        local_29[3i] = max(_e1592, _e1593);
                        local_29[2i] = min(_e1589, _e1590);
                        let _e1596 = local_28[0i];
                        let _e1598 = local_28[3i];
                        let _e1600 = local_28[0i];
                        let _e1601 = local_28[3i];
                        local_28[3i] = max(_e1600, _e1601);
                        local_28[0i] = min(_e1596, _e1598);
                        let _e1604 = local_28[1i];
                        let _e1606 = local_28[4i];
                        let _e1608 = local_28[1i];
                        let _e1609 = local_28[4i];
                        local_28[4i] = max(_e1608, _e1609);
                        local_28[1i] = min(_e1604, _e1606);
                        let _e1611 = local_28[0i];
                        let _e1613 = local_28[2i];
                        let _e1615 = local_28[0i];
                        let _e1616 = local_28[2i];
                        local_28[2i] = max(_e1615, _e1616);
                        local_28[0i] = min(_e1611, _e1613);
                        let _e1618 = local_28[1i];
                        let _e1619 = local_28[3i];
                        let _e1621 = local_28[1i];
                        let _e1622 = local_28[3i];
                        local_28[3i] = max(_e1621, _e1622);
                        local_28[1i] = min(_e1618, _e1619);
                        let _e1624 = local_28[0i];
                        let _e1625 = local_28[1i];
                        let _e1627 = local_28[0i];
                        let _e1628 = local_28[1i];
                        local_28[1i] = max(_e1627, _e1628);
                        local_28[0i] = min(_e1624, _e1625);
                        let _e1630 = local_28[2i];
                        let _e1631 = local_28[4i];
                        let _e1633 = local_28[2i];
                        let _e1634 = local_28[4i];
                        local_28[4i] = max(_e1633, _e1634);
                        local_28[2i] = min(_e1630, _e1631);
                        let _e1636 = local_28[1i];
                        let _e1637 = local_28[2i];
                        let _e1639 = local_28[1i];
                        let _e1640 = local_28[2i];
                        local_28[2i] = max(_e1639, _e1640);
                        local_28[1i] = min(_e1636, _e1637);
                        let _e1642 = local_28[3i];
                        let _e1643 = local_28[4i];
                        let _e1645 = local_28[3i];
                        let _e1646 = local_28[4i];
                        local_28[4i] = max(_e1645, _e1646);
                        local_28[3i] = min(_e1642, _e1643);
                        let _e1648 = local_28[2i];
                        let _e1649 = local_28[3i];
                        let _e1651 = local_28[2i];
                        let _e1652 = local_28[3i];
                        local_28[3i] = max(_e1651, _e1652);
                        local_28[2i] = min(_e1648, _e1649);
                        let _e1654 = local_29[4i];
                        let _e1655 = local_28[4i];
                        phi_1814_ = 65503f;
                        if (min(_e1654, _e1655) > 0.000000000000000000000000000000000000011754944f) {
                            phi_1757_ = 0i;
                            phi_1760_ = 0i;
                            phi_1762_ = 65503f;
                            phi_1764_ = 0i;
                            loop {
                                let _e1659 = phi_1757_;
                                let _e1661 = phi_1760_;
                                let _e1663 = phi_1762_;
                                let _e1665 = phi_1764_;
                                local_115 = _e1663;
                                phi_1772_ = false;
                                if (_e1665 < 5i) {
                                    phi_1772_ = (_e1663 < 65504f);
                                }
                                let _e1669 = phi_1772_;
                                if _e1669 {
                                    let _e1671 = local_29[_e1661];
                                    let _e1673 = local_28[_e1659];
                                    let _e1674 = (_e1671 - _e1673);
                                    if (abs(_e1674) > 0.000061f) {
                                        let _e1680 = local_29[_e1661];
                                        let _e1681 = local_28[_e1659];
                                        let _e1682 = max(_e1680, _e1681);
                                        if (_e1682 != 0f) {
                                            phi_1796_ = (min(_e1680, _e1681) / _e1682);
                                        } else {
                                            phi_1796_ = 0f;
                                        }
                                        let _e1687 = phi_1796_;
                                        let _e1689 = (f32(i32(sign(_e1674))) * (1f - _e1687));
                                        let _e1694 = local_29[_e1661];
                                        let _e1695 = local_28[_e1659];
                                        let _e1698 = (_e1661 + select(0i, 1i, (_e1694 < _e1695)));
                                        let _e1700 = local_29[_e1698];
                                        let _e1701 = local_28[_e1659];
                                        phi_1758_ = (_e1659 + select(0i, 1i, (_e1700 >= _e1701)));
                                        phi_1761_ = _e1698;
                                        phi_1763_ = select(_e1663, _e1689, (abs(_e1689) < abs(_e1663)));
                                    } else {
                                        phi_1758_ = _e1659;
                                        phi_1761_ = _e1661;
                                        phi_1763_ = 65504f;
                                    }
                                    let _e1706 = phi_1758_;
                                    let _e1708 = phi_1761_;
                                    let _e1710 = phi_1763_;
                                    local_112 = _e1706;
                                    local_113 = _e1708;
                                    local_114 = _e1710;
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    let _e5735 = local_112;
                                    phi_1757_ = _e5735;
                                    let _e5738 = local_113;
                                    phi_1760_ = _e5738;
                                    let _e5741 = local_114;
                                    phi_1762_ = _e5741;
                                    phi_1764_ = (_e1665 + 1i);
                                }
                            }
                            let _e5750 = local_115;
                            phi_1814_ = _e5750;
                        }
                        let _e1713 = phi_1814_;
                        phi_1818_ = (_e1713 * select(0f, 1f, (_e1713 < 65503f)));
                    }
                    let _e1718 = phi_1818_;
                    let _e1723 = vec4<f32>(_e1718, vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    if (_e1718 != 0f) {
                        phi_1827_ = f32(i32(sign(_e1718)));
                    } else {
                        phi_1827_ = 0f;
                    }
                    let _e1729 = phi_1827_;
                    let _e1734 = vec4<f32>(_e1723.x, _e1729, _e1723.z, _e1723.w);
                    let _e1742 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e1433 + vec2<u32>(0u, 1u)))));
                    let _e1749 = vec2<i32>(max(0i, min(_e1742.x, _e191)), max(0i, min(_e1742.y, _e196)));
                    let _e1751 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(_e1749), 0u);
                    let _e1755 = ((vec2<f32>(_e1749) + vec2<f32>(0.5f, 0.5f)) / _e205);
                    phi_1852_ = 0i;
                    loop {
                        let _e1761 = phi_1852_;
                        if (_e1761 < 5i) {
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e1764 = iSampleOffsets[_e1761];
                            let _e1765 = (vec2<i32>(floor(((_e1755 + _e209) * _e205))) + _e1764);
                            let _e1774 = textureLoad(r_current_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e1765.x, _e191)), max(0i, min(_e1765.y, _e196)))), 0u);
                            let _e1776 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                            local_33[_e1761] = (_e1774.x * select(_e1776.x, 1f, (_e1776.x == 0f)));
                            let _e1782 = local_33[_e1761];
                            local_33[_e1761] = pow(_e1782, 1f);
                            let _e1784 = local_33[_e1761];
                            local_33[_e1761] = max(_e1784, 0.000061f);
                            phi_1852_ = (_e1761 + 1i);
                        }
                    }
                    let _e1787 = local_33;
                    let _e1789 = ((_e1755 + _e247) + _e1751.xy);
                    phi_1890_ = false;
                    if (_e1789.x >= 0f) {
                        phi_1890_ = (_e1789.x <= 1f);
                    }
                    let _e1794 = phi_1890_;
                    phi_1899_ = false;
                    if _e1794 {
                        phi_1898_ = false;
                        if (_e1789.y >= 0f) {
                            phi_1898_ = (_e1789.y <= 1f);
                        }
                        let _e1799 = phi_1898_;
                        phi_1899_ = _e1799;
                    }
                    let _e1801 = phi_1899_;
                    if _e1801 {
                        phi_1906_ = 0i;
                        loop {
                            let _e1806 = phi_1906_;
                            if (_e1806 < 5i) {
                                continue;
                            } else {
                                break;
                            }
                            continuing {
                                let _e1809 = iSampleOffsets[_e1806];
                                let _e1810 = (vec2<i32>(floor((_e1789 * _e246))) + _e1809);
                                let _e1823 = textureLoad(r_previous_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e1810.x, (_e245.x - 1i))), max(0i, min(_e1810.y, (_e245.y - 1i))))), 0u);
                                let _e1826 = cbFSR3Upscaler.fDeltaPreExposure;
                                let _e1828 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                                local_5[_e1806] = ((_e1823.x * _e1826) * select(_e1828.x, 1f, (_e1828.x == 0f)));
                                let _e1834 = local_5[_e1806];
                                local_5[_e1806] = pow(_e1834, 1f);
                                let _e1836 = local_5[_e1806];
                                local_5[_e1806] = max(_e1836, 0.000061f);
                                phi_1906_ = (_e1806 + 1i);
                            }
                        }
                    }
                    let _e1839 = local_5;
                    phi_2132_ = 0f;
                    if _e1801 {
                        local_32 = _e1787;
                        local_31 = _e1839;
                        let _e1841 = local_32[0i];
                        let _e1843 = local_32[3i];
                        let _e1845 = local_32[0i];
                        let _e1846 = local_32[3i];
                        local_32[3i] = max(_e1845, _e1846);
                        local_32[0i] = min(_e1841, _e1843);
                        let _e1849 = local_32[1i];
                        let _e1851 = local_32[4i];
                        let _e1853 = local_32[1i];
                        let _e1854 = local_32[4i];
                        local_32[4i] = max(_e1853, _e1854);
                        local_32[1i] = min(_e1849, _e1851);
                        let _e1856 = local_32[0i];
                        let _e1858 = local_32[2i];
                        let _e1860 = local_32[0i];
                        let _e1861 = local_32[2i];
                        local_32[2i] = max(_e1860, _e1861);
                        local_32[0i] = min(_e1856, _e1858);
                        let _e1863 = local_32[1i];
                        let _e1864 = local_32[3i];
                        let _e1866 = local_32[1i];
                        let _e1867 = local_32[3i];
                        local_32[3i] = max(_e1866, _e1867);
                        local_32[1i] = min(_e1863, _e1864);
                        let _e1869 = local_32[0i];
                        let _e1870 = local_32[1i];
                        let _e1872 = local_32[0i];
                        let _e1873 = local_32[1i];
                        local_32[1i] = max(_e1872, _e1873);
                        local_32[0i] = min(_e1869, _e1870);
                        let _e1875 = local_32[2i];
                        let _e1876 = local_32[4i];
                        let _e1878 = local_32[2i];
                        let _e1879 = local_32[4i];
                        local_32[4i] = max(_e1878, _e1879);
                        local_32[2i] = min(_e1875, _e1876);
                        let _e1881 = local_32[1i];
                        let _e1882 = local_32[2i];
                        let _e1884 = local_32[1i];
                        let _e1885 = local_32[2i];
                        local_32[2i] = max(_e1884, _e1885);
                        local_32[1i] = min(_e1881, _e1882);
                        let _e1887 = local_32[3i];
                        let _e1888 = local_32[4i];
                        let _e1890 = local_32[3i];
                        let _e1891 = local_32[4i];
                        local_32[4i] = max(_e1890, _e1891);
                        local_32[3i] = min(_e1887, _e1888);
                        let _e1893 = local_32[2i];
                        let _e1894 = local_32[3i];
                        let _e1896 = local_32[2i];
                        let _e1897 = local_32[3i];
                        local_32[3i] = max(_e1896, _e1897);
                        local_32[2i] = min(_e1893, _e1894);
                        let _e1900 = local_31[0i];
                        let _e1902 = local_31[3i];
                        let _e1904 = local_31[0i];
                        let _e1905 = local_31[3i];
                        local_31[3i] = max(_e1904, _e1905);
                        local_31[0i] = min(_e1900, _e1902);
                        let _e1908 = local_31[1i];
                        let _e1910 = local_31[4i];
                        let _e1912 = local_31[1i];
                        let _e1913 = local_31[4i];
                        local_31[4i] = max(_e1912, _e1913);
                        local_31[1i] = min(_e1908, _e1910);
                        let _e1915 = local_31[0i];
                        let _e1917 = local_31[2i];
                        let _e1919 = local_31[0i];
                        let _e1920 = local_31[2i];
                        local_31[2i] = max(_e1919, _e1920);
                        local_31[0i] = min(_e1915, _e1917);
                        let _e1922 = local_31[1i];
                        let _e1923 = local_31[3i];
                        let _e1925 = local_31[1i];
                        let _e1926 = local_31[3i];
                        local_31[3i] = max(_e1925, _e1926);
                        local_31[1i] = min(_e1922, _e1923);
                        let _e1928 = local_31[0i];
                        let _e1929 = local_31[1i];
                        let _e1931 = local_31[0i];
                        let _e1932 = local_31[1i];
                        local_31[1i] = max(_e1931, _e1932);
                        local_31[0i] = min(_e1928, _e1929);
                        let _e1934 = local_31[2i];
                        let _e1935 = local_31[4i];
                        let _e1937 = local_31[2i];
                        let _e1938 = local_31[4i];
                        local_31[4i] = max(_e1937, _e1938);
                        local_31[2i] = min(_e1934, _e1935);
                        let _e1940 = local_31[1i];
                        let _e1941 = local_31[2i];
                        let _e1943 = local_31[1i];
                        let _e1944 = local_31[2i];
                        local_31[2i] = max(_e1943, _e1944);
                        local_31[1i] = min(_e1940, _e1941);
                        let _e1946 = local_31[3i];
                        let _e1947 = local_31[4i];
                        let _e1949 = local_31[3i];
                        let _e1950 = local_31[4i];
                        local_31[4i] = max(_e1949, _e1950);
                        local_31[3i] = min(_e1946, _e1947);
                        let _e1952 = local_31[2i];
                        let _e1953 = local_31[3i];
                        let _e1955 = local_31[2i];
                        let _e1956 = local_31[3i];
                        local_31[3i] = max(_e1955, _e1956);
                        local_31[2i] = min(_e1952, _e1953);
                        let _e1958 = local_32[4i];
                        let _e1959 = local_31[4i];
                        phi_2128_ = 65503f;
                        if (min(_e1958, _e1959) > 0.000000000000000000000000000000000000011754944f) {
                            phi_2071_ = 0i;
                            phi_2074_ = 0i;
                            phi_2076_ = 65503f;
                            phi_2078_ = 0i;
                            loop {
                                let _e1963 = phi_2071_;
                                let _e1965 = phi_2074_;
                                let _e1967 = phi_2076_;
                                let _e1969 = phi_2078_;
                                local_119 = _e1967;
                                phi_2086_ = false;
                                if (_e1969 < 5i) {
                                    phi_2086_ = (_e1967 < 65504f);
                                }
                                let _e1973 = phi_2086_;
                                if _e1973 {
                                    let _e1975 = local_32[_e1965];
                                    let _e1977 = local_31[_e1963];
                                    let _e1978 = (_e1975 - _e1977);
                                    if (abs(_e1978) > 0.000061f) {
                                        let _e1984 = local_32[_e1965];
                                        let _e1985 = local_31[_e1963];
                                        let _e1986 = max(_e1984, _e1985);
                                        if (_e1986 != 0f) {
                                            phi_2110_ = (min(_e1984, _e1985) / _e1986);
                                        } else {
                                            phi_2110_ = 0f;
                                        }
                                        let _e1991 = phi_2110_;
                                        let _e1993 = (f32(i32(sign(_e1978))) * (1f - _e1991));
                                        let _e1998 = local_32[_e1965];
                                        let _e1999 = local_31[_e1963];
                                        let _e2002 = (_e1965 + select(0i, 1i, (_e1998 < _e1999)));
                                        let _e2004 = local_32[_e2002];
                                        let _e2005 = local_31[_e1963];
                                        phi_2072_ = (_e1963 + select(0i, 1i, (_e2004 >= _e2005)));
                                        phi_2075_ = _e2002;
                                        phi_2077_ = select(_e1967, _e1993, (abs(_e1993) < abs(_e1967)));
                                    } else {
                                        phi_2072_ = _e1963;
                                        phi_2075_ = _e1965;
                                        phi_2077_ = 65504f;
                                    }
                                    let _e2010 = phi_2072_;
                                    let _e2012 = phi_2075_;
                                    let _e2014 = phi_2077_;
                                    local_116 = _e2010;
                                    local_117 = _e2012;
                                    local_118 = _e2014;
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    let _e5760 = local_116;
                                    phi_2071_ = _e5760;
                                    let _e5763 = local_117;
                                    phi_2074_ = _e5763;
                                    let _e5766 = local_118;
                                    phi_2076_ = _e5766;
                                    phi_2078_ = (_e1969 + 1i);
                                }
                            }
                            let _e5775 = local_119;
                            phi_2128_ = _e5775;
                        }
                        let _e2017 = phi_2128_;
                        phi_2132_ = (_e2017 * select(0f, 1f, (_e2017 < 65503f)));
                    }
                    let _e2022 = phi_2132_;
                    let _e2027 = vec4<f32>(_e2022, vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    if (_e2022 != 0f) {
                        phi_2141_ = f32(i32(sign(_e2022)));
                    } else {
                        phi_2141_ = 0f;
                    }
                    let _e2033 = phi_2141_;
                    let _e2038 = vec4<f32>(_e2027.x, _e2033, _e2027.z, _e2027.w);
                    let _e2046 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e1433 + vec2<u32>(1u, 0u)))));
                    let _e2053 = vec2<i32>(max(0i, min(_e2046.x, _e191)), max(0i, min(_e2046.y, _e196)));
                    let _e2055 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(_e2053), 0u);
                    let _e2059 = ((vec2<f32>(_e2053) + vec2<f32>(0.5f, 0.5f)) / _e205);
                    phi_2166_ = 0i;
                    loop {
                        let _e2065 = phi_2166_;
                        if (_e2065 < 5i) {
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e2068 = iSampleOffsets[_e2065];
                            let _e2069 = (vec2<i32>(floor(((_e2059 + _e209) * _e205))) + _e2068);
                            let _e2078 = textureLoad(r_current_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e2069.x, _e191)), max(0i, min(_e2069.y, _e196)))), 0u);
                            let _e2080 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                            local_36[_e2065] = (_e2078.x * select(_e2080.x, 1f, (_e2080.x == 0f)));
                            let _e2086 = local_36[_e2065];
                            local_36[_e2065] = pow(_e2086, 1f);
                            let _e2088 = local_36[_e2065];
                            local_36[_e2065] = max(_e2088, 0.000061f);
                            phi_2166_ = (_e2065 + 1i);
                        }
                    }
                    let _e2091 = local_36;
                    let _e2093 = ((_e2059 + _e247) + _e2055.xy);
                    phi_2204_ = false;
                    if (_e2093.x >= 0f) {
                        phi_2204_ = (_e2093.x <= 1f);
                    }
                    let _e2098 = phi_2204_;
                    phi_2213_ = false;
                    if _e2098 {
                        phi_2212_ = false;
                        if (_e2093.y >= 0f) {
                            phi_2212_ = (_e2093.y <= 1f);
                        }
                        let _e2103 = phi_2212_;
                        phi_2213_ = _e2103;
                    }
                    let _e2105 = phi_2213_;
                    if _e2105 {
                        phi_2220_ = 0i;
                        loop {
                            let _e2110 = phi_2220_;
                            if (_e2110 < 5i) {
                                continue;
                            } else {
                                break;
                            }
                            continuing {
                                let _e2113 = iSampleOffsets[_e2110];
                                let _e2114 = (vec2<i32>(floor((_e2093 * _e246))) + _e2113);
                                let _e2127 = textureLoad(r_previous_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e2114.x, (_e245.x - 1i))), max(0i, min(_e2114.y, (_e245.y - 1i))))), 0u);
                                let _e2130 = cbFSR3Upscaler.fDeltaPreExposure;
                                let _e2132 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                                local_6[_e2110] = ((_e2127.x * _e2130) * select(_e2132.x, 1f, (_e2132.x == 0f)));
                                let _e2138 = local_6[_e2110];
                                local_6[_e2110] = pow(_e2138, 1f);
                                let _e2140 = local_6[_e2110];
                                local_6[_e2110] = max(_e2140, 0.000061f);
                                phi_2220_ = (_e2110 + 1i);
                            }
                        }
                    }
                    let _e2143 = local_6;
                    phi_2446_ = 0f;
                    if _e2105 {
                        local_35 = _e2091;
                        local_34 = _e2143;
                        let _e2145 = local_35[0i];
                        let _e2147 = local_35[3i];
                        let _e2149 = local_35[0i];
                        let _e2150 = local_35[3i];
                        local_35[3i] = max(_e2149, _e2150);
                        local_35[0i] = min(_e2145, _e2147);
                        let _e2153 = local_35[1i];
                        let _e2155 = local_35[4i];
                        let _e2157 = local_35[1i];
                        let _e2158 = local_35[4i];
                        local_35[4i] = max(_e2157, _e2158);
                        local_35[1i] = min(_e2153, _e2155);
                        let _e2160 = local_35[0i];
                        let _e2162 = local_35[2i];
                        let _e2164 = local_35[0i];
                        let _e2165 = local_35[2i];
                        local_35[2i] = max(_e2164, _e2165);
                        local_35[0i] = min(_e2160, _e2162);
                        let _e2167 = local_35[1i];
                        let _e2168 = local_35[3i];
                        let _e2170 = local_35[1i];
                        let _e2171 = local_35[3i];
                        local_35[3i] = max(_e2170, _e2171);
                        local_35[1i] = min(_e2167, _e2168);
                        let _e2173 = local_35[0i];
                        let _e2174 = local_35[1i];
                        let _e2176 = local_35[0i];
                        let _e2177 = local_35[1i];
                        local_35[1i] = max(_e2176, _e2177);
                        local_35[0i] = min(_e2173, _e2174);
                        let _e2179 = local_35[2i];
                        let _e2180 = local_35[4i];
                        let _e2182 = local_35[2i];
                        let _e2183 = local_35[4i];
                        local_35[4i] = max(_e2182, _e2183);
                        local_35[2i] = min(_e2179, _e2180);
                        let _e2185 = local_35[1i];
                        let _e2186 = local_35[2i];
                        let _e2188 = local_35[1i];
                        let _e2189 = local_35[2i];
                        local_35[2i] = max(_e2188, _e2189);
                        local_35[1i] = min(_e2185, _e2186);
                        let _e2191 = local_35[3i];
                        let _e2192 = local_35[4i];
                        let _e2194 = local_35[3i];
                        let _e2195 = local_35[4i];
                        local_35[4i] = max(_e2194, _e2195);
                        local_35[3i] = min(_e2191, _e2192);
                        let _e2197 = local_35[2i];
                        let _e2198 = local_35[3i];
                        let _e2200 = local_35[2i];
                        let _e2201 = local_35[3i];
                        local_35[3i] = max(_e2200, _e2201);
                        local_35[2i] = min(_e2197, _e2198);
                        let _e2204 = local_34[0i];
                        let _e2206 = local_34[3i];
                        let _e2208 = local_34[0i];
                        let _e2209 = local_34[3i];
                        local_34[3i] = max(_e2208, _e2209);
                        local_34[0i] = min(_e2204, _e2206);
                        let _e2212 = local_34[1i];
                        let _e2214 = local_34[4i];
                        let _e2216 = local_34[1i];
                        let _e2217 = local_34[4i];
                        local_34[4i] = max(_e2216, _e2217);
                        local_34[1i] = min(_e2212, _e2214);
                        let _e2219 = local_34[0i];
                        let _e2221 = local_34[2i];
                        let _e2223 = local_34[0i];
                        let _e2224 = local_34[2i];
                        local_34[2i] = max(_e2223, _e2224);
                        local_34[0i] = min(_e2219, _e2221);
                        let _e2226 = local_34[1i];
                        let _e2227 = local_34[3i];
                        let _e2229 = local_34[1i];
                        let _e2230 = local_34[3i];
                        local_34[3i] = max(_e2229, _e2230);
                        local_34[1i] = min(_e2226, _e2227);
                        let _e2232 = local_34[0i];
                        let _e2233 = local_34[1i];
                        let _e2235 = local_34[0i];
                        let _e2236 = local_34[1i];
                        local_34[1i] = max(_e2235, _e2236);
                        local_34[0i] = min(_e2232, _e2233);
                        let _e2238 = local_34[2i];
                        let _e2239 = local_34[4i];
                        let _e2241 = local_34[2i];
                        let _e2242 = local_34[4i];
                        local_34[4i] = max(_e2241, _e2242);
                        local_34[2i] = min(_e2238, _e2239);
                        let _e2244 = local_34[1i];
                        let _e2245 = local_34[2i];
                        let _e2247 = local_34[1i];
                        let _e2248 = local_34[2i];
                        local_34[2i] = max(_e2247, _e2248);
                        local_34[1i] = min(_e2244, _e2245);
                        let _e2250 = local_34[3i];
                        let _e2251 = local_34[4i];
                        let _e2253 = local_34[3i];
                        let _e2254 = local_34[4i];
                        local_34[4i] = max(_e2253, _e2254);
                        local_34[3i] = min(_e2250, _e2251);
                        let _e2256 = local_34[2i];
                        let _e2257 = local_34[3i];
                        let _e2259 = local_34[2i];
                        let _e2260 = local_34[3i];
                        local_34[3i] = max(_e2259, _e2260);
                        local_34[2i] = min(_e2256, _e2257);
                        let _e2262 = local_35[4i];
                        let _e2263 = local_34[4i];
                        phi_2442_ = 65503f;
                        if (min(_e2262, _e2263) > 0.000000000000000000000000000000000000011754944f) {
                            phi_2385_ = 0i;
                            phi_2388_ = 0i;
                            phi_2390_ = 65503f;
                            phi_2392_ = 0i;
                            loop {
                                let _e2267 = phi_2385_;
                                let _e2269 = phi_2388_;
                                let _e2271 = phi_2390_;
                                let _e2273 = phi_2392_;
                                local_123 = _e2271;
                                phi_2400_ = false;
                                if (_e2273 < 5i) {
                                    phi_2400_ = (_e2271 < 65504f);
                                }
                                let _e2277 = phi_2400_;
                                if _e2277 {
                                    let _e2279 = local_35[_e2269];
                                    let _e2281 = local_34[_e2267];
                                    let _e2282 = (_e2279 - _e2281);
                                    if (abs(_e2282) > 0.000061f) {
                                        let _e2288 = local_35[_e2269];
                                        let _e2289 = local_34[_e2267];
                                        let _e2290 = max(_e2288, _e2289);
                                        if (_e2290 != 0f) {
                                            phi_2424_ = (min(_e2288, _e2289) / _e2290);
                                        } else {
                                            phi_2424_ = 0f;
                                        }
                                        let _e2295 = phi_2424_;
                                        let _e2297 = (f32(i32(sign(_e2282))) * (1f - _e2295));
                                        let _e2302 = local_35[_e2269];
                                        let _e2303 = local_34[_e2267];
                                        let _e2306 = (_e2269 + select(0i, 1i, (_e2302 < _e2303)));
                                        let _e2308 = local_35[_e2306];
                                        let _e2309 = local_34[_e2267];
                                        phi_2386_ = (_e2267 + select(0i, 1i, (_e2308 >= _e2309)));
                                        phi_2389_ = _e2306;
                                        phi_2391_ = select(_e2271, _e2297, (abs(_e2297) < abs(_e2271)));
                                    } else {
                                        phi_2386_ = _e2267;
                                        phi_2389_ = _e2269;
                                        phi_2391_ = 65504f;
                                    }
                                    let _e2314 = phi_2386_;
                                    let _e2316 = phi_2389_;
                                    let _e2318 = phi_2391_;
                                    local_120 = _e2314;
                                    local_121 = _e2316;
                                    local_122 = _e2318;
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    let _e5785 = local_120;
                                    phi_2385_ = _e5785;
                                    let _e5788 = local_121;
                                    phi_2388_ = _e5788;
                                    let _e5791 = local_122;
                                    phi_2390_ = _e5791;
                                    phi_2392_ = (_e2273 + 1i);
                                }
                            }
                            let _e5800 = local_123;
                            phi_2442_ = _e5800;
                        }
                        let _e2321 = phi_2442_;
                        phi_2446_ = (_e2321 * select(0f, 1f, (_e2321 < 65503f)));
                    }
                    let _e2326 = phi_2446_;
                    let _e2331 = vec4<f32>(_e2326, vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    if (_e2326 != 0f) {
                        phi_2455_ = f32(i32(sign(_e2326)));
                    } else {
                        phi_2455_ = 0f;
                    }
                    let _e2337 = phi_2455_;
                    let _e2342 = vec4<f32>(_e2331.x, _e2337, _e2331.z, _e2331.w);
                    let _e2350 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e1433 + vec2<u32>(1u, 1u)))));
                    let _e2357 = vec2<i32>(max(0i, min(_e2350.x, _e191)), max(0i, min(_e2350.y, _e196)));
                    let _e2359 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(_e2357), 0u);
                    let _e2363 = ((vec2<f32>(_e2357) + vec2<f32>(0.5f, 0.5f)) / _e205);
                    phi_2480_ = 0i;
                    loop {
                        let _e2369 = phi_2480_;
                        if (_e2369 < 5i) {
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e2372 = iSampleOffsets[_e2369];
                            let _e2373 = (vec2<i32>(floor(((_e2363 + _e209) * _e205))) + _e2372);
                            let _e2382 = textureLoad(r_current_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e2373.x, _e191)), max(0i, min(_e2373.y, _e196)))), 0u);
                            let _e2384 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                            local_39[_e2369] = (_e2382.x * select(_e2384.x, 1f, (_e2384.x == 0f)));
                            let _e2390 = local_39[_e2369];
                            local_39[_e2369] = pow(_e2390, 1f);
                            let _e2392 = local_39[_e2369];
                            local_39[_e2369] = max(_e2392, 0.000061f);
                            phi_2480_ = (_e2369 + 1i);
                        }
                    }
                    let _e2395 = local_39;
                    let _e2397 = ((_e2363 + _e247) + _e2359.xy);
                    phi_2518_ = false;
                    if (_e2397.x >= 0f) {
                        phi_2518_ = (_e2397.x <= 1f);
                    }
                    let _e2402 = phi_2518_;
                    phi_2527_ = false;
                    if _e2402 {
                        phi_2526_ = false;
                        if (_e2397.y >= 0f) {
                            phi_2526_ = (_e2397.y <= 1f);
                        }
                        let _e2407 = phi_2526_;
                        phi_2527_ = _e2407;
                    }
                    let _e2409 = phi_2527_;
                    if _e2409 {
                        phi_2534_ = 0i;
                        loop {
                            let _e2414 = phi_2534_;
                            if (_e2414 < 5i) {
                                continue;
                            } else {
                                break;
                            }
                            continuing {
                                let _e2417 = iSampleOffsets[_e2414];
                                let _e2418 = (vec2<i32>(floor((_e2397 * _e246))) + _e2417);
                                let _e2431 = textureLoad(r_previous_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e2418.x, (_e245.x - 1i))), max(0i, min(_e2418.y, (_e245.y - 1i))))), 0u);
                                let _e2434 = cbFSR3Upscaler.fDeltaPreExposure;
                                let _e2436 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                                local_7[_e2414] = ((_e2431.x * _e2434) * select(_e2436.x, 1f, (_e2436.x == 0f)));
                                let _e2442 = local_7[_e2414];
                                local_7[_e2414] = pow(_e2442, 1f);
                                let _e2444 = local_7[_e2414];
                                local_7[_e2414] = max(_e2444, 0.000061f);
                                phi_2534_ = (_e2414 + 1i);
                            }
                        }
                    }
                    let _e2447 = local_7;
                    phi_2760_ = 0f;
                    if _e2409 {
                        local_38 = _e2395;
                        local_37 = _e2447;
                        let _e2449 = local_38[0i];
                        let _e2451 = local_38[3i];
                        let _e2453 = local_38[0i];
                        let _e2454 = local_38[3i];
                        local_38[3i] = max(_e2453, _e2454);
                        local_38[0i] = min(_e2449, _e2451);
                        let _e2457 = local_38[1i];
                        let _e2459 = local_38[4i];
                        let _e2461 = local_38[1i];
                        let _e2462 = local_38[4i];
                        local_38[4i] = max(_e2461, _e2462);
                        local_38[1i] = min(_e2457, _e2459);
                        let _e2464 = local_38[0i];
                        let _e2466 = local_38[2i];
                        let _e2468 = local_38[0i];
                        let _e2469 = local_38[2i];
                        local_38[2i] = max(_e2468, _e2469);
                        local_38[0i] = min(_e2464, _e2466);
                        let _e2471 = local_38[1i];
                        let _e2472 = local_38[3i];
                        let _e2474 = local_38[1i];
                        let _e2475 = local_38[3i];
                        local_38[3i] = max(_e2474, _e2475);
                        local_38[1i] = min(_e2471, _e2472);
                        let _e2477 = local_38[0i];
                        let _e2478 = local_38[1i];
                        let _e2480 = local_38[0i];
                        let _e2481 = local_38[1i];
                        local_38[1i] = max(_e2480, _e2481);
                        local_38[0i] = min(_e2477, _e2478);
                        let _e2483 = local_38[2i];
                        let _e2484 = local_38[4i];
                        let _e2486 = local_38[2i];
                        let _e2487 = local_38[4i];
                        local_38[4i] = max(_e2486, _e2487);
                        local_38[2i] = min(_e2483, _e2484);
                        let _e2489 = local_38[1i];
                        let _e2490 = local_38[2i];
                        let _e2492 = local_38[1i];
                        let _e2493 = local_38[2i];
                        local_38[2i] = max(_e2492, _e2493);
                        local_38[1i] = min(_e2489, _e2490);
                        let _e2495 = local_38[3i];
                        let _e2496 = local_38[4i];
                        let _e2498 = local_38[3i];
                        let _e2499 = local_38[4i];
                        local_38[4i] = max(_e2498, _e2499);
                        local_38[3i] = min(_e2495, _e2496);
                        let _e2501 = local_38[2i];
                        let _e2502 = local_38[3i];
                        let _e2504 = local_38[2i];
                        let _e2505 = local_38[3i];
                        local_38[3i] = max(_e2504, _e2505);
                        local_38[2i] = min(_e2501, _e2502);
                        let _e2508 = local_37[0i];
                        let _e2510 = local_37[3i];
                        let _e2512 = local_37[0i];
                        let _e2513 = local_37[3i];
                        local_37[3i] = max(_e2512, _e2513);
                        local_37[0i] = min(_e2508, _e2510);
                        let _e2516 = local_37[1i];
                        let _e2518 = local_37[4i];
                        let _e2520 = local_37[1i];
                        let _e2521 = local_37[4i];
                        local_37[4i] = max(_e2520, _e2521);
                        local_37[1i] = min(_e2516, _e2518);
                        let _e2523 = local_37[0i];
                        let _e2525 = local_37[2i];
                        let _e2527 = local_37[0i];
                        let _e2528 = local_37[2i];
                        local_37[2i] = max(_e2527, _e2528);
                        local_37[0i] = min(_e2523, _e2525);
                        let _e2530 = local_37[1i];
                        let _e2531 = local_37[3i];
                        let _e2533 = local_37[1i];
                        let _e2534 = local_37[3i];
                        local_37[3i] = max(_e2533, _e2534);
                        local_37[1i] = min(_e2530, _e2531);
                        let _e2536 = local_37[0i];
                        let _e2537 = local_37[1i];
                        let _e2539 = local_37[0i];
                        let _e2540 = local_37[1i];
                        local_37[1i] = max(_e2539, _e2540);
                        local_37[0i] = min(_e2536, _e2537);
                        let _e2542 = local_37[2i];
                        let _e2543 = local_37[4i];
                        let _e2545 = local_37[2i];
                        let _e2546 = local_37[4i];
                        local_37[4i] = max(_e2545, _e2546);
                        local_37[2i] = min(_e2542, _e2543);
                        let _e2548 = local_37[1i];
                        let _e2549 = local_37[2i];
                        let _e2551 = local_37[1i];
                        let _e2552 = local_37[2i];
                        local_37[2i] = max(_e2551, _e2552);
                        local_37[1i] = min(_e2548, _e2549);
                        let _e2554 = local_37[3i];
                        let _e2555 = local_37[4i];
                        let _e2557 = local_37[3i];
                        let _e2558 = local_37[4i];
                        local_37[4i] = max(_e2557, _e2558);
                        local_37[3i] = min(_e2554, _e2555);
                        let _e2560 = local_37[2i];
                        let _e2561 = local_37[3i];
                        let _e2563 = local_37[2i];
                        let _e2564 = local_37[3i];
                        local_37[3i] = max(_e2563, _e2564);
                        local_37[2i] = min(_e2560, _e2561);
                        let _e2566 = local_38[4i];
                        let _e2567 = local_37[4i];
                        phi_2756_ = 65503f;
                        if (min(_e2566, _e2567) > 0.000000000000000000000000000000000000011754944f) {
                            phi_2699_ = 0i;
                            phi_2702_ = 0i;
                            phi_2704_ = 65503f;
                            phi_2706_ = 0i;
                            loop {
                                let _e2571 = phi_2699_;
                                let _e2573 = phi_2702_;
                                let _e2575 = phi_2704_;
                                let _e2577 = phi_2706_;
                                local_127 = _e2575;
                                phi_2714_ = false;
                                if (_e2577 < 5i) {
                                    phi_2714_ = (_e2575 < 65504f);
                                }
                                let _e2581 = phi_2714_;
                                if _e2581 {
                                    let _e2583 = local_38[_e2573];
                                    let _e2585 = local_37[_e2571];
                                    let _e2586 = (_e2583 - _e2585);
                                    if (abs(_e2586) > 0.000061f) {
                                        let _e2592 = local_38[_e2573];
                                        let _e2593 = local_37[_e2571];
                                        let _e2594 = max(_e2592, _e2593);
                                        if (_e2594 != 0f) {
                                            phi_2738_ = (min(_e2592, _e2593) / _e2594);
                                        } else {
                                            phi_2738_ = 0f;
                                        }
                                        let _e2599 = phi_2738_;
                                        let _e2601 = (f32(i32(sign(_e2586))) * (1f - _e2599));
                                        let _e2606 = local_38[_e2573];
                                        let _e2607 = local_37[_e2571];
                                        let _e2610 = (_e2573 + select(0i, 1i, (_e2606 < _e2607)));
                                        let _e2612 = local_38[_e2610];
                                        let _e2613 = local_37[_e2571];
                                        phi_2700_ = (_e2571 + select(0i, 1i, (_e2612 >= _e2613)));
                                        phi_2703_ = _e2610;
                                        phi_2705_ = select(_e2575, _e2601, (abs(_e2601) < abs(_e2575)));
                                    } else {
                                        phi_2700_ = _e2571;
                                        phi_2703_ = _e2573;
                                        phi_2705_ = 65504f;
                                    }
                                    let _e2618 = phi_2700_;
                                    let _e2620 = phi_2703_;
                                    let _e2622 = phi_2705_;
                                    local_124 = _e2618;
                                    local_125 = _e2620;
                                    local_126 = _e2622;
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    let _e5810 = local_124;
                                    phi_2699_ = _e5810;
                                    let _e5813 = local_125;
                                    phi_2702_ = _e5813;
                                    let _e5816 = local_126;
                                    phi_2704_ = _e5816;
                                    phi_2706_ = (_e2577 + 1i);
                                }
                            }
                            let _e5825 = local_127;
                            phi_2756_ = _e5825;
                        }
                        let _e2625 = phi_2756_;
                        phi_2760_ = (_e2625 * select(0f, 1f, (_e2625 < 65503f)));
                    }
                    let _e2630 = phi_2760_;
                    let _e2635 = vec4<f32>(_e2630, vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    if (_e2630 != 0f) {
                        phi_2769_ = f32(i32(sign(_e2630)));
                    } else {
                        phi_2769_ = 0f;
                    }
                    let _e2641 = phi_2769_;
                    let _e2646 = vec4<f32>(_e2635.x, _e2641, _e2635.z, _e2635.w);
                    local_64[1i] = ((((vec4<f32>(_e1734.x, _e1734.y, 1f, _e1734.w) + vec4<f32>(_e2038.x, _e2038.y, 1f, _e2038.w)) + vec4<f32>(_e2342.x, _e2342.y, 1f, _e2342.w)) + vec4<f32>(_e2646.x, _e2646.y, 1f, _e2646.w)) * 0.25f);
                    let _e2657 = local_64[1i];
                    textureStore(rw_spd_mip0_, bitcast<vec2<u32>>((_e176 + vec2<i32>(_e1430, _e178))), _e2657.xy.xyyy);
                    let _e2662 = bitcast<i32>((_e171 + 32u));
                    let _e2664 = (_e168 + vec2<i32>(_e170, _e2662));
                    let _e2666 = bitcast<i32>((_e165 + 16u));
                    let _e2669 = bitcast<vec2<u32>>(_e2664);
                    let _e2674 = vec2<i32>(vec2<f32>(_e2664));
                    let _e2681 = vec2<i32>(max(0i, min(_e2674.x, _e191)), max(0i, min(_e2674.y, _e196)));
                    let _e2683 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(_e2681), 0u);
                    let _e2687 = ((vec2<f32>(_e2681) + vec2<f32>(0.5f, 0.5f)) / _e205);
                    phi_2814_ = 0i;
                    loop {
                        let _e2693 = phi_2814_;
                        if (_e2693 < 5i) {
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e2696 = iSampleOffsets[_e2693];
                            let _e2697 = (vec2<i32>(floor(((_e2687 + _e209) * _e205))) + _e2696);
                            let _e2706 = textureLoad(r_current_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e2697.x, _e191)), max(0i, min(_e2697.y, _e196)))), 0u);
                            let _e2708 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                            local_42[_e2693] = (_e2706.x * select(_e2708.x, 1f, (_e2708.x == 0f)));
                            let _e2714 = local_42[_e2693];
                            local_42[_e2693] = pow(_e2714, 1f);
                            let _e2716 = local_42[_e2693];
                            local_42[_e2693] = max(_e2716, 0.000061f);
                            phi_2814_ = (_e2693 + 1i);
                        }
                    }
                    let _e2719 = local_42;
                    let _e2721 = ((_e2687 + _e247) + _e2683.xy);
                    phi_2852_ = false;
                    if (_e2721.x >= 0f) {
                        phi_2852_ = (_e2721.x <= 1f);
                    }
                    let _e2726 = phi_2852_;
                    phi_2861_ = false;
                    if _e2726 {
                        phi_2860_ = false;
                        if (_e2721.y >= 0f) {
                            phi_2860_ = (_e2721.y <= 1f);
                        }
                        let _e2731 = phi_2860_;
                        phi_2861_ = _e2731;
                    }
                    let _e2733 = phi_2861_;
                    if _e2733 {
                        phi_2868_ = 0i;
                        loop {
                            let _e2738 = phi_2868_;
                            if (_e2738 < 5i) {
                                continue;
                            } else {
                                break;
                            }
                            continuing {
                                let _e2741 = iSampleOffsets[_e2738];
                                let _e2742 = (vec2<i32>(floor((_e2721 * _e246))) + _e2741);
                                let _e2755 = textureLoad(r_previous_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e2742.x, (_e245.x - 1i))), max(0i, min(_e2742.y, (_e245.y - 1i))))), 0u);
                                let _e2758 = cbFSR3Upscaler.fDeltaPreExposure;
                                let _e2760 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                                local_8[_e2738] = ((_e2755.x * _e2758) * select(_e2760.x, 1f, (_e2760.x == 0f)));
                                let _e2766 = local_8[_e2738];
                                local_8[_e2738] = pow(_e2766, 1f);
                                let _e2768 = local_8[_e2738];
                                local_8[_e2738] = max(_e2768, 0.000061f);
                                phi_2868_ = (_e2738 + 1i);
                            }
                        }
                    }
                    let _e2771 = local_8;
                    phi_3094_ = 0f;
                    if _e2733 {
                        local_41 = _e2719;
                        local_40 = _e2771;
                        let _e2773 = local_41[0i];
                        let _e2775 = local_41[3i];
                        let _e2777 = local_41[0i];
                        let _e2778 = local_41[3i];
                        local_41[3i] = max(_e2777, _e2778);
                        local_41[0i] = min(_e2773, _e2775);
                        let _e2781 = local_41[1i];
                        let _e2783 = local_41[4i];
                        let _e2785 = local_41[1i];
                        let _e2786 = local_41[4i];
                        local_41[4i] = max(_e2785, _e2786);
                        local_41[1i] = min(_e2781, _e2783);
                        let _e2788 = local_41[0i];
                        let _e2790 = local_41[2i];
                        let _e2792 = local_41[0i];
                        let _e2793 = local_41[2i];
                        local_41[2i] = max(_e2792, _e2793);
                        local_41[0i] = min(_e2788, _e2790);
                        let _e2795 = local_41[1i];
                        let _e2796 = local_41[3i];
                        let _e2798 = local_41[1i];
                        let _e2799 = local_41[3i];
                        local_41[3i] = max(_e2798, _e2799);
                        local_41[1i] = min(_e2795, _e2796);
                        let _e2801 = local_41[0i];
                        let _e2802 = local_41[1i];
                        let _e2804 = local_41[0i];
                        let _e2805 = local_41[1i];
                        local_41[1i] = max(_e2804, _e2805);
                        local_41[0i] = min(_e2801, _e2802);
                        let _e2807 = local_41[2i];
                        let _e2808 = local_41[4i];
                        let _e2810 = local_41[2i];
                        let _e2811 = local_41[4i];
                        local_41[4i] = max(_e2810, _e2811);
                        local_41[2i] = min(_e2807, _e2808);
                        let _e2813 = local_41[1i];
                        let _e2814 = local_41[2i];
                        let _e2816 = local_41[1i];
                        let _e2817 = local_41[2i];
                        local_41[2i] = max(_e2816, _e2817);
                        local_41[1i] = min(_e2813, _e2814);
                        let _e2819 = local_41[3i];
                        let _e2820 = local_41[4i];
                        let _e2822 = local_41[3i];
                        let _e2823 = local_41[4i];
                        local_41[4i] = max(_e2822, _e2823);
                        local_41[3i] = min(_e2819, _e2820);
                        let _e2825 = local_41[2i];
                        let _e2826 = local_41[3i];
                        let _e2828 = local_41[2i];
                        let _e2829 = local_41[3i];
                        local_41[3i] = max(_e2828, _e2829);
                        local_41[2i] = min(_e2825, _e2826);
                        let _e2832 = local_40[0i];
                        let _e2834 = local_40[3i];
                        let _e2836 = local_40[0i];
                        let _e2837 = local_40[3i];
                        local_40[3i] = max(_e2836, _e2837);
                        local_40[0i] = min(_e2832, _e2834);
                        let _e2840 = local_40[1i];
                        let _e2842 = local_40[4i];
                        let _e2844 = local_40[1i];
                        let _e2845 = local_40[4i];
                        local_40[4i] = max(_e2844, _e2845);
                        local_40[1i] = min(_e2840, _e2842);
                        let _e2847 = local_40[0i];
                        let _e2849 = local_40[2i];
                        let _e2851 = local_40[0i];
                        let _e2852 = local_40[2i];
                        local_40[2i] = max(_e2851, _e2852);
                        local_40[0i] = min(_e2847, _e2849);
                        let _e2854 = local_40[1i];
                        let _e2855 = local_40[3i];
                        let _e2857 = local_40[1i];
                        let _e2858 = local_40[3i];
                        local_40[3i] = max(_e2857, _e2858);
                        local_40[1i] = min(_e2854, _e2855);
                        let _e2860 = local_40[0i];
                        let _e2861 = local_40[1i];
                        let _e2863 = local_40[0i];
                        let _e2864 = local_40[1i];
                        local_40[1i] = max(_e2863, _e2864);
                        local_40[0i] = min(_e2860, _e2861);
                        let _e2866 = local_40[2i];
                        let _e2867 = local_40[4i];
                        let _e2869 = local_40[2i];
                        let _e2870 = local_40[4i];
                        local_40[4i] = max(_e2869, _e2870);
                        local_40[2i] = min(_e2866, _e2867);
                        let _e2872 = local_40[1i];
                        let _e2873 = local_40[2i];
                        let _e2875 = local_40[1i];
                        let _e2876 = local_40[2i];
                        local_40[2i] = max(_e2875, _e2876);
                        local_40[1i] = min(_e2872, _e2873);
                        let _e2878 = local_40[3i];
                        let _e2879 = local_40[4i];
                        let _e2881 = local_40[3i];
                        let _e2882 = local_40[4i];
                        local_40[4i] = max(_e2881, _e2882);
                        local_40[3i] = min(_e2878, _e2879);
                        let _e2884 = local_40[2i];
                        let _e2885 = local_40[3i];
                        let _e2887 = local_40[2i];
                        let _e2888 = local_40[3i];
                        local_40[3i] = max(_e2887, _e2888);
                        local_40[2i] = min(_e2884, _e2885);
                        let _e2890 = local_41[4i];
                        let _e2891 = local_40[4i];
                        phi_3090_ = 65503f;
                        if (min(_e2890, _e2891) > 0.000000000000000000000000000000000000011754944f) {
                            phi_3033_ = 0i;
                            phi_3036_ = 0i;
                            phi_3038_ = 65503f;
                            phi_3040_ = 0i;
                            loop {
                                let _e2895 = phi_3033_;
                                let _e2897 = phi_3036_;
                                let _e2899 = phi_3038_;
                                let _e2901 = phi_3040_;
                                local_131 = _e2899;
                                phi_3048_ = false;
                                if (_e2901 < 5i) {
                                    phi_3048_ = (_e2899 < 65504f);
                                }
                                let _e2905 = phi_3048_;
                                if _e2905 {
                                    let _e2907 = local_41[_e2897];
                                    let _e2909 = local_40[_e2895];
                                    let _e2910 = (_e2907 - _e2909);
                                    if (abs(_e2910) > 0.000061f) {
                                        let _e2916 = local_41[_e2897];
                                        let _e2917 = local_40[_e2895];
                                        let _e2918 = max(_e2916, _e2917);
                                        if (_e2918 != 0f) {
                                            phi_3072_ = (min(_e2916, _e2917) / _e2918);
                                        } else {
                                            phi_3072_ = 0f;
                                        }
                                        let _e2923 = phi_3072_;
                                        let _e2925 = (f32(i32(sign(_e2910))) * (1f - _e2923));
                                        let _e2930 = local_41[_e2897];
                                        let _e2931 = local_40[_e2895];
                                        let _e2934 = (_e2897 + select(0i, 1i, (_e2930 < _e2931)));
                                        let _e2936 = local_41[_e2934];
                                        let _e2937 = local_40[_e2895];
                                        phi_3034_ = (_e2895 + select(0i, 1i, (_e2936 >= _e2937)));
                                        phi_3037_ = _e2934;
                                        phi_3039_ = select(_e2899, _e2925, (abs(_e2925) < abs(_e2899)));
                                    } else {
                                        phi_3034_ = _e2895;
                                        phi_3037_ = _e2897;
                                        phi_3039_ = 65504f;
                                    }
                                    let _e2942 = phi_3034_;
                                    let _e2944 = phi_3037_;
                                    let _e2946 = phi_3039_;
                                    local_128 = _e2942;
                                    local_129 = _e2944;
                                    local_130 = _e2946;
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    let _e5835 = local_128;
                                    phi_3033_ = _e5835;
                                    let _e5838 = local_129;
                                    phi_3036_ = _e5838;
                                    let _e5841 = local_130;
                                    phi_3038_ = _e5841;
                                    phi_3040_ = (_e2901 + 1i);
                                }
                            }
                            let _e5850 = local_131;
                            phi_3090_ = _e5850;
                        }
                        let _e2949 = phi_3090_;
                        phi_3094_ = (_e2949 * select(0f, 1f, (_e2949 < 65503f)));
                    }
                    let _e2954 = phi_3094_;
                    let _e2959 = vec4<f32>(_e2954, vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    if (_e2954 != 0f) {
                        phi_3103_ = f32(i32(sign(_e2954)));
                    } else {
                        phi_3103_ = 0f;
                    }
                    let _e2965 = phi_3103_;
                    let _e2970 = vec4<f32>(_e2959.x, _e2965, _e2959.z, _e2959.w);
                    let _e2978 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e2669 + vec2<u32>(0u, 1u)))));
                    let _e2985 = vec2<i32>(max(0i, min(_e2978.x, _e191)), max(0i, min(_e2978.y, _e196)));
                    let _e2987 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(_e2985), 0u);
                    let _e2991 = ((vec2<f32>(_e2985) + vec2<f32>(0.5f, 0.5f)) / _e205);
                    phi_3128_ = 0i;
                    loop {
                        let _e2997 = phi_3128_;
                        if (_e2997 < 5i) {
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e3000 = iSampleOffsets[_e2997];
                            let _e3001 = (vec2<i32>(floor(((_e2991 + _e209) * _e205))) + _e3000);
                            let _e3010 = textureLoad(r_current_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e3001.x, _e191)), max(0i, min(_e3001.y, _e196)))), 0u);
                            let _e3012 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                            local_45[_e2997] = (_e3010.x * select(_e3012.x, 1f, (_e3012.x == 0f)));
                            let _e3018 = local_45[_e2997];
                            local_45[_e2997] = pow(_e3018, 1f);
                            let _e3020 = local_45[_e2997];
                            local_45[_e2997] = max(_e3020, 0.000061f);
                            phi_3128_ = (_e2997 + 1i);
                        }
                    }
                    let _e3023 = local_45;
                    let _e3025 = ((_e2991 + _e247) + _e2987.xy);
                    phi_3166_ = false;
                    if (_e3025.x >= 0f) {
                        phi_3166_ = (_e3025.x <= 1f);
                    }
                    let _e3030 = phi_3166_;
                    phi_3175_ = false;
                    if _e3030 {
                        phi_3174_ = false;
                        if (_e3025.y >= 0f) {
                            phi_3174_ = (_e3025.y <= 1f);
                        }
                        let _e3035 = phi_3174_;
                        phi_3175_ = _e3035;
                    }
                    let _e3037 = phi_3175_;
                    if _e3037 {
                        phi_3182_ = 0i;
                        loop {
                            let _e3042 = phi_3182_;
                            if (_e3042 < 5i) {
                                continue;
                            } else {
                                break;
                            }
                            continuing {
                                let _e3045 = iSampleOffsets[_e3042];
                                let _e3046 = (vec2<i32>(floor((_e3025 * _e246))) + _e3045);
                                let _e3059 = textureLoad(r_previous_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e3046.x, (_e245.x - 1i))), max(0i, min(_e3046.y, (_e245.y - 1i))))), 0u);
                                let _e3062 = cbFSR3Upscaler.fDeltaPreExposure;
                                let _e3064 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                                local_9[_e3042] = ((_e3059.x * _e3062) * select(_e3064.x, 1f, (_e3064.x == 0f)));
                                let _e3070 = local_9[_e3042];
                                local_9[_e3042] = pow(_e3070, 1f);
                                let _e3072 = local_9[_e3042];
                                local_9[_e3042] = max(_e3072, 0.000061f);
                                phi_3182_ = (_e3042 + 1i);
                            }
                        }
                    }
                    let _e3075 = local_9;
                    phi_3408_ = 0f;
                    if _e3037 {
                        local_44 = _e3023;
                        local_43 = _e3075;
                        let _e3077 = local_44[0i];
                        let _e3079 = local_44[3i];
                        let _e3081 = local_44[0i];
                        let _e3082 = local_44[3i];
                        local_44[3i] = max(_e3081, _e3082);
                        local_44[0i] = min(_e3077, _e3079);
                        let _e3085 = local_44[1i];
                        let _e3087 = local_44[4i];
                        let _e3089 = local_44[1i];
                        let _e3090 = local_44[4i];
                        local_44[4i] = max(_e3089, _e3090);
                        local_44[1i] = min(_e3085, _e3087);
                        let _e3092 = local_44[0i];
                        let _e3094 = local_44[2i];
                        let _e3096 = local_44[0i];
                        let _e3097 = local_44[2i];
                        local_44[2i] = max(_e3096, _e3097);
                        local_44[0i] = min(_e3092, _e3094);
                        let _e3099 = local_44[1i];
                        let _e3100 = local_44[3i];
                        let _e3102 = local_44[1i];
                        let _e3103 = local_44[3i];
                        local_44[3i] = max(_e3102, _e3103);
                        local_44[1i] = min(_e3099, _e3100);
                        let _e3105 = local_44[0i];
                        let _e3106 = local_44[1i];
                        let _e3108 = local_44[0i];
                        let _e3109 = local_44[1i];
                        local_44[1i] = max(_e3108, _e3109);
                        local_44[0i] = min(_e3105, _e3106);
                        let _e3111 = local_44[2i];
                        let _e3112 = local_44[4i];
                        let _e3114 = local_44[2i];
                        let _e3115 = local_44[4i];
                        local_44[4i] = max(_e3114, _e3115);
                        local_44[2i] = min(_e3111, _e3112);
                        let _e3117 = local_44[1i];
                        let _e3118 = local_44[2i];
                        let _e3120 = local_44[1i];
                        let _e3121 = local_44[2i];
                        local_44[2i] = max(_e3120, _e3121);
                        local_44[1i] = min(_e3117, _e3118);
                        let _e3123 = local_44[3i];
                        let _e3124 = local_44[4i];
                        let _e3126 = local_44[3i];
                        let _e3127 = local_44[4i];
                        local_44[4i] = max(_e3126, _e3127);
                        local_44[3i] = min(_e3123, _e3124);
                        let _e3129 = local_44[2i];
                        let _e3130 = local_44[3i];
                        let _e3132 = local_44[2i];
                        let _e3133 = local_44[3i];
                        local_44[3i] = max(_e3132, _e3133);
                        local_44[2i] = min(_e3129, _e3130);
                        let _e3136 = local_43[0i];
                        let _e3138 = local_43[3i];
                        let _e3140 = local_43[0i];
                        let _e3141 = local_43[3i];
                        local_43[3i] = max(_e3140, _e3141);
                        local_43[0i] = min(_e3136, _e3138);
                        let _e3144 = local_43[1i];
                        let _e3146 = local_43[4i];
                        let _e3148 = local_43[1i];
                        let _e3149 = local_43[4i];
                        local_43[4i] = max(_e3148, _e3149);
                        local_43[1i] = min(_e3144, _e3146);
                        let _e3151 = local_43[0i];
                        let _e3153 = local_43[2i];
                        let _e3155 = local_43[0i];
                        let _e3156 = local_43[2i];
                        local_43[2i] = max(_e3155, _e3156);
                        local_43[0i] = min(_e3151, _e3153);
                        let _e3158 = local_43[1i];
                        let _e3159 = local_43[3i];
                        let _e3161 = local_43[1i];
                        let _e3162 = local_43[3i];
                        local_43[3i] = max(_e3161, _e3162);
                        local_43[1i] = min(_e3158, _e3159);
                        let _e3164 = local_43[0i];
                        let _e3165 = local_43[1i];
                        let _e3167 = local_43[0i];
                        let _e3168 = local_43[1i];
                        local_43[1i] = max(_e3167, _e3168);
                        local_43[0i] = min(_e3164, _e3165);
                        let _e3170 = local_43[2i];
                        let _e3171 = local_43[4i];
                        let _e3173 = local_43[2i];
                        let _e3174 = local_43[4i];
                        local_43[4i] = max(_e3173, _e3174);
                        local_43[2i] = min(_e3170, _e3171);
                        let _e3176 = local_43[1i];
                        let _e3177 = local_43[2i];
                        let _e3179 = local_43[1i];
                        let _e3180 = local_43[2i];
                        local_43[2i] = max(_e3179, _e3180);
                        local_43[1i] = min(_e3176, _e3177);
                        let _e3182 = local_43[3i];
                        let _e3183 = local_43[4i];
                        let _e3185 = local_43[3i];
                        let _e3186 = local_43[4i];
                        local_43[4i] = max(_e3185, _e3186);
                        local_43[3i] = min(_e3182, _e3183);
                        let _e3188 = local_43[2i];
                        let _e3189 = local_43[3i];
                        let _e3191 = local_43[2i];
                        let _e3192 = local_43[3i];
                        local_43[3i] = max(_e3191, _e3192);
                        local_43[2i] = min(_e3188, _e3189);
                        let _e3194 = local_44[4i];
                        let _e3195 = local_43[4i];
                        phi_3404_ = 65503f;
                        if (min(_e3194, _e3195) > 0.000000000000000000000000000000000000011754944f) {
                            phi_3347_ = 0i;
                            phi_3350_ = 0i;
                            phi_3352_ = 65503f;
                            phi_3354_ = 0i;
                            loop {
                                let _e3199 = phi_3347_;
                                let _e3201 = phi_3350_;
                                let _e3203 = phi_3352_;
                                let _e3205 = phi_3354_;
                                local_135 = _e3203;
                                phi_3362_ = false;
                                if (_e3205 < 5i) {
                                    phi_3362_ = (_e3203 < 65504f);
                                }
                                let _e3209 = phi_3362_;
                                if _e3209 {
                                    let _e3211 = local_44[_e3201];
                                    let _e3213 = local_43[_e3199];
                                    let _e3214 = (_e3211 - _e3213);
                                    if (abs(_e3214) > 0.000061f) {
                                        let _e3220 = local_44[_e3201];
                                        let _e3221 = local_43[_e3199];
                                        let _e3222 = max(_e3220, _e3221);
                                        if (_e3222 != 0f) {
                                            phi_3386_ = (min(_e3220, _e3221) / _e3222);
                                        } else {
                                            phi_3386_ = 0f;
                                        }
                                        let _e3227 = phi_3386_;
                                        let _e3229 = (f32(i32(sign(_e3214))) * (1f - _e3227));
                                        let _e3234 = local_44[_e3201];
                                        let _e3235 = local_43[_e3199];
                                        let _e3238 = (_e3201 + select(0i, 1i, (_e3234 < _e3235)));
                                        let _e3240 = local_44[_e3238];
                                        let _e3241 = local_43[_e3199];
                                        phi_3348_ = (_e3199 + select(0i, 1i, (_e3240 >= _e3241)));
                                        phi_3351_ = _e3238;
                                        phi_3353_ = select(_e3203, _e3229, (abs(_e3229) < abs(_e3203)));
                                    } else {
                                        phi_3348_ = _e3199;
                                        phi_3351_ = _e3201;
                                        phi_3353_ = 65504f;
                                    }
                                    let _e3246 = phi_3348_;
                                    let _e3248 = phi_3351_;
                                    let _e3250 = phi_3353_;
                                    local_132 = _e3246;
                                    local_133 = _e3248;
                                    local_134 = _e3250;
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    let _e5860 = local_132;
                                    phi_3347_ = _e5860;
                                    let _e5863 = local_133;
                                    phi_3350_ = _e5863;
                                    let _e5866 = local_134;
                                    phi_3352_ = _e5866;
                                    phi_3354_ = (_e3205 + 1i);
                                }
                            }
                            let _e5875 = local_135;
                            phi_3404_ = _e5875;
                        }
                        let _e3253 = phi_3404_;
                        phi_3408_ = (_e3253 * select(0f, 1f, (_e3253 < 65503f)));
                    }
                    let _e3258 = phi_3408_;
                    let _e3263 = vec4<f32>(_e3258, vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    if (_e3258 != 0f) {
                        phi_3417_ = f32(i32(sign(_e3258)));
                    } else {
                        phi_3417_ = 0f;
                    }
                    let _e3269 = phi_3417_;
                    let _e3274 = vec4<f32>(_e3263.x, _e3269, _e3263.z, _e3263.w);
                    let _e3282 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e2669 + vec2<u32>(1u, 0u)))));
                    let _e3289 = vec2<i32>(max(0i, min(_e3282.x, _e191)), max(0i, min(_e3282.y, _e196)));
                    let _e3291 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(_e3289), 0u);
                    let _e3295 = ((vec2<f32>(_e3289) + vec2<f32>(0.5f, 0.5f)) / _e205);
                    phi_3442_ = 0i;
                    loop {
                        let _e3301 = phi_3442_;
                        if (_e3301 < 5i) {
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e3304 = iSampleOffsets[_e3301];
                            let _e3305 = (vec2<i32>(floor(((_e3295 + _e209) * _e205))) + _e3304);
                            let _e3314 = textureLoad(r_current_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e3305.x, _e191)), max(0i, min(_e3305.y, _e196)))), 0u);
                            let _e3316 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                            local_48[_e3301] = (_e3314.x * select(_e3316.x, 1f, (_e3316.x == 0f)));
                            let _e3322 = local_48[_e3301];
                            local_48[_e3301] = pow(_e3322, 1f);
                            let _e3324 = local_48[_e3301];
                            local_48[_e3301] = max(_e3324, 0.000061f);
                            phi_3442_ = (_e3301 + 1i);
                        }
                    }
                    let _e3327 = local_48;
                    let _e3329 = ((_e3295 + _e247) + _e3291.xy);
                    phi_3480_ = false;
                    if (_e3329.x >= 0f) {
                        phi_3480_ = (_e3329.x <= 1f);
                    }
                    let _e3334 = phi_3480_;
                    phi_3489_ = false;
                    if _e3334 {
                        phi_3488_ = false;
                        if (_e3329.y >= 0f) {
                            phi_3488_ = (_e3329.y <= 1f);
                        }
                        let _e3339 = phi_3488_;
                        phi_3489_ = _e3339;
                    }
                    let _e3341 = phi_3489_;
                    if _e3341 {
                        phi_3496_ = 0i;
                        loop {
                            let _e3346 = phi_3496_;
                            if (_e3346 < 5i) {
                                continue;
                            } else {
                                break;
                            }
                            continuing {
                                let _e3349 = iSampleOffsets[_e3346];
                                let _e3350 = (vec2<i32>(floor((_e3329 * _e246))) + _e3349);
                                let _e3363 = textureLoad(r_previous_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e3350.x, (_e245.x - 1i))), max(0i, min(_e3350.y, (_e245.y - 1i))))), 0u);
                                let _e3366 = cbFSR3Upscaler.fDeltaPreExposure;
                                let _e3368 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                                local_10[_e3346] = ((_e3363.x * _e3366) * select(_e3368.x, 1f, (_e3368.x == 0f)));
                                let _e3374 = local_10[_e3346];
                                local_10[_e3346] = pow(_e3374, 1f);
                                let _e3376 = local_10[_e3346];
                                local_10[_e3346] = max(_e3376, 0.000061f);
                                phi_3496_ = (_e3346 + 1i);
                            }
                        }
                    }
                    let _e3379 = local_10;
                    phi_3722_ = 0f;
                    if _e3341 {
                        local_47 = _e3327;
                        local_46 = _e3379;
                        let _e3381 = local_47[0i];
                        let _e3383 = local_47[3i];
                        let _e3385 = local_47[0i];
                        let _e3386 = local_47[3i];
                        local_47[3i] = max(_e3385, _e3386);
                        local_47[0i] = min(_e3381, _e3383);
                        let _e3389 = local_47[1i];
                        let _e3391 = local_47[4i];
                        let _e3393 = local_47[1i];
                        let _e3394 = local_47[4i];
                        local_47[4i] = max(_e3393, _e3394);
                        local_47[1i] = min(_e3389, _e3391);
                        let _e3396 = local_47[0i];
                        let _e3398 = local_47[2i];
                        let _e3400 = local_47[0i];
                        let _e3401 = local_47[2i];
                        local_47[2i] = max(_e3400, _e3401);
                        local_47[0i] = min(_e3396, _e3398);
                        let _e3403 = local_47[1i];
                        let _e3404 = local_47[3i];
                        let _e3406 = local_47[1i];
                        let _e3407 = local_47[3i];
                        local_47[3i] = max(_e3406, _e3407);
                        local_47[1i] = min(_e3403, _e3404);
                        let _e3409 = local_47[0i];
                        let _e3410 = local_47[1i];
                        let _e3412 = local_47[0i];
                        let _e3413 = local_47[1i];
                        local_47[1i] = max(_e3412, _e3413);
                        local_47[0i] = min(_e3409, _e3410);
                        let _e3415 = local_47[2i];
                        let _e3416 = local_47[4i];
                        let _e3418 = local_47[2i];
                        let _e3419 = local_47[4i];
                        local_47[4i] = max(_e3418, _e3419);
                        local_47[2i] = min(_e3415, _e3416);
                        let _e3421 = local_47[1i];
                        let _e3422 = local_47[2i];
                        let _e3424 = local_47[1i];
                        let _e3425 = local_47[2i];
                        local_47[2i] = max(_e3424, _e3425);
                        local_47[1i] = min(_e3421, _e3422);
                        let _e3427 = local_47[3i];
                        let _e3428 = local_47[4i];
                        let _e3430 = local_47[3i];
                        let _e3431 = local_47[4i];
                        local_47[4i] = max(_e3430, _e3431);
                        local_47[3i] = min(_e3427, _e3428);
                        let _e3433 = local_47[2i];
                        let _e3434 = local_47[3i];
                        let _e3436 = local_47[2i];
                        let _e3437 = local_47[3i];
                        local_47[3i] = max(_e3436, _e3437);
                        local_47[2i] = min(_e3433, _e3434);
                        let _e3440 = local_46[0i];
                        let _e3442 = local_46[3i];
                        let _e3444 = local_46[0i];
                        let _e3445 = local_46[3i];
                        local_46[3i] = max(_e3444, _e3445);
                        local_46[0i] = min(_e3440, _e3442);
                        let _e3448 = local_46[1i];
                        let _e3450 = local_46[4i];
                        let _e3452 = local_46[1i];
                        let _e3453 = local_46[4i];
                        local_46[4i] = max(_e3452, _e3453);
                        local_46[1i] = min(_e3448, _e3450);
                        let _e3455 = local_46[0i];
                        let _e3457 = local_46[2i];
                        let _e3459 = local_46[0i];
                        let _e3460 = local_46[2i];
                        local_46[2i] = max(_e3459, _e3460);
                        local_46[0i] = min(_e3455, _e3457);
                        let _e3462 = local_46[1i];
                        let _e3463 = local_46[3i];
                        let _e3465 = local_46[1i];
                        let _e3466 = local_46[3i];
                        local_46[3i] = max(_e3465, _e3466);
                        local_46[1i] = min(_e3462, _e3463);
                        let _e3468 = local_46[0i];
                        let _e3469 = local_46[1i];
                        let _e3471 = local_46[0i];
                        let _e3472 = local_46[1i];
                        local_46[1i] = max(_e3471, _e3472);
                        local_46[0i] = min(_e3468, _e3469);
                        let _e3474 = local_46[2i];
                        let _e3475 = local_46[4i];
                        let _e3477 = local_46[2i];
                        let _e3478 = local_46[4i];
                        local_46[4i] = max(_e3477, _e3478);
                        local_46[2i] = min(_e3474, _e3475);
                        let _e3480 = local_46[1i];
                        let _e3481 = local_46[2i];
                        let _e3483 = local_46[1i];
                        let _e3484 = local_46[2i];
                        local_46[2i] = max(_e3483, _e3484);
                        local_46[1i] = min(_e3480, _e3481);
                        let _e3486 = local_46[3i];
                        let _e3487 = local_46[4i];
                        let _e3489 = local_46[3i];
                        let _e3490 = local_46[4i];
                        local_46[4i] = max(_e3489, _e3490);
                        local_46[3i] = min(_e3486, _e3487);
                        let _e3492 = local_46[2i];
                        let _e3493 = local_46[3i];
                        let _e3495 = local_46[2i];
                        let _e3496 = local_46[3i];
                        local_46[3i] = max(_e3495, _e3496);
                        local_46[2i] = min(_e3492, _e3493);
                        let _e3498 = local_47[4i];
                        let _e3499 = local_46[4i];
                        phi_3718_ = 65503f;
                        if (min(_e3498, _e3499) > 0.000000000000000000000000000000000000011754944f) {
                            phi_3661_ = 0i;
                            phi_3664_ = 0i;
                            phi_3666_ = 65503f;
                            phi_3668_ = 0i;
                            loop {
                                let _e3503 = phi_3661_;
                                let _e3505 = phi_3664_;
                                let _e3507 = phi_3666_;
                                let _e3509 = phi_3668_;
                                local_139 = _e3507;
                                phi_3676_ = false;
                                if (_e3509 < 5i) {
                                    phi_3676_ = (_e3507 < 65504f);
                                }
                                let _e3513 = phi_3676_;
                                if _e3513 {
                                    let _e3515 = local_47[_e3505];
                                    let _e3517 = local_46[_e3503];
                                    let _e3518 = (_e3515 - _e3517);
                                    if (abs(_e3518) > 0.000061f) {
                                        let _e3524 = local_47[_e3505];
                                        let _e3525 = local_46[_e3503];
                                        let _e3526 = max(_e3524, _e3525);
                                        if (_e3526 != 0f) {
                                            phi_3700_ = (min(_e3524, _e3525) / _e3526);
                                        } else {
                                            phi_3700_ = 0f;
                                        }
                                        let _e3531 = phi_3700_;
                                        let _e3533 = (f32(i32(sign(_e3518))) * (1f - _e3531));
                                        let _e3538 = local_47[_e3505];
                                        let _e3539 = local_46[_e3503];
                                        let _e3542 = (_e3505 + select(0i, 1i, (_e3538 < _e3539)));
                                        let _e3544 = local_47[_e3542];
                                        let _e3545 = local_46[_e3503];
                                        phi_3662_ = (_e3503 + select(0i, 1i, (_e3544 >= _e3545)));
                                        phi_3665_ = _e3542;
                                        phi_3667_ = select(_e3507, _e3533, (abs(_e3533) < abs(_e3507)));
                                    } else {
                                        phi_3662_ = _e3503;
                                        phi_3665_ = _e3505;
                                        phi_3667_ = 65504f;
                                    }
                                    let _e3550 = phi_3662_;
                                    let _e3552 = phi_3665_;
                                    let _e3554 = phi_3667_;
                                    local_136 = _e3550;
                                    local_137 = _e3552;
                                    local_138 = _e3554;
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    let _e5885 = local_136;
                                    phi_3661_ = _e5885;
                                    let _e5888 = local_137;
                                    phi_3664_ = _e5888;
                                    let _e5891 = local_138;
                                    phi_3666_ = _e5891;
                                    phi_3668_ = (_e3509 + 1i);
                                }
                            }
                            let _e5900 = local_139;
                            phi_3718_ = _e5900;
                        }
                        let _e3557 = phi_3718_;
                        phi_3722_ = (_e3557 * select(0f, 1f, (_e3557 < 65503f)));
                    }
                    let _e3562 = phi_3722_;
                    let _e3567 = vec4<f32>(_e3562, vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    if (_e3562 != 0f) {
                        phi_3731_ = f32(i32(sign(_e3562)));
                    } else {
                        phi_3731_ = 0f;
                    }
                    let _e3573 = phi_3731_;
                    let _e3578 = vec4<f32>(_e3567.x, _e3573, _e3567.z, _e3567.w);
                    let _e3586 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e2669 + vec2<u32>(1u, 1u)))));
                    let _e3593 = vec2<i32>(max(0i, min(_e3586.x, _e191)), max(0i, min(_e3586.y, _e196)));
                    let _e3595 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(_e3593), 0u);
                    let _e3599 = ((vec2<f32>(_e3593) + vec2<f32>(0.5f, 0.5f)) / _e205);
                    phi_3756_ = 0i;
                    loop {
                        let _e3605 = phi_3756_;
                        if (_e3605 < 5i) {
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e3608 = iSampleOffsets[_e3605];
                            let _e3609 = (vec2<i32>(floor(((_e3599 + _e209) * _e205))) + _e3608);
                            let _e3618 = textureLoad(r_current_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e3609.x, _e191)), max(0i, min(_e3609.y, _e196)))), 0u);
                            let _e3620 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                            local_51[_e3605] = (_e3618.x * select(_e3620.x, 1f, (_e3620.x == 0f)));
                            let _e3626 = local_51[_e3605];
                            local_51[_e3605] = pow(_e3626, 1f);
                            let _e3628 = local_51[_e3605];
                            local_51[_e3605] = max(_e3628, 0.000061f);
                            phi_3756_ = (_e3605 + 1i);
                        }
                    }
                    let _e3631 = local_51;
                    let _e3633 = ((_e3599 + _e247) + _e3595.xy);
                    phi_3794_ = false;
                    if (_e3633.x >= 0f) {
                        phi_3794_ = (_e3633.x <= 1f);
                    }
                    let _e3638 = phi_3794_;
                    phi_3803_ = false;
                    if _e3638 {
                        phi_3802_ = false;
                        if (_e3633.y >= 0f) {
                            phi_3802_ = (_e3633.y <= 1f);
                        }
                        let _e3643 = phi_3802_;
                        phi_3803_ = _e3643;
                    }
                    let _e3645 = phi_3803_;
                    if _e3645 {
                        phi_3810_ = 0i;
                        loop {
                            let _e3650 = phi_3810_;
                            if (_e3650 < 5i) {
                                continue;
                            } else {
                                break;
                            }
                            continuing {
                                let _e3653 = iSampleOffsets[_e3650];
                                let _e3654 = (vec2<i32>(floor((_e3633 * _e246))) + _e3653);
                                let _e3667 = textureLoad(r_previous_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e3654.x, (_e245.x - 1i))), max(0i, min(_e3654.y, (_e245.y - 1i))))), 0u);
                                let _e3670 = cbFSR3Upscaler.fDeltaPreExposure;
                                let _e3672 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                                local_11[_e3650] = ((_e3667.x * _e3670) * select(_e3672.x, 1f, (_e3672.x == 0f)));
                                let _e3678 = local_11[_e3650];
                                local_11[_e3650] = pow(_e3678, 1f);
                                let _e3680 = local_11[_e3650];
                                local_11[_e3650] = max(_e3680, 0.000061f);
                                phi_3810_ = (_e3650 + 1i);
                            }
                        }
                    }
                    let _e3683 = local_11;
                    phi_4036_ = 0f;
                    if _e3645 {
                        local_50 = _e3631;
                        local_49 = _e3683;
                        let _e3685 = local_50[0i];
                        let _e3687 = local_50[3i];
                        let _e3689 = local_50[0i];
                        let _e3690 = local_50[3i];
                        local_50[3i] = max(_e3689, _e3690);
                        local_50[0i] = min(_e3685, _e3687);
                        let _e3693 = local_50[1i];
                        let _e3695 = local_50[4i];
                        let _e3697 = local_50[1i];
                        let _e3698 = local_50[4i];
                        local_50[4i] = max(_e3697, _e3698);
                        local_50[1i] = min(_e3693, _e3695);
                        let _e3700 = local_50[0i];
                        let _e3702 = local_50[2i];
                        let _e3704 = local_50[0i];
                        let _e3705 = local_50[2i];
                        local_50[2i] = max(_e3704, _e3705);
                        local_50[0i] = min(_e3700, _e3702);
                        let _e3707 = local_50[1i];
                        let _e3708 = local_50[3i];
                        let _e3710 = local_50[1i];
                        let _e3711 = local_50[3i];
                        local_50[3i] = max(_e3710, _e3711);
                        local_50[1i] = min(_e3707, _e3708);
                        let _e3713 = local_50[0i];
                        let _e3714 = local_50[1i];
                        let _e3716 = local_50[0i];
                        let _e3717 = local_50[1i];
                        local_50[1i] = max(_e3716, _e3717);
                        local_50[0i] = min(_e3713, _e3714);
                        let _e3719 = local_50[2i];
                        let _e3720 = local_50[4i];
                        let _e3722 = local_50[2i];
                        let _e3723 = local_50[4i];
                        local_50[4i] = max(_e3722, _e3723);
                        local_50[2i] = min(_e3719, _e3720);
                        let _e3725 = local_50[1i];
                        let _e3726 = local_50[2i];
                        let _e3728 = local_50[1i];
                        let _e3729 = local_50[2i];
                        local_50[2i] = max(_e3728, _e3729);
                        local_50[1i] = min(_e3725, _e3726);
                        let _e3731 = local_50[3i];
                        let _e3732 = local_50[4i];
                        let _e3734 = local_50[3i];
                        let _e3735 = local_50[4i];
                        local_50[4i] = max(_e3734, _e3735);
                        local_50[3i] = min(_e3731, _e3732);
                        let _e3737 = local_50[2i];
                        let _e3738 = local_50[3i];
                        let _e3740 = local_50[2i];
                        let _e3741 = local_50[3i];
                        local_50[3i] = max(_e3740, _e3741);
                        local_50[2i] = min(_e3737, _e3738);
                        let _e3744 = local_49[0i];
                        let _e3746 = local_49[3i];
                        let _e3748 = local_49[0i];
                        let _e3749 = local_49[3i];
                        local_49[3i] = max(_e3748, _e3749);
                        local_49[0i] = min(_e3744, _e3746);
                        let _e3752 = local_49[1i];
                        let _e3754 = local_49[4i];
                        let _e3756 = local_49[1i];
                        let _e3757 = local_49[4i];
                        local_49[4i] = max(_e3756, _e3757);
                        local_49[1i] = min(_e3752, _e3754);
                        let _e3759 = local_49[0i];
                        let _e3761 = local_49[2i];
                        let _e3763 = local_49[0i];
                        let _e3764 = local_49[2i];
                        local_49[2i] = max(_e3763, _e3764);
                        local_49[0i] = min(_e3759, _e3761);
                        let _e3766 = local_49[1i];
                        let _e3767 = local_49[3i];
                        let _e3769 = local_49[1i];
                        let _e3770 = local_49[3i];
                        local_49[3i] = max(_e3769, _e3770);
                        local_49[1i] = min(_e3766, _e3767);
                        let _e3772 = local_49[0i];
                        let _e3773 = local_49[1i];
                        let _e3775 = local_49[0i];
                        let _e3776 = local_49[1i];
                        local_49[1i] = max(_e3775, _e3776);
                        local_49[0i] = min(_e3772, _e3773);
                        let _e3778 = local_49[2i];
                        let _e3779 = local_49[4i];
                        let _e3781 = local_49[2i];
                        let _e3782 = local_49[4i];
                        local_49[4i] = max(_e3781, _e3782);
                        local_49[2i] = min(_e3778, _e3779);
                        let _e3784 = local_49[1i];
                        let _e3785 = local_49[2i];
                        let _e3787 = local_49[1i];
                        let _e3788 = local_49[2i];
                        local_49[2i] = max(_e3787, _e3788);
                        local_49[1i] = min(_e3784, _e3785);
                        let _e3790 = local_49[3i];
                        let _e3791 = local_49[4i];
                        let _e3793 = local_49[3i];
                        let _e3794 = local_49[4i];
                        local_49[4i] = max(_e3793, _e3794);
                        local_49[3i] = min(_e3790, _e3791);
                        let _e3796 = local_49[2i];
                        let _e3797 = local_49[3i];
                        let _e3799 = local_49[2i];
                        let _e3800 = local_49[3i];
                        local_49[3i] = max(_e3799, _e3800);
                        local_49[2i] = min(_e3796, _e3797);
                        let _e3802 = local_50[4i];
                        let _e3803 = local_49[4i];
                        phi_4032_ = 65503f;
                        if (min(_e3802, _e3803) > 0.000000000000000000000000000000000000011754944f) {
                            phi_3975_ = 0i;
                            phi_3978_ = 0i;
                            phi_3980_ = 65503f;
                            phi_3982_ = 0i;
                            loop {
                                let _e3807 = phi_3975_;
                                let _e3809 = phi_3978_;
                                let _e3811 = phi_3980_;
                                let _e3813 = phi_3982_;
                                local_143 = _e3811;
                                phi_3990_ = false;
                                if (_e3813 < 5i) {
                                    phi_3990_ = (_e3811 < 65504f);
                                }
                                let _e3817 = phi_3990_;
                                if _e3817 {
                                    let _e3819 = local_50[_e3809];
                                    let _e3821 = local_49[_e3807];
                                    let _e3822 = (_e3819 - _e3821);
                                    if (abs(_e3822) > 0.000061f) {
                                        let _e3828 = local_50[_e3809];
                                        let _e3829 = local_49[_e3807];
                                        let _e3830 = max(_e3828, _e3829);
                                        if (_e3830 != 0f) {
                                            phi_4014_ = (min(_e3828, _e3829) / _e3830);
                                        } else {
                                            phi_4014_ = 0f;
                                        }
                                        let _e3835 = phi_4014_;
                                        let _e3837 = (f32(i32(sign(_e3822))) * (1f - _e3835));
                                        let _e3842 = local_50[_e3809];
                                        let _e3843 = local_49[_e3807];
                                        let _e3846 = (_e3809 + select(0i, 1i, (_e3842 < _e3843)));
                                        let _e3848 = local_50[_e3846];
                                        let _e3849 = local_49[_e3807];
                                        phi_3976_ = (_e3807 + select(0i, 1i, (_e3848 >= _e3849)));
                                        phi_3979_ = _e3846;
                                        phi_3981_ = select(_e3811, _e3837, (abs(_e3837) < abs(_e3811)));
                                    } else {
                                        phi_3976_ = _e3807;
                                        phi_3979_ = _e3809;
                                        phi_3981_ = 65504f;
                                    }
                                    let _e3854 = phi_3976_;
                                    let _e3856 = phi_3979_;
                                    let _e3858 = phi_3981_;
                                    local_140 = _e3854;
                                    local_141 = _e3856;
                                    local_142 = _e3858;
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    let _e5910 = local_140;
                                    phi_3975_ = _e5910;
                                    let _e5913 = local_141;
                                    phi_3978_ = _e5913;
                                    let _e5916 = local_142;
                                    phi_3980_ = _e5916;
                                    phi_3982_ = (_e3813 + 1i);
                                }
                            }
                            let _e5925 = local_143;
                            phi_4032_ = _e5925;
                        }
                        let _e3861 = phi_4032_;
                        phi_4036_ = (_e3861 * select(0f, 1f, (_e3861 < 65503f)));
                    }
                    let _e3866 = phi_4036_;
                    let _e3871 = vec4<f32>(_e3866, vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    if (_e3866 != 0f) {
                        phi_4045_ = f32(i32(sign(_e3866)));
                    } else {
                        phi_4045_ = 0f;
                    }
                    let _e3877 = phi_4045_;
                    let _e3882 = vec4<f32>(_e3871.x, _e3877, _e3871.z, _e3871.w);
                    local_64[2i] = ((((vec4<f32>(_e2970.x, _e2970.y, 1f, _e2970.w) + vec4<f32>(_e3274.x, _e3274.y, 1f, _e3274.w)) + vec4<f32>(_e3578.x, _e3578.y, 1f, _e3578.w)) + vec4<f32>(_e3882.x, _e3882.y, 1f, _e3882.w)) * 0.25f);
                    let _e3893 = local_64[2i];
                    textureStore(rw_spd_mip0_, bitcast<vec2<u32>>((_e176 + vec2<i32>(_e177, _e2666))), _e3893.xy.xyyy);
                    let _e3898 = (_e168 + vec2<i32>(_e1426, _e2662));
                    let _e3901 = bitcast<vec2<u32>>(_e3898);
                    let _e3906 = vec2<i32>(vec2<f32>(_e3898));
                    let _e3913 = vec2<i32>(max(0i, min(_e3906.x, _e191)), max(0i, min(_e3906.y, _e196)));
                    let _e3915 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(_e3913), 0u);
                    let _e3919 = ((vec2<f32>(_e3913) + vec2<f32>(0.5f, 0.5f)) / _e205);
                    phi_4086_ = 0i;
                    loop {
                        let _e3925 = phi_4086_;
                        if (_e3925 < 5i) {
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e3928 = iSampleOffsets[_e3925];
                            let _e3929 = (vec2<i32>(floor(((_e3919 + _e209) * _e205))) + _e3928);
                            let _e3938 = textureLoad(r_current_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e3929.x, _e191)), max(0i, min(_e3929.y, _e196)))), 0u);
                            let _e3940 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                            local_54[_e3925] = (_e3938.x * select(_e3940.x, 1f, (_e3940.x == 0f)));
                            let _e3946 = local_54[_e3925];
                            local_54[_e3925] = pow(_e3946, 1f);
                            let _e3948 = local_54[_e3925];
                            local_54[_e3925] = max(_e3948, 0.000061f);
                            phi_4086_ = (_e3925 + 1i);
                        }
                    }
                    let _e3951 = local_54;
                    let _e3953 = ((_e3919 + _e247) + _e3915.xy);
                    phi_4124_ = false;
                    if (_e3953.x >= 0f) {
                        phi_4124_ = (_e3953.x <= 1f);
                    }
                    let _e3958 = phi_4124_;
                    phi_4133_ = false;
                    if _e3958 {
                        phi_4132_ = false;
                        if (_e3953.y >= 0f) {
                            phi_4132_ = (_e3953.y <= 1f);
                        }
                        let _e3963 = phi_4132_;
                        phi_4133_ = _e3963;
                    }
                    let _e3965 = phi_4133_;
                    if _e3965 {
                        phi_4140_ = 0i;
                        loop {
                            let _e3970 = phi_4140_;
                            if (_e3970 < 5i) {
                                continue;
                            } else {
                                break;
                            }
                            continuing {
                                let _e3973 = iSampleOffsets[_e3970];
                                let _e3974 = (vec2<i32>(floor((_e3953 * _e246))) + _e3973);
                                let _e3987 = textureLoad(r_previous_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e3974.x, (_e245.x - 1i))), max(0i, min(_e3974.y, (_e245.y - 1i))))), 0u);
                                let _e3990 = cbFSR3Upscaler.fDeltaPreExposure;
                                let _e3992 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                                local_12[_e3970] = ((_e3987.x * _e3990) * select(_e3992.x, 1f, (_e3992.x == 0f)));
                                let _e3998 = local_12[_e3970];
                                local_12[_e3970] = pow(_e3998, 1f);
                                let _e4000 = local_12[_e3970];
                                local_12[_e3970] = max(_e4000, 0.000061f);
                                phi_4140_ = (_e3970 + 1i);
                            }
                        }
                    }
                    let _e4003 = local_12;
                    phi_4366_ = 0f;
                    if _e3965 {
                        local_53 = _e3951;
                        local_52 = _e4003;
                        let _e4005 = local_53[0i];
                        let _e4007 = local_53[3i];
                        let _e4009 = local_53[0i];
                        let _e4010 = local_53[3i];
                        local_53[3i] = max(_e4009, _e4010);
                        local_53[0i] = min(_e4005, _e4007);
                        let _e4013 = local_53[1i];
                        let _e4015 = local_53[4i];
                        let _e4017 = local_53[1i];
                        let _e4018 = local_53[4i];
                        local_53[4i] = max(_e4017, _e4018);
                        local_53[1i] = min(_e4013, _e4015);
                        let _e4020 = local_53[0i];
                        let _e4022 = local_53[2i];
                        let _e4024 = local_53[0i];
                        let _e4025 = local_53[2i];
                        local_53[2i] = max(_e4024, _e4025);
                        local_53[0i] = min(_e4020, _e4022);
                        let _e4027 = local_53[1i];
                        let _e4028 = local_53[3i];
                        let _e4030 = local_53[1i];
                        let _e4031 = local_53[3i];
                        local_53[3i] = max(_e4030, _e4031);
                        local_53[1i] = min(_e4027, _e4028);
                        let _e4033 = local_53[0i];
                        let _e4034 = local_53[1i];
                        let _e4036 = local_53[0i];
                        let _e4037 = local_53[1i];
                        local_53[1i] = max(_e4036, _e4037);
                        local_53[0i] = min(_e4033, _e4034);
                        let _e4039 = local_53[2i];
                        let _e4040 = local_53[4i];
                        let _e4042 = local_53[2i];
                        let _e4043 = local_53[4i];
                        local_53[4i] = max(_e4042, _e4043);
                        local_53[2i] = min(_e4039, _e4040);
                        let _e4045 = local_53[1i];
                        let _e4046 = local_53[2i];
                        let _e4048 = local_53[1i];
                        let _e4049 = local_53[2i];
                        local_53[2i] = max(_e4048, _e4049);
                        local_53[1i] = min(_e4045, _e4046);
                        let _e4051 = local_53[3i];
                        let _e4052 = local_53[4i];
                        let _e4054 = local_53[3i];
                        let _e4055 = local_53[4i];
                        local_53[4i] = max(_e4054, _e4055);
                        local_53[3i] = min(_e4051, _e4052);
                        let _e4057 = local_53[2i];
                        let _e4058 = local_53[3i];
                        let _e4060 = local_53[2i];
                        let _e4061 = local_53[3i];
                        local_53[3i] = max(_e4060, _e4061);
                        local_53[2i] = min(_e4057, _e4058);
                        let _e4064 = local_52[0i];
                        let _e4066 = local_52[3i];
                        let _e4068 = local_52[0i];
                        let _e4069 = local_52[3i];
                        local_52[3i] = max(_e4068, _e4069);
                        local_52[0i] = min(_e4064, _e4066);
                        let _e4072 = local_52[1i];
                        let _e4074 = local_52[4i];
                        let _e4076 = local_52[1i];
                        let _e4077 = local_52[4i];
                        local_52[4i] = max(_e4076, _e4077);
                        local_52[1i] = min(_e4072, _e4074);
                        let _e4079 = local_52[0i];
                        let _e4081 = local_52[2i];
                        let _e4083 = local_52[0i];
                        let _e4084 = local_52[2i];
                        local_52[2i] = max(_e4083, _e4084);
                        local_52[0i] = min(_e4079, _e4081);
                        let _e4086 = local_52[1i];
                        let _e4087 = local_52[3i];
                        let _e4089 = local_52[1i];
                        let _e4090 = local_52[3i];
                        local_52[3i] = max(_e4089, _e4090);
                        local_52[1i] = min(_e4086, _e4087);
                        let _e4092 = local_52[0i];
                        let _e4093 = local_52[1i];
                        let _e4095 = local_52[0i];
                        let _e4096 = local_52[1i];
                        local_52[1i] = max(_e4095, _e4096);
                        local_52[0i] = min(_e4092, _e4093);
                        let _e4098 = local_52[2i];
                        let _e4099 = local_52[4i];
                        let _e4101 = local_52[2i];
                        let _e4102 = local_52[4i];
                        local_52[4i] = max(_e4101, _e4102);
                        local_52[2i] = min(_e4098, _e4099);
                        let _e4104 = local_52[1i];
                        let _e4105 = local_52[2i];
                        let _e4107 = local_52[1i];
                        let _e4108 = local_52[2i];
                        local_52[2i] = max(_e4107, _e4108);
                        local_52[1i] = min(_e4104, _e4105);
                        let _e4110 = local_52[3i];
                        let _e4111 = local_52[4i];
                        let _e4113 = local_52[3i];
                        let _e4114 = local_52[4i];
                        local_52[4i] = max(_e4113, _e4114);
                        local_52[3i] = min(_e4110, _e4111);
                        let _e4116 = local_52[2i];
                        let _e4117 = local_52[3i];
                        let _e4119 = local_52[2i];
                        let _e4120 = local_52[3i];
                        local_52[3i] = max(_e4119, _e4120);
                        local_52[2i] = min(_e4116, _e4117);
                        let _e4122 = local_53[4i];
                        let _e4123 = local_52[4i];
                        phi_4362_ = 65503f;
                        if (min(_e4122, _e4123) > 0.000000000000000000000000000000000000011754944f) {
                            phi_4305_ = 0i;
                            phi_4308_ = 0i;
                            phi_4310_ = 65503f;
                            phi_4312_ = 0i;
                            loop {
                                let _e4127 = phi_4305_;
                                let _e4129 = phi_4308_;
                                let _e4131 = phi_4310_;
                                let _e4133 = phi_4312_;
                                local_147 = _e4131;
                                phi_4320_ = false;
                                if (_e4133 < 5i) {
                                    phi_4320_ = (_e4131 < 65504f);
                                }
                                let _e4137 = phi_4320_;
                                if _e4137 {
                                    let _e4139 = local_53[_e4129];
                                    let _e4141 = local_52[_e4127];
                                    let _e4142 = (_e4139 - _e4141);
                                    if (abs(_e4142) > 0.000061f) {
                                        let _e4148 = local_53[_e4129];
                                        let _e4149 = local_52[_e4127];
                                        let _e4150 = max(_e4148, _e4149);
                                        if (_e4150 != 0f) {
                                            phi_4344_ = (min(_e4148, _e4149) / _e4150);
                                        } else {
                                            phi_4344_ = 0f;
                                        }
                                        let _e4155 = phi_4344_;
                                        let _e4157 = (f32(i32(sign(_e4142))) * (1f - _e4155));
                                        let _e4162 = local_53[_e4129];
                                        let _e4163 = local_52[_e4127];
                                        let _e4166 = (_e4129 + select(0i, 1i, (_e4162 < _e4163)));
                                        let _e4168 = local_53[_e4166];
                                        let _e4169 = local_52[_e4127];
                                        phi_4306_ = (_e4127 + select(0i, 1i, (_e4168 >= _e4169)));
                                        phi_4309_ = _e4166;
                                        phi_4311_ = select(_e4131, _e4157, (abs(_e4157) < abs(_e4131)));
                                    } else {
                                        phi_4306_ = _e4127;
                                        phi_4309_ = _e4129;
                                        phi_4311_ = 65504f;
                                    }
                                    let _e4174 = phi_4306_;
                                    let _e4176 = phi_4309_;
                                    let _e4178 = phi_4311_;
                                    local_144 = _e4174;
                                    local_145 = _e4176;
                                    local_146 = _e4178;
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    let _e5935 = local_144;
                                    phi_4305_ = _e5935;
                                    let _e5938 = local_145;
                                    phi_4308_ = _e5938;
                                    let _e5941 = local_146;
                                    phi_4310_ = _e5941;
                                    phi_4312_ = (_e4133 + 1i);
                                }
                            }
                            let _e5950 = local_147;
                            phi_4362_ = _e5950;
                        }
                        let _e4181 = phi_4362_;
                        phi_4366_ = (_e4181 * select(0f, 1f, (_e4181 < 65503f)));
                    }
                    let _e4186 = phi_4366_;
                    let _e4191 = vec4<f32>(_e4186, vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    if (_e4186 != 0f) {
                        phi_4375_ = f32(i32(sign(_e4186)));
                    } else {
                        phi_4375_ = 0f;
                    }
                    let _e4197 = phi_4375_;
                    let _e4202 = vec4<f32>(_e4191.x, _e4197, _e4191.z, _e4191.w);
                    let _e4210 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e3901 + vec2<u32>(0u, 1u)))));
                    let _e4217 = vec2<i32>(max(0i, min(_e4210.x, _e191)), max(0i, min(_e4210.y, _e196)));
                    let _e4219 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(_e4217), 0u);
                    let _e4223 = ((vec2<f32>(_e4217) + vec2<f32>(0.5f, 0.5f)) / _e205);
                    phi_4400_ = 0i;
                    loop {
                        let _e4229 = phi_4400_;
                        if (_e4229 < 5i) {
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e4232 = iSampleOffsets[_e4229];
                            let _e4233 = (vec2<i32>(floor(((_e4223 + _e209) * _e205))) + _e4232);
                            let _e4242 = textureLoad(r_current_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e4233.x, _e191)), max(0i, min(_e4233.y, _e196)))), 0u);
                            let _e4244 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                            local_57[_e4229] = (_e4242.x * select(_e4244.x, 1f, (_e4244.x == 0f)));
                            let _e4250 = local_57[_e4229];
                            local_57[_e4229] = pow(_e4250, 1f);
                            let _e4252 = local_57[_e4229];
                            local_57[_e4229] = max(_e4252, 0.000061f);
                            phi_4400_ = (_e4229 + 1i);
                        }
                    }
                    let _e4255 = local_57;
                    let _e4257 = ((_e4223 + _e247) + _e4219.xy);
                    phi_4438_ = false;
                    if (_e4257.x >= 0f) {
                        phi_4438_ = (_e4257.x <= 1f);
                    }
                    let _e4262 = phi_4438_;
                    phi_4447_ = false;
                    if _e4262 {
                        phi_4446_ = false;
                        if (_e4257.y >= 0f) {
                            phi_4446_ = (_e4257.y <= 1f);
                        }
                        let _e4267 = phi_4446_;
                        phi_4447_ = _e4267;
                    }
                    let _e4269 = phi_4447_;
                    if _e4269 {
                        phi_4454_ = 0i;
                        loop {
                            let _e4274 = phi_4454_;
                            if (_e4274 < 5i) {
                                continue;
                            } else {
                                break;
                            }
                            continuing {
                                let _e4277 = iSampleOffsets[_e4274];
                                let _e4278 = (vec2<i32>(floor((_e4257 * _e246))) + _e4277);
                                let _e4291 = textureLoad(r_previous_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e4278.x, (_e245.x - 1i))), max(0i, min(_e4278.y, (_e245.y - 1i))))), 0u);
                                let _e4294 = cbFSR3Upscaler.fDeltaPreExposure;
                                let _e4296 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                                local_13[_e4274] = ((_e4291.x * _e4294) * select(_e4296.x, 1f, (_e4296.x == 0f)));
                                let _e4302 = local_13[_e4274];
                                local_13[_e4274] = pow(_e4302, 1f);
                                let _e4304 = local_13[_e4274];
                                local_13[_e4274] = max(_e4304, 0.000061f);
                                phi_4454_ = (_e4274 + 1i);
                            }
                        }
                    }
                    let _e4307 = local_13;
                    phi_4680_ = 0f;
                    if _e4269 {
                        local_56 = _e4255;
                        local_55 = _e4307;
                        let _e4309 = local_56[0i];
                        let _e4311 = local_56[3i];
                        let _e4313 = local_56[0i];
                        let _e4314 = local_56[3i];
                        local_56[3i] = max(_e4313, _e4314);
                        local_56[0i] = min(_e4309, _e4311);
                        let _e4317 = local_56[1i];
                        let _e4319 = local_56[4i];
                        let _e4321 = local_56[1i];
                        let _e4322 = local_56[4i];
                        local_56[4i] = max(_e4321, _e4322);
                        local_56[1i] = min(_e4317, _e4319);
                        let _e4324 = local_56[0i];
                        let _e4326 = local_56[2i];
                        let _e4328 = local_56[0i];
                        let _e4329 = local_56[2i];
                        local_56[2i] = max(_e4328, _e4329);
                        local_56[0i] = min(_e4324, _e4326);
                        let _e4331 = local_56[1i];
                        let _e4332 = local_56[3i];
                        let _e4334 = local_56[1i];
                        let _e4335 = local_56[3i];
                        local_56[3i] = max(_e4334, _e4335);
                        local_56[1i] = min(_e4331, _e4332);
                        let _e4337 = local_56[0i];
                        let _e4338 = local_56[1i];
                        let _e4340 = local_56[0i];
                        let _e4341 = local_56[1i];
                        local_56[1i] = max(_e4340, _e4341);
                        local_56[0i] = min(_e4337, _e4338);
                        let _e4343 = local_56[2i];
                        let _e4344 = local_56[4i];
                        let _e4346 = local_56[2i];
                        let _e4347 = local_56[4i];
                        local_56[4i] = max(_e4346, _e4347);
                        local_56[2i] = min(_e4343, _e4344);
                        let _e4349 = local_56[1i];
                        let _e4350 = local_56[2i];
                        let _e4352 = local_56[1i];
                        let _e4353 = local_56[2i];
                        local_56[2i] = max(_e4352, _e4353);
                        local_56[1i] = min(_e4349, _e4350);
                        let _e4355 = local_56[3i];
                        let _e4356 = local_56[4i];
                        let _e4358 = local_56[3i];
                        let _e4359 = local_56[4i];
                        local_56[4i] = max(_e4358, _e4359);
                        local_56[3i] = min(_e4355, _e4356);
                        let _e4361 = local_56[2i];
                        let _e4362 = local_56[3i];
                        let _e4364 = local_56[2i];
                        let _e4365 = local_56[3i];
                        local_56[3i] = max(_e4364, _e4365);
                        local_56[2i] = min(_e4361, _e4362);
                        let _e4368 = local_55[0i];
                        let _e4370 = local_55[3i];
                        let _e4372 = local_55[0i];
                        let _e4373 = local_55[3i];
                        local_55[3i] = max(_e4372, _e4373);
                        local_55[0i] = min(_e4368, _e4370);
                        let _e4376 = local_55[1i];
                        let _e4378 = local_55[4i];
                        let _e4380 = local_55[1i];
                        let _e4381 = local_55[4i];
                        local_55[4i] = max(_e4380, _e4381);
                        local_55[1i] = min(_e4376, _e4378);
                        let _e4383 = local_55[0i];
                        let _e4385 = local_55[2i];
                        let _e4387 = local_55[0i];
                        let _e4388 = local_55[2i];
                        local_55[2i] = max(_e4387, _e4388);
                        local_55[0i] = min(_e4383, _e4385);
                        let _e4390 = local_55[1i];
                        let _e4391 = local_55[3i];
                        let _e4393 = local_55[1i];
                        let _e4394 = local_55[3i];
                        local_55[3i] = max(_e4393, _e4394);
                        local_55[1i] = min(_e4390, _e4391);
                        let _e4396 = local_55[0i];
                        let _e4397 = local_55[1i];
                        let _e4399 = local_55[0i];
                        let _e4400 = local_55[1i];
                        local_55[1i] = max(_e4399, _e4400);
                        local_55[0i] = min(_e4396, _e4397);
                        let _e4402 = local_55[2i];
                        let _e4403 = local_55[4i];
                        let _e4405 = local_55[2i];
                        let _e4406 = local_55[4i];
                        local_55[4i] = max(_e4405, _e4406);
                        local_55[2i] = min(_e4402, _e4403);
                        let _e4408 = local_55[1i];
                        let _e4409 = local_55[2i];
                        let _e4411 = local_55[1i];
                        let _e4412 = local_55[2i];
                        local_55[2i] = max(_e4411, _e4412);
                        local_55[1i] = min(_e4408, _e4409);
                        let _e4414 = local_55[3i];
                        let _e4415 = local_55[4i];
                        let _e4417 = local_55[3i];
                        let _e4418 = local_55[4i];
                        local_55[4i] = max(_e4417, _e4418);
                        local_55[3i] = min(_e4414, _e4415);
                        let _e4420 = local_55[2i];
                        let _e4421 = local_55[3i];
                        let _e4423 = local_55[2i];
                        let _e4424 = local_55[3i];
                        local_55[3i] = max(_e4423, _e4424);
                        local_55[2i] = min(_e4420, _e4421);
                        let _e4426 = local_56[4i];
                        let _e4427 = local_55[4i];
                        phi_4676_ = 65503f;
                        if (min(_e4426, _e4427) > 0.000000000000000000000000000000000000011754944f) {
                            phi_4619_ = 0i;
                            phi_4622_ = 0i;
                            phi_4624_ = 65503f;
                            phi_4626_ = 0i;
                            loop {
                                let _e4431 = phi_4619_;
                                let _e4433 = phi_4622_;
                                let _e4435 = phi_4624_;
                                let _e4437 = phi_4626_;
                                local_151 = _e4435;
                                phi_4634_ = false;
                                if (_e4437 < 5i) {
                                    phi_4634_ = (_e4435 < 65504f);
                                }
                                let _e4441 = phi_4634_;
                                if _e4441 {
                                    let _e4443 = local_56[_e4433];
                                    let _e4445 = local_55[_e4431];
                                    let _e4446 = (_e4443 - _e4445);
                                    if (abs(_e4446) > 0.000061f) {
                                        let _e4452 = local_56[_e4433];
                                        let _e4453 = local_55[_e4431];
                                        let _e4454 = max(_e4452, _e4453);
                                        if (_e4454 != 0f) {
                                            phi_4658_ = (min(_e4452, _e4453) / _e4454);
                                        } else {
                                            phi_4658_ = 0f;
                                        }
                                        let _e4459 = phi_4658_;
                                        let _e4461 = (f32(i32(sign(_e4446))) * (1f - _e4459));
                                        let _e4466 = local_56[_e4433];
                                        let _e4467 = local_55[_e4431];
                                        let _e4470 = (_e4433 + select(0i, 1i, (_e4466 < _e4467)));
                                        let _e4472 = local_56[_e4470];
                                        let _e4473 = local_55[_e4431];
                                        phi_4620_ = (_e4431 + select(0i, 1i, (_e4472 >= _e4473)));
                                        phi_4623_ = _e4470;
                                        phi_4625_ = select(_e4435, _e4461, (abs(_e4461) < abs(_e4435)));
                                    } else {
                                        phi_4620_ = _e4431;
                                        phi_4623_ = _e4433;
                                        phi_4625_ = 65504f;
                                    }
                                    let _e4478 = phi_4620_;
                                    let _e4480 = phi_4623_;
                                    let _e4482 = phi_4625_;
                                    local_148 = _e4478;
                                    local_149 = _e4480;
                                    local_150 = _e4482;
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    let _e5960 = local_148;
                                    phi_4619_ = _e5960;
                                    let _e5963 = local_149;
                                    phi_4622_ = _e5963;
                                    let _e5966 = local_150;
                                    phi_4624_ = _e5966;
                                    phi_4626_ = (_e4437 + 1i);
                                }
                            }
                            let _e5975 = local_151;
                            phi_4676_ = _e5975;
                        }
                        let _e4485 = phi_4676_;
                        phi_4680_ = (_e4485 * select(0f, 1f, (_e4485 < 65503f)));
                    }
                    let _e4490 = phi_4680_;
                    let _e4495 = vec4<f32>(_e4490, vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    if (_e4490 != 0f) {
                        phi_4689_ = f32(i32(sign(_e4490)));
                    } else {
                        phi_4689_ = 0f;
                    }
                    let _e4501 = phi_4689_;
                    let _e4506 = vec4<f32>(_e4495.x, _e4501, _e4495.z, _e4495.w);
                    let _e4514 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e3901 + vec2<u32>(1u, 0u)))));
                    let _e4521 = vec2<i32>(max(0i, min(_e4514.x, _e191)), max(0i, min(_e4514.y, _e196)));
                    let _e4523 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(_e4521), 0u);
                    let _e4527 = ((vec2<f32>(_e4521) + vec2<f32>(0.5f, 0.5f)) / _e205);
                    phi_4714_ = 0i;
                    loop {
                        let _e4533 = phi_4714_;
                        if (_e4533 < 5i) {
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e4536 = iSampleOffsets[_e4533];
                            let _e4537 = (vec2<i32>(floor(((_e4527 + _e209) * _e205))) + _e4536);
                            let _e4546 = textureLoad(r_current_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e4537.x, _e191)), max(0i, min(_e4537.y, _e196)))), 0u);
                            let _e4548 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                            local_60[_e4533] = (_e4546.x * select(_e4548.x, 1f, (_e4548.x == 0f)));
                            let _e4554 = local_60[_e4533];
                            local_60[_e4533] = pow(_e4554, 1f);
                            let _e4556 = local_60[_e4533];
                            local_60[_e4533] = max(_e4556, 0.000061f);
                            phi_4714_ = (_e4533 + 1i);
                        }
                    }
                    let _e4559 = local_60;
                    let _e4561 = ((_e4527 + _e247) + _e4523.xy);
                    phi_4752_ = false;
                    if (_e4561.x >= 0f) {
                        phi_4752_ = (_e4561.x <= 1f);
                    }
                    let _e4566 = phi_4752_;
                    phi_4761_ = false;
                    if _e4566 {
                        phi_4760_ = false;
                        if (_e4561.y >= 0f) {
                            phi_4760_ = (_e4561.y <= 1f);
                        }
                        let _e4571 = phi_4760_;
                        phi_4761_ = _e4571;
                    }
                    let _e4573 = phi_4761_;
                    if _e4573 {
                        phi_4768_ = 0i;
                        loop {
                            let _e4578 = phi_4768_;
                            if (_e4578 < 5i) {
                                continue;
                            } else {
                                break;
                            }
                            continuing {
                                let _e4581 = iSampleOffsets[_e4578];
                                let _e4582 = (vec2<i32>(floor((_e4561 * _e246))) + _e4581);
                                let _e4595 = textureLoad(r_previous_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e4582.x, (_e245.x - 1i))), max(0i, min(_e4582.y, (_e245.y - 1i))))), 0u);
                                let _e4598 = cbFSR3Upscaler.fDeltaPreExposure;
                                let _e4600 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                                local_14[_e4578] = ((_e4595.x * _e4598) * select(_e4600.x, 1f, (_e4600.x == 0f)));
                                let _e4606 = local_14[_e4578];
                                local_14[_e4578] = pow(_e4606, 1f);
                                let _e4608 = local_14[_e4578];
                                local_14[_e4578] = max(_e4608, 0.000061f);
                                phi_4768_ = (_e4578 + 1i);
                            }
                        }
                    }
                    let _e4611 = local_14;
                    phi_4994_ = 0f;
                    if _e4573 {
                        local_59 = _e4559;
                        local_58 = _e4611;
                        let _e4613 = local_59[0i];
                        let _e4615 = local_59[3i];
                        let _e4617 = local_59[0i];
                        let _e4618 = local_59[3i];
                        local_59[3i] = max(_e4617, _e4618);
                        local_59[0i] = min(_e4613, _e4615);
                        let _e4621 = local_59[1i];
                        let _e4623 = local_59[4i];
                        let _e4625 = local_59[1i];
                        let _e4626 = local_59[4i];
                        local_59[4i] = max(_e4625, _e4626);
                        local_59[1i] = min(_e4621, _e4623);
                        let _e4628 = local_59[0i];
                        let _e4630 = local_59[2i];
                        let _e4632 = local_59[0i];
                        let _e4633 = local_59[2i];
                        local_59[2i] = max(_e4632, _e4633);
                        local_59[0i] = min(_e4628, _e4630);
                        let _e4635 = local_59[1i];
                        let _e4636 = local_59[3i];
                        let _e4638 = local_59[1i];
                        let _e4639 = local_59[3i];
                        local_59[3i] = max(_e4638, _e4639);
                        local_59[1i] = min(_e4635, _e4636);
                        let _e4641 = local_59[0i];
                        let _e4642 = local_59[1i];
                        let _e4644 = local_59[0i];
                        let _e4645 = local_59[1i];
                        local_59[1i] = max(_e4644, _e4645);
                        local_59[0i] = min(_e4641, _e4642);
                        let _e4647 = local_59[2i];
                        let _e4648 = local_59[4i];
                        let _e4650 = local_59[2i];
                        let _e4651 = local_59[4i];
                        local_59[4i] = max(_e4650, _e4651);
                        local_59[2i] = min(_e4647, _e4648);
                        let _e4653 = local_59[1i];
                        let _e4654 = local_59[2i];
                        let _e4656 = local_59[1i];
                        let _e4657 = local_59[2i];
                        local_59[2i] = max(_e4656, _e4657);
                        local_59[1i] = min(_e4653, _e4654);
                        let _e4659 = local_59[3i];
                        let _e4660 = local_59[4i];
                        let _e4662 = local_59[3i];
                        let _e4663 = local_59[4i];
                        local_59[4i] = max(_e4662, _e4663);
                        local_59[3i] = min(_e4659, _e4660);
                        let _e4665 = local_59[2i];
                        let _e4666 = local_59[3i];
                        let _e4668 = local_59[2i];
                        let _e4669 = local_59[3i];
                        local_59[3i] = max(_e4668, _e4669);
                        local_59[2i] = min(_e4665, _e4666);
                        let _e4672 = local_58[0i];
                        let _e4674 = local_58[3i];
                        let _e4676 = local_58[0i];
                        let _e4677 = local_58[3i];
                        local_58[3i] = max(_e4676, _e4677);
                        local_58[0i] = min(_e4672, _e4674);
                        let _e4680 = local_58[1i];
                        let _e4682 = local_58[4i];
                        let _e4684 = local_58[1i];
                        let _e4685 = local_58[4i];
                        local_58[4i] = max(_e4684, _e4685);
                        local_58[1i] = min(_e4680, _e4682);
                        let _e4687 = local_58[0i];
                        let _e4689 = local_58[2i];
                        let _e4691 = local_58[0i];
                        let _e4692 = local_58[2i];
                        local_58[2i] = max(_e4691, _e4692);
                        local_58[0i] = min(_e4687, _e4689);
                        let _e4694 = local_58[1i];
                        let _e4695 = local_58[3i];
                        let _e4697 = local_58[1i];
                        let _e4698 = local_58[3i];
                        local_58[3i] = max(_e4697, _e4698);
                        local_58[1i] = min(_e4694, _e4695);
                        let _e4700 = local_58[0i];
                        let _e4701 = local_58[1i];
                        let _e4703 = local_58[0i];
                        let _e4704 = local_58[1i];
                        local_58[1i] = max(_e4703, _e4704);
                        local_58[0i] = min(_e4700, _e4701);
                        let _e4706 = local_58[2i];
                        let _e4707 = local_58[4i];
                        let _e4709 = local_58[2i];
                        let _e4710 = local_58[4i];
                        local_58[4i] = max(_e4709, _e4710);
                        local_58[2i] = min(_e4706, _e4707);
                        let _e4712 = local_58[1i];
                        let _e4713 = local_58[2i];
                        let _e4715 = local_58[1i];
                        let _e4716 = local_58[2i];
                        local_58[2i] = max(_e4715, _e4716);
                        local_58[1i] = min(_e4712, _e4713);
                        let _e4718 = local_58[3i];
                        let _e4719 = local_58[4i];
                        let _e4721 = local_58[3i];
                        let _e4722 = local_58[4i];
                        local_58[4i] = max(_e4721, _e4722);
                        local_58[3i] = min(_e4718, _e4719);
                        let _e4724 = local_58[2i];
                        let _e4725 = local_58[3i];
                        let _e4727 = local_58[2i];
                        let _e4728 = local_58[3i];
                        local_58[3i] = max(_e4727, _e4728);
                        local_58[2i] = min(_e4724, _e4725);
                        let _e4730 = local_59[4i];
                        let _e4731 = local_58[4i];
                        phi_4990_ = 65503f;
                        if (min(_e4730, _e4731) > 0.000000000000000000000000000000000000011754944f) {
                            phi_4933_ = 0i;
                            phi_4936_ = 0i;
                            phi_4938_ = 65503f;
                            phi_4940_ = 0i;
                            loop {
                                let _e4735 = phi_4933_;
                                let _e4737 = phi_4936_;
                                let _e4739 = phi_4938_;
                                let _e4741 = phi_4940_;
                                local_155 = _e4739;
                                phi_4948_ = false;
                                if (_e4741 < 5i) {
                                    phi_4948_ = (_e4739 < 65504f);
                                }
                                let _e4745 = phi_4948_;
                                if _e4745 {
                                    let _e4747 = local_59[_e4737];
                                    let _e4749 = local_58[_e4735];
                                    let _e4750 = (_e4747 - _e4749);
                                    if (abs(_e4750) > 0.000061f) {
                                        let _e4756 = local_59[_e4737];
                                        let _e4757 = local_58[_e4735];
                                        let _e4758 = max(_e4756, _e4757);
                                        if (_e4758 != 0f) {
                                            phi_4972_ = (min(_e4756, _e4757) / _e4758);
                                        } else {
                                            phi_4972_ = 0f;
                                        }
                                        let _e4763 = phi_4972_;
                                        let _e4765 = (f32(i32(sign(_e4750))) * (1f - _e4763));
                                        let _e4770 = local_59[_e4737];
                                        let _e4771 = local_58[_e4735];
                                        let _e4774 = (_e4737 + select(0i, 1i, (_e4770 < _e4771)));
                                        let _e4776 = local_59[_e4774];
                                        let _e4777 = local_58[_e4735];
                                        phi_4934_ = (_e4735 + select(0i, 1i, (_e4776 >= _e4777)));
                                        phi_4937_ = _e4774;
                                        phi_4939_ = select(_e4739, _e4765, (abs(_e4765) < abs(_e4739)));
                                    } else {
                                        phi_4934_ = _e4735;
                                        phi_4937_ = _e4737;
                                        phi_4939_ = 65504f;
                                    }
                                    let _e4782 = phi_4934_;
                                    let _e4784 = phi_4937_;
                                    let _e4786 = phi_4939_;
                                    local_152 = _e4782;
                                    local_153 = _e4784;
                                    local_154 = _e4786;
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    let _e5985 = local_152;
                                    phi_4933_ = _e5985;
                                    let _e5988 = local_153;
                                    phi_4936_ = _e5988;
                                    let _e5991 = local_154;
                                    phi_4938_ = _e5991;
                                    phi_4940_ = (_e4741 + 1i);
                                }
                            }
                            let _e6000 = local_155;
                            phi_4990_ = _e6000;
                        }
                        let _e4789 = phi_4990_;
                        phi_4994_ = (_e4789 * select(0f, 1f, (_e4789 < 65503f)));
                    }
                    let _e4794 = phi_4994_;
                    let _e4799 = vec4<f32>(_e4794, vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    if (_e4794 != 0f) {
                        phi_5003_ = f32(i32(sign(_e4794)));
                    } else {
                        phi_5003_ = 0f;
                    }
                    let _e4805 = phi_5003_;
                    let _e4810 = vec4<f32>(_e4799.x, _e4805, _e4799.z, _e4799.w);
                    let _e4818 = vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e3901 + vec2<u32>(1u, 1u)))));
                    let _e4825 = vec2<i32>(max(0i, min(_e4818.x, _e191)), max(0i, min(_e4818.y, _e196)));
                    let _e4827 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(_e4825), 0u);
                    let _e4831 = ((vec2<f32>(_e4825) + vec2<f32>(0.5f, 0.5f)) / _e205);
                    phi_5028_ = 0i;
                    loop {
                        let _e4837 = phi_5028_;
                        if (_e4837 < 5i) {
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            let _e4840 = iSampleOffsets[_e4837];
                            let _e4841 = (vec2<i32>(floor(((_e4831 + _e209) * _e205))) + _e4840);
                            let _e4850 = textureLoad(r_current_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e4841.x, _e191)), max(0i, min(_e4841.y, _e196)))), 0u);
                            let _e4852 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                            local_63[_e4837] = (_e4850.x * select(_e4852.x, 1f, (_e4852.x == 0f)));
                            let _e4858 = local_63[_e4837];
                            local_63[_e4837] = pow(_e4858, 1f);
                            let _e4860 = local_63[_e4837];
                            local_63[_e4837] = max(_e4860, 0.000061f);
                            phi_5028_ = (_e4837 + 1i);
                        }
                    }
                    let _e4863 = local_63;
                    let _e4865 = ((_e4831 + _e247) + _e4827.xy);
                    phi_5066_ = false;
                    if (_e4865.x >= 0f) {
                        phi_5066_ = (_e4865.x <= 1f);
                    }
                    let _e4870 = phi_5066_;
                    phi_5075_ = false;
                    if _e4870 {
                        phi_5074_ = false;
                        if (_e4865.y >= 0f) {
                            phi_5074_ = (_e4865.y <= 1f);
                        }
                        let _e4875 = phi_5074_;
                        phi_5075_ = _e4875;
                    }
                    let _e4877 = phi_5075_;
                    if _e4877 {
                        phi_5082_ = 0i;
                        loop {
                            let _e4882 = phi_5082_;
                            if (_e4882 < 5i) {
                                continue;
                            } else {
                                break;
                            }
                            continuing {
                                let _e4885 = iSampleOffsets[_e4882];
                                let _e4886 = (vec2<i32>(floor((_e4865 * _e246))) + _e4885);
                                let _e4899 = textureLoad(r_previous_luma, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e4886.x, (_e245.x - 1i))), max(0i, min(_e4886.y, (_e245.y - 1i))))), 0u);
                                let _e4902 = cbFSR3Upscaler.fDeltaPreExposure;
                                let _e4904 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
                                local_15[_e4882] = ((_e4899.x * _e4902) * select(_e4904.x, 1f, (_e4904.x == 0f)));
                                let _e4910 = local_15[_e4882];
                                local_15[_e4882] = pow(_e4910, 1f);
                                let _e4912 = local_15[_e4882];
                                local_15[_e4882] = max(_e4912, 0.000061f);
                                phi_5082_ = (_e4882 + 1i);
                            }
                        }
                    }
                    let _e4915 = local_15;
                    phi_5308_ = 0f;
                    if _e4877 {
                        local_62 = _e4863;
                        local_61 = _e4915;
                        let _e4917 = local_62[0i];
                        let _e4919 = local_62[3i];
                        let _e4921 = local_62[0i];
                        let _e4922 = local_62[3i];
                        local_62[3i] = max(_e4921, _e4922);
                        local_62[0i] = min(_e4917, _e4919);
                        let _e4925 = local_62[1i];
                        let _e4927 = local_62[4i];
                        let _e4929 = local_62[1i];
                        let _e4930 = local_62[4i];
                        local_62[4i] = max(_e4929, _e4930);
                        local_62[1i] = min(_e4925, _e4927);
                        let _e4932 = local_62[0i];
                        let _e4934 = local_62[2i];
                        let _e4936 = local_62[0i];
                        let _e4937 = local_62[2i];
                        local_62[2i] = max(_e4936, _e4937);
                        local_62[0i] = min(_e4932, _e4934);
                        let _e4939 = local_62[1i];
                        let _e4940 = local_62[3i];
                        let _e4942 = local_62[1i];
                        let _e4943 = local_62[3i];
                        local_62[3i] = max(_e4942, _e4943);
                        local_62[1i] = min(_e4939, _e4940);
                        let _e4945 = local_62[0i];
                        let _e4946 = local_62[1i];
                        let _e4948 = local_62[0i];
                        let _e4949 = local_62[1i];
                        local_62[1i] = max(_e4948, _e4949);
                        local_62[0i] = min(_e4945, _e4946);
                        let _e4951 = local_62[2i];
                        let _e4952 = local_62[4i];
                        let _e4954 = local_62[2i];
                        let _e4955 = local_62[4i];
                        local_62[4i] = max(_e4954, _e4955);
                        local_62[2i] = min(_e4951, _e4952);
                        let _e4957 = local_62[1i];
                        let _e4958 = local_62[2i];
                        let _e4960 = local_62[1i];
                        let _e4961 = local_62[2i];
                        local_62[2i] = max(_e4960, _e4961);
                        local_62[1i] = min(_e4957, _e4958);
                        let _e4963 = local_62[3i];
                        let _e4964 = local_62[4i];
                        let _e4966 = local_62[3i];
                        let _e4967 = local_62[4i];
                        local_62[4i] = max(_e4966, _e4967);
                        local_62[3i] = min(_e4963, _e4964);
                        let _e4969 = local_62[2i];
                        let _e4970 = local_62[3i];
                        let _e4972 = local_62[2i];
                        let _e4973 = local_62[3i];
                        local_62[3i] = max(_e4972, _e4973);
                        local_62[2i] = min(_e4969, _e4970);
                        let _e4976 = local_61[0i];
                        let _e4978 = local_61[3i];
                        let _e4980 = local_61[0i];
                        let _e4981 = local_61[3i];
                        local_61[3i] = max(_e4980, _e4981);
                        local_61[0i] = min(_e4976, _e4978);
                        let _e4984 = local_61[1i];
                        let _e4986 = local_61[4i];
                        let _e4988 = local_61[1i];
                        let _e4989 = local_61[4i];
                        local_61[4i] = max(_e4988, _e4989);
                        local_61[1i] = min(_e4984, _e4986);
                        let _e4991 = local_61[0i];
                        let _e4993 = local_61[2i];
                        let _e4995 = local_61[0i];
                        let _e4996 = local_61[2i];
                        local_61[2i] = max(_e4995, _e4996);
                        local_61[0i] = min(_e4991, _e4993);
                        let _e4998 = local_61[1i];
                        let _e4999 = local_61[3i];
                        let _e5001 = local_61[1i];
                        let _e5002 = local_61[3i];
                        local_61[3i] = max(_e5001, _e5002);
                        local_61[1i] = min(_e4998, _e4999);
                        let _e5004 = local_61[0i];
                        let _e5005 = local_61[1i];
                        let _e5007 = local_61[0i];
                        let _e5008 = local_61[1i];
                        local_61[1i] = max(_e5007, _e5008);
                        local_61[0i] = min(_e5004, _e5005);
                        let _e5010 = local_61[2i];
                        let _e5011 = local_61[4i];
                        let _e5013 = local_61[2i];
                        let _e5014 = local_61[4i];
                        local_61[4i] = max(_e5013, _e5014);
                        local_61[2i] = min(_e5010, _e5011);
                        let _e5016 = local_61[1i];
                        let _e5017 = local_61[2i];
                        let _e5019 = local_61[1i];
                        let _e5020 = local_61[2i];
                        local_61[2i] = max(_e5019, _e5020);
                        local_61[1i] = min(_e5016, _e5017);
                        let _e5022 = local_61[3i];
                        let _e5023 = local_61[4i];
                        let _e5025 = local_61[3i];
                        let _e5026 = local_61[4i];
                        local_61[4i] = max(_e5025, _e5026);
                        local_61[3i] = min(_e5022, _e5023);
                        let _e5028 = local_61[2i];
                        let _e5029 = local_61[3i];
                        let _e5031 = local_61[2i];
                        let _e5032 = local_61[3i];
                        local_61[3i] = max(_e5031, _e5032);
                        local_61[2i] = min(_e5028, _e5029);
                        let _e5034 = local_62[4i];
                        let _e5035 = local_61[4i];
                        phi_5304_ = 65503f;
                        if (min(_e5034, _e5035) > 0.000000000000000000000000000000000000011754944f) {
                            phi_5247_ = 0i;
                            phi_5250_ = 0i;
                            phi_5252_ = 65503f;
                            phi_5254_ = 0i;
                            loop {
                                let _e5039 = phi_5247_;
                                let _e5041 = phi_5250_;
                                let _e5043 = phi_5252_;
                                let _e5045 = phi_5254_;
                                local_159 = _e5043;
                                phi_5262_ = false;
                                if (_e5045 < 5i) {
                                    phi_5262_ = (_e5043 < 65504f);
                                }
                                let _e5049 = phi_5262_;
                                if _e5049 {
                                    let _e5051 = local_62[_e5041];
                                    let _e5053 = local_61[_e5039];
                                    let _e5054 = (_e5051 - _e5053);
                                    if (abs(_e5054) > 0.000061f) {
                                        let _e5060 = local_62[_e5041];
                                        let _e5061 = local_61[_e5039];
                                        let _e5062 = max(_e5060, _e5061);
                                        if (_e5062 != 0f) {
                                            phi_5286_ = (min(_e5060, _e5061) / _e5062);
                                        } else {
                                            phi_5286_ = 0f;
                                        }
                                        let _e5067 = phi_5286_;
                                        let _e5069 = (f32(i32(sign(_e5054))) * (1f - _e5067));
                                        let _e5074 = local_62[_e5041];
                                        let _e5075 = local_61[_e5039];
                                        let _e5078 = (_e5041 + select(0i, 1i, (_e5074 < _e5075)));
                                        let _e5080 = local_62[_e5078];
                                        let _e5081 = local_61[_e5039];
                                        phi_5248_ = (_e5039 + select(0i, 1i, (_e5080 >= _e5081)));
                                        phi_5251_ = _e5078;
                                        phi_5253_ = select(_e5043, _e5069, (abs(_e5069) < abs(_e5043)));
                                    } else {
                                        phi_5248_ = _e5039;
                                        phi_5251_ = _e5041;
                                        phi_5253_ = 65504f;
                                    }
                                    let _e5086 = phi_5248_;
                                    let _e5088 = phi_5251_;
                                    let _e5090 = phi_5253_;
                                    local_156 = _e5086;
                                    local_157 = _e5088;
                                    local_158 = _e5090;
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    let _e6010 = local_156;
                                    phi_5247_ = _e6010;
                                    let _e6013 = local_157;
                                    phi_5250_ = _e6013;
                                    let _e6016 = local_158;
                                    phi_5252_ = _e6016;
                                    phi_5254_ = (_e5045 + 1i);
                                }
                            }
                            let _e6025 = local_159;
                            phi_5304_ = _e6025;
                        }
                        let _e5093 = phi_5304_;
                        phi_5308_ = (_e5093 * select(0f, 1f, (_e5093 < 65503f)));
                    }
                    let _e5098 = phi_5308_;
                    let _e5103 = vec4<f32>(_e5098, vec4<f32>(0f, 0f, 0f, 0f).y, vec4<f32>(0f, 0f, 0f, 0f).z, vec4<f32>(0f, 0f, 0f, 0f).w);
                    if (_e5098 != 0f) {
                        phi_5317_ = f32(i32(sign(_e5098)));
                    } else {
                        phi_5317_ = 0f;
                    }
                    let _e5109 = phi_5317_;
                    let _e5114 = vec4<f32>(_e5103.x, _e5109, _e5103.z, _e5103.w);
                    local_64[3i] = ((((vec4<f32>(_e4202.x, _e4202.y, 1f, _e4202.w) + vec4<f32>(_e4506.x, _e4506.y, 1f, _e4506.w)) + vec4<f32>(_e4810.x, _e4810.y, 1f, _e4810.w)) + vec4<f32>(_e5114.x, _e5114.y, 1f, _e5114.w)) * 0.25f);
                    let _e5125 = local_64[3i];
                    textureStore(rw_spd_mip0_, bitcast<vec2<u32>>((_e176 + vec2<i32>(_e1430, _e2666))), _e5125.xy.xyyy);
                    if (_e139 <= 1u) {
                        break;
                    }
                    phi_5333_ = 0u;
                    loop {
                        let _e5131 = phi_5333_;
                        if (_e5131 < 4u) {
                            let _e5134 = local_64[_e5131];
                            spdIntermediateR[_e161][_e165] = _e5134.x;
                            spdIntermediateG[_e161][_e165] = _e5134.y;
                            spdIntermediateB[_e161][_e165] = _e5134.z;
                            spdIntermediateA[_e161][_e165] = _e5134.w;
                            workgroupBarrier();
                            if (_e136 < 64u) {
                                let _e5148 = (_e169 + 1u);
                                let _e5149 = (_e171 + 1u);
                                let _e5152 = spdIntermediateR[_e169][_e171];
                                let _e5155 = spdIntermediateG[_e169][_e171];
                                let _e5158 = spdIntermediateB[_e169][_e171];
                                let _e5161 = spdIntermediateA[_e169][_e171];
                                let _e5165 = spdIntermediateR[_e5148][_e171];
                                let _e5168 = spdIntermediateG[_e5148][_e171];
                                let _e5171 = spdIntermediateB[_e5148][_e171];
                                let _e5174 = spdIntermediateA[_e5148][_e171];
                                let _e5178 = spdIntermediateR[_e169][_e5149];
                                let _e5181 = spdIntermediateG[_e169][_e5149];
                                let _e5184 = spdIntermediateB[_e169][_e5149];
                                let _e5187 = spdIntermediateA[_e169][_e5149];
                                let _e5191 = spdIntermediateR[_e5148][_e5149];
                                let _e5194 = spdIntermediateG[_e5148][_e5149];
                                let _e5197 = spdIntermediateB[_e5148][_e5149];
                                let _e5200 = spdIntermediateA[_e5148][_e5149];
                                local_64[_e5131] = ((((vec4<f32>(_e5152, _e5155, _e5158, _e5161) + vec4<f32>(_e5165, _e5168, _e5171, _e5174)) + vec4<f32>(_e5178, _e5181, _e5184, _e5187)) + vec4<f32>(_e5191, _e5194, _e5197, _e5200)) * 0.25f);
                                let _e5218 = local_64[_e5131];
                                textureStore(rw_spd_mip1_, bitcast<vec2<u32>>((bitcast<vec2<i32>>((_e142 * vec2<u32>(16u, 16u))) + vec2<i32>(bitcast<i32>((_e161 + ((_e5131 % 2u) * 8u))), bitcast<i32>((_e165 + ((_e5131 / 2u) * 8u)))))), _e5218.xy.xyyy);
                            }
                            workgroupBarrier();
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            phi_5333_ = (_e5131 + 1u);
                        }
                    }
                    if (_e136 < 64u) {
                        let _e5224 = local_64[0i];
                        spdIntermediateR[_e161][_e165] = _e5224.x;
                        spdIntermediateG[_e161][_e165] = _e5224.y;
                        spdIntermediateB[_e161][_e165] = _e5224.z;
                        spdIntermediateA[_e161][_e165] = _e5224.w;
                        let _e5237 = (_e161 + 8u);
                        let _e5238 = local_64[1i];
                        spdIntermediateR[_e5237][_e165] = _e5238.x;
                        spdIntermediateG[_e5237][_e165] = _e5238.y;
                        spdIntermediateB[_e5237][_e165] = _e5238.z;
                        spdIntermediateA[_e5237][_e165] = _e5238.w;
                        let _e5251 = (_e165 + 8u);
                        let _e5252 = local_64[2i];
                        spdIntermediateR[_e161][_e5251] = _e5252.x;
                        spdIntermediateG[_e161][_e5251] = _e5252.y;
                        spdIntermediateB[_e161][_e5251] = _e5252.z;
                        spdIntermediateA[_e161][_e5251] = _e5252.w;
                        let _e5265 = local_64[3i];
                        spdIntermediateR[_e5237][_e5251] = _e5265.x;
                        spdIntermediateG[_e5237][_e5251] = _e5265.y;
                        spdIntermediateB[_e5237][_e5251] = _e5265.z;
                        spdIntermediateA[_e5237][_e5251] = _e5265.w;
                    }
                    break;
                }
            }
            switch bitcast<i32>(0u) {
                default: {
                    if (_e139 <= 2u) {
                        break;
                    }
                    workgroupBarrier();
                    if (_e136 < 64u) {
                        let _e5282 = local_65;
                        let _e5283 = (_e5282 + 1u);
                        let _e5285 = local_66;
                        let _e5286 = (_e5285 + 1u);
                        let _e5288 = local_67;
                        let _e5291 = local_68;
                        let _e5293 = spdIntermediateR[_e5288][_e5291];
                        let _e5295 = local_69;
                        let _e5298 = local_70;
                        let _e5300 = spdIntermediateG[_e5295][_e5298];
                        let _e5302 = local_71;
                        let _e5305 = local_72;
                        let _e5307 = spdIntermediateB[_e5302][_e5305];
                        let _e5309 = local_73;
                        let _e5312 = local_74;
                        let _e5314 = spdIntermediateA[_e5309][_e5312];
                        let _e5318 = local_75;
                        let _e5320 = spdIntermediateR[_e5283][_e5318];
                        let _e5323 = local_76;
                        let _e5325 = spdIntermediateG[_e5283][_e5323];
                        let _e5328 = local_77;
                        let _e5330 = spdIntermediateB[_e5283][_e5328];
                        let _e5333 = local_78;
                        let _e5335 = spdIntermediateA[_e5283][_e5333];
                        let _e5338 = local_79;
                        let _e5341 = spdIntermediateR[_e5338][_e5286];
                        let _e5343 = local_80;
                        let _e5346 = spdIntermediateG[_e5343][_e5286];
                        let _e5348 = local_81;
                        let _e5351 = spdIntermediateB[_e5348][_e5286];
                        let _e5353 = local_82;
                        let _e5356 = spdIntermediateA[_e5353][_e5286];
                        let _e5360 = spdIntermediateR[_e5283][_e5286];
                        let _e5363 = spdIntermediateG[_e5283][_e5286];
                        let _e5366 = spdIntermediateB[_e5283][_e5286];
                        let _e5369 = spdIntermediateA[_e5283][_e5286];
                        let _e5374 = ((((vec4<f32>(_e5293, _e5300, _e5307, _e5314) + vec4<f32>(_e5320, _e5325, _e5330, _e5335)) + vec4<f32>(_e5341, _e5346, _e5351, _e5356)) + vec4<f32>(_e5360, _e5363, _e5366, _e5369)) * 0.25f);
                        let _e5378 = local_83;
                        textureStore(rw_spd_mip2_, bitcast<vec2<u32>>((bitcast<vec2<i32>>((_e142 * vec2<u32>(8u, 8u))) + _e5378)), _e5374.xy.xyyy);
                        let _e5385 = local_84;
                        let _e5386 = (_e5385 + (_e165 % 2u));
                        let _e5390 = local_85;
                        spdIntermediateR[_e5386][_e5390] = _e5374.x;
                        let _e5395 = local_86;
                        spdIntermediateG[_e5386][_e5395] = _e5374.y;
                        let _e5400 = local_87;
                        spdIntermediateB[_e5386][_e5400] = _e5374.z;
                        let _e5405 = local_88;
                        spdIntermediateA[_e5386][_e5405] = _e5374.w;
                    }
                    if (_e139 <= 3u) {
                        break;
                    }
                    workgroupBarrier();
                    if (_e136 < 16u) {
                        let _e5409 = (_e161 * 4u);
                        let _e5410 = (_e165 * 4u);
                        let _e5411 = (_e5409 + 2u);
                        let _e5412 = (_e5409 + 1u);
                        let _e5413 = (_e5410 + 2u);
                        let _e5414 = (_e5409 + 3u);
                        let _e5417 = spdIntermediateR[_e5409][_e5410];
                        let _e5420 = spdIntermediateG[_e5409][_e5410];
                        let _e5423 = spdIntermediateB[_e5409][_e5410];
                        let _e5426 = spdIntermediateA[_e5409][_e5410];
                        let _e5430 = spdIntermediateR[_e5411][_e5410];
                        let _e5433 = spdIntermediateG[_e5411][_e5410];
                        let _e5436 = spdIntermediateB[_e5411][_e5410];
                        let _e5439 = spdIntermediateA[_e5411][_e5410];
                        let _e5443 = spdIntermediateR[_e5412][_e5413];
                        let _e5446 = spdIntermediateG[_e5412][_e5413];
                        let _e5449 = spdIntermediateB[_e5412][_e5413];
                        let _e5452 = spdIntermediateA[_e5412][_e5413];
                        let _e5456 = spdIntermediateR[_e5414][_e5413];
                        let _e5459 = spdIntermediateG[_e5414][_e5413];
                        let _e5462 = spdIntermediateB[_e5414][_e5413];
                        let _e5465 = spdIntermediateA[_e5414][_e5413];
                        let _e5470 = ((((vec4<f32>(_e5417, _e5420, _e5423, _e5426) + vec4<f32>(_e5430, _e5433, _e5436, _e5439)) + vec4<f32>(_e5443, _e5446, _e5449, _e5452)) + vec4<f32>(_e5456, _e5459, _e5462, _e5465)) * 0.25f);
                        let _e5474 = local_89;
                        textureStore(rw_spd_mip3_, bitcast<vec2<u32>>((bitcast<vec2<i32>>((_e142 * vec2<u32>(4u, 4u))) + _e5474)), _e5470.xy.xyyy);
                        let _e5479 = (_e5409 + _e165);
                        spdIntermediateR[_e5479][_e5410] = _e5470.x;
                        spdIntermediateG[_e5479][_e5410] = _e5470.y;
                        spdIntermediateB[_e5479][_e5410] = _e5470.z;
                        spdIntermediateA[_e5479][_e5410] = _e5470.w;
                    }
                    if (_e139 <= 4u) {
                        break;
                    }
                    workgroupBarrier();
                    if (_e136 < 4u) {
                        let _e5494 = (_e161 * 8u);
                        let _e5496 = local_90;
                        let _e5497 = (_e5494 + _e5496);
                        let _e5498 = (_e165 * 8u);
                        let _e5501 = local_91;
                        let _e5502 = ((_e5494 + 4u) + _e5501);
                        let _e5505 = local_92;
                        let _e5506 = ((_e5494 + 1u) + _e5505);
                        let _e5507 = (_e5498 + 4u);
                        let _e5510 = local_93;
                        let _e5511 = ((_e5494 + 5u) + _e5510);
                        let _e5514 = spdIntermediateR[_e5497][_e5498];
                        let _e5517 = spdIntermediateG[_e5497][_e5498];
                        let _e5520 = spdIntermediateB[_e5497][_e5498];
                        let _e5523 = spdIntermediateA[_e5497][_e5498];
                        let _e5527 = spdIntermediateR[_e5502][_e5498];
                        let _e5530 = spdIntermediateG[_e5502][_e5498];
                        let _e5533 = spdIntermediateB[_e5502][_e5498];
                        let _e5536 = spdIntermediateA[_e5502][_e5498];
                        let _e5540 = spdIntermediateR[_e5506][_e5507];
                        let _e5543 = spdIntermediateG[_e5506][_e5507];
                        let _e5546 = spdIntermediateB[_e5506][_e5507];
                        let _e5549 = spdIntermediateA[_e5506][_e5507];
                        let _e5553 = spdIntermediateR[_e5511][_e5507];
                        let _e5556 = spdIntermediateG[_e5511][_e5507];
                        let _e5559 = spdIntermediateB[_e5511][_e5507];
                        let _e5562 = spdIntermediateA[_e5511][_e5507];
                        let _e5567 = ((((vec4<f32>(_e5514, _e5517, _e5520, _e5523) + vec4<f32>(_e5527, _e5530, _e5533, _e5536)) + vec4<f32>(_e5540, _e5543, _e5546, _e5549)) + vec4<f32>(_e5553, _e5556, _e5559, _e5562)) * 0.25f);
                        let _e5571 = local_94;
                        textureStore(rw_spd_mip4_, bitcast<vec2<u32>>((bitcast<vec2<i32>>((_e142 * vec2<u32>(2u, 2u))) + _e5571)), _e5567.xy.xyyy);
                        let _e5577 = local_95;
                        let _e5578 = (_e161 + _e5577);
                        spdIntermediateR[_e5578][0u] = _e5567.x;
                        spdIntermediateG[_e5578][0u] = _e5567.y;
                        spdIntermediateB[_e5578][0u] = _e5567.z;
                        spdIntermediateA[_e5578][0u] = _e5567.w;
                    }
                    if (_e139 <= 5u) {
                        break;
                    }
                    workgroupBarrier();
                    if (_e136 < 1u) {
                        let _e5595 = spdIntermediateR[0u][0u];
                        let _e5598 = spdIntermediateG[0u][0u];
                        let _e5602 = spdIntermediateR[1u][0u];
                        let _e5605 = spdIntermediateG[1u][0u];
                        let _e5609 = spdIntermediateR[2u][0u];
                        let _e5612 = spdIntermediateG[2u][0u];
                        let _e5616 = spdIntermediateR[3u][0u];
                        let _e5619 = spdIntermediateG[3u][0u];
                        textureStore(rw_spd_mip5_, _e142, ((((vec4<f32>(_e5595, _e5598, f32(), f32()) + vec4<f32>(_e5602, _e5605, f32(), f32())) + vec4<f32>(_e5609, _e5612, f32(), f32())) + vec4<f32>(_e5616, _e5619, f32(), f32())) * 0.25f).xy.xyyy);
                    }
                    break;
                }
            }
            if (_e139 <= 6u) {
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
