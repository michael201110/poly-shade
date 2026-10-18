// AMD FidelityFX SDK v2.3.0, Frame Interpolation 3.1.6.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL; scripts/fg/compile.mjs.
@group(0) @binding(32) 
var rw_optical_flow_input: texture_2d<u32>;
@group(0) @binding(33) 
var rw_optical_flow_input_level_1_: texture_storage_2d<r32uint,write>;
@group(0) @binding(34) 
var rw_optical_flow_input_level_2_: texture_storage_2d<r32uint,write>;
@group(0) @binding(35) 
var rw_optical_flow_input_level_3_: texture_storage_2d<r32uint,write>;
@group(0) @binding(36) 
var rw_optical_flow_input_level_4_: texture_storage_2d<r32uint,write>;
@group(0) @binding(37) 
var rw_optical_flow_input_level_5_: texture_storage_2d<r32uint,write>;
@group(0) @binding(38) 
var rw_optical_flow_input_level_6_: texture_storage_2d<r32uint,write>;
var<workgroup> spdIntermediateR: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateG: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateB: array<array<f32, 16>, 16>;
var<workgroup> spdIntermediateA: array<array<f32, 16>, 16>;
var<private> global: vec3<i32>;
var<private> global_1: i32;

fn CS_1() {
    var local: array<vec4<f32>, 4>;
    var phi_322_: u32;

    let _e43 = global;
    let _e45 = global_1;
    let _e46 = bitcast<vec2<u32>>(_e43.xy);
    let _e47 = bitcast<u32>(_e45);
    let _e48 = (_e47 % 64u);
    let _e65 = (((_e48 & 1u) | ((_e48 >> bitcast<u32>(2u)) & 6u)) + (8u * ((_e47 >> bitcast<u32>(6u)) % 2u)));
    let _e69 = ((((_e48 >> bitcast<u32>(1u)) & 3u) | ((_e48 >> bitcast<u32>(3u)) & 4u)) + (8u * (_e47 >> bitcast<u32>(7u))));
    let _e71 = bitcast<vec2<i32>>((_e46 * vec2<u32>(64u, 64u)));
    let _e72 = (_e65 * 2u);
    let _e73 = bitcast<i32>(_e72);
    let _e74 = (_e69 * 2u);
    let _e75 = bitcast<i32>(_e74);
    let _e77 = (_e71 + vec2<i32>(_e73, _e75));
    let _e79 = bitcast<vec2<i32>>((_e46 * vec2<u32>(32u, 32u)));
    let _e80 = bitcast<i32>(_e65);
    let _e81 = bitcast<i32>(_e69);
    let _e82 = vec2<i32>(_e80, _e81);
    let _e84 = bitcast<vec2<u32>>(_e77);
    let _e91 = textureLoad(rw_optical_flow_input, bitcast<vec2<u32>>(vec2<i32>(vec2<f32>(_e77))), 0);
    let _e99 = textureLoad(rw_optical_flow_input, bitcast<vec2<u32>>(vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e84 + vec2<u32>(0u, 1u)))))), 0);
    let _e107 = textureLoad(rw_optical_flow_input, bitcast<vec2<u32>>(vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e84 + vec2<u32>(1u, 0u)))))), 0);
    let _e115 = textureLoad(rw_optical_flow_input, bitcast<vec2<u32>>(vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e84 + vec2<u32>(1u, 1u)))))), 0);
    local[0i] = ((((vec4<f32>(f32(_e91.x), 0f, 0f, 0f) + vec4<f32>(f32(_e99.x), 0f, 0f, 0f)) + vec4<f32>(f32(_e107.x), 0f, 0f, 0f)) + vec4<f32>(f32(_e115.x), 0f, 0f, 0f)) * 0.25f);
    let _e124 = local[0i];
    textureStore(rw_optical_flow_input_level_1_, bitcast<vec2<u32>>((_e79 + _e82)), vec4(u32(_e124.x)));
    let _e130 = bitcast<i32>((_e72 + 32u));
    let _e132 = (_e71 + vec2<i32>(_e130, _e75));
    let _e134 = bitcast<i32>((_e65 + 16u));
    let _e137 = bitcast<vec2<u32>>(_e132);
    let _e144 = textureLoad(rw_optical_flow_input, bitcast<vec2<u32>>(vec2<i32>(vec2<f32>(_e132))), 0);
    let _e152 = textureLoad(rw_optical_flow_input, bitcast<vec2<u32>>(vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e137 + vec2<u32>(0u, 1u)))))), 0);
    let _e160 = textureLoad(rw_optical_flow_input, bitcast<vec2<u32>>(vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e137 + vec2<u32>(1u, 0u)))))), 0);
    let _e168 = textureLoad(rw_optical_flow_input, bitcast<vec2<u32>>(vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e137 + vec2<u32>(1u, 1u)))))), 0);
    local[1i] = ((((vec4<f32>(f32(_e144.x), 0f, 0f, 0f) + vec4<f32>(f32(_e152.x), 0f, 0f, 0f)) + vec4<f32>(f32(_e160.x), 0f, 0f, 0f)) + vec4<f32>(f32(_e168.x), 0f, 0f, 0f)) * 0.25f);
    let _e177 = local[1i];
    textureStore(rw_optical_flow_input_level_1_, bitcast<vec2<u32>>((_e79 + vec2<i32>(_e134, _e81))), vec4(u32(_e177.x)));
    let _e183 = bitcast<i32>((_e74 + 32u));
    let _e185 = (_e71 + vec2<i32>(_e73, _e183));
    let _e187 = bitcast<i32>((_e69 + 16u));
    let _e190 = bitcast<vec2<u32>>(_e185);
    let _e197 = textureLoad(rw_optical_flow_input, bitcast<vec2<u32>>(vec2<i32>(vec2<f32>(_e185))), 0);
    let _e205 = textureLoad(rw_optical_flow_input, bitcast<vec2<u32>>(vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e190 + vec2<u32>(0u, 1u)))))), 0);
    let _e213 = textureLoad(rw_optical_flow_input, bitcast<vec2<u32>>(vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e190 + vec2<u32>(1u, 0u)))))), 0);
    let _e221 = textureLoad(rw_optical_flow_input, bitcast<vec2<u32>>(vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e190 + vec2<u32>(1u, 1u)))))), 0);
    local[2i] = ((((vec4<f32>(f32(_e197.x), 0f, 0f, 0f) + vec4<f32>(f32(_e205.x), 0f, 0f, 0f)) + vec4<f32>(f32(_e213.x), 0f, 0f, 0f)) + vec4<f32>(f32(_e221.x), 0f, 0f, 0f)) * 0.25f);
    let _e230 = local[2i];
    textureStore(rw_optical_flow_input_level_1_, bitcast<vec2<u32>>((_e79 + vec2<i32>(_e80, _e187))), vec4(u32(_e230.x)));
    let _e236 = (_e71 + vec2<i32>(_e130, _e183));
    let _e239 = bitcast<vec2<u32>>(_e236);
    let _e246 = textureLoad(rw_optical_flow_input, bitcast<vec2<u32>>(vec2<i32>(vec2<f32>(_e236))), 0);
    let _e254 = textureLoad(rw_optical_flow_input, bitcast<vec2<u32>>(vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e239 + vec2<u32>(0u, 1u)))))), 0);
    let _e262 = textureLoad(rw_optical_flow_input, bitcast<vec2<u32>>(vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e239 + vec2<u32>(1u, 0u)))))), 0);
    let _e270 = textureLoad(rw_optical_flow_input, bitcast<vec2<u32>>(vec2<i32>(vec2<f32>(bitcast<vec2<i32>>((_e239 + vec2<u32>(1u, 1u)))))), 0);
    local[3i] = ((((vec4<f32>(f32(_e246.x), 0f, 0f, 0f) + vec4<f32>(f32(_e254.x), 0f, 0f, 0f)) + vec4<f32>(f32(_e262.x), 0f, 0f, 0f)) + vec4<f32>(f32(_e270.x), 0f, 0f, 0f)) * 0.25f);
    let _e279 = local[3i];
    textureStore(rw_optical_flow_input_level_1_, bitcast<vec2<u32>>((_e79 + vec2<i32>(_e134, _e187))), vec4(u32(_e279.x)));
    phi_322_ = 0u;
    loop {
        let _e285 = phi_322_;
        if (_e285 < 4u) {
            let _e288 = local[_e285];
            spdIntermediateR[_e65][_e69] = _e288.x;
            spdIntermediateG[_e65][_e69] = _e288.y;
            spdIntermediateB[_e65][_e69] = _e288.z;
            spdIntermediateA[_e65][_e69] = _e288.w;
            workgroupBarrier();
            if (_e47 < 64u) {
                let _e302 = (_e72 + 1u);
                let _e303 = (_e74 + 1u);
                let _e306 = spdIntermediateR[_e72][_e74];
                let _e309 = spdIntermediateG[_e72][_e74];
                let _e312 = spdIntermediateB[_e72][_e74];
                let _e315 = spdIntermediateA[_e72][_e74];
                let _e319 = spdIntermediateR[_e302][_e74];
                let _e322 = spdIntermediateG[_e302][_e74];
                let _e325 = spdIntermediateB[_e302][_e74];
                let _e328 = spdIntermediateA[_e302][_e74];
                let _e332 = spdIntermediateR[_e72][_e303];
                let _e335 = spdIntermediateG[_e72][_e303];
                let _e338 = spdIntermediateB[_e72][_e303];
                let _e341 = spdIntermediateA[_e72][_e303];
                let _e345 = spdIntermediateR[_e302][_e303];
                let _e348 = spdIntermediateG[_e302][_e303];
                let _e351 = spdIntermediateB[_e302][_e303];
                let _e354 = spdIntermediateA[_e302][_e303];
                local[_e285] = ((((vec4<f32>(_e306, _e309, _e312, _e315) + vec4<f32>(_e319, _e322, _e325, _e328)) + vec4<f32>(_e332, _e335, _e338, _e341)) + vec4<f32>(_e345, _e348, _e351, _e354)) * 0.25f);
                let _e372 = local[_e285];
                textureStore(rw_optical_flow_input_level_2_, bitcast<vec2<u32>>((bitcast<vec2<i32>>((_e46 * vec2<u32>(16u, 16u))) + vec2<i32>(bitcast<i32>((_e65 + ((_e285 % 2u) * 8u))), bitcast<i32>((_e69 + ((_e285 / 2u) * 8u)))))), vec4(u32(_e372.x)));
            }
            workgroupBarrier();
            continue;
        } else {
            break;
        }
        continuing {
            phi_322_ = (_e285 + 1u);
        }
    }
    let _e378 = (_e47 < 64u);
    if _e378 {
        let _e379 = local[0i];
        spdIntermediateR[_e65][_e69] = _e379.x;
        spdIntermediateG[_e65][_e69] = _e379.y;
        spdIntermediateB[_e65][_e69] = _e379.z;
        spdIntermediateA[_e65][_e69] = _e379.w;
        let _e392 = (_e65 + 8u);
        let _e393 = local[1i];
        spdIntermediateR[_e392][_e69] = _e393.x;
        spdIntermediateG[_e392][_e69] = _e393.y;
        spdIntermediateB[_e392][_e69] = _e393.z;
        spdIntermediateA[_e392][_e69] = _e393.w;
        let _e406 = (_e69 + 8u);
        let _e407 = local[2i];
        spdIntermediateR[_e65][_e406] = _e407.x;
        spdIntermediateG[_e65][_e406] = _e407.y;
        spdIntermediateB[_e65][_e406] = _e407.z;
        spdIntermediateA[_e65][_e406] = _e407.w;
        let _e420 = local[3i];
        spdIntermediateR[_e392][_e406] = _e420.x;
        spdIntermediateG[_e392][_e406] = _e420.y;
        spdIntermediateB[_e392][_e406] = _e420.z;
        spdIntermediateA[_e392][_e406] = _e420.w;
    }
    workgroupBarrier();
    if _e378 {
        let _e433 = (_e72 + 1u);
        let _e434 = (_e74 + 1u);
        let _e437 = spdIntermediateR[_e72][_e74];
        let _e440 = spdIntermediateG[_e72][_e74];
        let _e443 = spdIntermediateB[_e72][_e74];
        let _e446 = spdIntermediateA[_e72][_e74];
        let _e450 = spdIntermediateR[_e433][_e74];
        let _e453 = spdIntermediateG[_e433][_e74];
        let _e456 = spdIntermediateB[_e433][_e74];
        let _e459 = spdIntermediateA[_e433][_e74];
        let _e463 = spdIntermediateR[_e72][_e434];
        let _e466 = spdIntermediateG[_e72][_e434];
        let _e469 = spdIntermediateB[_e72][_e434];
        let _e472 = spdIntermediateA[_e72][_e434];
        let _e476 = spdIntermediateR[_e433][_e434];
        let _e479 = spdIntermediateG[_e433][_e434];
        let _e482 = spdIntermediateB[_e433][_e434];
        let _e485 = spdIntermediateA[_e433][_e434];
        let _e490 = ((((vec4<f32>(_e437, _e440, _e443, _e446) + vec4<f32>(_e450, _e453, _e456, _e459)) + vec4<f32>(_e463, _e466, _e469, _e472)) + vec4<f32>(_e476, _e479, _e482, _e485)) * 0.25f);
        textureStore(rw_optical_flow_input_level_3_, bitcast<vec2<u32>>((bitcast<vec2<i32>>((_e46 * vec2<u32>(8u, 8u))) + _e82)), vec4(u32(_e490.x)));
        let _e499 = (_e72 + (_e69 % 2u));
        spdIntermediateR[_e499][_e74] = _e490.x;
        spdIntermediateG[_e499][_e74] = _e490.y;
        spdIntermediateB[_e499][_e74] = _e490.z;
        spdIntermediateA[_e499][_e74] = _e490.w;
    }
    workgroupBarrier();
    if (_e47 < 16u) {
        let _e512 = (_e65 * 4u);
        let _e513 = (_e69 * 4u);
        let _e514 = (_e512 + 2u);
        let _e515 = (_e512 + 1u);
        let _e516 = (_e513 + 2u);
        let _e517 = (_e512 + 3u);
        let _e520 = spdIntermediateR[_e512][_e513];
        let _e523 = spdIntermediateG[_e512][_e513];
        let _e526 = spdIntermediateB[_e512][_e513];
        let _e529 = spdIntermediateA[_e512][_e513];
        let _e533 = spdIntermediateR[_e514][_e513];
        let _e536 = spdIntermediateG[_e514][_e513];
        let _e539 = spdIntermediateB[_e514][_e513];
        let _e542 = spdIntermediateA[_e514][_e513];
        let _e546 = spdIntermediateR[_e515][_e516];
        let _e549 = spdIntermediateG[_e515][_e516];
        let _e552 = spdIntermediateB[_e515][_e516];
        let _e555 = spdIntermediateA[_e515][_e516];
        let _e559 = spdIntermediateR[_e517][_e516];
        let _e562 = spdIntermediateG[_e517][_e516];
        let _e565 = spdIntermediateB[_e517][_e516];
        let _e568 = spdIntermediateA[_e517][_e516];
        let _e573 = ((((vec4<f32>(_e520, _e523, _e526, _e529) + vec4<f32>(_e533, _e536, _e539, _e542)) + vec4<f32>(_e546, _e549, _e552, _e555)) + vec4<f32>(_e559, _e562, _e565, _e568)) * 0.25f);
        textureStore(rw_optical_flow_input_level_4_, bitcast<vec2<u32>>((bitcast<vec2<i32>>((_e46 * vec2<u32>(4u, 4u))) + _e82)), vec4(u32(_e573.x)));
        let _e581 = (_e512 + _e69);
        spdIntermediateR[_e581][_e513] = _e573.x;
        spdIntermediateG[_e581][_e513] = _e573.y;
        spdIntermediateB[_e581][_e513] = _e573.z;
        spdIntermediateA[_e581][_e513] = _e573.w;
    }
    workgroupBarrier();
    if (_e47 < 4u) {
        let _e594 = (_e65 * 8u);
        let _e595 = (_e594 + _e74);
        let _e596 = (_e69 * 8u);
        let _e598 = ((_e594 + 4u) + _e74);
        let _e600 = ((_e594 + 1u) + _e74);
        let _e601 = (_e596 + 4u);
        let _e603 = ((_e594 + 5u) + _e74);
        let _e606 = spdIntermediateR[_e595][_e596];
        let _e609 = spdIntermediateG[_e595][_e596];
        let _e612 = spdIntermediateB[_e595][_e596];
        let _e615 = spdIntermediateA[_e595][_e596];
        let _e619 = spdIntermediateR[_e598][_e596];
        let _e622 = spdIntermediateG[_e598][_e596];
        let _e625 = spdIntermediateB[_e598][_e596];
        let _e628 = spdIntermediateA[_e598][_e596];
        let _e632 = spdIntermediateR[_e600][_e601];
        let _e635 = spdIntermediateG[_e600][_e601];
        let _e638 = spdIntermediateB[_e600][_e601];
        let _e641 = spdIntermediateA[_e600][_e601];
        let _e645 = spdIntermediateR[_e603][_e601];
        let _e648 = spdIntermediateG[_e603][_e601];
        let _e651 = spdIntermediateB[_e603][_e601];
        let _e654 = spdIntermediateA[_e603][_e601];
        let _e659 = ((((vec4<f32>(_e606, _e609, _e612, _e615) + vec4<f32>(_e619, _e622, _e625, _e628)) + vec4<f32>(_e632, _e635, _e638, _e641)) + vec4<f32>(_e645, _e648, _e651, _e654)) * 0.25f);
        textureStore(rw_optical_flow_input_level_5_, bitcast<vec2<u32>>((bitcast<vec2<i32>>((_e46 * vec2<u32>(2u, 2u))) + _e82)), vec4(u32(_e659.x)));
        let _e667 = (_e65 + _e74);
        spdIntermediateR[_e667][0u] = _e659.x;
        spdIntermediateG[_e667][0u] = _e659.y;
        spdIntermediateB[_e667][0u] = _e659.z;
        spdIntermediateA[_e667][0u] = _e659.w;
    }
    workgroupBarrier();
    if (_e47 < 1u) {
        let _e682 = spdIntermediateR[0u][0u];
        let _e686 = spdIntermediateR[1u][0u];
        let _e690 = spdIntermediateR[2u][0u];
        let _e694 = spdIntermediateR[3u][0u];
        textureStore(rw_optical_flow_input_level_6_, _e46, vec4(u32(((((vec4<f32>(_e682, f32(), f32(), f32()) + vec4<f32>(_e686, f32(), f32(), f32())) + vec4<f32>(_e690, f32(), f32(), f32())) + vec4<f32>(_e694, f32(), f32(), f32())) * 0.25f).x)));
    }
    return;
}

@compute @workgroup_size(256, 1, 1) 
fn CS(@builtin(workgroup_id) param: vec3<u32>, @builtin(local_invocation_index) param_1: u32) {
    global = vec3<i32>(param);
    global_1 = i32(param_1);
    CS_1();
}
