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
@group(0) @binding(16) 
var r_input_color_jittered: texture_2d<f32>;
@group(0) @binding(11) 
var r_internal_upscaled_color: texture_2d<f32>;
@group(0) @binding(32) 
var rw_internal_upscaled_color: texture_storage_2d<rgba16float,write>;
@group(0) @binding(13) 
var r_farthest_depth_mip1_: texture_2d<f32>;
@group(0) @binding(15) 
var r_luma_instability: texture_2d<f32>;
@group(0) @binding(34) 
var rw_new_locks: texture_storage_2d<r32float,read_write>;
@group(0) @binding(10) 
var r_dilated_motion_vectors: texture_2d<f32>;
@group(0) @binding(8) 
var r_input_exposure: texture_2d<f32>;
@group(0) @binding(9) 
var r_dilated_reactive_masks: texture_2d<f32>;
var<private> global: vec3<i32>;

fn CS_1() {
    var local: array<vec3<f32>, 9>;
    var phi_159_: bool;
    var phi_167_: bool;
    var phi_168_: bool;
    var phi_202_: bool;
    var phi_223_: bool;
    var phi_441_: f32;
    var phi_457_: f32;
    var phi_473_: f32;
    var phi_489_: f32;
    var phi_512_: f32;
    var phi_523_: f32;
    var phi_534_: f32;
    var phi_545_: f32;
    var phi_568_: f32;
    var phi_579_: f32;
    var phi_590_: f32;
    var phi_601_: f32;
    var phi_624_: f32;
    var phi_635_: f32;
    var phi_646_: f32;
    var phi_657_: f32;
    var phi_686_: f32;
    var phi_702_: f32;
    var phi_718_: f32;
    var phi_734_: f32;
    var phi_779_: vec3<f32>;
    var phi_780_: f32;
    var phi_816_: bool;
    var phi_824_: bool;
    var phi_825_: bool;
    var phi_1185_: i32;
    var phi_1264_: f32;
    var phi_1265_: vec3<f32>;
    var phi_1300_: f32;
    var phi_1301_: vec3<f32>;
    var phi_1341_: f32;
    var phi_1342_: vec3<f32>;
    var phi_1382_: f32;
    var phi_1383_: vec3<f32>;
    var phi_1423_: f32;
    var phi_1424_: vec3<f32>;
    var phi_1464_: f32;
    var phi_1465_: vec3<f32>;
    var phi_1505_: f32;
    var phi_1506_: vec3<f32>;
    var phi_1546_: f32;
    var phi_1547_: vec3<f32>;
    var phi_1587_: f32;
    var phi_1588_: vec3<f32>;
    var phi_1621_: vec3<f32>;
    var phi_1622_: f32;
    var phi_1654_: vec3<f32>;
    var phi_1688_: vec3<f32>;

    let _e87 = global;
    let _e88 = _e87.xy;
    let _e90 = (vec2<f32>(_e88) + vec2<f32>(0.5f, 0.5f));
    let _e92 = cbFSR3Upscaler.iUpscaleSize;
    let _e94 = (_e90 / vec2<f32>(_e92));
    let _e96 = cbFSR3Upscaler.fJitter;
    let _e98 = cbFSR3Upscaler.iRenderSize;
    let _e99 = vec2<f32>(_e98);
    let _e101 = (_e94 + (_e96 / _e99));
    let _e103 = cbFSR3Upscaler.iMaxRenderSize;
    let _e105 = (_e99 - vec2<f32>(0.5f, 0.5f));
    let _e108 = vec2<f32>(_e103);
    let _e110 = (_e94 * _e99);
    let _e113 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(vec2<i32>(_e110)), 0u);
    let _e114 = _e113.xy;
    let _e116 = length((_e114 * vec2<f32>(3840f, 2160f)));
    let _e117 = (_e94 + _e114);
    phi_159_ = false;
    if (_e117.x >= 0f) {
        phi_159_ = (_e117.x <= 1f);
    }
    let _e122 = phi_159_;
    phi_168_ = false;
    if _e122 {
        phi_167_ = false;
        if (_e117.y >= 0f) {
            phi_167_ = (_e117.y <= 1f);
        }
        let _e127 = phi_167_;
        phi_168_ = _e127;
    }
    let _e129 = phi_168_;
    let _e133 = textureSampleLevel(r_luma_instability, s_LinearClamp, (max(vec2<f32>(0.5f, 0.5f), min(_e110, _e105)) / _e108), 0f);
    let _e136 = textureDimensions(r_farthest_depth_mip1_, 0i);
    let _e142 = vec2<f32>((_e98 / vec2<i32>(2i, 2i)));
    let _e149 = textureSampleLevel(r_farthest_depth_mip1_, s_LinearClamp, (max(vec2<f32>(0.5f, 0.5f), min((_e101 * _e142), (_e142 - vec2<f32>(0.5f, 0.5f)))) / vec2<f32>(vec2<i32>(bitcast<i32>(_e136.x), bitcast<i32>(_e136.y)))), 0f);
    phi_202_ = true;
    if _e129 {
        let _e152 = cbFSR3Upscaler.fFrameIndex;
        phi_202_ = (0f == _e152);
    }
    let _e155 = phi_202_;
    let _e156 = textureSampleLevel(r_dilated_reactive_masks, s_LinearClamp, (max(vec2<f32>(0.5f, 0.5f), min((_e101 * _e99), _e105)) / _e108), 0f);
    let _e158 = clamp(_e156.x, 0f, 1f);
    let _e160 = clamp(_e156.y, 0f, 1f);
    let _e162 = clamp(_e156.z, 0f, 1f);
    let _e164 = clamp(_e156.w, 0f, 1f);
    let _e169 = (_e164 * select(0f, 1f, (round((_e164 * 100f)) > 1f)));
    phi_223_ = false;
    if _e129 {
        phi_223_ = !(_e155);
    }
    let _e172 = phi_223_;
    phi_779_ = vec3<f32>(0f, 0f, 0f);
    phi_780_ = 0f;
    if _e172 {
        let _e174 = cbFSR3Upscaler.iPreviousFrameUpscaleSize;
        let _e177 = ((_e117 * vec2<f32>(_e174)) - vec2<f32>(0.5f, 0.5f));
        let _e179 = (_e177 - floor(_e177));
        let _e194 = vec2<i32>(floor(vec2<f32>(max(0f, min(f32((_e174.x - 1i)), _e177.x)), max(0f, min(f32((_e174.y - 1i)), _e177.y)))));
        let _e195 = (_e194 + vec2<i32>(-1i, -1i));
        let _e197 = (_e174.x - 2i);
        let _e201 = (_e174.y - 2i);
        let _e206 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e195.x, _e197)), max(1i, min(_e195.y, _e201)))), 0u);
        let _e207 = (_e194 + vec2<i32>(0i, -1i));
        let _e216 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e207.x, _e197)), max(1i, min(_e207.y, _e201)))), 0u);
        let _e217 = (_e194 + vec2<i32>(1i, -1i));
        let _e226 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e217.x, _e197)), max(1i, min(_e217.y, _e201)))), 0u);
        let _e227 = (_e194 + vec2<i32>(2i, -1i));
        let _e236 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e227.x, _e197)), max(1i, min(_e227.y, _e201)))), 0u);
        let _e237 = (_e194 + vec2<i32>(-1i, 0i));
        let _e246 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e237.x, _e197)), max(1i, min(_e237.y, _e201)))), 0u);
        let _e255 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e194.x, _e197)), max(1i, min(_e194.y, _e201)))), 0u);
        let _e256 = (_e194 + vec2<i32>(1i, 0i));
        let _e265 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e256.x, _e197)), max(1i, min(_e256.y, _e201)))), 0u);
        let _e266 = (_e194 + vec2<i32>(2i, 0i));
        let _e275 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e266.x, _e197)), max(1i, min(_e266.y, _e201)))), 0u);
        let _e276 = (_e194 + vec2<i32>(-1i, 1i));
        let _e285 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e276.x, _e197)), max(1i, min(_e276.y, _e201)))), 0u);
        let _e286 = (_e194 + vec2<i32>(0i, 1i));
        let _e295 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e286.x, _e197)), max(1i, min(_e286.y, _e201)))), 0u);
        let _e296 = (_e194 + vec2<i32>(1i, 1i));
        let _e305 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e296.x, _e197)), max(1i, min(_e296.y, _e201)))), 0u);
        let _e306 = (_e194 + vec2<i32>(2i, 1i));
        let _e315 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e306.x, _e197)), max(1i, min(_e306.y, _e201)))), 0u);
        let _e316 = (_e194 + vec2<i32>(-1i, 2i));
        let _e325 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e316.x, _e197)), max(1i, min(_e316.y, _e201)))), 0u);
        let _e326 = (_e194 + vec2<i32>(0i, 2i));
        let _e335 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e326.x, _e197)), max(1i, min(_e326.y, _e201)))), 0u);
        let _e336 = (_e194 + vec2<i32>(1i, 2i));
        let _e345 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e336.x, _e197)), max(1i, min(_e336.y, _e201)))), 0u);
        let _e346 = (_e194 + vec2<i32>(2i, 2i));
        let _e355 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e346.x, _e197)), max(1i, min(_e346.y, _e201)))), 0u);
        let _e359 = min(abs((-1f - _e179.x)), 2f);
        let _e361 = (abs(_e359) < 0.000061f);
        if _e361 {
            phi_441_ = 1f;
        } else {
            let _e362 = (3.1415927f * _e359);
            let _e365 = (1.5707964f * _e359);
            phi_441_ = ((sin(_e362) / _e362) * (sin(_e365) / _e365));
        }
        let _e370 = phi_441_;
        let _e373 = min(abs(-(_e179.x)), 2f);
        let _e375 = (abs(_e373) < 0.000061f);
        if _e375 {
            phi_457_ = 1f;
        } else {
            let _e376 = (3.1415927f * _e373);
            let _e379 = (1.5707964f * _e373);
            phi_457_ = ((sin(_e376) / _e376) * (sin(_e379) / _e379));
        }
        let _e384 = phi_457_;
        let _e387 = min(abs((1f - _e179.x)), 2f);
        let _e389 = (abs(_e387) < 0.000061f);
        if _e389 {
            phi_473_ = 1f;
        } else {
            let _e390 = (3.1415927f * _e387);
            let _e393 = (1.5707964f * _e387);
            phi_473_ = ((sin(_e390) / _e390) * (sin(_e393) / _e393));
        }
        let _e398 = phi_473_;
        let _e401 = min(abs((2f - _e179.x)), 2f);
        let _e403 = (abs(_e401) < 0.000061f);
        if _e403 {
            phi_489_ = 1f;
        } else {
            let _e404 = (3.1415927f * _e401);
            let _e407 = (1.5707964f * _e401);
            phi_489_ = ((sin(_e404) / _e404) * (sin(_e407) / _e407));
        }
        let _e412 = phi_489_;
        if _e361 {
            phi_512_ = 1f;
        } else {
            let _e425 = (3.1415927f * _e359);
            let _e428 = (1.5707964f * _e359);
            phi_512_ = ((sin(_e425) / _e425) * (sin(_e428) / _e428));
        }
        let _e433 = phi_512_;
        if _e375 {
            phi_523_ = 1f;
        } else {
            let _e434 = (3.1415927f * _e373);
            let _e437 = (1.5707964f * _e373);
            phi_523_ = ((sin(_e434) / _e434) * (sin(_e437) / _e437));
        }
        let _e442 = phi_523_;
        if _e389 {
            phi_534_ = 1f;
        } else {
            let _e443 = (3.1415927f * _e387);
            let _e446 = (1.5707964f * _e387);
            phi_534_ = ((sin(_e443) / _e443) * (sin(_e446) / _e446));
        }
        let _e451 = phi_534_;
        if _e403 {
            phi_545_ = 1f;
        } else {
            let _e452 = (3.1415927f * _e401);
            let _e455 = (1.5707964f * _e401);
            phi_545_ = ((sin(_e452) / _e452) * (sin(_e455) / _e455));
        }
        let _e460 = phi_545_;
        if _e361 {
            phi_568_ = 1f;
        } else {
            let _e473 = (3.1415927f * _e359);
            let _e476 = (1.5707964f * _e359);
            phi_568_ = ((sin(_e473) / _e473) * (sin(_e476) / _e476));
        }
        let _e481 = phi_568_;
        if _e375 {
            phi_579_ = 1f;
        } else {
            let _e482 = (3.1415927f * _e373);
            let _e485 = (1.5707964f * _e373);
            phi_579_ = ((sin(_e482) / _e482) * (sin(_e485) / _e485));
        }
        let _e490 = phi_579_;
        if _e389 {
            phi_590_ = 1f;
        } else {
            let _e491 = (3.1415927f * _e387);
            let _e494 = (1.5707964f * _e387);
            phi_590_ = ((sin(_e491) / _e491) * (sin(_e494) / _e494));
        }
        let _e499 = phi_590_;
        if _e403 {
            phi_601_ = 1f;
        } else {
            let _e500 = (3.1415927f * _e401);
            let _e503 = (1.5707964f * _e401);
            phi_601_ = ((sin(_e500) / _e500) * (sin(_e503) / _e503));
        }
        let _e508 = phi_601_;
        if _e361 {
            phi_624_ = 1f;
        } else {
            let _e521 = (3.1415927f * _e359);
            let _e524 = (1.5707964f * _e359);
            phi_624_ = ((sin(_e521) / _e521) * (sin(_e524) / _e524));
        }
        let _e529 = phi_624_;
        if _e375 {
            phi_635_ = 1f;
        } else {
            let _e530 = (3.1415927f * _e373);
            let _e533 = (1.5707964f * _e373);
            phi_635_ = ((sin(_e530) / _e530) * (sin(_e533) / _e533));
        }
        let _e538 = phi_635_;
        if _e389 {
            phi_646_ = 1f;
        } else {
            let _e539 = (3.1415927f * _e387);
            let _e542 = (1.5707964f * _e387);
            phi_646_ = ((sin(_e539) / _e539) * (sin(_e542) / _e542));
        }
        let _e547 = phi_646_;
        if _e403 {
            phi_657_ = 1f;
        } else {
            let _e548 = (3.1415927f * _e401);
            let _e551 = (1.5707964f * _e401);
            phi_657_ = ((sin(_e548) / _e548) * (sin(_e551) / _e551));
        }
        let _e556 = phi_657_;
        let _e572 = min(abs((-1f - _e179.y)), 2f);
        if (abs(_e572) < 0.000061f) {
            phi_686_ = 1f;
        } else {
            let _e575 = (3.1415927f * _e572);
            let _e578 = (1.5707964f * _e572);
            phi_686_ = ((sin(_e575) / _e575) * (sin(_e578) / _e578));
        }
        let _e583 = phi_686_;
        let _e586 = min(abs(-(_e179.y)), 2f);
        if (abs(_e586) < 0.000061f) {
            phi_702_ = 1f;
        } else {
            let _e589 = (3.1415927f * _e586);
            let _e592 = (1.5707964f * _e586);
            phi_702_ = ((sin(_e589) / _e589) * (sin(_e592) / _e592));
        }
        let _e597 = phi_702_;
        let _e600 = min(abs((1f - _e179.y)), 2f);
        if (abs(_e600) < 0.000061f) {
            phi_718_ = 1f;
        } else {
            let _e603 = (3.1415927f * _e600);
            let _e606 = (1.5707964f * _e600);
            phi_718_ = ((sin(_e603) / _e603) * (sin(_e606) / _e606));
        }
        let _e611 = phi_718_;
        let _e614 = min(abs((2f - _e179.y)), 2f);
        if (abs(_e614) < 0.000061f) {
            phi_734_ = 1f;
        } else {
            let _e617 = (3.1415927f * _e614);
            let _e620 = (1.5707964f * _e614);
            phi_734_ = ((sin(_e617) / _e617) * (sin(_e620) / _e620));
        }
        let _e625 = phi_734_;
        let _e644 = clamp(((((((((((_e206 * _e370) + (_e216 * _e384)) + (_e226 * _e398)) + (_e236 * _e412)) / vec4((((_e370 + _e384) + _e398) + _e412))) * _e583) + ((((((_e246 * _e433) + (_e255 * _e442)) + (_e265 * _e451)) + (_e275 * _e460)) / vec4((((_e433 + _e442) + _e451) + _e460))) * _e597)) + ((((((_e285 * _e481) + (_e295 * _e490)) + (_e305 * _e499)) + (_e315 * _e508)) / vec4((((_e481 + _e490) + _e499) + _e508))) * _e611)) + ((((((_e325 * _e529) + (_e335 * _e538)) + (_e345 * _e547)) + (_e355 * _e556)) / vec4((((_e529 + _e538) + _e547) + _e556))) * _e625)) / vec4((((_e583 + _e597) + _e611) + _e625))), min(min(min(_e255, _e265), _e295), _e305), max(max(max(_e255, _e265), _e295), _e305));
        let _e647 = cbFSR3Upscaler.fDeltaPreExposure;
        let _e649 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
        let _e653 = ((_e644.xyz * _e647) * select(_e649.x, 1f, (_e649.x == 0f)));
        let _e657 = (0.5f * _e653.y);
        let _e660 = (0.25f * _e653.z);
        phi_779_ = vec3<f32>((((0.25f * _e653.x) + _e657) + _e660), (0.5f * (_e653.x - _e653.z)), (((-0.25f * _e653.x) + _e657) - _e660));
        phi_780_ = _e644.w;
    }
    let _e670 = phi_779_;
    let _e672 = phi_780_;
    let _e678 = max(clamp(_e162, 0f, 1f), max(_e158, _e160));
    let _e681 = max(0f, ((_e672 * select(0f, 1f, !(_e155))) - (_e678 * 2f)));
    let _e685 = bitcast<vec2<u32>>(_e88);
    let _e686 = textureLoad(rw_new_locks, _e685);
    let _e695 = cbFSR3Upscaler.fJitterSequenceLength;
    let _e701 = (_e94 - _e114);
    phi_816_ = false;
    if (_e701.x >= 0f) {
        phi_816_ = (_e701.x <= 1f);
    }
    let _e706 = phi_816_;
    phi_825_ = false;
    if _e706 {
        phi_824_ = false;
        if (_e701.y >= 0f) {
            phi_824_ = (_e701.y <= 1f);
        }
        let _e711 = phi_824_;
        phi_825_ = _e711;
    }
    let _e713 = phi_825_;
    let _e717 = cbFSR3Upscaler.fVelocityFactor;
    let _e723 = min(_e169, mix(_e169, 0.15f, clamp(max(0f, ((_e116 * _e717) * 2f)), 0f, 1f)));
    let _e725 = cbFSR3Upscaler.fDownscaleFactor;
    let _e726 = (_e90 * _e725);
    let _e728 = vec2<i32>(floor(_e726));
    let _e731 = ((vec2<f32>(_e728) + vec2<f32>(0.5f, 0.5f)) - _e96);
    let _e732 = (_e731 - _e726);
    let _e735 = (_e731.x > _e726.x);
    let _e739 = (_e731.y > _e726.y);
    let _e741 = vec2<i32>(select(-1i, -2i, _e735), select(-1i, -2i, _e739));
    let _e742 = vec2<f32>(_e741);
    let _e743 = (_e169 == 0f);
    let _e744 = select(0i, 3i, _e735);
    let _e745 = select(0i, 3i, _e739);
    let _e746 = vec2<i32>(_e744, _e745);
    let _e747 = (_e728 + _e741);
    let _e748 = (_e747 + _e746);
    let _e751 = (_e98.x - 1i);
    let _e756 = (_e98.y - 1i);
    let _e761 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e748.x, _e751)), max(0i, min(_e748.y, _e756)))), 0u);
    let _e764 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e768 = (max(vec3<f32>(0f, 0f, 0f), _e761.xyz) * select(_e764.x, 1f, (_e764.x == 0f)));
    let _e772 = (0.5f * _e768.y);
    let _e775 = (0.25f * _e768.z);
    local[0i] = vec3<f32>((((0.25f * _e768.x) + _e772) + _e775), (0.5f * (_e768.x - _e768.z)), (((-0.25f * _e768.x) + _e772) - _e775));
    let _e784 = select(1i, 2i, _e735);
    let _e785 = vec2<i32>(_e784, _e745);
    let _e786 = (_e747 + _e785);
    let _e795 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e786.x, _e751)), max(0i, min(_e786.y, _e756)))), 0u);
    let _e798 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e802 = (max(vec3<f32>(0f, 0f, 0f), _e795.xyz) * select(_e798.x, 1f, (_e798.x == 0f)));
    let _e806 = (0.5f * _e802.y);
    let _e809 = (0.25f * _e802.z);
    local[1i] = vec3<f32>((((0.25f * _e802.x) + _e806) + _e809), (0.5f * (_e802.x - _e802.z)), (((-0.25f * _e802.x) + _e806) - _e809));
    let _e818 = select(2i, 1i, _e735);
    let _e819 = vec2<i32>(_e818, _e745);
    let _e820 = (_e747 + _e819);
    let _e829 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e820.x, _e751)), max(0i, min(_e820.y, _e756)))), 0u);
    let _e832 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e836 = (max(vec3<f32>(0f, 0f, 0f), _e829.xyz) * select(_e832.x, 1f, (_e832.x == 0f)));
    let _e840 = (0.5f * _e836.y);
    let _e843 = (0.25f * _e836.z);
    local[2i] = vec3<f32>((((0.25f * _e836.x) + _e840) + _e843), (0.5f * (_e836.x - _e836.z)), (((-0.25f * _e836.x) + _e840) - _e843));
    let _e852 = select(1i, 2i, _e739);
    let _e853 = vec2<i32>(_e744, _e852);
    let _e854 = (_e747 + _e853);
    let _e863 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e854.x, _e751)), max(0i, min(_e854.y, _e756)))), 0u);
    let _e866 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e870 = (max(vec3<f32>(0f, 0f, 0f), _e863.xyz) * select(_e866.x, 1f, (_e866.x == 0f)));
    let _e874 = (0.5f * _e870.y);
    let _e877 = (0.25f * _e870.z);
    local[3i] = vec3<f32>((((0.25f * _e870.x) + _e874) + _e877), (0.5f * (_e870.x - _e870.z)), (((-0.25f * _e870.x) + _e874) - _e877));
    let _e886 = vec2<i32>(_e784, _e852);
    let _e887 = (_e747 + _e886);
    let _e896 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e887.x, _e751)), max(0i, min(_e887.y, _e756)))), 0u);
    let _e899 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e903 = (max(vec3<f32>(0f, 0f, 0f), _e896.xyz) * select(_e899.x, 1f, (_e899.x == 0f)));
    let _e907 = (0.5f * _e903.y);
    let _e910 = (0.25f * _e903.z);
    local[4i] = vec3<f32>((((0.25f * _e903.x) + _e907) + _e910), (0.5f * (_e903.x - _e903.z)), (((-0.25f * _e903.x) + _e907) - _e910));
    let _e919 = vec2<i32>(_e818, _e852);
    let _e920 = (_e747 + _e919);
    let _e929 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e920.x, _e751)), max(0i, min(_e920.y, _e756)))), 0u);
    let _e932 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e936 = (max(vec3<f32>(0f, 0f, 0f), _e929.xyz) * select(_e932.x, 1f, (_e932.x == 0f)));
    let _e940 = (0.5f * _e936.y);
    let _e943 = (0.25f * _e936.z);
    local[5i] = vec3<f32>((((0.25f * _e936.x) + _e940) + _e943), (0.5f * (_e936.x - _e936.z)), (((-0.25f * _e936.x) + _e940) - _e943));
    let _e952 = select(2i, 1i, _e739);
    let _e953 = vec2<i32>(_e744, _e952);
    let _e954 = (_e747 + _e953);
    let _e963 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e954.x, _e751)), max(0i, min(_e954.y, _e756)))), 0u);
    let _e966 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e970 = (max(vec3<f32>(0f, 0f, 0f), _e963.xyz) * select(_e966.x, 1f, (_e966.x == 0f)));
    let _e974 = (0.5f * _e970.y);
    let _e977 = (0.25f * _e970.z);
    local[6i] = vec3<f32>((((0.25f * _e970.x) + _e974) + _e977), (0.5f * (_e970.x - _e970.z)), (((-0.25f * _e970.x) + _e974) - _e977));
    let _e986 = vec2<i32>(_e784, _e952);
    let _e987 = (_e747 + _e986);
    let _e996 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e987.x, _e751)), max(0i, min(_e987.y, _e756)))), 0u);
    let _e999 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e1003 = (max(vec3<f32>(0f, 0f, 0f), _e996.xyz) * select(_e999.x, 1f, (_e999.x == 0f)));
    let _e1007 = (0.5f * _e1003.y);
    let _e1010 = (0.25f * _e1003.z);
    local[7i] = vec3<f32>((((0.25f * _e1003.x) + _e1007) + _e1010), (0.5f * (_e1003.x - _e1003.z)), (((-0.25f * _e1003.x) + _e1007) - _e1010));
    let _e1019 = vec2<i32>(_e818, _e952);
    let _e1020 = (_e747 + _e1019);
    let _e1029 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e1020.x, _e751)), max(0i, min(_e1020.y, _e756)))), 0u);
    let _e1032 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e1036 = (max(vec3<f32>(0f, 0f, 0f), _e1029.xyz) * select(_e1032.x, 1f, (_e1032.x == 0f)));
    let _e1040 = (0.5f * _e1036.y);
    let _e1043 = (0.25f * _e1036.z);
    local[8i] = vec3<f32>((((0.25f * _e1036.x) + _e1040) + _e1043), (0.5f * (_e1036.x - _e1036.z)), (((-0.25f * _e1036.x) + _e1040) - _e1043));
    if _e743 {
        phi_1185_ = 0i;
        loop {
            let _e1053 = phi_1185_;
            if (_e1053 < 9i) {
                continue;
            } else {
                break;
            }
            continuing {
                let _e1056 = local[_e1053];
                let _e1061 = ((_e1056.x + _e1056.y) - _e1056.z);
                let _e1062 = (_e1056.x + _e1056.z);
                let _e1064 = ((_e1056.x - _e1056.y) - _e1056.z);
                let _e1071 = (vec3<f32>(_e1061, _e1062, _e1064) / vec3((max(max(0f, _e1061), max(_e1062, _e1064)) + 1f)));
                let _e1075 = (0.5f * _e1071.y);
                let _e1078 = (0.25f * _e1071.z);
                local[_e1053] = vec3<f32>((((0.25f * _e1071.x) + _e1075) + _e1078), (0.5f * (_e1071.x - _e1071.z)), (((-0.25f * _e1071.x) + _e1075) - _e1078));
                phi_1185_ = (_e1053 + 1i);
            }
        }
    }
    let _e1091 = min(1.99f, (1f + ((vec2<f32>(1f, 1f) / _e725) - vec2<f32>(1f, 1f)).x));
    let _e1102 = mix(max(1f, ((1f + _e1091) * 0.3f)), _e1091, min((1f - (_e160 * 0.5f)), min((1f - _e162), clamp((_e723 * 5f), 0f, 1f))));
    let _e1105 = (_e732 + (_e742 + vec2<f32>(_e746)));
    let _e1107 = bitcast<vec2<u32>>(_e98);
    let _e1110 = select(0f, 1f, all((bitcast<vec2<u32>>(_e748) < _e1107)));
    let _e1111 = !(_e743);
    phi_1264_ = 0f;
    phi_1265_ = vec3<f32>(0f, 0f, 0f);
    if _e1111 {
        let _e1113 = (_e1105 * vec2(_e1102));
        let _e1115 = min(dot(_e1113, _e1113), 4f);
        let _e1117 = ((0.4f * _e1115) - 1f);
        let _e1119 = ((0.25f * _e1115) - 1f);
        let _e1125 = (_e1110 * ((((1.5625f * _e1117) * _e1117) - 0.5625f) * (_e1119 * _e1119)));
        let _e1126 = local[0i];
        phi_1264_ = _e1125;
        phi_1265_ = (_e1126 * _e1125);
    }
    let _e1129 = phi_1264_;
    let _e1131 = phi_1265_;
    let _e1135 = (exp((-2.3f * dot(_e1105, _e1105))) * _e1110);
    let _e1136 = local[0i];
    let _e1137 = (_e1136 * _e1135);
    let _e1141 = (_e732 + (_e742 + vec2<f32>(_e785)));
    let _e1145 = select(0f, 1f, all((bitcast<vec2<u32>>(_e786) < _e1107)));
    phi_1300_ = _e1129;
    phi_1301_ = _e1131;
    if _e1111 {
        let _e1147 = (_e1141 * vec2(_e1102));
        let _e1149 = min(dot(_e1147, _e1147), 4f);
        let _e1151 = ((0.4f * _e1149) - 1f);
        let _e1153 = ((0.25f * _e1149) - 1f);
        let _e1159 = (_e1145 * ((((1.5625f * _e1151) * _e1151) - 0.5625f) * (_e1153 * _e1153)));
        let _e1160 = local[1i];
        phi_1300_ = (_e1129 + _e1159);
        phi_1301_ = (_e1131 + (_e1160 * _e1159));
    }
    let _e1165 = phi_1300_;
    let _e1167 = phi_1301_;
    let _e1171 = (exp((-2.3f * dot(_e1141, _e1141))) * _e1145);
    let _e1172 = local[1i];
    let _e1175 = (_e1172 * _e1171);
    let _e1182 = (_e732 + (_e742 + vec2<f32>(_e819)));
    let _e1186 = select(0f, 1f, all((bitcast<vec2<u32>>(_e820) < _e1107)));
    phi_1341_ = _e1165;
    phi_1342_ = _e1167;
    if _e1111 {
        let _e1188 = (_e1182 * vec2(_e1102));
        let _e1190 = min(dot(_e1188, _e1188), 4f);
        let _e1192 = ((0.4f * _e1190) - 1f);
        let _e1194 = ((0.25f * _e1190) - 1f);
        let _e1200 = (_e1186 * ((((1.5625f * _e1192) * _e1192) - 0.5625f) * (_e1194 * _e1194)));
        let _e1201 = local[2i];
        phi_1341_ = (_e1165 + _e1200);
        phi_1342_ = (_e1167 + (_e1201 * _e1200));
    }
    let _e1206 = phi_1341_;
    let _e1208 = phi_1342_;
    let _e1212 = (exp((-2.3f * dot(_e1182, _e1182))) * _e1186);
    let _e1213 = local[2i];
    let _e1216 = (_e1213 * _e1212);
    let _e1223 = (_e732 + (_e742 + vec2<f32>(_e853)));
    let _e1227 = select(0f, 1f, all((bitcast<vec2<u32>>(_e854) < _e1107)));
    phi_1382_ = _e1206;
    phi_1383_ = _e1208;
    if _e1111 {
        let _e1229 = (_e1223 * vec2(_e1102));
        let _e1231 = min(dot(_e1229, _e1229), 4f);
        let _e1233 = ((0.4f * _e1231) - 1f);
        let _e1235 = ((0.25f * _e1231) - 1f);
        let _e1241 = (_e1227 * ((((1.5625f * _e1233) * _e1233) - 0.5625f) * (_e1235 * _e1235)));
        let _e1242 = local[3i];
        phi_1382_ = (_e1206 + _e1241);
        phi_1383_ = (_e1208 + (_e1242 * _e1241));
    }
    let _e1247 = phi_1382_;
    let _e1249 = phi_1383_;
    let _e1253 = (exp((-2.3f * dot(_e1223, _e1223))) * _e1227);
    let _e1254 = local[3i];
    let _e1257 = (_e1254 * _e1253);
    let _e1264 = (_e732 + (_e742 + vec2<f32>(_e886)));
    let _e1268 = select(0f, 1f, all((bitcast<vec2<u32>>(_e887) < _e1107)));
    phi_1423_ = _e1247;
    phi_1424_ = _e1249;
    if _e1111 {
        let _e1270 = (_e1264 * vec2(_e1102));
        let _e1272 = min(dot(_e1270, _e1270), 4f);
        let _e1274 = ((0.4f * _e1272) - 1f);
        let _e1276 = ((0.25f * _e1272) - 1f);
        let _e1282 = (_e1268 * ((((1.5625f * _e1274) * _e1274) - 0.5625f) * (_e1276 * _e1276)));
        let _e1283 = local[4i];
        phi_1423_ = (_e1247 + _e1282);
        phi_1424_ = (_e1249 + (_e1283 * _e1282));
    }
    let _e1288 = phi_1423_;
    let _e1290 = phi_1424_;
    let _e1294 = (exp((-2.3f * dot(_e1264, _e1264))) * _e1268);
    let _e1295 = local[4i];
    let _e1298 = (_e1295 * _e1294);
    let _e1305 = (_e732 + (_e742 + vec2<f32>(_e919)));
    let _e1309 = select(0f, 1f, all((bitcast<vec2<u32>>(_e920) < _e1107)));
    phi_1464_ = _e1288;
    phi_1465_ = _e1290;
    if _e1111 {
        let _e1311 = (_e1305 * vec2(_e1102));
        let _e1313 = min(dot(_e1311, _e1311), 4f);
        let _e1315 = ((0.4f * _e1313) - 1f);
        let _e1317 = ((0.25f * _e1313) - 1f);
        let _e1323 = (_e1309 * ((((1.5625f * _e1315) * _e1315) - 0.5625f) * (_e1317 * _e1317)));
        let _e1324 = local[5i];
        phi_1464_ = (_e1288 + _e1323);
        phi_1465_ = (_e1290 + (_e1324 * _e1323));
    }
    let _e1329 = phi_1464_;
    let _e1331 = phi_1465_;
    let _e1335 = (exp((-2.3f * dot(_e1305, _e1305))) * _e1309);
    let _e1336 = local[5i];
    let _e1339 = (_e1336 * _e1335);
    let _e1346 = (_e732 + (_e742 + vec2<f32>(_e953)));
    let _e1350 = select(0f, 1f, all((bitcast<vec2<u32>>(_e954) < _e1107)));
    phi_1505_ = _e1329;
    phi_1506_ = _e1331;
    if _e1111 {
        let _e1352 = (_e1346 * vec2(_e1102));
        let _e1354 = min(dot(_e1352, _e1352), 4f);
        let _e1356 = ((0.4f * _e1354) - 1f);
        let _e1358 = ((0.25f * _e1354) - 1f);
        let _e1364 = (_e1350 * ((((1.5625f * _e1356) * _e1356) - 0.5625f) * (_e1358 * _e1358)));
        let _e1365 = local[6i];
        phi_1505_ = (_e1329 + _e1364);
        phi_1506_ = (_e1331 + (_e1365 * _e1364));
    }
    let _e1370 = phi_1505_;
    let _e1372 = phi_1506_;
    let _e1376 = (exp((-2.3f * dot(_e1346, _e1346))) * _e1350);
    let _e1377 = local[6i];
    let _e1380 = (_e1377 * _e1376);
    let _e1387 = (_e732 + (_e742 + vec2<f32>(_e986)));
    let _e1391 = select(0f, 1f, all((bitcast<vec2<u32>>(_e987) < _e1107)));
    phi_1546_ = _e1370;
    phi_1547_ = _e1372;
    if _e1111 {
        let _e1393 = (_e1387 * vec2(_e1102));
        let _e1395 = min(dot(_e1393, _e1393), 4f);
        let _e1397 = ((0.4f * _e1395) - 1f);
        let _e1399 = ((0.25f * _e1395) - 1f);
        let _e1405 = (_e1391 * ((((1.5625f * _e1397) * _e1397) - 0.5625f) * (_e1399 * _e1399)));
        let _e1406 = local[7i];
        phi_1546_ = (_e1370 + _e1405);
        phi_1547_ = (_e1372 + (_e1406 * _e1405));
    }
    let _e1411 = phi_1546_;
    let _e1413 = phi_1547_;
    let _e1417 = (exp((-2.3f * dot(_e1387, _e1387))) * _e1391);
    let _e1418 = local[7i];
    let _e1421 = (_e1418 * _e1417);
    let _e1428 = (_e732 + (_e742 + vec2<f32>(_e1019)));
    let _e1432 = select(0f, 1f, all((bitcast<vec2<u32>>(_e1020) < _e1107)));
    phi_1587_ = _e1411;
    phi_1588_ = _e1413;
    if _e1111 {
        let _e1434 = (_e1428 * vec2(_e1102));
        let _e1436 = min(dot(_e1434, _e1434), 4f);
        let _e1438 = ((0.4f * _e1436) - 1f);
        let _e1440 = ((0.25f * _e1436) - 1f);
        let _e1446 = (_e1432 * ((((1.5625f * _e1438) * _e1438) - 0.5625f) * (_e1440 * _e1440)));
        let _e1447 = local[8i];
        phi_1587_ = (_e1411 + _e1446);
        phi_1588_ = (_e1413 + (_e1447 * _e1446));
    }
    let _e1452 = phi_1587_;
    let _e1454 = phi_1588_;
    let _e1458 = (exp((-2.3f * dot(_e1428, _e1428))) * _e1432);
    let _e1459 = local[8i];
    let _e1462 = (_e1459 * _e1458);
    let _e1466 = ((((((((_e1135 + _e1171) + _e1212) + _e1253) + _e1294) + _e1335) + _e1376) + _e1417) + _e1458);
    let _e1470 = vec3(select(1f, _e1466, (abs(_e1466) > 0.000000000000000000000000000000000000011754944f)));
    let _e1471 = (((((((((_e1137 + _e1175) + _e1216) + _e1257) + _e1298) + _e1339) + _e1380) + _e1421) + _e1462) / _e1470);
    let _e1479 = (_e1452 * select(0f, 1f, (_e1452 > 0.000061f)));
    phi_1621_ = _e1454;
    phi_1622_ = _e1479;
    if (_e1479 > 0.000061f) {
        phi_1621_ = clamp((_e1454 / vec3(_e1479)), min(min(min(min(min(min(min(min(_e1136, _e1172), _e1213), _e1254), _e1295), _e1336), _e1377), _e1418), _e1459), max(max(max(max(max(max(max(max(_e1136, _e1172), _e1213), _e1254), _e1295), _e1336), _e1377), _e1418), _e1459));
        phi_1622_ = (_e1479 * 0.04625f);
    }
    let _e1486 = phi_1621_;
    let _e1488 = phi_1622_;
    phi_1654_ = _e1486;
    if _e743 {
        let _e1493 = ((_e1471.x + _e1471.y) - _e1471.z);
        let _e1494 = (_e1471.x + _e1471.z);
        let _e1496 = ((_e1471.x - _e1471.y) - _e1471.z);
        let _e1503 = (vec3<f32>(_e1493, _e1494, _e1496) / vec3(max(0.000061f, (1f - max(_e1493, max(_e1494, _e1496))))));
        let _e1507 = (0.5f * _e1503.y);
        let _e1510 = (0.25f * _e1503.z);
        phi_1654_ = vec3<f32>((((0.25f * _e1503.x) + _e1507) + _e1510), (0.5f * (_e1503.x - _e1503.z)), (((-0.25f * _e1503.x) + _e1507) - _e1510));
    }
    let _e1519 = phi_1654_;
    let _e1520 = select(_e1488, 1f, _e743);
    let _e1521 = select(_e723, 0f, _e743);
    let _e1535 = ((sqrt(abs((((((((((((_e1136 * _e1137) + (_e1172 * _e1175)) + (_e1213 * _e1216)) + (_e1254 * _e1257)) + (_e1295 * _e1298)) + (_e1336 * _e1339)) + (_e1377 * _e1380)) + (_e1418 * _e1421)) + (_e1459 * _e1462)) / _e1470) - (_e1471 * _e1471)))) * vec3<f32>(1.7f, 1f, 1f)) * mix(3f, 1f, max(clamp((_e116 * 0.05f), 0f, 1f), max(clamp((0.75f - (_e149.x * 0.05f)), 0f, 1f), max((1f - _e169), max(pow(_e158, 0.5f), _e162))))));
    let _e1538 = ((_e670 - _e1471) / max(_e1535, vec3<f32>(0.0000001193f, 0.0000001193f, 0.0000001193f)));
    phi_1688_ = _e670;
    if (length(_e1538) > 1f) {
        phi_1688_ = mix(((normalize(_e1538) * _e1535) + _e1471), _e670, vec3(clamp(((max(_e133.x, clamp(clamp((_e681 - 1f), 0f, 1f), 0f, 1f)) * _e169) * (1f - _e160)), 0f, 1f)));
    }
    let _e1552 = phi_1688_;
    let _e1562 = ((_e1519.x + _e1519.y) - _e1519.z);
    let _e1563 = (_e1519.x + _e1519.z);
    let _e1565 = ((_e1519.x - _e1519.y) - _e1519.z);
    let _e1572 = (vec3<f32>(_e1562, _e1563, _e1565) / vec3((max(max(0f, _e1562), max(_e1563, _e1565)) + 1f)));
    let _e1576 = (0.5f * _e1572.y);
    let _e1579 = (0.25f * _e1572.z);
    let _e1591 = ((_e1552.x + _e1552.y) - _e1552.z);
    let _e1592 = (_e1552.x + _e1552.z);
    let _e1594 = ((_e1552.x - _e1552.y) - _e1552.z);
    let _e1601 = (vec3<f32>(_e1591, _e1592, _e1594) / vec3((max(max(0f, _e1591), max(_e1592, _e1594)) + 1f)));
    let _e1605 = (0.5f * _e1601.y);
    let _e1608 = (0.25f * _e1601.z);
    let _e1619 = mix(vec3<f32>((((0.25f * _e1601.x) + _e1605) + _e1608), (0.5f * (_e1601.x - _e1601.z)), (((-0.25f * _e1601.x) + _e1605) - _e1608)), vec3<f32>((((0.25f * _e1572.x) + _e1576) + _e1579), (0.5f * (_e1572.x - _e1572.z)), (((-0.25f * _e1572.x) + _e1576) - _e1579)), vec3(clamp((_e1520 / max(0.000061f, ((_e1521 * select(0f, 1f, (_e1521 > 0.000061f))) + _e1520))), 0f, 1f)));
    let _e1624 = ((_e1619.x + _e1619.y) - _e1619.z);
    let _e1625 = (_e1619.x + _e1619.z);
    let _e1627 = ((_e1619.x - _e1619.y) - _e1619.z);
    let _e1635 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e1641 = max(((vec3<f32>(_e1624, _e1625, _e1627) / vec3(max(0.000061f, (1f - max(_e1624, max(_e1625, _e1627)))))) / vec3(select(_e1635.x, 1f, (_e1635.x == 0f)))), vec3<f32>(0f, 0f, 0f));
    textureStore(rw_internal_upscaled_color, _e685, vec4<f32>(_e1641.x, _e1641.y, _e1641.z, (max(0f, (max(0f, min((_e681 + (_e686.x * (1f - max(0f, _e158)))), 2f)) - ((0.1f / _e695) * (1f - _e678)))) * select(0f, 1f, _e713))));
    textureStore(rw_new_locks, _e685, vec4((round(0f) * 0.003921569f)));
    return;
}

@compute @workgroup_size(8, 8, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>) {
    global = vec3<i32>(param);
    CS_1();
}
`;
