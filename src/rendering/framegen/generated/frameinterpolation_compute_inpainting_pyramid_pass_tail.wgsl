// AMD FidelityFX SDK v2.3.0, Frame Interpolation 3.1.6.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL; scripts/fg/compile.mjs.
struct type_u002e_cbInpaintingPyramid {
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
    var phi_122_: vec4<f32>;
    var phi_164_: vec4<f32>;
    var phi_206_: vec4<f32>;
    var phi_244_: vec4<f32>;
    var phi_271_: vec4<f32>;
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
    var phi_346_: vec4<f32>;
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
    var phi_423_: vec4<f32>;
    var local_63: u32;
    var local_64: u32;
    var local_65: u32;
    var local_66: u32;
    var local_67: u32;
    var local_68: u32;
    var local_69: u32;
    var local_70: u32;
    var local_71: u32;
    var phi_507_: vec4<f32>;
    var local_72: u32;
    var phi_581_: vec4<f32>;

    let _e35 = global;
    let _e36 = (_e35 % 64u);
    let _e53 = (((_e36 & 1u) | ((_e36 >> bitcast<u32>(2u)) & 6u)) + (8u * ((_e35 >> bitcast<u32>(6u)) % 2u)));
    let _e57 = ((((_e36 >> bitcast<u32>(1u)) & 3u) | ((_e36 >> bitcast<u32>(3u)) & 4u)) + (8u * (_e35 >> bitcast<u32>(7u))));
    let _e59 = cbInpaintingPyramid.mips;
    switch bitcast<i32>(0u) {
        default: {
            let _e61 = (_e53 * 4u);
            let _e62 = bitcast<i32>(_e61);
            let _e63 = (_e57 * 4u);
            let _e64 = bitcast<i32>(_e63);
            let _e66 = (_e53 * 2u);
            let _e67 = bitcast<i32>(_e66);
            let _e68 = (_e57 * 2u);
            let _e69 = bitcast<i32>(_e68);
            let _e71 = bitcast<vec2<u32>>(vec2<i32>(_e62, _e64));
            let _e75 = textureLoad(rw_inpainting_pyramid5_, _e71, 0);
            let _e76 = textureLoad(rw_inpainting_pyramid5_, (_e71 + vec2<u32>(0u, 1u)), 0);
            let _e77 = textureLoad(rw_inpainting_pyramid5_, (_e71 + vec2<u32>(1u, 0u)), 0);
            let _e78 = textureLoad(rw_inpainting_pyramid5_, (_e71 + vec2<u32>(1u, 1u)), 0);
            local = _e66;
            local_1 = _e68;
            local_2 = _e66;
            local_3 = _e68;
            local_4 = _e66;
            local_5 = _e68;
            local_6 = _e66;
            local_7 = _e68;
            local_9 = _e68;
            local_11 = _e68;
            local_13 = _e68;
            local_15 = _e68;
            local_16 = _e66;
            local_18 = _e66;
            local_20 = _e66;
            local_22 = _e66;
            local_32 = _e66;
            local_33 = _e68;
            local_34 = _e68;
            local_35 = _e68;
            local_36 = _e68;
            local_37 = _e61;
            local_38 = _e61;
            local_39 = _e61;
            local_40 = _e63;
            local_41 = _e61;
            local_42 = _e63;
            local_43 = _e61;
            local_44 = _e63;
            local_45 = _e61;
            local_46 = _e63;
            local_48 = _e63;
            local_50 = _e63;
            local_52 = _e63;
            local_54 = _e63;
            local_63 = _e61;
            local_64 = _e63;
            local_65 = _e63;
            local_66 = _e63;
            local_67 = _e63;
            local_68 = _e68;
            local_69 = _e68;
            local_70 = _e68;
            local_71 = _e68;
            local_72 = _e68;
            switch bitcast<i32>(0u) {
                default: {
                    let _e86 = (((_e75.w + _e76.w) + _e77.w) + _e78.w);
                    if (_e86 == 0f) {
                        phi_122_ = vec4<f32>(0f, 0f, 0f, 0f);
                        break;
                    }
                    phi_122_ = (((((_e75 * _e75.w) + (_e76 * _e76.w)) + (_e77 * _e77.w)) + (_e78 * _e78.w)) / vec4(_e86));
                    break;
                }
            }
            let _e98 = phi_122_;
            textureStore(rw_inpainting_pyramid6_, bitcast<vec2<u32>>(vec2<i32>(_e67, _e69)), _e98);
            let _e100 = (_e61 + 2u);
            let _e101 = bitcast<i32>(_e100);
            let _e103 = (_e66 + 1u);
            let _e104 = bitcast<i32>(_e103);
            let _e106 = bitcast<vec2<u32>>(vec2<i32>(_e101, _e64));
            let _e110 = textureLoad(rw_inpainting_pyramid5_, _e106, 0);
            let _e111 = textureLoad(rw_inpainting_pyramid5_, (_e106 + vec2<u32>(0u, 1u)), 0);
            let _e112 = textureLoad(rw_inpainting_pyramid5_, (_e106 + vec2<u32>(1u, 0u)), 0);
            let _e113 = textureLoad(rw_inpainting_pyramid5_, (_e106 + vec2<u32>(1u, 1u)), 0);
            local_8 = _e103;
            local_10 = _e103;
            local_12 = _e103;
            local_14 = _e103;
            local_24 = _e103;
            local_26 = _e103;
            local_28 = _e103;
            local_30 = _e103;
            local_47 = _e100;
            local_49 = _e100;
            local_51 = _e100;
            local_53 = _e100;
            switch bitcast<i32>(0u) {
                default: {
                    let _e121 = (((_e110.w + _e111.w) + _e112.w) + _e113.w);
                    if (_e121 == 0f) {
                        phi_164_ = vec4<f32>(0f, 0f, 0f, 0f);
                        break;
                    }
                    phi_164_ = (((((_e110 * _e110.w) + (_e111 * _e111.w)) + (_e112 * _e112.w)) + (_e113 * _e113.w)) / vec4(_e121));
                    break;
                }
            }
            let _e133 = phi_164_;
            textureStore(rw_inpainting_pyramid6_, bitcast<vec2<u32>>(vec2<i32>(_e104, _e69)), _e133);
            let _e135 = (_e63 + 2u);
            let _e136 = bitcast<i32>(_e135);
            let _e138 = (_e68 + 1u);
            let _e139 = bitcast<i32>(_e138);
            let _e141 = bitcast<vec2<u32>>(vec2<i32>(_e62, _e136));
            let _e145 = textureLoad(rw_inpainting_pyramid5_, _e141, 0);
            let _e146 = textureLoad(rw_inpainting_pyramid5_, (_e141 + vec2<u32>(0u, 1u)), 0);
            let _e147 = textureLoad(rw_inpainting_pyramid5_, (_e141 + vec2<u32>(1u, 0u)), 0);
            let _e148 = textureLoad(rw_inpainting_pyramid5_, (_e141 + vec2<u32>(1u, 1u)), 0);
            local_17 = _e138;
            local_19 = _e138;
            local_21 = _e138;
            local_23 = _e138;
            local_25 = _e138;
            local_27 = _e138;
            local_29 = _e138;
            local_31 = _e138;
            local_55 = _e135;
            local_56 = _e135;
            local_57 = _e135;
            local_58 = _e135;
            local_59 = _e135;
            local_60 = _e135;
            local_61 = _e135;
            local_62 = _e135;
            switch bitcast<i32>(0u) {
                default: {
                    let _e156 = (((_e145.w + _e146.w) + _e147.w) + _e148.w);
                    if (_e156 == 0f) {
                        phi_206_ = vec4<f32>(0f, 0f, 0f, 0f);
                        break;
                    }
                    phi_206_ = (((((_e145 * _e145.w) + (_e146 * _e146.w)) + (_e147 * _e147.w)) + (_e148 * _e148.w)) / vec4(_e156));
                    break;
                }
            }
            let _e168 = phi_206_;
            textureStore(rw_inpainting_pyramid6_, bitcast<vec2<u32>>(vec2<i32>(_e67, _e139)), _e168);
            let _e172 = bitcast<vec2<u32>>(vec2<i32>(_e101, _e136));
            let _e176 = textureLoad(rw_inpainting_pyramid5_, _e172, 0);
            let _e177 = textureLoad(rw_inpainting_pyramid5_, (_e172 + vec2<u32>(0u, 1u)), 0);
            let _e178 = textureLoad(rw_inpainting_pyramid5_, (_e172 + vec2<u32>(1u, 0u)), 0);
            let _e179 = textureLoad(rw_inpainting_pyramid5_, (_e172 + vec2<u32>(1u, 1u)), 0);
            switch bitcast<i32>(0u) {
                default: {
                    let _e187 = (((_e176.w + _e177.w) + _e178.w) + _e179.w);
                    if (_e187 == 0f) {
                        phi_244_ = vec4<f32>(0f, 0f, 0f, 0f);
                        break;
                    }
                    phi_244_ = (((((_e176 * _e176.w) + (_e177 * _e177.w)) + (_e178 * _e178.w)) + (_e179 * _e179.w)) / vec4(_e187));
                    break;
                }
            }
            let _e199 = phi_244_;
            textureStore(rw_inpainting_pyramid6_, bitcast<vec2<u32>>(vec2<i32>(_e104, _e139)), _e199);
            if (_e59 <= 7u) {
                break;
            }
            switch bitcast<i32>(0u) {
                default: {
                    let _e209 = (((_e98.w + _e133.w) + _e168.w) + _e199.w);
                    if (_e209 == 0f) {
                        phi_271_ = vec4<f32>(0f, 0f, 0f, 0f);
                        break;
                    }
                    phi_271_ = (((((_e98 * _e98.w) + (_e133 * _e133.w)) + (_e168 * _e168.w)) + (_e199 * _e199.w)) / vec4(_e209));
                    break;
                }
            }
            let _e221 = phi_271_;
            textureStore(rw_inpainting_pyramid7_, bitcast<vec2<u32>>(vec2<i32>(bitcast<i32>(_e53), bitcast<i32>(_e57))), _e221);
            spdIntermediateR[_e53][_e57] = _e221.x;
            spdIntermediateG[_e53][_e57] = _e221.y;
            spdIntermediateB[_e53][_e57] = _e221.z;
            spdIntermediateA[_e53][_e57] = _e221.w;
            break;
        }
    }
    switch bitcast<i32>(0u) {
        default: {
            if (_e59 <= 8u) {
                break;
            }
            workgroupBarrier();
            if (_e35 < 64u) {
                let _e242 = local;
                let _e245 = local_1;
                let _e247 = spdIntermediateR[_e242][_e245];
                let _e249 = local_2;
                let _e252 = local_3;
                let _e254 = spdIntermediateG[_e249][_e252];
                let _e256 = local_4;
                let _e259 = local_5;
                let _e261 = spdIntermediateB[_e256][_e259];
                let _e263 = local_6;
                let _e266 = local_7;
                let _e268 = spdIntermediateA[_e263][_e266];
                let _e271 = local_8;
                let _e274 = local_9;
                let _e276 = spdIntermediateR[_e271][_e274];
                let _e278 = local_10;
                let _e281 = local_11;
                let _e283 = spdIntermediateG[_e278][_e281];
                let _e285 = local_12;
                let _e288 = local_13;
                let _e290 = spdIntermediateB[_e285][_e288];
                let _e292 = local_14;
                let _e295 = local_15;
                let _e297 = spdIntermediateA[_e292][_e295];
                let _e300 = local_16;
                let _e303 = local_17;
                let _e305 = spdIntermediateR[_e300][_e303];
                let _e307 = local_18;
                let _e310 = local_19;
                let _e312 = spdIntermediateG[_e307][_e310];
                let _e314 = local_20;
                let _e317 = local_21;
                let _e319 = spdIntermediateB[_e314][_e317];
                let _e321 = local_22;
                let _e324 = local_23;
                let _e326 = spdIntermediateA[_e321][_e324];
                let _e329 = local_24;
                let _e332 = local_25;
                let _e334 = spdIntermediateR[_e329][_e332];
                let _e336 = local_26;
                let _e339 = local_27;
                let _e341 = spdIntermediateG[_e336][_e339];
                let _e343 = local_28;
                let _e346 = local_29;
                let _e348 = spdIntermediateB[_e343][_e346];
                let _e350 = local_30;
                let _e353 = local_31;
                let _e355 = spdIntermediateA[_e350][_e353];
                switch bitcast<i32>(0u) {
                    default: {
                        let _e360 = (((_e268 + _e297) + _e326) + _e355);
                        if (_e360 == 0f) {
                            phi_346_ = vec4<f32>(0f, 0f, 0f, 0f);
                            break;
                        }
                        phi_346_ = (((((vec4<f32>(_e247, _e254, _e261, _e268) * _e268) + (vec4<f32>(_e276, _e283, _e290, _e297) * _e297)) + (vec4<f32>(_e305, _e312, _e319, _e326) * _e326)) + (vec4<f32>(_e334, _e341, _e348, _e355) * _e355)) / vec4(_e360));
                        break;
                    }
                }
                let _e372 = phi_346_;
                textureStore(rw_inpainting_pyramid8_, bitcast<vec2<u32>>(vec2<i32>(bitcast<i32>(_e53), bitcast<i32>(_e57))), _e372);
                let _e379 = local_32;
                let _e380 = (_e379 + (_e57 % 2u));
                let _e384 = local_33;
                spdIntermediateR[_e380][_e384] = _e372.x;
                let _e389 = local_34;
                spdIntermediateG[_e380][_e389] = _e372.y;
                let _e394 = local_35;
                spdIntermediateB[_e380][_e394] = _e372.z;
                let _e399 = local_36;
                spdIntermediateA[_e380][_e399] = _e372.w;
            }
            if (_e59 <= 9u) {
                break;
            }
            workgroupBarrier();
            if (_e35 < 16u) {
                let _e404 = local_37;
                let _e405 = (_e404 + 1u);
                let _e407 = local_38;
                let _e408 = (_e407 + 3u);
                let _e410 = local_39;
                let _e413 = local_40;
                let _e415 = spdIntermediateR[_e410][_e413];
                let _e417 = local_41;
                let _e420 = local_42;
                let _e422 = spdIntermediateG[_e417][_e420];
                let _e424 = local_43;
                let _e427 = local_44;
                let _e429 = spdIntermediateB[_e424][_e427];
                let _e431 = local_45;
                let _e434 = local_46;
                let _e436 = spdIntermediateA[_e431][_e434];
                let _e439 = local_47;
                let _e442 = local_48;
                let _e444 = spdIntermediateR[_e439][_e442];
                let _e446 = local_49;
                let _e449 = local_50;
                let _e451 = spdIntermediateG[_e446][_e449];
                let _e453 = local_51;
                let _e456 = local_52;
                let _e458 = spdIntermediateB[_e453][_e456];
                let _e460 = local_53;
                let _e463 = local_54;
                let _e465 = spdIntermediateA[_e460][_e463];
                let _e469 = local_55;
                let _e471 = spdIntermediateR[_e405][_e469];
                let _e474 = local_56;
                let _e476 = spdIntermediateG[_e405][_e474];
                let _e479 = local_57;
                let _e481 = spdIntermediateB[_e405][_e479];
                let _e484 = local_58;
                let _e486 = spdIntermediateA[_e405][_e484];
                let _e490 = local_59;
                let _e492 = spdIntermediateR[_e408][_e490];
                let _e495 = local_60;
                let _e497 = spdIntermediateG[_e408][_e495];
                let _e500 = local_61;
                let _e502 = spdIntermediateB[_e408][_e500];
                let _e505 = local_62;
                let _e507 = spdIntermediateA[_e408][_e505];
                switch bitcast<i32>(0u) {
                    default: {
                        let _e512 = (((_e436 + _e465) + _e486) + _e507);
                        if (_e512 == 0f) {
                            phi_423_ = vec4<f32>(0f, 0f, 0f, 0f);
                            break;
                        }
                        phi_423_ = (((((vec4<f32>(_e415, _e422, _e429, _e436) * _e436) + (vec4<f32>(_e444, _e451, _e458, _e465) * _e465)) + (vec4<f32>(_e471, _e476, _e481, _e486) * _e486)) + (vec4<f32>(_e492, _e497, _e502, _e507) * _e507)) / vec4(_e512));
                        break;
                    }
                }
                let _e524 = phi_423_;
                textureStore(rw_inpainting_pyramid9_, bitcast<vec2<u32>>(vec2<i32>(bitcast<i32>(_e53), bitcast<i32>(_e57))), _e524);
                let _e530 = local_63;
                let _e531 = (_e530 + _e57);
                let _e535 = local_64;
                spdIntermediateR[_e531][_e535] = _e524.x;
                let _e540 = local_65;
                spdIntermediateG[_e531][_e540] = _e524.y;
                let _e545 = local_66;
                spdIntermediateB[_e531][_e545] = _e524.z;
                let _e550 = local_67;
                spdIntermediateA[_e531][_e550] = _e524.w;
            }
            if (_e59 <= 10u) {
                break;
            }
            workgroupBarrier();
            if (_e35 < 4u) {
                let _e554 = (_e53 * 8u);
                let _e556 = local_68;
                let _e557 = (_e554 + _e556);
                let _e558 = (_e57 * 8u);
                let _e561 = local_69;
                let _e562 = ((_e554 + 4u) + _e561);
                let _e565 = local_70;
                let _e566 = ((_e554 + 1u) + _e565);
                let _e567 = (_e558 + 4u);
                let _e570 = local_71;
                let _e571 = ((_e554 + 5u) + _e570);
                let _e574 = spdIntermediateR[_e557][_e558];
                let _e577 = spdIntermediateG[_e557][_e558];
                let _e580 = spdIntermediateB[_e557][_e558];
                let _e583 = spdIntermediateA[_e557][_e558];
                let _e587 = spdIntermediateR[_e562][_e558];
                let _e590 = spdIntermediateG[_e562][_e558];
                let _e593 = spdIntermediateB[_e562][_e558];
                let _e596 = spdIntermediateA[_e562][_e558];
                let _e600 = spdIntermediateR[_e566][_e567];
                let _e603 = spdIntermediateG[_e566][_e567];
                let _e606 = spdIntermediateB[_e566][_e567];
                let _e609 = spdIntermediateA[_e566][_e567];
                let _e613 = spdIntermediateR[_e571][_e567];
                let _e616 = spdIntermediateG[_e571][_e567];
                let _e619 = spdIntermediateB[_e571][_e567];
                let _e622 = spdIntermediateA[_e571][_e567];
                switch bitcast<i32>(0u) {
                    default: {
                        let _e627 = (((_e583 + _e596) + _e609) + _e622);
                        if (_e627 == 0f) {
                            phi_507_ = vec4<f32>(0f, 0f, 0f, 0f);
                            break;
                        }
                        phi_507_ = (((((vec4<f32>(_e574, _e577, _e580, _e583) * _e583) + (vec4<f32>(_e587, _e590, _e593, _e596) * _e596)) + (vec4<f32>(_e600, _e603, _e606, _e609) * _e609)) + (vec4<f32>(_e613, _e616, _e619, _e622) * _e622)) / vec4(_e627));
                        break;
                    }
                }
                let _e639 = phi_507_;
                textureStore(rw_inpainting_pyramid10_, bitcast<vec2<u32>>(vec2<i32>(bitcast<i32>(_e53), bitcast<i32>(_e57))), _e639);
                let _e645 = local_72;
                let _e646 = (_e53 + _e645);
                spdIntermediateR[_e646][0u] = _e639.x;
                spdIntermediateG[_e646][0u] = _e639.y;
                spdIntermediateB[_e646][0u] = _e639.z;
                spdIntermediateA[_e646][0u] = _e639.w;
            }
            if (_e59 <= 11u) {
                break;
            }
            workgroupBarrier();
            if (_e35 < 1u) {
                let _e663 = spdIntermediateR[0u][0u];
                let _e666 = spdIntermediateG[0u][0u];
                let _e669 = spdIntermediateB[0u][0u];
                let _e672 = spdIntermediateA[0u][0u];
                let _e676 = spdIntermediateR[1u][0u];
                let _e679 = spdIntermediateG[1u][0u];
                let _e682 = spdIntermediateB[1u][0u];
                let _e685 = spdIntermediateA[1u][0u];
                let _e689 = spdIntermediateR[2u][0u];
                let _e692 = spdIntermediateG[2u][0u];
                let _e695 = spdIntermediateB[2u][0u];
                let _e698 = spdIntermediateA[2u][0u];
                let _e702 = spdIntermediateR[3u][0u];
                let _e705 = spdIntermediateG[3u][0u];
                let _e708 = spdIntermediateB[3u][0u];
                let _e711 = spdIntermediateA[3u][0u];
                switch bitcast<i32>(0u) {
                    default: {
                        let _e716 = (((_e672 + _e685) + _e698) + _e711);
                        if (_e716 == 0f) {
                            phi_581_ = vec4<f32>(0f, 0f, 0f, 0f);
                            break;
                        }
                        phi_581_ = (((((vec4<f32>(_e663, _e666, _e669, _e672) * _e672) + (vec4<f32>(_e676, _e679, _e682, _e685) * _e685)) + (vec4<f32>(_e689, _e692, _e695, _e698) * _e698)) + (vec4<f32>(_e702, _e705, _e708, _e711) * _e711)) / vec4(_e716));
                        break;
                    }
                }
                let _e728 = phi_581_;
                textureStore(rw_inpainting_pyramid11_, vec2<u32>(0u, 0u), _e728);
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
