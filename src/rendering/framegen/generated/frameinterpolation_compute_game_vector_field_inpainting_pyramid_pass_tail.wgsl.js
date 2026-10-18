// AMD FidelityFX SDK v2.3.0, Frame Interpolation 3.1.6.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL; scripts/fg/compile.mjs.
export default String.raw`struct type_u002e_cbInpaintingPyramid {
    mips: u32,
    numWorkGroups: u32,
    workGroupOffset: vec2<u32>,
}

@group(0) @binding(1) 
var<uniform> cbInpaintingPyramid: type_u002e_cbInpaintingPyramid;
@group(0) @binding(38) 
var rw_inpainting_pyramid5_: texture_2d<f32>;
@group(0) @binding(39) 
var rw_inpainting_pyramid6_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(40) 
var rw_inpainting_pyramid7_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(41) 
var rw_inpainting_pyramid8_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(42) 
var rw_inpainting_pyramid9_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(43) 
var rw_inpainting_pyramid10_: texture_storage_2d<rgba16float,write>;
@group(0) @binding(44) 
var rw_inpainting_pyramid11_: texture_storage_2d<rgba16float,write>;
var<workgroup> spdIntermediateR: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateG: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateB: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateA: array<array<f32, 16>, 16>;
var<private> global: u32;

fn CS_1() {
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
    var local_65: u32;
    var local_66: u32;
    var local_67: u32;
    var local_68: u32;
    var local_69: u32;
    var local_70: u32;
    var local_71: u32;
    var local_72: u32;

    let _e36 = global;
    let _e37 = (_e36 % 64u);
    let _e54 = (((_e37 & 1u) | ((_e37 >> bitcast<u32>(2u)) & 6u)) + (8u * ((_e36 >> bitcast<u32>(6u)) % 2u)));
    let _e58 = ((((_e37 >> bitcast<u32>(1u)) & 3u) | ((_e37 >> bitcast<u32>(3u)) & 4u)) + (8u * (_e36 >> bitcast<u32>(7u))));
    let _e60 = cbInpaintingPyramid.mips;
    switch bitcast<i32>(0u) {
        default: {
            let _e62 = (_e54 * 4u);
            let _e63 = bitcast<i32>(_e62);
            let _e64 = (_e58 * 4u);
            let _e65 = bitcast<i32>(_e64);
            let _e67 = (_e54 * 2u);
            let _e68 = bitcast<i32>(_e67);
            let _e69 = (_e58 * 2u);
            let _e70 = bitcast<i32>(_e69);
            let _e72 = bitcast<vec2<u32>>(vec2<i32>(_e63, _e65));
            let _e76 = textureLoad(rw_inpainting_pyramid5_, _e72, 0);
            let _e77 = textureLoad(rw_inpainting_pyramid5_, (_e72 + vec2<u32>(0u, 1u)), 0);
            let _e78 = textureLoad(rw_inpainting_pyramid5_, (_e72 + vec2<u32>(1u, 0u)), 0);
            let _e79 = textureLoad(rw_inpainting_pyramid5_, (_e72 + vec2<u32>(1u, 1u)), 0);
            let _e82 = select(0f, 1f, (_e76.z > 0f));
            let _e86 = select(0f, 1f, (_e77.z > 0f));
            let _e92 = select(0f, 1f, (_e78.z > 0f));
            let _e98 = select(0f, 1f, (_e79.z > 0f));
            let _e101 = (((_e82 + _e86) + _e92) + _e98);
            let _e105 = (((((_e76 * _e82) + (_e77 * _e86)) + (_e78 * _e92)) + (_e79 * _e98)) / vec4(select(1f, _e101, (_e101 > 0.001f))));
            textureStore(rw_inpainting_pyramid6_, bitcast<vec2<u32>>(vec2<i32>(_e68, _e70)), _e105);
            let _e107 = (_e62 + 2u);
            let _e108 = bitcast<i32>(_e107);
            let _e110 = (_e67 + 1u);
            let _e111 = bitcast<i32>(_e110);
            let _e113 = bitcast<vec2<u32>>(vec2<i32>(_e108, _e65));
            let _e117 = textureLoad(rw_inpainting_pyramid5_, _e113, 0);
            let _e118 = textureLoad(rw_inpainting_pyramid5_, (_e113 + vec2<u32>(0u, 1u)), 0);
            let _e119 = textureLoad(rw_inpainting_pyramid5_, (_e113 + vec2<u32>(1u, 0u)), 0);
            let _e120 = textureLoad(rw_inpainting_pyramid5_, (_e113 + vec2<u32>(1u, 1u)), 0);
            let _e123 = select(0f, 1f, (_e117.z > 0f));
            let _e127 = select(0f, 1f, (_e118.z > 0f));
            let _e133 = select(0f, 1f, (_e119.z > 0f));
            let _e139 = select(0f, 1f, (_e120.z > 0f));
            let _e142 = (((_e123 + _e127) + _e133) + _e139);
            let _e146 = (((((_e117 * _e123) + (_e118 * _e127)) + (_e119 * _e133)) + (_e120 * _e139)) / vec4(select(1f, _e142, (_e142 > 0.001f))));
            textureStore(rw_inpainting_pyramid6_, bitcast<vec2<u32>>(vec2<i32>(_e111, _e70)), _e146);
            let _e148 = (_e64 + 2u);
            let _e149 = bitcast<i32>(_e148);
            let _e151 = (_e69 + 1u);
            let _e152 = bitcast<i32>(_e151);
            let _e154 = bitcast<vec2<u32>>(vec2<i32>(_e63, _e149));
            let _e158 = textureLoad(rw_inpainting_pyramid5_, _e154, 0);
            let _e159 = textureLoad(rw_inpainting_pyramid5_, (_e154 + vec2<u32>(0u, 1u)), 0);
            let _e160 = textureLoad(rw_inpainting_pyramid5_, (_e154 + vec2<u32>(1u, 0u)), 0);
            let _e161 = textureLoad(rw_inpainting_pyramid5_, (_e154 + vec2<u32>(1u, 1u)), 0);
            let _e164 = select(0f, 1f, (_e158.z > 0f));
            let _e168 = select(0f, 1f, (_e159.z > 0f));
            let _e174 = select(0f, 1f, (_e160.z > 0f));
            let _e180 = select(0f, 1f, (_e161.z > 0f));
            let _e183 = (((_e164 + _e168) + _e174) + _e180);
            let _e187 = (((((_e158 * _e164) + (_e159 * _e168)) + (_e160 * _e174)) + (_e161 * _e180)) / vec4(select(1f, _e183, (_e183 > 0.001f))));
            textureStore(rw_inpainting_pyramid6_, bitcast<vec2<u32>>(vec2<i32>(_e68, _e152)), _e187);
            let _e191 = bitcast<vec2<u32>>(vec2<i32>(_e108, _e149));
            let _e195 = textureLoad(rw_inpainting_pyramid5_, _e191, 0);
            let _e196 = textureLoad(rw_inpainting_pyramid5_, (_e191 + vec2<u32>(0u, 1u)), 0);
            let _e197 = textureLoad(rw_inpainting_pyramid5_, (_e191 + vec2<u32>(1u, 0u)), 0);
            let _e198 = textureLoad(rw_inpainting_pyramid5_, (_e191 + vec2<u32>(1u, 1u)), 0);
            let _e201 = select(0f, 1f, (_e195.z > 0f));
            let _e205 = select(0f, 1f, (_e196.z > 0f));
            let _e211 = select(0f, 1f, (_e197.z > 0f));
            let _e217 = select(0f, 1f, (_e198.z > 0f));
            let _e220 = (((_e201 + _e205) + _e211) + _e217);
            let _e224 = (((((_e195 * _e201) + (_e196 * _e205)) + (_e197 * _e211)) + (_e198 * _e217)) / vec4(select(1f, _e220, (_e220 > 0.001f))));
            textureStore(rw_inpainting_pyramid6_, bitcast<vec2<u32>>(vec2<i32>(_e111, _e152)), _e224);
            local = _e67;
            local_1 = _e69;
            local_2 = _e67;
            local_3 = _e69;
            local_4 = _e67;
            local_5 = _e69;
            local_6 = _e67;
            local_7 = _e69;
            local_8 = _e110;
            local_9 = _e69;
            local_10 = _e110;
            local_11 = _e69;
            local_12 = _e110;
            local_13 = _e69;
            local_14 = _e110;
            local_15 = _e69;
            local_16 = _e67;
            local_17 = _e151;
            local_18 = _e67;
            local_19 = _e151;
            local_20 = _e67;
            local_21 = _e151;
            local_22 = _e67;
            local_23 = _e151;
            local_24 = _e110;
            local_25 = _e151;
            local_26 = _e110;
            local_27 = _e151;
            local_28 = _e110;
            local_29 = _e151;
            local_30 = _e110;
            local_31 = _e151;
            local_32 = _e67;
            local_33 = _e69;
            local_34 = _e69;
            local_35 = _e69;
            local_36 = _e69;
            local_37 = _e62;
            local_38 = _e62;
            local_39 = _e62;
            local_40 = _e64;
            local_41 = _e62;
            local_42 = _e64;
            local_43 = _e62;
            local_44 = _e64;
            local_45 = _e62;
            local_46 = _e64;
            local_47 = _e107;
            local_48 = _e64;
            local_49 = _e107;
            local_50 = _e64;
            local_51 = _e107;
            local_52 = _e64;
            local_53 = _e107;
            local_54 = _e64;
            local_55 = _e148;
            local_56 = _e148;
            local_57 = _e148;
            local_58 = _e148;
            local_59 = _e148;
            local_60 = _e148;
            local_61 = _e148;
            local_62 = _e148;
            local_63 = _e62;
            local_64 = _e64;
            local_65 = _e64;
            local_66 = _e64;
            local_67 = _e64;
            local_68 = _e69;
            local_69 = _e69;
            local_70 = _e69;
            local_71 = _e69;
            local_72 = _e69;
            if (_e60 <= 7u) {
                break;
            }
            let _e229 = select(0f, 1f, (_e105.z > 0f));
            let _e233 = select(0f, 1f, (_e146.z > 0f));
            let _e239 = select(0f, 1f, (_e187.z > 0f));
            let _e245 = select(0f, 1f, (_e224.z > 0f));
            let _e248 = (((_e229 + _e233) + _e239) + _e245);
            let _e252 = (((((_e105 * _e229) + (_e146 * _e233)) + (_e187 * _e239)) + (_e224 * _e245)) / vec4(select(1f, _e248, (_e248 > 0.001f))));
            textureStore(rw_inpainting_pyramid7_, bitcast<vec2<u32>>(vec2<i32>(bitcast<i32>(_e54), bitcast<i32>(_e58))), _e252);
            spdIntermediateR[_e54][_e58] = _e252.x;
            spdIntermediateG[_e54][_e58] = _e252.y;
            spdIntermediateB[_e54][_e58] = _e252.z;
            spdIntermediateA[_e54][_e58] = _e252.w;
            break;
        }
    }
    switch bitcast<i32>(0u) {
        default: {
            if (_e60 <= 8u) {
                break;
            }
            workgroupBarrier();
            if (_e36 < 64u) {
                let _e273 = local;
                let _e276 = local_1;
                let _e278 = spdIntermediateR[_e273][_e276];
                let _e280 = local_2;
                let _e283 = local_3;
                let _e285 = spdIntermediateG[_e280][_e283];
                let _e287 = local_4;
                let _e290 = local_5;
                let _e292 = spdIntermediateB[_e287][_e290];
                let _e294 = local_6;
                let _e297 = local_7;
                let _e299 = spdIntermediateA[_e294][_e297];
                let _e302 = local_8;
                let _e305 = local_9;
                let _e307 = spdIntermediateR[_e302][_e305];
                let _e309 = local_10;
                let _e312 = local_11;
                let _e314 = spdIntermediateG[_e309][_e312];
                let _e316 = local_12;
                let _e319 = local_13;
                let _e321 = spdIntermediateB[_e316][_e319];
                let _e323 = local_14;
                let _e326 = local_15;
                let _e328 = spdIntermediateA[_e323][_e326];
                let _e331 = local_16;
                let _e334 = local_17;
                let _e336 = spdIntermediateR[_e331][_e334];
                let _e338 = local_18;
                let _e341 = local_19;
                let _e343 = spdIntermediateG[_e338][_e341];
                let _e345 = local_20;
                let _e348 = local_21;
                let _e350 = spdIntermediateB[_e345][_e348];
                let _e352 = local_22;
                let _e355 = local_23;
                let _e357 = spdIntermediateA[_e352][_e355];
                let _e360 = local_24;
                let _e363 = local_25;
                let _e365 = spdIntermediateR[_e360][_e363];
                let _e367 = local_26;
                let _e370 = local_27;
                let _e372 = spdIntermediateG[_e367][_e370];
                let _e374 = local_28;
                let _e377 = local_29;
                let _e379 = spdIntermediateB[_e374][_e377];
                let _e381 = local_30;
                let _e384 = local_31;
                let _e386 = spdIntermediateA[_e381][_e384];
                let _e389 = select(0f, 1f, (_e292 > 0f));
                let _e392 = select(0f, 1f, (_e321 > 0f));
                let _e397 = select(0f, 1f, (_e350 > 0f));
                let _e402 = select(0f, 1f, (_e379 > 0f));
                let _e405 = (((_e389 + _e392) + _e397) + _e402);
                let _e409 = (((((vec4<f32>(_e278, _e285, _e292, _e299) * _e389) + (vec4<f32>(_e307, _e314, _e321, _e328) * _e392)) + (vec4<f32>(_e336, _e343, _e350, _e357) * _e397)) + (vec4<f32>(_e365, _e372, _e379, _e386) * _e402)) / vec4(select(1f, _e405, (_e405 > 0.001f))));
                textureStore(rw_inpainting_pyramid8_, bitcast<vec2<u32>>(vec2<i32>(bitcast<i32>(_e54), bitcast<i32>(_e58))), _e409);
                let _e416 = local_32;
                let _e417 = (_e416 + (_e58 % 2u));
                let _e421 = local_33;
                spdIntermediateR[_e417][_e421] = _e409.x;
                let _e426 = local_34;
                spdIntermediateG[_e417][_e426] = _e409.y;
                let _e431 = local_35;
                spdIntermediateB[_e417][_e431] = _e409.z;
                let _e436 = local_36;
                spdIntermediateA[_e417][_e436] = _e409.w;
            }
            if (_e60 <= 9u) {
                break;
            }
            workgroupBarrier();
            if (_e36 < 16u) {
                let _e441 = local_37;
                let _e442 = (_e441 + 1u);
                let _e444 = local_38;
                let _e445 = (_e444 + 3u);
                let _e447 = local_39;
                let _e450 = local_40;
                let _e452 = spdIntermediateR[_e447][_e450];
                let _e454 = local_41;
                let _e457 = local_42;
                let _e459 = spdIntermediateG[_e454][_e457];
                let _e461 = local_43;
                let _e464 = local_44;
                let _e466 = spdIntermediateB[_e461][_e464];
                let _e468 = local_45;
                let _e471 = local_46;
                let _e473 = spdIntermediateA[_e468][_e471];
                let _e476 = local_47;
                let _e479 = local_48;
                let _e481 = spdIntermediateR[_e476][_e479];
                let _e483 = local_49;
                let _e486 = local_50;
                let _e488 = spdIntermediateG[_e483][_e486];
                let _e490 = local_51;
                let _e493 = local_52;
                let _e495 = spdIntermediateB[_e490][_e493];
                let _e497 = local_53;
                let _e500 = local_54;
                let _e502 = spdIntermediateA[_e497][_e500];
                let _e506 = local_55;
                let _e508 = spdIntermediateR[_e442][_e506];
                let _e511 = local_56;
                let _e513 = spdIntermediateG[_e442][_e511];
                let _e516 = local_57;
                let _e518 = spdIntermediateB[_e442][_e516];
                let _e521 = local_58;
                let _e523 = spdIntermediateA[_e442][_e521];
                let _e527 = local_59;
                let _e529 = spdIntermediateR[_e445][_e527];
                let _e532 = local_60;
                let _e534 = spdIntermediateG[_e445][_e532];
                let _e537 = local_61;
                let _e539 = spdIntermediateB[_e445][_e537];
                let _e542 = local_62;
                let _e544 = spdIntermediateA[_e445][_e542];
                let _e547 = select(0f, 1f, (_e466 > 0f));
                let _e550 = select(0f, 1f, (_e495 > 0f));
                let _e555 = select(0f, 1f, (_e518 > 0f));
                let _e560 = select(0f, 1f, (_e539 > 0f));
                let _e563 = (((_e547 + _e550) + _e555) + _e560);
                let _e567 = (((((vec4<f32>(_e452, _e459, _e466, _e473) * _e547) + (vec4<f32>(_e481, _e488, _e495, _e502) * _e550)) + (vec4<f32>(_e508, _e513, _e518, _e523) * _e555)) + (vec4<f32>(_e529, _e534, _e539, _e544) * _e560)) / vec4(select(1f, _e563, (_e563 > 0.001f))));
                textureStore(rw_inpainting_pyramid9_, bitcast<vec2<u32>>(vec2<i32>(bitcast<i32>(_e54), bitcast<i32>(_e58))), _e567);
                let _e573 = local_63;
                let _e574 = (_e573 + _e58);
                let _e578 = local_64;
                spdIntermediateR[_e574][_e578] = _e567.x;
                let _e583 = local_65;
                spdIntermediateG[_e574][_e583] = _e567.y;
                let _e588 = local_66;
                spdIntermediateB[_e574][_e588] = _e567.z;
                let _e593 = local_67;
                spdIntermediateA[_e574][_e593] = _e567.w;
            }
            if (_e60 <= 10u) {
                break;
            }
            workgroupBarrier();
            if (_e36 < 4u) {
                let _e597 = (_e54 * 8u);
                let _e599 = local_68;
                let _e600 = (_e597 + _e599);
                let _e601 = (_e58 * 8u);
                let _e604 = local_69;
                let _e605 = ((_e597 + 4u) + _e604);
                let _e608 = local_70;
                let _e609 = ((_e597 + 1u) + _e608);
                let _e610 = (_e601 + 4u);
                let _e613 = local_71;
                let _e614 = ((_e597 + 5u) + _e613);
                let _e617 = spdIntermediateR[_e600][_e601];
                let _e620 = spdIntermediateG[_e600][_e601];
                let _e623 = spdIntermediateB[_e600][_e601];
                let _e626 = spdIntermediateA[_e600][_e601];
                let _e630 = spdIntermediateR[_e605][_e601];
                let _e633 = spdIntermediateG[_e605][_e601];
                let _e636 = spdIntermediateB[_e605][_e601];
                let _e639 = spdIntermediateA[_e605][_e601];
                let _e643 = spdIntermediateR[_e609][_e610];
                let _e646 = spdIntermediateG[_e609][_e610];
                let _e649 = spdIntermediateB[_e609][_e610];
                let _e652 = spdIntermediateA[_e609][_e610];
                let _e656 = spdIntermediateR[_e614][_e610];
                let _e659 = spdIntermediateG[_e614][_e610];
                let _e662 = spdIntermediateB[_e614][_e610];
                let _e665 = spdIntermediateA[_e614][_e610];
                let _e668 = select(0f, 1f, (_e623 > 0f));
                let _e671 = select(0f, 1f, (_e636 > 0f));
                let _e676 = select(0f, 1f, (_e649 > 0f));
                let _e681 = select(0f, 1f, (_e662 > 0f));
                let _e684 = (((_e668 + _e671) + _e676) + _e681);
                let _e688 = (((((vec4<f32>(_e617, _e620, _e623, _e626) * _e668) + (vec4<f32>(_e630, _e633, _e636, _e639) * _e671)) + (vec4<f32>(_e643, _e646, _e649, _e652) * _e676)) + (vec4<f32>(_e656, _e659, _e662, _e665) * _e681)) / vec4(select(1f, _e684, (_e684 > 0.001f))));
                textureStore(rw_inpainting_pyramid10_, bitcast<vec2<u32>>(vec2<i32>(bitcast<i32>(_e54), bitcast<i32>(_e58))), _e688);
                let _e694 = local_72;
                let _e695 = (_e54 + _e694);
                spdIntermediateR[_e695][0u] = _e688.x;
                spdIntermediateG[_e695][0u] = _e688.y;
                spdIntermediateB[_e695][0u] = _e688.z;
                spdIntermediateA[_e695][0u] = _e688.w;
            }
            if (_e60 <= 11u) {
                break;
            }
            workgroupBarrier();
            if (_e36 < 1u) {
                let _e712 = spdIntermediateR[0u][0u];
                let _e715 = spdIntermediateG[0u][0u];
                let _e718 = spdIntermediateB[0u][0u];
                let _e721 = spdIntermediateA[0u][0u];
                let _e725 = spdIntermediateR[1u][0u];
                let _e728 = spdIntermediateG[1u][0u];
                let _e731 = spdIntermediateB[1u][0u];
                let _e734 = spdIntermediateA[1u][0u];
                let _e738 = spdIntermediateR[2u][0u];
                let _e741 = spdIntermediateG[2u][0u];
                let _e744 = spdIntermediateB[2u][0u];
                let _e747 = spdIntermediateA[2u][0u];
                let _e751 = spdIntermediateR[3u][0u];
                let _e754 = spdIntermediateG[3u][0u];
                let _e757 = spdIntermediateB[3u][0u];
                let _e760 = spdIntermediateA[3u][0u];
                let _e763 = select(0f, 1f, (_e718 > 0f));
                let _e766 = select(0f, 1f, (_e731 > 0f));
                let _e771 = select(0f, 1f, (_e744 > 0f));
                let _e776 = select(0f, 1f, (_e757 > 0f));
                let _e779 = (((_e763 + _e766) + _e771) + _e776);
                textureStore(rw_inpainting_pyramid11_, vec2<u32>(0u, 0u), (((((vec4<f32>(_e712, _e715, _e718, _e721) * _e763) + (vec4<f32>(_e725, _e728, _e731, _e734) * _e766)) + (vec4<f32>(_e738, _e741, _e744, _e747) * _e771)) + (vec4<f32>(_e751, _e754, _e757, _e760) * _e776)) / vec4(select(1f, _e779, (_e779 > 0.001f)))));
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
`;
