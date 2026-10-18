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
@group(0) @binding(33) 
var rw_upscaled_output: texture_storage_2d<rgba16float,write>;
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
    var phi_160_: bool;
    var phi_168_: bool;
    var phi_169_: bool;
    var phi_203_: bool;
    var phi_224_: bool;
    var phi_442_: f32;
    var phi_458_: f32;
    var phi_474_: f32;
    var phi_490_: f32;
    var phi_513_: f32;
    var phi_524_: f32;
    var phi_535_: f32;
    var phi_546_: f32;
    var phi_569_: f32;
    var phi_580_: f32;
    var phi_591_: f32;
    var phi_602_: f32;
    var phi_625_: f32;
    var phi_636_: f32;
    var phi_647_: f32;
    var phi_658_: f32;
    var phi_687_: f32;
    var phi_703_: f32;
    var phi_719_: f32;
    var phi_735_: f32;
    var phi_780_: vec3<f32>;
    var phi_781_: f32;
    var phi_817_: bool;
    var phi_825_: bool;
    var phi_826_: bool;
    var phi_1186_: i32;
    var phi_1265_: f32;
    var phi_1266_: vec3<f32>;
    var phi_1301_: f32;
    var phi_1302_: vec3<f32>;
    var phi_1342_: f32;
    var phi_1343_: vec3<f32>;
    var phi_1383_: f32;
    var phi_1384_: vec3<f32>;
    var phi_1424_: f32;
    var phi_1425_: vec3<f32>;
    var phi_1465_: f32;
    var phi_1466_: vec3<f32>;
    var phi_1506_: f32;
    var phi_1507_: vec3<f32>;
    var phi_1547_: f32;
    var phi_1548_: vec3<f32>;
    var phi_1588_: f32;
    var phi_1589_: vec3<f32>;
    var phi_1622_: vec3<f32>;
    var phi_1623_: f32;
    var phi_1655_: vec3<f32>;
    var phi_1689_: vec3<f32>;

    let _e88 = global;
    let _e89 = _e88.xy;
    let _e91 = (vec2<f32>(_e89) + vec2<f32>(0.5f, 0.5f));
    let _e93 = cbFSR3Upscaler.iUpscaleSize;
    let _e95 = (_e91 / vec2<f32>(_e93));
    let _e97 = cbFSR3Upscaler.fJitter;
    let _e99 = cbFSR3Upscaler.iRenderSize;
    let _e100 = vec2<f32>(_e99);
    let _e102 = (_e95 + (_e97 / _e100));
    let _e104 = cbFSR3Upscaler.iMaxRenderSize;
    let _e106 = (_e100 - vec2<f32>(0.5f, 0.5f));
    let _e109 = vec2<f32>(_e104);
    let _e111 = (_e95 * _e100);
    let _e114 = textureLoad(r_dilated_motion_vectors, bitcast<vec2<u32>>(vec2<i32>(_e111)), 0u);
    let _e115 = _e114.xy;
    let _e117 = length((_e115 * vec2<f32>(3840f, 2160f)));
    let _e118 = (_e95 + _e115);
    phi_160_ = false;
    if (_e118.x >= 0f) {
        phi_160_ = (_e118.x <= 1f);
    }
    let _e123 = phi_160_;
    phi_169_ = false;
    if _e123 {
        phi_168_ = false;
        if (_e118.y >= 0f) {
            phi_168_ = (_e118.y <= 1f);
        }
        let _e128 = phi_168_;
        phi_169_ = _e128;
    }
    let _e130 = phi_169_;
    let _e134 = textureSampleLevel(r_luma_instability, s_LinearClamp, (max(vec2<f32>(0.5f, 0.5f), min(_e111, _e106)) / _e109), 0f);
    let _e137 = textureDimensions(r_farthest_depth_mip1_, 0i);
    let _e143 = vec2<f32>((_e99 / vec2<i32>(2i, 2i)));
    let _e150 = textureSampleLevel(r_farthest_depth_mip1_, s_LinearClamp, (max(vec2<f32>(0.5f, 0.5f), min((_e102 * _e143), (_e143 - vec2<f32>(0.5f, 0.5f)))) / vec2<f32>(vec2<i32>(bitcast<i32>(_e137.x), bitcast<i32>(_e137.y)))), 0f);
    phi_203_ = true;
    if _e130 {
        let _e153 = cbFSR3Upscaler.fFrameIndex;
        phi_203_ = (0f == _e153);
    }
    let _e156 = phi_203_;
    let _e157 = textureSampleLevel(r_dilated_reactive_masks, s_LinearClamp, (max(vec2<f32>(0.5f, 0.5f), min((_e102 * _e100), _e106)) / _e109), 0f);
    let _e159 = clamp(_e157.x, 0f, 1f);
    let _e161 = clamp(_e157.y, 0f, 1f);
    let _e163 = clamp(_e157.z, 0f, 1f);
    let _e165 = clamp(_e157.w, 0f, 1f);
    let _e170 = (_e165 * select(0f, 1f, (round((_e165 * 100f)) > 1f)));
    phi_224_ = false;
    if _e130 {
        phi_224_ = !(_e156);
    }
    let _e173 = phi_224_;
    phi_780_ = vec3<f32>(0f, 0f, 0f);
    phi_781_ = 0f;
    if _e173 {
        let _e175 = cbFSR3Upscaler.iPreviousFrameUpscaleSize;
        let _e178 = ((_e118 * vec2<f32>(_e175)) - vec2<f32>(0.5f, 0.5f));
        let _e180 = (_e178 - floor(_e178));
        let _e195 = vec2<i32>(floor(vec2<f32>(max(0f, min(f32((_e175.x - 1i)), _e178.x)), max(0f, min(f32((_e175.y - 1i)), _e178.y)))));
        let _e196 = (_e195 + vec2<i32>(-1i, -1i));
        let _e198 = (_e175.x - 2i);
        let _e202 = (_e175.y - 2i);
        let _e207 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e196.x, _e198)), max(1i, min(_e196.y, _e202)))), 0u);
        let _e208 = (_e195 + vec2<i32>(0i, -1i));
        let _e217 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e208.x, _e198)), max(1i, min(_e208.y, _e202)))), 0u);
        let _e218 = (_e195 + vec2<i32>(1i, -1i));
        let _e227 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e218.x, _e198)), max(1i, min(_e218.y, _e202)))), 0u);
        let _e228 = (_e195 + vec2<i32>(2i, -1i));
        let _e237 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e228.x, _e198)), max(1i, min(_e228.y, _e202)))), 0u);
        let _e238 = (_e195 + vec2<i32>(-1i, 0i));
        let _e247 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e238.x, _e198)), max(1i, min(_e238.y, _e202)))), 0u);
        let _e256 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e195.x, _e198)), max(1i, min(_e195.y, _e202)))), 0u);
        let _e257 = (_e195 + vec2<i32>(1i, 0i));
        let _e266 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e257.x, _e198)), max(1i, min(_e257.y, _e202)))), 0u);
        let _e267 = (_e195 + vec2<i32>(2i, 0i));
        let _e276 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e267.x, _e198)), max(1i, min(_e267.y, _e202)))), 0u);
        let _e277 = (_e195 + vec2<i32>(-1i, 1i));
        let _e286 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e277.x, _e198)), max(1i, min(_e277.y, _e202)))), 0u);
        let _e287 = (_e195 + vec2<i32>(0i, 1i));
        let _e296 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e287.x, _e198)), max(1i, min(_e287.y, _e202)))), 0u);
        let _e297 = (_e195 + vec2<i32>(1i, 1i));
        let _e306 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e297.x, _e198)), max(1i, min(_e297.y, _e202)))), 0u);
        let _e307 = (_e195 + vec2<i32>(2i, 1i));
        let _e316 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e307.x, _e198)), max(1i, min(_e307.y, _e202)))), 0u);
        let _e317 = (_e195 + vec2<i32>(-1i, 2i));
        let _e326 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e317.x, _e198)), max(1i, min(_e317.y, _e202)))), 0u);
        let _e327 = (_e195 + vec2<i32>(0i, 2i));
        let _e336 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e327.x, _e198)), max(1i, min(_e327.y, _e202)))), 0u);
        let _e337 = (_e195 + vec2<i32>(1i, 2i));
        let _e346 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e337.x, _e198)), max(1i, min(_e337.y, _e202)))), 0u);
        let _e347 = (_e195 + vec2<i32>(2i, 2i));
        let _e356 = textureLoad(r_internal_upscaled_color, bitcast<vec2<u32>>(vec2<i32>(max(1i, min(_e347.x, _e198)), max(1i, min(_e347.y, _e202)))), 0u);
        let _e360 = min(abs((-1f - _e180.x)), 2f);
        let _e362 = (abs(_e360) < 0.000061f);
        if _e362 {
            phi_442_ = 1f;
        } else {
            let _e363 = (3.1415927f * _e360);
            let _e366 = (1.5707964f * _e360);
            phi_442_ = ((sin(_e363) / _e363) * (sin(_e366) / _e366));
        }
        let _e371 = phi_442_;
        let _e374 = min(abs(-(_e180.x)), 2f);
        let _e376 = (abs(_e374) < 0.000061f);
        if _e376 {
            phi_458_ = 1f;
        } else {
            let _e377 = (3.1415927f * _e374);
            let _e380 = (1.5707964f * _e374);
            phi_458_ = ((sin(_e377) / _e377) * (sin(_e380) / _e380));
        }
        let _e385 = phi_458_;
        let _e388 = min(abs((1f - _e180.x)), 2f);
        let _e390 = (abs(_e388) < 0.000061f);
        if _e390 {
            phi_474_ = 1f;
        } else {
            let _e391 = (3.1415927f * _e388);
            let _e394 = (1.5707964f * _e388);
            phi_474_ = ((sin(_e391) / _e391) * (sin(_e394) / _e394));
        }
        let _e399 = phi_474_;
        let _e402 = min(abs((2f - _e180.x)), 2f);
        let _e404 = (abs(_e402) < 0.000061f);
        if _e404 {
            phi_490_ = 1f;
        } else {
            let _e405 = (3.1415927f * _e402);
            let _e408 = (1.5707964f * _e402);
            phi_490_ = ((sin(_e405) / _e405) * (sin(_e408) / _e408));
        }
        let _e413 = phi_490_;
        if _e362 {
            phi_513_ = 1f;
        } else {
            let _e426 = (3.1415927f * _e360);
            let _e429 = (1.5707964f * _e360);
            phi_513_ = ((sin(_e426) / _e426) * (sin(_e429) / _e429));
        }
        let _e434 = phi_513_;
        if _e376 {
            phi_524_ = 1f;
        } else {
            let _e435 = (3.1415927f * _e374);
            let _e438 = (1.5707964f * _e374);
            phi_524_ = ((sin(_e435) / _e435) * (sin(_e438) / _e438));
        }
        let _e443 = phi_524_;
        if _e390 {
            phi_535_ = 1f;
        } else {
            let _e444 = (3.1415927f * _e388);
            let _e447 = (1.5707964f * _e388);
            phi_535_ = ((sin(_e444) / _e444) * (sin(_e447) / _e447));
        }
        let _e452 = phi_535_;
        if _e404 {
            phi_546_ = 1f;
        } else {
            let _e453 = (3.1415927f * _e402);
            let _e456 = (1.5707964f * _e402);
            phi_546_ = ((sin(_e453) / _e453) * (sin(_e456) / _e456));
        }
        let _e461 = phi_546_;
        if _e362 {
            phi_569_ = 1f;
        } else {
            let _e474 = (3.1415927f * _e360);
            let _e477 = (1.5707964f * _e360);
            phi_569_ = ((sin(_e474) / _e474) * (sin(_e477) / _e477));
        }
        let _e482 = phi_569_;
        if _e376 {
            phi_580_ = 1f;
        } else {
            let _e483 = (3.1415927f * _e374);
            let _e486 = (1.5707964f * _e374);
            phi_580_ = ((sin(_e483) / _e483) * (sin(_e486) / _e486));
        }
        let _e491 = phi_580_;
        if _e390 {
            phi_591_ = 1f;
        } else {
            let _e492 = (3.1415927f * _e388);
            let _e495 = (1.5707964f * _e388);
            phi_591_ = ((sin(_e492) / _e492) * (sin(_e495) / _e495));
        }
        let _e500 = phi_591_;
        if _e404 {
            phi_602_ = 1f;
        } else {
            let _e501 = (3.1415927f * _e402);
            let _e504 = (1.5707964f * _e402);
            phi_602_ = ((sin(_e501) / _e501) * (sin(_e504) / _e504));
        }
        let _e509 = phi_602_;
        if _e362 {
            phi_625_ = 1f;
        } else {
            let _e522 = (3.1415927f * _e360);
            let _e525 = (1.5707964f * _e360);
            phi_625_ = ((sin(_e522) / _e522) * (sin(_e525) / _e525));
        }
        let _e530 = phi_625_;
        if _e376 {
            phi_636_ = 1f;
        } else {
            let _e531 = (3.1415927f * _e374);
            let _e534 = (1.5707964f * _e374);
            phi_636_ = ((sin(_e531) / _e531) * (sin(_e534) / _e534));
        }
        let _e539 = phi_636_;
        if _e390 {
            phi_647_ = 1f;
        } else {
            let _e540 = (3.1415927f * _e388);
            let _e543 = (1.5707964f * _e388);
            phi_647_ = ((sin(_e540) / _e540) * (sin(_e543) / _e543));
        }
        let _e548 = phi_647_;
        if _e404 {
            phi_658_ = 1f;
        } else {
            let _e549 = (3.1415927f * _e402);
            let _e552 = (1.5707964f * _e402);
            phi_658_ = ((sin(_e549) / _e549) * (sin(_e552) / _e552));
        }
        let _e557 = phi_658_;
        let _e573 = min(abs((-1f - _e180.y)), 2f);
        if (abs(_e573) < 0.000061f) {
            phi_687_ = 1f;
        } else {
            let _e576 = (3.1415927f * _e573);
            let _e579 = (1.5707964f * _e573);
            phi_687_ = ((sin(_e576) / _e576) * (sin(_e579) / _e579));
        }
        let _e584 = phi_687_;
        let _e587 = min(abs(-(_e180.y)), 2f);
        if (abs(_e587) < 0.000061f) {
            phi_703_ = 1f;
        } else {
            let _e590 = (3.1415927f * _e587);
            let _e593 = (1.5707964f * _e587);
            phi_703_ = ((sin(_e590) / _e590) * (sin(_e593) / _e593));
        }
        let _e598 = phi_703_;
        let _e601 = min(abs((1f - _e180.y)), 2f);
        if (abs(_e601) < 0.000061f) {
            phi_719_ = 1f;
        } else {
            let _e604 = (3.1415927f * _e601);
            let _e607 = (1.5707964f * _e601);
            phi_719_ = ((sin(_e604) / _e604) * (sin(_e607) / _e607));
        }
        let _e612 = phi_719_;
        let _e615 = min(abs((2f - _e180.y)), 2f);
        if (abs(_e615) < 0.000061f) {
            phi_735_ = 1f;
        } else {
            let _e618 = (3.1415927f * _e615);
            let _e621 = (1.5707964f * _e615);
            phi_735_ = ((sin(_e618) / _e618) * (sin(_e621) / _e621));
        }
        let _e626 = phi_735_;
        let _e645 = clamp(((((((((((_e207 * _e371) + (_e217 * _e385)) + (_e227 * _e399)) + (_e237 * _e413)) / vec4((((_e371 + _e385) + _e399) + _e413))) * _e584) + ((((((_e247 * _e434) + (_e256 * _e443)) + (_e266 * _e452)) + (_e276 * _e461)) / vec4((((_e434 + _e443) + _e452) + _e461))) * _e598)) + ((((((_e286 * _e482) + (_e296 * _e491)) + (_e306 * _e500)) + (_e316 * _e509)) / vec4((((_e482 + _e491) + _e500) + _e509))) * _e612)) + ((((((_e326 * _e530) + (_e336 * _e539)) + (_e346 * _e548)) + (_e356 * _e557)) / vec4((((_e530 + _e539) + _e548) + _e557))) * _e626)) / vec4((((_e584 + _e598) + _e612) + _e626))), min(min(min(_e256, _e266), _e296), _e306), max(max(max(_e256, _e266), _e296), _e306));
        let _e648 = cbFSR3Upscaler.fDeltaPreExposure;
        let _e650 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
        let _e654 = ((_e645.xyz * _e648) * select(_e650.x, 1f, (_e650.x == 0f)));
        let _e658 = (0.5f * _e654.y);
        let _e661 = (0.25f * _e654.z);
        phi_780_ = vec3<f32>((((0.25f * _e654.x) + _e658) + _e661), (0.5f * (_e654.x - _e654.z)), (((-0.25f * _e654.x) + _e658) - _e661));
        phi_781_ = _e645.w;
    }
    let _e671 = phi_780_;
    let _e673 = phi_781_;
    let _e679 = max(clamp(_e163, 0f, 1f), max(_e159, _e161));
    let _e682 = max(0f, ((_e673 * select(0f, 1f, !(_e156))) - (_e679 * 2f)));
    let _e686 = bitcast<vec2<u32>>(_e89);
    let _e687 = textureLoad(rw_new_locks, _e686);
    let _e696 = cbFSR3Upscaler.fJitterSequenceLength;
    let _e702 = (_e95 - _e115);
    phi_817_ = false;
    if (_e702.x >= 0f) {
        phi_817_ = (_e702.x <= 1f);
    }
    let _e707 = phi_817_;
    phi_826_ = false;
    if _e707 {
        phi_825_ = false;
        if (_e702.y >= 0f) {
            phi_825_ = (_e702.y <= 1f);
        }
        let _e712 = phi_825_;
        phi_826_ = _e712;
    }
    let _e714 = phi_826_;
    let _e718 = cbFSR3Upscaler.fVelocityFactor;
    let _e724 = min(_e170, mix(_e170, 0.15f, clamp(max(0f, ((_e117 * _e718) * 2f)), 0f, 1f)));
    let _e726 = cbFSR3Upscaler.fDownscaleFactor;
    let _e727 = (_e91 * _e726);
    let _e729 = vec2<i32>(floor(_e727));
    let _e732 = ((vec2<f32>(_e729) + vec2<f32>(0.5f, 0.5f)) - _e97);
    let _e733 = (_e732 - _e727);
    let _e736 = (_e732.x > _e727.x);
    let _e740 = (_e732.y > _e727.y);
    let _e742 = vec2<i32>(select(-1i, -2i, _e736), select(-1i, -2i, _e740));
    let _e743 = vec2<f32>(_e742);
    let _e744 = (_e170 == 0f);
    let _e745 = select(0i, 3i, _e736);
    let _e746 = select(0i, 3i, _e740);
    let _e747 = vec2<i32>(_e745, _e746);
    let _e748 = (_e729 + _e742);
    let _e749 = (_e748 + _e747);
    let _e752 = (_e99.x - 1i);
    let _e757 = (_e99.y - 1i);
    let _e762 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e749.x, _e752)), max(0i, min(_e749.y, _e757)))), 0u);
    let _e765 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e769 = (max(vec3<f32>(0f, 0f, 0f), _e762.xyz) * select(_e765.x, 1f, (_e765.x == 0f)));
    let _e773 = (0.5f * _e769.y);
    let _e776 = (0.25f * _e769.z);
    local[0i] = vec3<f32>((((0.25f * _e769.x) + _e773) + _e776), (0.5f * (_e769.x - _e769.z)), (((-0.25f * _e769.x) + _e773) - _e776));
    let _e785 = select(1i, 2i, _e736);
    let _e786 = vec2<i32>(_e785, _e746);
    let _e787 = (_e748 + _e786);
    let _e796 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e787.x, _e752)), max(0i, min(_e787.y, _e757)))), 0u);
    let _e799 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e803 = (max(vec3<f32>(0f, 0f, 0f), _e796.xyz) * select(_e799.x, 1f, (_e799.x == 0f)));
    let _e807 = (0.5f * _e803.y);
    let _e810 = (0.25f * _e803.z);
    local[1i] = vec3<f32>((((0.25f * _e803.x) + _e807) + _e810), (0.5f * (_e803.x - _e803.z)), (((-0.25f * _e803.x) + _e807) - _e810));
    let _e819 = select(2i, 1i, _e736);
    let _e820 = vec2<i32>(_e819, _e746);
    let _e821 = (_e748 + _e820);
    let _e830 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e821.x, _e752)), max(0i, min(_e821.y, _e757)))), 0u);
    let _e833 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e837 = (max(vec3<f32>(0f, 0f, 0f), _e830.xyz) * select(_e833.x, 1f, (_e833.x == 0f)));
    let _e841 = (0.5f * _e837.y);
    let _e844 = (0.25f * _e837.z);
    local[2i] = vec3<f32>((((0.25f * _e837.x) + _e841) + _e844), (0.5f * (_e837.x - _e837.z)), (((-0.25f * _e837.x) + _e841) - _e844));
    let _e853 = select(1i, 2i, _e740);
    let _e854 = vec2<i32>(_e745, _e853);
    let _e855 = (_e748 + _e854);
    let _e864 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e855.x, _e752)), max(0i, min(_e855.y, _e757)))), 0u);
    let _e867 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e871 = (max(vec3<f32>(0f, 0f, 0f), _e864.xyz) * select(_e867.x, 1f, (_e867.x == 0f)));
    let _e875 = (0.5f * _e871.y);
    let _e878 = (0.25f * _e871.z);
    local[3i] = vec3<f32>((((0.25f * _e871.x) + _e875) + _e878), (0.5f * (_e871.x - _e871.z)), (((-0.25f * _e871.x) + _e875) - _e878));
    let _e887 = vec2<i32>(_e785, _e853);
    let _e888 = (_e748 + _e887);
    let _e897 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e888.x, _e752)), max(0i, min(_e888.y, _e757)))), 0u);
    let _e900 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e904 = (max(vec3<f32>(0f, 0f, 0f), _e897.xyz) * select(_e900.x, 1f, (_e900.x == 0f)));
    let _e908 = (0.5f * _e904.y);
    let _e911 = (0.25f * _e904.z);
    local[4i] = vec3<f32>((((0.25f * _e904.x) + _e908) + _e911), (0.5f * (_e904.x - _e904.z)), (((-0.25f * _e904.x) + _e908) - _e911));
    let _e920 = vec2<i32>(_e819, _e853);
    let _e921 = (_e748 + _e920);
    let _e930 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e921.x, _e752)), max(0i, min(_e921.y, _e757)))), 0u);
    let _e933 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e937 = (max(vec3<f32>(0f, 0f, 0f), _e930.xyz) * select(_e933.x, 1f, (_e933.x == 0f)));
    let _e941 = (0.5f * _e937.y);
    let _e944 = (0.25f * _e937.z);
    local[5i] = vec3<f32>((((0.25f * _e937.x) + _e941) + _e944), (0.5f * (_e937.x - _e937.z)), (((-0.25f * _e937.x) + _e941) - _e944));
    let _e953 = select(2i, 1i, _e740);
    let _e954 = vec2<i32>(_e745, _e953);
    let _e955 = (_e748 + _e954);
    let _e964 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e955.x, _e752)), max(0i, min(_e955.y, _e757)))), 0u);
    let _e967 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e971 = (max(vec3<f32>(0f, 0f, 0f), _e964.xyz) * select(_e967.x, 1f, (_e967.x == 0f)));
    let _e975 = (0.5f * _e971.y);
    let _e978 = (0.25f * _e971.z);
    local[6i] = vec3<f32>((((0.25f * _e971.x) + _e975) + _e978), (0.5f * (_e971.x - _e971.z)), (((-0.25f * _e971.x) + _e975) - _e978));
    let _e987 = vec2<i32>(_e785, _e953);
    let _e988 = (_e748 + _e987);
    let _e997 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e988.x, _e752)), max(0i, min(_e988.y, _e757)))), 0u);
    let _e1000 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e1004 = (max(vec3<f32>(0f, 0f, 0f), _e997.xyz) * select(_e1000.x, 1f, (_e1000.x == 0f)));
    let _e1008 = (0.5f * _e1004.y);
    let _e1011 = (0.25f * _e1004.z);
    local[7i] = vec3<f32>((((0.25f * _e1004.x) + _e1008) + _e1011), (0.5f * (_e1004.x - _e1004.z)), (((-0.25f * _e1004.x) + _e1008) - _e1011));
    let _e1020 = vec2<i32>(_e819, _e953);
    let _e1021 = (_e748 + _e1020);
    let _e1030 = textureLoad(r_input_color_jittered, bitcast<vec2<u32>>(vec2<i32>(max(0i, min(_e1021.x, _e752)), max(0i, min(_e1021.y, _e757)))), 0u);
    let _e1033 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e1037 = (max(vec3<f32>(0f, 0f, 0f), _e1030.xyz) * select(_e1033.x, 1f, (_e1033.x == 0f)));
    let _e1041 = (0.5f * _e1037.y);
    let _e1044 = (0.25f * _e1037.z);
    local[8i] = vec3<f32>((((0.25f * _e1037.x) + _e1041) + _e1044), (0.5f * (_e1037.x - _e1037.z)), (((-0.25f * _e1037.x) + _e1041) - _e1044));
    if _e744 {
        phi_1186_ = 0i;
        loop {
            let _e1054 = phi_1186_;
            if (_e1054 < 9i) {
                continue;
            } else {
                break;
            }
            continuing {
                let _e1057 = local[_e1054];
                let _e1062 = ((_e1057.x + _e1057.y) - _e1057.z);
                let _e1063 = (_e1057.x + _e1057.z);
                let _e1065 = ((_e1057.x - _e1057.y) - _e1057.z);
                let _e1072 = (vec3<f32>(_e1062, _e1063, _e1065) / vec3((max(max(0f, _e1062), max(_e1063, _e1065)) + 1f)));
                let _e1076 = (0.5f * _e1072.y);
                let _e1079 = (0.25f * _e1072.z);
                local[_e1054] = vec3<f32>((((0.25f * _e1072.x) + _e1076) + _e1079), (0.5f * (_e1072.x - _e1072.z)), (((-0.25f * _e1072.x) + _e1076) - _e1079));
                phi_1186_ = (_e1054 + 1i);
            }
        }
    }
    let _e1092 = min(1.99f, (1f + ((vec2<f32>(1f, 1f) / _e726) - vec2<f32>(1f, 1f)).x));
    let _e1103 = mix(max(1f, ((1f + _e1092) * 0.3f)), _e1092, min((1f - (_e161 * 0.5f)), min((1f - _e163), clamp((_e724 * 5f), 0f, 1f))));
    let _e1106 = (_e733 + (_e743 + vec2<f32>(_e747)));
    let _e1108 = bitcast<vec2<u32>>(_e99);
    let _e1111 = select(0f, 1f, all((bitcast<vec2<u32>>(_e749) < _e1108)));
    let _e1112 = !(_e744);
    phi_1265_ = 0f;
    phi_1266_ = vec3<f32>(0f, 0f, 0f);
    if _e1112 {
        let _e1114 = (_e1106 * vec2(_e1103));
        let _e1116 = min(dot(_e1114, _e1114), 4f);
        let _e1118 = ((0.4f * _e1116) - 1f);
        let _e1120 = ((0.25f * _e1116) - 1f);
        let _e1126 = (_e1111 * ((((1.5625f * _e1118) * _e1118) - 0.5625f) * (_e1120 * _e1120)));
        let _e1127 = local[0i];
        phi_1265_ = _e1126;
        phi_1266_ = (_e1127 * _e1126);
    }
    let _e1130 = phi_1265_;
    let _e1132 = phi_1266_;
    let _e1136 = (exp((-2.3f * dot(_e1106, _e1106))) * _e1111);
    let _e1137 = local[0i];
    let _e1138 = (_e1137 * _e1136);
    let _e1142 = (_e733 + (_e743 + vec2<f32>(_e786)));
    let _e1146 = select(0f, 1f, all((bitcast<vec2<u32>>(_e787) < _e1108)));
    phi_1301_ = _e1130;
    phi_1302_ = _e1132;
    if _e1112 {
        let _e1148 = (_e1142 * vec2(_e1103));
        let _e1150 = min(dot(_e1148, _e1148), 4f);
        let _e1152 = ((0.4f * _e1150) - 1f);
        let _e1154 = ((0.25f * _e1150) - 1f);
        let _e1160 = (_e1146 * ((((1.5625f * _e1152) * _e1152) - 0.5625f) * (_e1154 * _e1154)));
        let _e1161 = local[1i];
        phi_1301_ = (_e1130 + _e1160);
        phi_1302_ = (_e1132 + (_e1161 * _e1160));
    }
    let _e1166 = phi_1301_;
    let _e1168 = phi_1302_;
    let _e1172 = (exp((-2.3f * dot(_e1142, _e1142))) * _e1146);
    let _e1173 = local[1i];
    let _e1176 = (_e1173 * _e1172);
    let _e1183 = (_e733 + (_e743 + vec2<f32>(_e820)));
    let _e1187 = select(0f, 1f, all((bitcast<vec2<u32>>(_e821) < _e1108)));
    phi_1342_ = _e1166;
    phi_1343_ = _e1168;
    if _e1112 {
        let _e1189 = (_e1183 * vec2(_e1103));
        let _e1191 = min(dot(_e1189, _e1189), 4f);
        let _e1193 = ((0.4f * _e1191) - 1f);
        let _e1195 = ((0.25f * _e1191) - 1f);
        let _e1201 = (_e1187 * ((((1.5625f * _e1193) * _e1193) - 0.5625f) * (_e1195 * _e1195)));
        let _e1202 = local[2i];
        phi_1342_ = (_e1166 + _e1201);
        phi_1343_ = (_e1168 + (_e1202 * _e1201));
    }
    let _e1207 = phi_1342_;
    let _e1209 = phi_1343_;
    let _e1213 = (exp((-2.3f * dot(_e1183, _e1183))) * _e1187);
    let _e1214 = local[2i];
    let _e1217 = (_e1214 * _e1213);
    let _e1224 = (_e733 + (_e743 + vec2<f32>(_e854)));
    let _e1228 = select(0f, 1f, all((bitcast<vec2<u32>>(_e855) < _e1108)));
    phi_1383_ = _e1207;
    phi_1384_ = _e1209;
    if _e1112 {
        let _e1230 = (_e1224 * vec2(_e1103));
        let _e1232 = min(dot(_e1230, _e1230), 4f);
        let _e1234 = ((0.4f * _e1232) - 1f);
        let _e1236 = ((0.25f * _e1232) - 1f);
        let _e1242 = (_e1228 * ((((1.5625f * _e1234) * _e1234) - 0.5625f) * (_e1236 * _e1236)));
        let _e1243 = local[3i];
        phi_1383_ = (_e1207 + _e1242);
        phi_1384_ = (_e1209 + (_e1243 * _e1242));
    }
    let _e1248 = phi_1383_;
    let _e1250 = phi_1384_;
    let _e1254 = (exp((-2.3f * dot(_e1224, _e1224))) * _e1228);
    let _e1255 = local[3i];
    let _e1258 = (_e1255 * _e1254);
    let _e1265 = (_e733 + (_e743 + vec2<f32>(_e887)));
    let _e1269 = select(0f, 1f, all((bitcast<vec2<u32>>(_e888) < _e1108)));
    phi_1424_ = _e1248;
    phi_1425_ = _e1250;
    if _e1112 {
        let _e1271 = (_e1265 * vec2(_e1103));
        let _e1273 = min(dot(_e1271, _e1271), 4f);
        let _e1275 = ((0.4f * _e1273) - 1f);
        let _e1277 = ((0.25f * _e1273) - 1f);
        let _e1283 = (_e1269 * ((((1.5625f * _e1275) * _e1275) - 0.5625f) * (_e1277 * _e1277)));
        let _e1284 = local[4i];
        phi_1424_ = (_e1248 + _e1283);
        phi_1425_ = (_e1250 + (_e1284 * _e1283));
    }
    let _e1289 = phi_1424_;
    let _e1291 = phi_1425_;
    let _e1295 = (exp((-2.3f * dot(_e1265, _e1265))) * _e1269);
    let _e1296 = local[4i];
    let _e1299 = (_e1296 * _e1295);
    let _e1306 = (_e733 + (_e743 + vec2<f32>(_e920)));
    let _e1310 = select(0f, 1f, all((bitcast<vec2<u32>>(_e921) < _e1108)));
    phi_1465_ = _e1289;
    phi_1466_ = _e1291;
    if _e1112 {
        let _e1312 = (_e1306 * vec2(_e1103));
        let _e1314 = min(dot(_e1312, _e1312), 4f);
        let _e1316 = ((0.4f * _e1314) - 1f);
        let _e1318 = ((0.25f * _e1314) - 1f);
        let _e1324 = (_e1310 * ((((1.5625f * _e1316) * _e1316) - 0.5625f) * (_e1318 * _e1318)));
        let _e1325 = local[5i];
        phi_1465_ = (_e1289 + _e1324);
        phi_1466_ = (_e1291 + (_e1325 * _e1324));
    }
    let _e1330 = phi_1465_;
    let _e1332 = phi_1466_;
    let _e1336 = (exp((-2.3f * dot(_e1306, _e1306))) * _e1310);
    let _e1337 = local[5i];
    let _e1340 = (_e1337 * _e1336);
    let _e1347 = (_e733 + (_e743 + vec2<f32>(_e954)));
    let _e1351 = select(0f, 1f, all((bitcast<vec2<u32>>(_e955) < _e1108)));
    phi_1506_ = _e1330;
    phi_1507_ = _e1332;
    if _e1112 {
        let _e1353 = (_e1347 * vec2(_e1103));
        let _e1355 = min(dot(_e1353, _e1353), 4f);
        let _e1357 = ((0.4f * _e1355) - 1f);
        let _e1359 = ((0.25f * _e1355) - 1f);
        let _e1365 = (_e1351 * ((((1.5625f * _e1357) * _e1357) - 0.5625f) * (_e1359 * _e1359)));
        let _e1366 = local[6i];
        phi_1506_ = (_e1330 + _e1365);
        phi_1507_ = (_e1332 + (_e1366 * _e1365));
    }
    let _e1371 = phi_1506_;
    let _e1373 = phi_1507_;
    let _e1377 = (exp((-2.3f * dot(_e1347, _e1347))) * _e1351);
    let _e1378 = local[6i];
    let _e1381 = (_e1378 * _e1377);
    let _e1388 = (_e733 + (_e743 + vec2<f32>(_e987)));
    let _e1392 = select(0f, 1f, all((bitcast<vec2<u32>>(_e988) < _e1108)));
    phi_1547_ = _e1371;
    phi_1548_ = _e1373;
    if _e1112 {
        let _e1394 = (_e1388 * vec2(_e1103));
        let _e1396 = min(dot(_e1394, _e1394), 4f);
        let _e1398 = ((0.4f * _e1396) - 1f);
        let _e1400 = ((0.25f * _e1396) - 1f);
        let _e1406 = (_e1392 * ((((1.5625f * _e1398) * _e1398) - 0.5625f) * (_e1400 * _e1400)));
        let _e1407 = local[7i];
        phi_1547_ = (_e1371 + _e1406);
        phi_1548_ = (_e1373 + (_e1407 * _e1406));
    }
    let _e1412 = phi_1547_;
    let _e1414 = phi_1548_;
    let _e1418 = (exp((-2.3f * dot(_e1388, _e1388))) * _e1392);
    let _e1419 = local[7i];
    let _e1422 = (_e1419 * _e1418);
    let _e1429 = (_e733 + (_e743 + vec2<f32>(_e1020)));
    let _e1433 = select(0f, 1f, all((bitcast<vec2<u32>>(_e1021) < _e1108)));
    phi_1588_ = _e1412;
    phi_1589_ = _e1414;
    if _e1112 {
        let _e1435 = (_e1429 * vec2(_e1103));
        let _e1437 = min(dot(_e1435, _e1435), 4f);
        let _e1439 = ((0.4f * _e1437) - 1f);
        let _e1441 = ((0.25f * _e1437) - 1f);
        let _e1447 = (_e1433 * ((((1.5625f * _e1439) * _e1439) - 0.5625f) * (_e1441 * _e1441)));
        let _e1448 = local[8i];
        phi_1588_ = (_e1412 + _e1447);
        phi_1589_ = (_e1414 + (_e1448 * _e1447));
    }
    let _e1453 = phi_1588_;
    let _e1455 = phi_1589_;
    let _e1459 = (exp((-2.3f * dot(_e1429, _e1429))) * _e1433);
    let _e1460 = local[8i];
    let _e1463 = (_e1460 * _e1459);
    let _e1467 = ((((((((_e1136 + _e1172) + _e1213) + _e1254) + _e1295) + _e1336) + _e1377) + _e1418) + _e1459);
    let _e1471 = vec3(select(1f, _e1467, (abs(_e1467) > 0.000000000000000000000000000000000000011754944f)));
    let _e1472 = (((((((((_e1138 + _e1176) + _e1217) + _e1258) + _e1299) + _e1340) + _e1381) + _e1422) + _e1463) / _e1471);
    let _e1480 = (_e1453 * select(0f, 1f, (_e1453 > 0.000061f)));
    phi_1622_ = _e1455;
    phi_1623_ = _e1480;
    if (_e1480 > 0.000061f) {
        phi_1622_ = clamp((_e1455 / vec3(_e1480)), min(min(min(min(min(min(min(min(_e1137, _e1173), _e1214), _e1255), _e1296), _e1337), _e1378), _e1419), _e1460), max(max(max(max(max(max(max(max(_e1137, _e1173), _e1214), _e1255), _e1296), _e1337), _e1378), _e1419), _e1460));
        phi_1623_ = (_e1480 * 0.04625f);
    }
    let _e1487 = phi_1622_;
    let _e1489 = phi_1623_;
    phi_1655_ = _e1487;
    if _e744 {
        let _e1494 = ((_e1472.x + _e1472.y) - _e1472.z);
        let _e1495 = (_e1472.x + _e1472.z);
        let _e1497 = ((_e1472.x - _e1472.y) - _e1472.z);
        let _e1504 = (vec3<f32>(_e1494, _e1495, _e1497) / vec3(max(0.000061f, (1f - max(_e1494, max(_e1495, _e1497))))));
        let _e1508 = (0.5f * _e1504.y);
        let _e1511 = (0.25f * _e1504.z);
        phi_1655_ = vec3<f32>((((0.25f * _e1504.x) + _e1508) + _e1511), (0.5f * (_e1504.x - _e1504.z)), (((-0.25f * _e1504.x) + _e1508) - _e1511));
    }
    let _e1520 = phi_1655_;
    let _e1521 = select(_e1489, 1f, _e744);
    let _e1522 = select(_e724, 0f, _e744);
    let _e1536 = ((sqrt(abs((((((((((((_e1137 * _e1138) + (_e1173 * _e1176)) + (_e1214 * _e1217)) + (_e1255 * _e1258)) + (_e1296 * _e1299)) + (_e1337 * _e1340)) + (_e1378 * _e1381)) + (_e1419 * _e1422)) + (_e1460 * _e1463)) / _e1471) - (_e1472 * _e1472)))) * vec3<f32>(1.7f, 1f, 1f)) * mix(3f, 1f, max(clamp((_e117 * 0.05f), 0f, 1f), max(clamp((0.75f - (_e150.x * 0.05f)), 0f, 1f), max((1f - _e170), max(pow(_e159, 0.5f), _e163))))));
    let _e1539 = ((_e671 - _e1472) / max(_e1536, vec3<f32>(0.0000001193f, 0.0000001193f, 0.0000001193f)));
    phi_1689_ = _e671;
    if (length(_e1539) > 1f) {
        phi_1689_ = mix(((normalize(_e1539) * _e1536) + _e1472), _e671, vec3(clamp(((max(_e134.x, clamp(clamp((_e682 - 1f), 0f, 1f), 0f, 1f)) * _e170) * (1f - _e161)), 0f, 1f)));
    }
    let _e1553 = phi_1689_;
    let _e1563 = ((_e1520.x + _e1520.y) - _e1520.z);
    let _e1564 = (_e1520.x + _e1520.z);
    let _e1566 = ((_e1520.x - _e1520.y) - _e1520.z);
    let _e1573 = (vec3<f32>(_e1563, _e1564, _e1566) / vec3((max(max(0f, _e1563), max(_e1564, _e1566)) + 1f)));
    let _e1577 = (0.5f * _e1573.y);
    let _e1580 = (0.25f * _e1573.z);
    let _e1592 = ((_e1553.x + _e1553.y) - _e1553.z);
    let _e1593 = (_e1553.x + _e1553.z);
    let _e1595 = ((_e1553.x - _e1553.y) - _e1553.z);
    let _e1602 = (vec3<f32>(_e1592, _e1593, _e1595) / vec3((max(max(0f, _e1592), max(_e1593, _e1595)) + 1f)));
    let _e1606 = (0.5f * _e1602.y);
    let _e1609 = (0.25f * _e1602.z);
    let _e1620 = mix(vec3<f32>((((0.25f * _e1602.x) + _e1606) + _e1609), (0.5f * (_e1602.x - _e1602.z)), (((-0.25f * _e1602.x) + _e1606) - _e1609)), vec3<f32>((((0.25f * _e1573.x) + _e1577) + _e1580), (0.5f * (_e1573.x - _e1573.z)), (((-0.25f * _e1573.x) + _e1577) - _e1580)), vec3(clamp((_e1521 / max(0.000061f, ((_e1522 * select(0f, 1f, (_e1522 > 0.000061f))) + _e1521))), 0f, 1f)));
    let _e1625 = ((_e1620.x + _e1620.y) - _e1620.z);
    let _e1626 = (_e1620.x + _e1620.z);
    let _e1628 = ((_e1620.x - _e1620.y) - _e1620.z);
    let _e1636 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e1642 = max(((vec3<f32>(_e1625, _e1626, _e1628) / vec3(max(0.000061f, (1f - max(_e1625, max(_e1626, _e1628)))))) / vec3(select(_e1636.x, 1f, (_e1636.x == 0f)))), vec3<f32>(0f, 0f, 0f));
    textureStore(rw_internal_upscaled_color, _e686, vec4<f32>(_e1642.x, _e1642.y, _e1642.z, (max(0f, (max(0f, min((_e682 + (_e687.x * (1f - max(0f, _e159)))), 2f)) - ((0.1f / _e696) * (1f - _e679)))) * select(0f, 1f, _e714))));
    textureStore(rw_upscaled_output, _e686, vec4<f32>(_e1642.x, _e1642.y, _e1642.z, 1f));
    textureStore(rw_new_locks, _e686, vec4((round(0f) * 0.003921569f)));
    return;
}

@compute @workgroup_size(8, 8, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>) {
    global = vec3<i32>(param);
    CS_1();
}
