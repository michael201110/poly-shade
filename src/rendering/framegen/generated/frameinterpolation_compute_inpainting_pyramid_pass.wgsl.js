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

struct type_u002e_cbInpaintingPyramid {
    mips: u32,
    numWorkGroups: u32,
    workGroupOffset: vec2<u32>,
}

@group(0) @binding(0) 
var<uniform> cbFI: type_u002e_cbFI;
@group(0) @binding(1) 
var<uniform> cbInpaintingPyramid: type_u002e_cbInpaintingPyramid;
@group(0) @binding(8) 
var r_output: texture_2d<f32>;
@group(0) @binding(9) 
var r_inpainting_mask: texture_2d<f32>;
@group(0) @binding(33) 
var rw_inpainting_pyramid0_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(34) 
var rw_inpainting_pyramid1_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(35) 
var rw_inpainting_pyramid2_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(36) 
var rw_inpainting_pyramid3_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(37) 
var rw_inpainting_pyramid4_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(38) 
var rw_inpainting_pyramid5_: texture_storage_2d<rgba16float,write>;
var<workgroup> spdIntermediateR: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateG: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateB: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateA: array<array<f32, 16>, 16>;
var<private> global: vec3<u32>;
var<private> global_1: u32;

fn CS_1() {
    var local: array<vec4<f32>, 4>;
    var phi_166_: bool;
    var phi_173_: bool;
    var phi_184_: bool;
    var phi_188_: vec4<f32>;
    var phi_213_: bool;
    var phi_220_: bool;
    var phi_231_: bool;
    var phi_235_: vec4<f32>;
    var phi_260_: bool;
    var phi_267_: bool;
    var phi_278_: bool;
    var phi_282_: vec4<f32>;
    var phi_307_: bool;
    var phi_314_: bool;
    var phi_325_: bool;
    var phi_329_: vec4<f32>;
    var phi_351_: vec4<f32>;
    var phi_391_: bool;
    var phi_398_: bool;
    var phi_409_: bool;
    var phi_413_: vec4<f32>;
    var phi_438_: bool;
    var phi_445_: bool;
    var phi_456_: bool;
    var phi_460_: vec4<f32>;
    var phi_485_: bool;
    var phi_492_: bool;
    var phi_503_: bool;
    var phi_507_: vec4<f32>;
    var phi_532_: bool;
    var phi_539_: bool;
    var phi_550_: bool;
    var phi_554_: vec4<f32>;
    var phi_576_: vec4<f32>;
    var phi_616_: bool;
    var phi_623_: bool;
    var phi_634_: bool;
    var phi_638_: vec4<f32>;
    var phi_663_: bool;
    var phi_670_: bool;
    var phi_681_: bool;
    var phi_685_: vec4<f32>;
    var phi_710_: bool;
    var phi_717_: bool;
    var phi_728_: bool;
    var phi_732_: vec4<f32>;
    var phi_757_: bool;
    var phi_764_: bool;
    var phi_775_: bool;
    var phi_779_: vec4<f32>;
    var phi_801_: vec4<f32>;
    var phi_837_: bool;
    var phi_844_: bool;
    var phi_855_: bool;
    var phi_859_: vec4<f32>;
    var phi_884_: bool;
    var phi_891_: bool;
    var phi_902_: bool;
    var phi_906_: vec4<f32>;
    var phi_931_: bool;
    var phi_938_: bool;
    var phi_949_: bool;
    var phi_953_: vec4<f32>;
    var phi_978_: bool;
    var phi_985_: bool;
    var phi_996_: bool;
    var phi_1000_: vec4<f32>;
    var phi_1022_: vec4<f32>;
    var phi_1031_: u32;
    var phi_1105_: vec4<f32>;
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
    var phi_1225_: vec4<f32>;
    var local_19: vec2<i32>;
    var local_20: u32;
    var local_21: u32;
    var local_22: u32;
    var local_23: u32;
    var local_24: u32;
    var phi_1306_: vec4<f32>;
    var local_25: vec2<i32>;
    var local_26: u32;
    var local_27: u32;
    var local_28: u32;
    var local_29: u32;
    var phi_1390_: vec4<f32>;
    var local_30: vec2<i32>;
    var local_31: u32;
    var phi_1464_: vec4<f32>;

    let _e49 = global;
    let _e50 = global_1;
    let _e55 = cbInpaintingPyramid.mips;
    let _e57 = cbInpaintingPyramid.workGroupOffset;
    let _e58 = (bitcast<vec2<u32>>(bitcast<vec3<i32>>(_e49).xy) + _e57);
    switch bitcast<i32>(0u) {
        default: {
            let _e60 = (_e50 % 64u);
            let _e77 = (((_e60 & 1u) | ((_e60 >> bitcast<u32>(2u)) & 6u)) + (8u * ((_e50 >> bitcast<u32>(6u)) % 2u)));
            let _e81 = ((((_e60 >> bitcast<u32>(1u)) & 3u) | ((_e60 >> bitcast<u32>(3u)) & 4u)) + (8u * (_e50 >> bitcast<u32>(7u))));
            switch bitcast<i32>(0u) {
                default: {
                    let _e84 = bitcast<vec2<i32>>((_e58 * vec2<u32>(64u, 64u)));
                    let _e85 = (_e77 * 2u);
                    let _e86 = bitcast<i32>(_e85);
                    let _e87 = (_e81 * 2u);
                    let _e88 = bitcast<i32>(_e87);
                    let _e90 = (_e84 + vec2<i32>(_e86, _e88));
                    let _e92 = bitcast<vec2<i32>>((_e58 * vec2<u32>(32u, 32u)));
                    let _e93 = bitcast<i32>(_e77);
                    let _e94 = bitcast<i32>(_e81);
                    let _e95 = vec2<i32>(_e93, _e94);
                    let _e97 = bitcast<vec2<u32>>(_e90);
                    let _e98 = (_e97 + vec2<u32>(0u, 1u));
                    let _e99 = (_e97 + vec2<u32>(1u, 0u));
                    let _e100 = (_e97 + vec2<u32>(1u, 1u));
                    let _e101 = textureLoad(r_output, _e97, 0u);
                    let _e102 = textureLoad(r_inpainting_mask, _e97, 0u);
                    let _e109 = cbFI.displaySize;
                    let _e112 = select(0f, 1f, (_e109.x > 0i));
                    let _e113 = (vec4<f32>(_e101.x, _e101.y, _e101.z, _e102.x) * _e112);
                    let _e121 = vec4<f32>(_e113.x, _e113.y, _e113.z, clamp((1f - _e113.w), 0f, 1f));
                    let _e124 = cbFI.interpolationRectBase;
                    phi_166_ = true;
                    local_1 = _e85;
                    local_2 = _e87;
                    local_3 = _e85;
                    local_4 = _e87;
                    local_5 = _e85;
                    local_6 = _e87;
                    local_7 = _e85;
                    local_8 = _e87;
                    local_9 = _e85;
                    local_10 = _e87;
                    local_11 = _e87;
                    local_12 = _e87;
                    local_13 = _e87;
                    local_14 = _e87;
                    local_15 = _e85;
                    local_16 = _e85;
                    local_17 = _e85;
                    local_18 = _e85;
                    local_19 = _e95;
                    local_20 = _e85;
                    local_21 = _e87;
                    local_22 = _e87;
                    local_23 = _e87;
                    local_24 = _e87;
                    local_25 = _e95;
                    local_26 = _e87;
                    local_27 = _e87;
                    local_28 = _e87;
                    local_29 = _e87;
                    local_30 = _e95;
                    local_31 = _e87;
                    if (_e90.x >= _e124.x) {
                        let _e128 = cbFI.interpolationRectSize;
                        phi_166_ = (_e90.x >= (_e128.x + _e124.x));
                    }
                    let _e133 = phi_166_;
                    phi_173_ = true;
                    if !(_e133) {
                        phi_173_ = (_e90.y < _e124.y);
                    }
                    let _e139 = phi_173_;
                    phi_184_ = true;
                    if !(_e139) {
                        let _e143 = cbFI.interpolationRectSize;
                        phi_184_ = (_e90.y >= (_e143.y + _e124.y));
                    }
                    let _e149 = phi_184_;
                    phi_188_ = _e121;
                    if _e149 {
                        phi_188_ = vec4<f32>(_e121.x, _e121.y, _e121.z, 0f);
                    }
                    let _e156 = phi_188_;
                    let _e157 = bitcast<vec2<i32>>(_e98);
                    let _e158 = textureLoad(r_output, _e98, 0u);
                    let _e159 = textureLoad(r_inpainting_mask, _e98, 0u);
                    let _e165 = (vec4<f32>(_e158.x, _e158.y, _e158.z, _e159.x) * _e112);
                    let _e173 = vec4<f32>(_e165.x, _e165.y, _e165.z, clamp((1f - _e165.w), 0f, 1f));
                    phi_213_ = true;
                    if (_e157.x >= _e124.x) {
                        let _e177 = cbFI.interpolationRectSize;
                        phi_213_ = (_e157.x >= (_e177.x + _e124.x));
                    }
                    let _e182 = phi_213_;
                    phi_220_ = true;
                    if !(_e182) {
                        phi_220_ = (_e157.y < _e124.y);
                    }
                    let _e188 = phi_220_;
                    phi_231_ = true;
                    if !(_e188) {
                        let _e192 = cbFI.interpolationRectSize;
                        phi_231_ = (_e157.y >= (_e192.y + _e124.y));
                    }
                    let _e198 = phi_231_;
                    phi_235_ = _e173;
                    if _e198 {
                        phi_235_ = vec4<f32>(_e173.x, _e173.y, _e173.z, 0f);
                    }
                    let _e205 = phi_235_;
                    let _e206 = bitcast<vec2<i32>>(_e99);
                    let _e207 = textureLoad(r_output, _e99, 0u);
                    let _e208 = textureLoad(r_inpainting_mask, _e99, 0u);
                    let _e214 = (vec4<f32>(_e207.x, _e207.y, _e207.z, _e208.x) * _e112);
                    let _e222 = vec4<f32>(_e214.x, _e214.y, _e214.z, clamp((1f - _e214.w), 0f, 1f));
                    phi_260_ = true;
                    if (_e206.x >= _e124.x) {
                        let _e226 = cbFI.interpolationRectSize;
                        phi_260_ = (_e206.x >= (_e226.x + _e124.x));
                    }
                    let _e231 = phi_260_;
                    phi_267_ = true;
                    if !(_e231) {
                        phi_267_ = (_e206.y < _e124.y);
                    }
                    let _e237 = phi_267_;
                    phi_278_ = true;
                    if !(_e237) {
                        let _e241 = cbFI.interpolationRectSize;
                        phi_278_ = (_e206.y >= (_e241.y + _e124.y));
                    }
                    let _e247 = phi_278_;
                    phi_282_ = _e222;
                    if _e247 {
                        phi_282_ = vec4<f32>(_e222.x, _e222.y, _e222.z, 0f);
                    }
                    let _e254 = phi_282_;
                    let _e255 = bitcast<vec2<i32>>(_e100);
                    let _e256 = textureLoad(r_output, _e100, 0u);
                    let _e257 = textureLoad(r_inpainting_mask, _e100, 0u);
                    let _e263 = (vec4<f32>(_e256.x, _e256.y, _e256.z, _e257.x) * _e112);
                    let _e271 = vec4<f32>(_e263.x, _e263.y, _e263.z, clamp((1f - _e263.w), 0f, 1f));
                    phi_307_ = true;
                    if (_e255.x >= _e124.x) {
                        let _e275 = cbFI.interpolationRectSize;
                        phi_307_ = (_e255.x >= (_e275.x + _e124.x));
                    }
                    let _e280 = phi_307_;
                    phi_314_ = true;
                    if !(_e280) {
                        phi_314_ = (_e255.y < _e124.y);
                    }
                    let _e286 = phi_314_;
                    phi_325_ = true;
                    if !(_e286) {
                        let _e290 = cbFI.interpolationRectSize;
                        phi_325_ = (_e255.y >= (_e290.y + _e124.y));
                    }
                    let _e296 = phi_325_;
                    phi_329_ = _e271;
                    if _e296 {
                        phi_329_ = vec4<f32>(_e271.x, _e271.y, _e271.z, 0f);
                    }
                    let _e303 = phi_329_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e311 = (((_e156.w + _e205.w) + _e254.w) + _e303.w);
                            if (_e311 == 0f) {
                                phi_351_ = vec4<f32>(0f, 0f, 0f, 0f);
                                break;
                            }
                            phi_351_ = (((((_e156 * _e156.w) + (_e205 * _e205.w)) + (_e254 * _e254.w)) + (_e303 * _e303.w)) / vec4(_e311));
                            break;
                        }
                    }
                    let _e323 = phi_351_;
                    local[0i] = _e323;
                    let _e325 = local[0i];
                    textureStore(rw_inpainting_pyramid0_, bitcast<vec2<u32>>((_e92 + _e95)), _e325);
                    let _e328 = bitcast<i32>((_e85 + 32u));
                    let _e330 = (_e84 + vec2<i32>(_e328, _e88));
                    let _e332 = bitcast<i32>((_e77 + 16u));
                    let _e335 = bitcast<vec2<u32>>(_e330);
                    let _e336 = (_e335 + vec2<u32>(0u, 1u));
                    let _e337 = (_e335 + vec2<u32>(1u, 0u));
                    let _e338 = (_e335 + vec2<u32>(1u, 1u));
                    let _e339 = textureLoad(r_output, _e335, 0u);
                    let _e340 = textureLoad(r_inpainting_mask, _e335, 0u);
                    let _e346 = (vec4<f32>(_e339.x, _e339.y, _e339.z, _e340.x) * _e112);
                    let _e354 = vec4<f32>(_e346.x, _e346.y, _e346.z, clamp((1f - _e346.w), 0f, 1f));
                    phi_391_ = true;
                    if (_e330.x >= _e124.x) {
                        let _e358 = cbFI.interpolationRectSize;
                        phi_391_ = (_e330.x >= (_e358.x + _e124.x));
                    }
                    let _e363 = phi_391_;
                    phi_398_ = true;
                    if !(_e363) {
                        phi_398_ = (_e330.y < _e124.y);
                    }
                    let _e369 = phi_398_;
                    phi_409_ = true;
                    if !(_e369) {
                        let _e373 = cbFI.interpolationRectSize;
                        phi_409_ = (_e330.y >= (_e373.y + _e124.y));
                    }
                    let _e379 = phi_409_;
                    phi_413_ = _e354;
                    if _e379 {
                        phi_413_ = vec4<f32>(_e354.x, _e354.y, _e354.z, 0f);
                    }
                    let _e386 = phi_413_;
                    let _e387 = bitcast<vec2<i32>>(_e336);
                    let _e388 = textureLoad(r_output, _e336, 0u);
                    let _e389 = textureLoad(r_inpainting_mask, _e336, 0u);
                    let _e395 = (vec4<f32>(_e388.x, _e388.y, _e388.z, _e389.x) * _e112);
                    let _e403 = vec4<f32>(_e395.x, _e395.y, _e395.z, clamp((1f - _e395.w), 0f, 1f));
                    phi_438_ = true;
                    if (_e387.x >= _e124.x) {
                        let _e407 = cbFI.interpolationRectSize;
                        phi_438_ = (_e387.x >= (_e407.x + _e124.x));
                    }
                    let _e412 = phi_438_;
                    phi_445_ = true;
                    if !(_e412) {
                        phi_445_ = (_e387.y < _e124.y);
                    }
                    let _e418 = phi_445_;
                    phi_456_ = true;
                    if !(_e418) {
                        let _e422 = cbFI.interpolationRectSize;
                        phi_456_ = (_e387.y >= (_e422.y + _e124.y));
                    }
                    let _e428 = phi_456_;
                    phi_460_ = _e403;
                    if _e428 {
                        phi_460_ = vec4<f32>(_e403.x, _e403.y, _e403.z, 0f);
                    }
                    let _e435 = phi_460_;
                    let _e436 = bitcast<vec2<i32>>(_e337);
                    let _e437 = textureLoad(r_output, _e337, 0u);
                    let _e438 = textureLoad(r_inpainting_mask, _e337, 0u);
                    let _e444 = (vec4<f32>(_e437.x, _e437.y, _e437.z, _e438.x) * _e112);
                    let _e452 = vec4<f32>(_e444.x, _e444.y, _e444.z, clamp((1f - _e444.w), 0f, 1f));
                    phi_485_ = true;
                    if (_e436.x >= _e124.x) {
                        let _e456 = cbFI.interpolationRectSize;
                        phi_485_ = (_e436.x >= (_e456.x + _e124.x));
                    }
                    let _e461 = phi_485_;
                    phi_492_ = true;
                    if !(_e461) {
                        phi_492_ = (_e436.y < _e124.y);
                    }
                    let _e467 = phi_492_;
                    phi_503_ = true;
                    if !(_e467) {
                        let _e471 = cbFI.interpolationRectSize;
                        phi_503_ = (_e436.y >= (_e471.y + _e124.y));
                    }
                    let _e477 = phi_503_;
                    phi_507_ = _e452;
                    if _e477 {
                        phi_507_ = vec4<f32>(_e452.x, _e452.y, _e452.z, 0f);
                    }
                    let _e484 = phi_507_;
                    let _e485 = bitcast<vec2<i32>>(_e338);
                    let _e486 = textureLoad(r_output, _e338, 0u);
                    let _e487 = textureLoad(r_inpainting_mask, _e338, 0u);
                    let _e493 = (vec4<f32>(_e486.x, _e486.y, _e486.z, _e487.x) * _e112);
                    let _e501 = vec4<f32>(_e493.x, _e493.y, _e493.z, clamp((1f - _e493.w), 0f, 1f));
                    phi_532_ = true;
                    if (_e485.x >= _e124.x) {
                        let _e505 = cbFI.interpolationRectSize;
                        phi_532_ = (_e485.x >= (_e505.x + _e124.x));
                    }
                    let _e510 = phi_532_;
                    phi_539_ = true;
                    if !(_e510) {
                        phi_539_ = (_e485.y < _e124.y);
                    }
                    let _e516 = phi_539_;
                    phi_550_ = true;
                    if !(_e516) {
                        let _e520 = cbFI.interpolationRectSize;
                        phi_550_ = (_e485.y >= (_e520.y + _e124.y));
                    }
                    let _e526 = phi_550_;
                    phi_554_ = _e501;
                    if _e526 {
                        phi_554_ = vec4<f32>(_e501.x, _e501.y, _e501.z, 0f);
                    }
                    let _e533 = phi_554_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e541 = (((_e386.w + _e435.w) + _e484.w) + _e533.w);
                            if (_e541 == 0f) {
                                phi_576_ = vec4<f32>(0f, 0f, 0f, 0f);
                                break;
                            }
                            phi_576_ = (((((_e386 * _e386.w) + (_e435 * _e435.w)) + (_e484 * _e484.w)) + (_e533 * _e533.w)) / vec4(_e541));
                            break;
                        }
                    }
                    let _e553 = phi_576_;
                    local[1i] = _e553;
                    let _e555 = local[1i];
                    textureStore(rw_inpainting_pyramid0_, bitcast<vec2<u32>>((_e92 + vec2<i32>(_e332, _e94))), _e555);
                    let _e558 = bitcast<i32>((_e87 + 32u));
                    let _e560 = (_e84 + vec2<i32>(_e86, _e558));
                    let _e562 = bitcast<i32>((_e81 + 16u));
                    let _e565 = bitcast<vec2<u32>>(_e560);
                    let _e566 = (_e565 + vec2<u32>(0u, 1u));
                    let _e567 = (_e565 + vec2<u32>(1u, 0u));
                    let _e568 = (_e565 + vec2<u32>(1u, 1u));
                    let _e569 = textureLoad(r_output, _e565, 0u);
                    let _e570 = textureLoad(r_inpainting_mask, _e565, 0u);
                    let _e576 = (vec4<f32>(_e569.x, _e569.y, _e569.z, _e570.x) * _e112);
                    let _e584 = vec4<f32>(_e576.x, _e576.y, _e576.z, clamp((1f - _e576.w), 0f, 1f));
                    phi_616_ = true;
                    if (_e560.x >= _e124.x) {
                        let _e588 = cbFI.interpolationRectSize;
                        phi_616_ = (_e560.x >= (_e588.x + _e124.x));
                    }
                    let _e593 = phi_616_;
                    phi_623_ = true;
                    if !(_e593) {
                        phi_623_ = (_e560.y < _e124.y);
                    }
                    let _e599 = phi_623_;
                    phi_634_ = true;
                    if !(_e599) {
                        let _e603 = cbFI.interpolationRectSize;
                        phi_634_ = (_e560.y >= (_e603.y + _e124.y));
                    }
                    let _e609 = phi_634_;
                    phi_638_ = _e584;
                    if _e609 {
                        phi_638_ = vec4<f32>(_e584.x, _e584.y, _e584.z, 0f);
                    }
                    let _e616 = phi_638_;
                    let _e617 = bitcast<vec2<i32>>(_e566);
                    let _e618 = textureLoad(r_output, _e566, 0u);
                    let _e619 = textureLoad(r_inpainting_mask, _e566, 0u);
                    let _e625 = (vec4<f32>(_e618.x, _e618.y, _e618.z, _e619.x) * _e112);
                    let _e633 = vec4<f32>(_e625.x, _e625.y, _e625.z, clamp((1f - _e625.w), 0f, 1f));
                    phi_663_ = true;
                    if (_e617.x >= _e124.x) {
                        let _e637 = cbFI.interpolationRectSize;
                        phi_663_ = (_e617.x >= (_e637.x + _e124.x));
                    }
                    let _e642 = phi_663_;
                    phi_670_ = true;
                    if !(_e642) {
                        phi_670_ = (_e617.y < _e124.y);
                    }
                    let _e648 = phi_670_;
                    phi_681_ = true;
                    if !(_e648) {
                        let _e652 = cbFI.interpolationRectSize;
                        phi_681_ = (_e617.y >= (_e652.y + _e124.y));
                    }
                    let _e658 = phi_681_;
                    phi_685_ = _e633;
                    if _e658 {
                        phi_685_ = vec4<f32>(_e633.x, _e633.y, _e633.z, 0f);
                    }
                    let _e665 = phi_685_;
                    let _e666 = bitcast<vec2<i32>>(_e567);
                    let _e667 = textureLoad(r_output, _e567, 0u);
                    let _e668 = textureLoad(r_inpainting_mask, _e567, 0u);
                    let _e674 = (vec4<f32>(_e667.x, _e667.y, _e667.z, _e668.x) * _e112);
                    let _e682 = vec4<f32>(_e674.x, _e674.y, _e674.z, clamp((1f - _e674.w), 0f, 1f));
                    phi_710_ = true;
                    if (_e666.x >= _e124.x) {
                        let _e686 = cbFI.interpolationRectSize;
                        phi_710_ = (_e666.x >= (_e686.x + _e124.x));
                    }
                    let _e691 = phi_710_;
                    phi_717_ = true;
                    if !(_e691) {
                        phi_717_ = (_e666.y < _e124.y);
                    }
                    let _e697 = phi_717_;
                    phi_728_ = true;
                    if !(_e697) {
                        let _e701 = cbFI.interpolationRectSize;
                        phi_728_ = (_e666.y >= (_e701.y + _e124.y));
                    }
                    let _e707 = phi_728_;
                    phi_732_ = _e682;
                    if _e707 {
                        phi_732_ = vec4<f32>(_e682.x, _e682.y, _e682.z, 0f);
                    }
                    let _e714 = phi_732_;
                    let _e715 = bitcast<vec2<i32>>(_e568);
                    let _e716 = textureLoad(r_output, _e568, 0u);
                    let _e717 = textureLoad(r_inpainting_mask, _e568, 0u);
                    let _e723 = (vec4<f32>(_e716.x, _e716.y, _e716.z, _e717.x) * _e112);
                    let _e731 = vec4<f32>(_e723.x, _e723.y, _e723.z, clamp((1f - _e723.w), 0f, 1f));
                    phi_757_ = true;
                    if (_e715.x >= _e124.x) {
                        let _e735 = cbFI.interpolationRectSize;
                        phi_757_ = (_e715.x >= (_e735.x + _e124.x));
                    }
                    let _e740 = phi_757_;
                    phi_764_ = true;
                    if !(_e740) {
                        phi_764_ = (_e715.y < _e124.y);
                    }
                    let _e746 = phi_764_;
                    phi_775_ = true;
                    if !(_e746) {
                        let _e750 = cbFI.interpolationRectSize;
                        phi_775_ = (_e715.y >= (_e750.y + _e124.y));
                    }
                    let _e756 = phi_775_;
                    phi_779_ = _e731;
                    if _e756 {
                        phi_779_ = vec4<f32>(_e731.x, _e731.y, _e731.z, 0f);
                    }
                    let _e763 = phi_779_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e771 = (((_e616.w + _e665.w) + _e714.w) + _e763.w);
                            if (_e771 == 0f) {
                                phi_801_ = vec4<f32>(0f, 0f, 0f, 0f);
                                break;
                            }
                            phi_801_ = (((((_e616 * _e616.w) + (_e665 * _e665.w)) + (_e714 * _e714.w)) + (_e763 * _e763.w)) / vec4(_e771));
                            break;
                        }
                    }
                    let _e783 = phi_801_;
                    local[2i] = _e783;
                    let _e785 = local[2i];
                    textureStore(rw_inpainting_pyramid0_, bitcast<vec2<u32>>((_e92 + vec2<i32>(_e93, _e562))), _e785);
                    let _e788 = (_e84 + vec2<i32>(_e328, _e558));
                    let _e791 = bitcast<vec2<u32>>(_e788);
                    let _e792 = (_e791 + vec2<u32>(0u, 1u));
                    let _e793 = (_e791 + vec2<u32>(1u, 0u));
                    let _e794 = (_e791 + vec2<u32>(1u, 1u));
                    let _e795 = textureLoad(r_output, _e791, 0u);
                    let _e796 = textureLoad(r_inpainting_mask, _e791, 0u);
                    let _e802 = (vec4<f32>(_e795.x, _e795.y, _e795.z, _e796.x) * _e112);
                    let _e810 = vec4<f32>(_e802.x, _e802.y, _e802.z, clamp((1f - _e802.w), 0f, 1f));
                    phi_837_ = true;
                    if (_e788.x >= _e124.x) {
                        let _e814 = cbFI.interpolationRectSize;
                        phi_837_ = (_e788.x >= (_e814.x + _e124.x));
                    }
                    let _e819 = phi_837_;
                    phi_844_ = true;
                    if !(_e819) {
                        phi_844_ = (_e788.y < _e124.y);
                    }
                    let _e825 = phi_844_;
                    phi_855_ = true;
                    if !(_e825) {
                        let _e829 = cbFI.interpolationRectSize;
                        phi_855_ = (_e788.y >= (_e829.y + _e124.y));
                    }
                    let _e835 = phi_855_;
                    phi_859_ = _e810;
                    if _e835 {
                        phi_859_ = vec4<f32>(_e810.x, _e810.y, _e810.z, 0f);
                    }
                    let _e842 = phi_859_;
                    let _e843 = bitcast<vec2<i32>>(_e792);
                    let _e844 = textureLoad(r_output, _e792, 0u);
                    let _e845 = textureLoad(r_inpainting_mask, _e792, 0u);
                    let _e851 = (vec4<f32>(_e844.x, _e844.y, _e844.z, _e845.x) * _e112);
                    let _e859 = vec4<f32>(_e851.x, _e851.y, _e851.z, clamp((1f - _e851.w), 0f, 1f));
                    phi_884_ = true;
                    if (_e843.x >= _e124.x) {
                        let _e863 = cbFI.interpolationRectSize;
                        phi_884_ = (_e843.x >= (_e863.x + _e124.x));
                    }
                    let _e868 = phi_884_;
                    phi_891_ = true;
                    if !(_e868) {
                        phi_891_ = (_e843.y < _e124.y);
                    }
                    let _e874 = phi_891_;
                    phi_902_ = true;
                    if !(_e874) {
                        let _e878 = cbFI.interpolationRectSize;
                        phi_902_ = (_e843.y >= (_e878.y + _e124.y));
                    }
                    let _e884 = phi_902_;
                    phi_906_ = _e859;
                    if _e884 {
                        phi_906_ = vec4<f32>(_e859.x, _e859.y, _e859.z, 0f);
                    }
                    let _e891 = phi_906_;
                    let _e892 = bitcast<vec2<i32>>(_e793);
                    let _e893 = textureLoad(r_output, _e793, 0u);
                    let _e894 = textureLoad(r_inpainting_mask, _e793, 0u);
                    let _e900 = (vec4<f32>(_e893.x, _e893.y, _e893.z, _e894.x) * _e112);
                    let _e908 = vec4<f32>(_e900.x, _e900.y, _e900.z, clamp((1f - _e900.w), 0f, 1f));
                    phi_931_ = true;
                    if (_e892.x >= _e124.x) {
                        let _e912 = cbFI.interpolationRectSize;
                        phi_931_ = (_e892.x >= (_e912.x + _e124.x));
                    }
                    let _e917 = phi_931_;
                    phi_938_ = true;
                    if !(_e917) {
                        phi_938_ = (_e892.y < _e124.y);
                    }
                    let _e923 = phi_938_;
                    phi_949_ = true;
                    if !(_e923) {
                        let _e927 = cbFI.interpolationRectSize;
                        phi_949_ = (_e892.y >= (_e927.y + _e124.y));
                    }
                    let _e933 = phi_949_;
                    phi_953_ = _e908;
                    if _e933 {
                        phi_953_ = vec4<f32>(_e908.x, _e908.y, _e908.z, 0f);
                    }
                    let _e940 = phi_953_;
                    let _e941 = bitcast<vec2<i32>>(_e794);
                    let _e942 = textureLoad(r_output, _e794, 0u);
                    let _e943 = textureLoad(r_inpainting_mask, _e794, 0u);
                    let _e949 = (vec4<f32>(_e942.x, _e942.y, _e942.z, _e943.x) * _e112);
                    let _e957 = vec4<f32>(_e949.x, _e949.y, _e949.z, clamp((1f - _e949.w), 0f, 1f));
                    phi_978_ = true;
                    if (_e941.x >= _e124.x) {
                        let _e961 = cbFI.interpolationRectSize;
                        phi_978_ = (_e941.x >= (_e961.x + _e124.x));
                    }
                    let _e966 = phi_978_;
                    phi_985_ = true;
                    if !(_e966) {
                        phi_985_ = (_e941.y < _e124.y);
                    }
                    let _e972 = phi_985_;
                    phi_996_ = true;
                    if !(_e972) {
                        let _e976 = cbFI.interpolationRectSize;
                        phi_996_ = (_e941.y >= (_e976.y + _e124.y));
                    }
                    let _e982 = phi_996_;
                    phi_1000_ = _e957;
                    if _e982 {
                        phi_1000_ = vec4<f32>(_e957.x, _e957.y, _e957.z, 0f);
                    }
                    let _e989 = phi_1000_;
                    switch bitcast<i32>(0u) {
                        default: {
                            let _e997 = (((_e842.w + _e891.w) + _e940.w) + _e989.w);
                            if (_e997 == 0f) {
                                phi_1022_ = vec4<f32>(0f, 0f, 0f, 0f);
                                break;
                            }
                            phi_1022_ = (((((_e842 * _e842.w) + (_e891 * _e891.w)) + (_e940 * _e940.w)) + (_e989 * _e989.w)) / vec4(_e997));
                            break;
                        }
                    }
                    let _e1009 = phi_1022_;
                    local[3i] = _e1009;
                    let _e1011 = local[3i];
                    textureStore(rw_inpainting_pyramid0_, bitcast<vec2<u32>>((_e92 + vec2<i32>(_e332, _e562))), _e1011);
                    if (_e55 <= 1u) {
                        break;
                    }
                    phi_1031_ = 0u;
                    loop {
                        let _e1015 = phi_1031_;
                        if (_e1015 < 4u) {
                            let _e1018 = local[_e1015];
                            spdIntermediateR[_e77][_e81] = _e1018.x;
                            spdIntermediateG[_e77][_e81] = _e1018.y;
                            spdIntermediateB[_e77][_e81] = _e1018.z;
                            spdIntermediateA[_e77][_e81] = _e1018.w;
                            workgroupBarrier();
                            if (_e50 < 64u) {
                                let _e1032 = (_e85 + 1u);
                                let _e1033 = (_e87 + 1u);
                                let _e1036 = spdIntermediateR[_e85][_e87];
                                let _e1039 = spdIntermediateG[_e85][_e87];
                                let _e1042 = spdIntermediateB[_e85][_e87];
                                let _e1045 = spdIntermediateA[_e85][_e87];
                                let _e1049 = spdIntermediateR[_e1032][_e87];
                                let _e1052 = spdIntermediateG[_e1032][_e87];
                                let _e1055 = spdIntermediateB[_e1032][_e87];
                                let _e1058 = spdIntermediateA[_e1032][_e87];
                                let _e1062 = spdIntermediateR[_e85][_e1033];
                                let _e1065 = spdIntermediateG[_e85][_e1033];
                                let _e1068 = spdIntermediateB[_e85][_e1033];
                                let _e1071 = spdIntermediateA[_e85][_e1033];
                                let _e1075 = spdIntermediateR[_e1032][_e1033];
                                let _e1078 = spdIntermediateG[_e1032][_e1033];
                                let _e1081 = spdIntermediateB[_e1032][_e1033];
                                let _e1084 = spdIntermediateA[_e1032][_e1033];
                                switch bitcast<i32>(0u) {
                                    default: {
                                        let _e1089 = (((_e1045 + _e1058) + _e1071) + _e1084);
                                        if (_e1089 == 0f) {
                                            phi_1105_ = vec4<f32>(0f, 0f, 0f, 0f);
                                            break;
                                        }
                                        phi_1105_ = (((((vec4<f32>(_e1036, _e1039, _e1042, _e1045) * _e1045) + (vec4<f32>(_e1049, _e1052, _e1055, _e1058) * _e1058)) + (vec4<f32>(_e1062, _e1065, _e1068, _e1071) * _e1071)) + (vec4<f32>(_e1075, _e1078, _e1081, _e1084) * _e1084)) / vec4(_e1089));
                                        break;
                                    }
                                }
                                let _e1101 = phi_1105_;
                                local[_e1015] = _e1101;
                                let _e1114 = local[_e1015];
                                textureStore(rw_inpainting_pyramid1_, bitcast<vec2<u32>>((bitcast<vec2<i32>>((_e58 * vec2<u32>(16u, 16u))) + vec2<i32>(bitcast<i32>((_e77 + ((_e1015 % 2u) * 8u))), bitcast<i32>((_e81 + ((_e1015 / 2u) * 8u)))))), _e1114);
                            }
                            workgroupBarrier();
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            phi_1031_ = (_e1015 + 1u);
                        }
                    }
                    if (_e50 < 64u) {
                        let _e1118 = local[0i];
                        spdIntermediateR[_e77][_e81] = _e1118.x;
                        spdIntermediateG[_e77][_e81] = _e1118.y;
                        spdIntermediateB[_e77][_e81] = _e1118.z;
                        spdIntermediateA[_e77][_e81] = _e1118.w;
                        let _e1131 = (_e77 + 8u);
                        let _e1132 = local[1i];
                        spdIntermediateR[_e1131][_e81] = _e1132.x;
                        spdIntermediateG[_e1131][_e81] = _e1132.y;
                        spdIntermediateB[_e1131][_e81] = _e1132.z;
                        spdIntermediateA[_e1131][_e81] = _e1132.w;
                        let _e1145 = (_e81 + 8u);
                        let _e1146 = local[2i];
                        spdIntermediateR[_e77][_e1145] = _e1146.x;
                        spdIntermediateG[_e77][_e1145] = _e1146.y;
                        spdIntermediateB[_e77][_e1145] = _e1146.z;
                        spdIntermediateA[_e77][_e1145] = _e1146.w;
                        let _e1159 = local[3i];
                        spdIntermediateR[_e1131][_e1145] = _e1159.x;
                        spdIntermediateG[_e1131][_e1145] = _e1159.y;
                        spdIntermediateB[_e1131][_e1145] = _e1159.z;
                        spdIntermediateA[_e1131][_e1145] = _e1159.w;
                    }
                    break;
                }
            }
            switch bitcast<i32>(0u) {
                default: {
                    if (_e55 <= 2u) {
                        break;
                    }
                    workgroupBarrier();
                    if (_e50 < 64u) {
                        let _e1176 = local_1;
                        let _e1177 = (_e1176 + 1u);
                        let _e1179 = local_2;
                        let _e1180 = (_e1179 + 1u);
                        let _e1182 = local_3;
                        let _e1185 = local_4;
                        let _e1187 = spdIntermediateR[_e1182][_e1185];
                        let _e1189 = local_5;
                        let _e1192 = local_6;
                        let _e1194 = spdIntermediateG[_e1189][_e1192];
                        let _e1196 = local_7;
                        let _e1199 = local_8;
                        let _e1201 = spdIntermediateB[_e1196][_e1199];
                        let _e1203 = local_9;
                        let _e1206 = local_10;
                        let _e1208 = spdIntermediateA[_e1203][_e1206];
                        let _e1212 = local_11;
                        let _e1214 = spdIntermediateR[_e1177][_e1212];
                        let _e1217 = local_12;
                        let _e1219 = spdIntermediateG[_e1177][_e1217];
                        let _e1222 = local_13;
                        let _e1224 = spdIntermediateB[_e1177][_e1222];
                        let _e1227 = local_14;
                        let _e1229 = spdIntermediateA[_e1177][_e1227];
                        let _e1232 = local_15;
                        let _e1235 = spdIntermediateR[_e1232][_e1180];
                        let _e1237 = local_16;
                        let _e1240 = spdIntermediateG[_e1237][_e1180];
                        let _e1242 = local_17;
                        let _e1245 = spdIntermediateB[_e1242][_e1180];
                        let _e1247 = local_18;
                        let _e1250 = spdIntermediateA[_e1247][_e1180];
                        let _e1254 = spdIntermediateR[_e1177][_e1180];
                        let _e1257 = spdIntermediateG[_e1177][_e1180];
                        let _e1260 = spdIntermediateB[_e1177][_e1180];
                        let _e1263 = spdIntermediateA[_e1177][_e1180];
                        switch bitcast<i32>(0u) {
                            default: {
                                let _e1268 = (((_e1208 + _e1229) + _e1250) + _e1263);
                                if (_e1268 == 0f) {
                                    phi_1225_ = vec4<f32>(0f, 0f, 0f, 0f);
                                    break;
                                }
                                phi_1225_ = (((((vec4<f32>(_e1187, _e1194, _e1201, _e1208) * _e1208) + (vec4<f32>(_e1214, _e1219, _e1224, _e1229) * _e1229)) + (vec4<f32>(_e1235, _e1240, _e1245, _e1250) * _e1250)) + (vec4<f32>(_e1254, _e1257, _e1260, _e1263) * _e1263)) / vec4(_e1268));
                                break;
                            }
                        }
                        let _e1280 = phi_1225_;
                        let _e1284 = local_19;
                        textureStore(rw_inpainting_pyramid2_, bitcast<vec2<u32>>((bitcast<vec2<i32>>((_e58 * vec2<u32>(8u, 8u))) + _e1284)), _e1280);
                        let _e1289 = local_20;
                        let _e1290 = (_e1289 + (_e81 % 2u));
                        let _e1294 = local_21;
                        spdIntermediateR[_e1290][_e1294] = _e1280.x;
                        let _e1299 = local_22;
                        spdIntermediateG[_e1290][_e1299] = _e1280.y;
                        let _e1304 = local_23;
                        spdIntermediateB[_e1290][_e1304] = _e1280.z;
                        let _e1309 = local_24;
                        spdIntermediateA[_e1290][_e1309] = _e1280.w;
                    }
                    if (_e55 <= 3u) {
                        break;
                    }
                    workgroupBarrier();
                    if (_e50 < 16u) {
                        let _e1313 = (_e77 * 4u);
                        let _e1314 = (_e81 * 4u);
                        let _e1315 = (_e1313 + 2u);
                        let _e1316 = (_e1313 + 1u);
                        let _e1317 = (_e1314 + 2u);
                        let _e1318 = (_e1313 + 3u);
                        let _e1321 = spdIntermediateR[_e1313][_e1314];
                        let _e1324 = spdIntermediateG[_e1313][_e1314];
                        let _e1327 = spdIntermediateB[_e1313][_e1314];
                        let _e1330 = spdIntermediateA[_e1313][_e1314];
                        let _e1334 = spdIntermediateR[_e1315][_e1314];
                        let _e1337 = spdIntermediateG[_e1315][_e1314];
                        let _e1340 = spdIntermediateB[_e1315][_e1314];
                        let _e1343 = spdIntermediateA[_e1315][_e1314];
                        let _e1347 = spdIntermediateR[_e1316][_e1317];
                        let _e1350 = spdIntermediateG[_e1316][_e1317];
                        let _e1353 = spdIntermediateB[_e1316][_e1317];
                        let _e1356 = spdIntermediateA[_e1316][_e1317];
                        let _e1360 = spdIntermediateR[_e1318][_e1317];
                        let _e1363 = spdIntermediateG[_e1318][_e1317];
                        let _e1366 = spdIntermediateB[_e1318][_e1317];
                        let _e1369 = spdIntermediateA[_e1318][_e1317];
                        switch bitcast<i32>(0u) {
                            default: {
                                let _e1374 = (((_e1330 + _e1343) + _e1356) + _e1369);
                                if (_e1374 == 0f) {
                                    phi_1306_ = vec4<f32>(0f, 0f, 0f, 0f);
                                    break;
                                }
                                phi_1306_ = (((((vec4<f32>(_e1321, _e1324, _e1327, _e1330) * _e1330) + (vec4<f32>(_e1334, _e1337, _e1340, _e1343) * _e1343)) + (vec4<f32>(_e1347, _e1350, _e1353, _e1356) * _e1356)) + (vec4<f32>(_e1360, _e1363, _e1366, _e1369) * _e1369)) / vec4(_e1374));
                                break;
                            }
                        }
                        let _e1386 = phi_1306_;
                        let _e1390 = local_25;
                        textureStore(rw_inpainting_pyramid3_, bitcast<vec2<u32>>((bitcast<vec2<i32>>((_e58 * vec2<u32>(4u, 4u))) + _e1390)), _e1386);
                        let _e1393 = (_e1313 + _e81);
                        spdIntermediateR[_e1393][_e1314] = _e1386.x;
                        spdIntermediateG[_e1393][_e1314] = _e1386.y;
                        spdIntermediateB[_e1393][_e1314] = _e1386.z;
                        spdIntermediateA[_e1393][_e1314] = _e1386.w;
                    }
                    if (_e55 <= 4u) {
                        break;
                    }
                    workgroupBarrier();
                    if (_e50 < 4u) {
                        let _e1408 = (_e77 * 8u);
                        let _e1410 = local_26;
                        let _e1411 = (_e1408 + _e1410);
                        let _e1412 = (_e81 * 8u);
                        let _e1415 = local_27;
                        let _e1416 = ((_e1408 + 4u) + _e1415);
                        let _e1419 = local_28;
                        let _e1420 = ((_e1408 + 1u) + _e1419);
                        let _e1421 = (_e1412 + 4u);
                        let _e1424 = local_29;
                        let _e1425 = ((_e1408 + 5u) + _e1424);
                        let _e1428 = spdIntermediateR[_e1411][_e1412];
                        let _e1431 = spdIntermediateG[_e1411][_e1412];
                        let _e1434 = spdIntermediateB[_e1411][_e1412];
                        let _e1437 = spdIntermediateA[_e1411][_e1412];
                        let _e1441 = spdIntermediateR[_e1416][_e1412];
                        let _e1444 = spdIntermediateG[_e1416][_e1412];
                        let _e1447 = spdIntermediateB[_e1416][_e1412];
                        let _e1450 = spdIntermediateA[_e1416][_e1412];
                        let _e1454 = spdIntermediateR[_e1420][_e1421];
                        let _e1457 = spdIntermediateG[_e1420][_e1421];
                        let _e1460 = spdIntermediateB[_e1420][_e1421];
                        let _e1463 = spdIntermediateA[_e1420][_e1421];
                        let _e1467 = spdIntermediateR[_e1425][_e1421];
                        let _e1470 = spdIntermediateG[_e1425][_e1421];
                        let _e1473 = spdIntermediateB[_e1425][_e1421];
                        let _e1476 = spdIntermediateA[_e1425][_e1421];
                        switch bitcast<i32>(0u) {
                            default: {
                                let _e1481 = (((_e1437 + _e1450) + _e1463) + _e1476);
                                if (_e1481 == 0f) {
                                    phi_1390_ = vec4<f32>(0f, 0f, 0f, 0f);
                                    break;
                                }
                                phi_1390_ = (((((vec4<f32>(_e1428, _e1431, _e1434, _e1437) * _e1437) + (vec4<f32>(_e1441, _e1444, _e1447, _e1450) * _e1450)) + (vec4<f32>(_e1454, _e1457, _e1460, _e1463) * _e1463)) + (vec4<f32>(_e1467, _e1470, _e1473, _e1476) * _e1476)) / vec4(_e1481));
                                break;
                            }
                        }
                        let _e1493 = phi_1390_;
                        let _e1497 = local_30;
                        textureStore(rw_inpainting_pyramid4_, bitcast<vec2<u32>>((bitcast<vec2<i32>>((_e58 * vec2<u32>(2u, 2u))) + _e1497)), _e1493);
                        let _e1501 = local_31;
                        let _e1502 = (_e77 + _e1501);
                        spdIntermediateR[_e1502][0u] = _e1493.x;
                        spdIntermediateG[_e1502][0u] = _e1493.y;
                        spdIntermediateB[_e1502][0u] = _e1493.z;
                        spdIntermediateA[_e1502][0u] = _e1493.w;
                    }
                    if (_e55 <= 5u) {
                        break;
                    }
                    workgroupBarrier();
                    if (_e50 < 1u) {
                        let _e1519 = spdIntermediateR[0u][0u];
                        let _e1522 = spdIntermediateG[0u][0u];
                        let _e1525 = spdIntermediateB[0u][0u];
                        let _e1528 = spdIntermediateA[0u][0u];
                        let _e1532 = spdIntermediateR[1u][0u];
                        let _e1535 = spdIntermediateG[1u][0u];
                        let _e1538 = spdIntermediateB[1u][0u];
                        let _e1541 = spdIntermediateA[1u][0u];
                        let _e1545 = spdIntermediateR[2u][0u];
                        let _e1548 = spdIntermediateG[2u][0u];
                        let _e1551 = spdIntermediateB[2u][0u];
                        let _e1554 = spdIntermediateA[2u][0u];
                        let _e1558 = spdIntermediateR[3u][0u];
                        let _e1561 = spdIntermediateG[3u][0u];
                        let _e1564 = spdIntermediateB[3u][0u];
                        let _e1567 = spdIntermediateA[3u][0u];
                        switch bitcast<i32>(0u) {
                            default: {
                                let _e1572 = (((_e1528 + _e1541) + _e1554) + _e1567);
                                if (_e1572 == 0f) {
                                    phi_1464_ = vec4<f32>(0f, 0f, 0f, 0f);
                                    break;
                                }
                                phi_1464_ = (((((vec4<f32>(_e1519, _e1522, _e1525, _e1528) * _e1528) + (vec4<f32>(_e1532, _e1535, _e1538, _e1541) * _e1541)) + (vec4<f32>(_e1545, _e1548, _e1551, _e1554) * _e1554)) + (vec4<f32>(_e1558, _e1561, _e1564, _e1567) * _e1567)) / vec4(_e1572));
                                break;
                            }
                        }
                        let _e1584 = phi_1464_;
                        textureStore(rw_inpainting_pyramid5_, _e58, _e1584);
                    }
                    break;
                }
            }
            if (_e55 <= 6u) {
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
