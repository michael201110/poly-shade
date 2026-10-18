// AMD FidelityFX SDK v2.3.0, Frame Interpolation 3.1.6.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL; scripts/fg/compile.mjs.
export default String.raw`enable subgroups;
var<workgroup> polySharedSceneChange:u32;
struct type_u002e_cbPolyShadeFG {
    polyFlowSize: vec2<i32>,
    polyPreviousFlowSize: vec2<i32>,
    polyNextFlowSize: vec2<i32>,
    polyReserved: vec2<i32>,
}

struct type_u002e_cbOF {
    iInputLumaResolution: vec2<i32>,
    uOpticalFlowPyramidLevel: u32,
    uOpticalFlowPyramidLevelCount: u32,
    iFrameIndex: u32,
    backbufferTransferFunction: u32,
    minMaxLuminance: vec2<f32>,
}

struct type_u002e_RWStructuredBuffer_u002e_v2int {
    member: array<vec2<i32>>,
}

struct type_u002e_RWStructuredBuffer_u002e_uint {
    member: array<u32>,
}

@group(0) @binding(2) 
var<uniform> cbPolyShadeFG: type_u002e_cbPolyShadeFG;
@group(0) @binding(0) 
var<uniform> cbOF: type_u002e_cbOF;
@group(0) @binding(8) 
var r_optical_flow_input: texture_2d<u32>;
@group(0) @binding(9) 
var r_optical_flow_previous_input: texture_2d<u32>;
@group(0) @binding(32) 
var<storage, read_write> rw_optical_flow: type_u002e_RWStructuredBuffer_u002e_v2int;
@group(0) @binding(33) 
var<storage, read_write> rw_optical_flow_scd_output: type_u002e_RWStructuredBuffer_u002e_uint;
var<workgroup> pixels: array<array<u32, 2>, 8>;
var<workgroup> searchBuffer: array<array<u32, 144>, 1>;
var<workgroup> sadMapBuffer: array<array<array<u32, 5>, 16>, 4>;
var<workgroup> sWaveSad: array<u32, 2>;
var<workgroup> sWaveMin: array<u32, 2>;



@compute @workgroup_size(64, 1, 1) 
fn CS(@builtin(workgroup_id) param: vec3<u32>, @builtin(local_invocation_index) param_1: u32, @builtin(subgroup_size) param_2: u32, @builtin(subgroup_invocation_id) param_3: u32) {
if (param_1 == 0u) { polySharedSceneChange = rw_optical_flow_scd_output.member[1u]; }
let polyUniformSceneChange = workgroupUniformLoad(&polySharedSceneChange);

    let global = vec3<i32>(param);
    let global_1 = i32(param_1);
    let global_2 = param_2;
    let global_3 = param_3;
    
    var phi_145_: bool;
    var phi_154_: bool;
    var phi_165_: bool;
    var phi_237_: u32;
    var phi_244_: u32;
    var phi_251_: u32;
    var phi_252_: u32;
    var phi_259_: u32;
    var phi_265_: u32;
    var phi_271_: u32;
    var phi_272_: u32;
    var phi_304_: u32;
    var phi_311_: u32;
    var phi_318_: u32;
    var phi_319_: u32;
    var phi_326_: u32;
    var phi_332_: u32;
    var phi_338_: u32;
    var phi_339_: u32;
    var phi_377_: vec2<i32>;
    var phi_386_: vec2<i32>;
    var phi_404_: bool;
    var phi_416_: vec2<i32>;
    var phi_437_: i32;
    var phi_492_: u32;
    var phi_499_: u32;
    var phi_506_: u32;
    var phi_507_: u32;
    var phi_514_: u32;
    var phi_520_: u32;
    var phi_526_: u32;
    var phi_527_: u32;
    var phi_530_: vec4<u32>;
    var phi_533_: i32;
    var local: vec4<u32>;
    var local_1: vec4<u32>;
    var local_2: vec4<u32>;
    var local_3: vec4<u32>;
    var phi_880_: u32;
    var phi_905_: u32;
    var phi_911_: bool;
    var local_4: bool;
    var phi_920_: bool;
    var local_5: vec2<i32>;
    var local_6: vec2<i32>;

    let _e64 = global;
    let _e65 = _e64.xy;
    let _e66 = global_1;
    switch bitcast<i32>(0u) {
        default: {
            let _e68 = bitcast<u32>(_e66);
            let _e70 = bitcast<i32>((_e68 & 3u));
            let _e74 = bitcast<i32>(((_e68 >> bitcast<u32>(2u)) & 15u));
            let _e85 = bitcast<i32>((((_e68 >> bitcast<u32>(1u)) & 1u) | (((_e68 >> bitcast<u32>(5u)) & 1u) << bitcast<u32>(1u))));
            let _e87 = (_e65 << bitcast<vec2<u32>>(vec2<i32>(4i, 4i)));
            let _e89 = (_e87 + (vec2<i32>(_e70, _e74) * vec2<i32>(4i, 1i)));
            let _e91 = (_e89 >> bitcast<vec2<u32>>(vec2<i32>(3i, 3i)));
            switch bitcast<i32>(0u) {
                default: {
                    let _e94 = cbOF.iFrameIndex;
                    if (_e94 <= 5u) {
                        phi_145_ = true;
                        break;
                    } else {
                        let _e98 = polyUniformSceneChange;
                        phi_145_ = ((_e98 & 15u) != 0u);
                        break;
                    }
                }
            }
            let _e102 = phi_145_;
            if _e102 {
                phi_154_ = false;
                if ((_e74 & 7i) == 0i) {
                    phi_154_ = ((_e70 & 1i) == 0i);
                }
                let _e108 = phi_154_;
                if _e108 {
                    phi_165_ = false;
                    if all((_e91 >= vec2<i32>(0i, 0i))) {
                        let _e112 = cbPolyShadeFG.polyFlowSize;
                        phi_165_ = all((_e91 < _e112));
                    }
                    let _e116 = phi_165_;
                    if _e116 {
                        let _e120 = cbPolyShadeFG.polyFlowSize[0i];
                        rw_optical_flow.member[bitcast<u32>(((_e91.y * _e120) + _e91.x))] = vec2<i32>(0i, 0i);
                    }
                }
                break;
            }
            let _e128 = cbOF.uOpticalFlowPyramidLevel;
            let _e130 = cbOF.uOpticalFlowPyramidLevelCount;
            let _e133 = cbOF.iInputLumaResolution;
            let _e136 = (bitcast<i32>(_e128) & 31i);
            let _e138 = (_e133.x >> bitcast<u32>(_e136));
            let _e142 = (_e138 - 4i);
            let _e146 = ((_e133.y >> bitcast<u32>(_e136)) - 1i);
            let _e150 = vec2<i32>(max(0i, min(_e142, _e89.x)), max(0i, min(_e146, _e89.y)));
            let _e151 = bitcast<vec2<u32>>(_e150);
            let _e152 = textureLoad(r_optical_flow_input, _e151, 0u);
            let _e155 = bitcast<vec2<u32>>((_e150 + vec2<i32>(1i, 0i)));
            let _e156 = textureLoad(r_optical_flow_input, _e155, 0u);
            let _e159 = bitcast<vec2<u32>>((_e150 + vec2<i32>(2i, 0i)));
            let _e160 = textureLoad(r_optical_flow_input, _e159, 0u);
            let _e163 = bitcast<vec2<u32>>((_e150 + vec2<i32>(3i, 0i)));
            let _e164 = textureLoad(r_optical_flow_input, _e163, 0u);
            let _e174 = (((_e152.x | (_e156.x << bitcast<u32>(8u))) | (_e160.x << bitcast<u32>(16u))) | (_e164.x << bitcast<u32>(24u)));
            let _e175 = (_e89.x < 0i);
            if _e175 {
                let _e201 = (_e174 & 255u);
                phi_259_ = _e174;
                if (_e89.x <= -1i) {
                    phi_259_ = ((_e174 << bitcast<u32>(8u)) | _e201);
                }
                let _e207 = phi_259_;
                phi_265_ = _e207;
                if (_e89.x <= -2i) {
                    phi_265_ = ((_e207 << bitcast<u32>(8u)) | _e201);
                }
                let _e213 = phi_265_;
                phi_271_ = _e213;
                if (_e89.x <= -3i) {
                    phi_271_ = ((_e213 << bitcast<u32>(8u)) | _e201);
                }
                let _e219 = phi_271_;
                phi_272_ = _e219;
            } else {
                phi_252_ = _e174;
                if (_e89.x > _e142) {
                    let _e177 = (_e174 & 4278190080u);
                    phi_237_ = _e174;
                    if (_e89.x >= (_e138 - 3i)) {
                        phi_237_ = ((_e174 >> bitcast<u32>(8u)) | _e177);
                    }
                    let _e184 = phi_237_;
                    phi_244_ = _e184;
                    if (_e89.x >= (_e138 - 2i)) {
                        phi_244_ = ((_e184 >> bitcast<u32>(8u)) | _e177);
                    }
                    let _e191 = phi_244_;
                    phi_251_ = _e191;
                    if (_e89.x >= (_e138 - 1i)) {
                        phi_251_ = ((_e191 >> bitcast<u32>(8u)) | _e177);
                    }
                    let _e198 = phi_251_;
                    phi_252_ = _e198;
                }
                let _e200 = phi_252_;
                phi_272_ = _e200;
            }
            let _e221 = phi_272_;
            let _e222 = textureLoad(r_optical_flow_previous_input, _e151, 0u);
            let _e224 = textureLoad(r_optical_flow_previous_input, _e155, 0u);
            let _e226 = textureLoad(r_optical_flow_previous_input, _e159, 0u);
            let _e228 = textureLoad(r_optical_flow_previous_input, _e163, 0u);
            let _e238 = (((_e222.x | (_e224.x << bitcast<u32>(8u))) | (_e226.x << bitcast<u32>(16u))) | (_e228.x << bitcast<u32>(24u)));
            if _e175 {
                let _e264 = (_e238 & 255u);
                phi_326_ = _e238;
                if (_e89.x <= -1i) {
                    phi_326_ = ((_e238 << bitcast<u32>(8u)) | _e264);
                }
                let _e270 = phi_326_;
                phi_332_ = _e270;
                if (_e89.x <= -2i) {
                    phi_332_ = ((_e270 << bitcast<u32>(8u)) | _e264);
                }
                let _e276 = phi_332_;
                phi_338_ = _e276;
                if (_e89.x <= -3i) {
                    phi_338_ = ((_e276 << bitcast<u32>(8u)) | _e264);
                }
                let _e282 = phi_338_;
                phi_339_ = _e282;
            } else {
                phi_319_ = _e238;
                if (_e89.x > _e142) {
                    let _e240 = (_e238 & 4278190080u);
                    phi_304_ = _e238;
                    if (_e89.x >= (_e138 - 3i)) {
                        phi_304_ = ((_e238 >> bitcast<u32>(8u)) | _e240);
                    }
                    let _e247 = phi_304_;
                    phi_311_ = _e247;
                    if (_e89.x >= (_e138 - 2i)) {
                        phi_311_ = ((_e247 >> bitcast<u32>(8u)) | _e240);
                    }
                    let _e254 = phi_311_;
                    phi_318_ = _e254;
                    if (_e89.x >= (_e138 - 1i)) {
                        phi_318_ = ((_e254 >> bitcast<u32>(8u)) | _e240);
                    }
                    let _e261 = phi_318_;
                    phi_319_ = _e261;
                }
                let _e263 = phi_319_;
                phi_339_ = _e263;
            }
            let _e284 = phi_339_;
            phi_377_ = vec2<i32>(vec2<i32>().x, 0i);
            loop {
                let _e331 = phi_377_;
                if (_e331.y < 2i) {
                    phi_386_ = vec2<i32>(0i, _e331.y);
                    loop {
                        let _e338 = phi_386_;
                        local_5 = _e338;
                        local_6 = _e338;
                        if (_e338.x < 2i) {
                            let _e341 = ((_e65 << bitcast<vec2<u32>>(vec2<i32>(1i, 1i))) + _e338);
                            switch bitcast<i32>(0u) {
                                default: {
                                    let _e344 = all((_e341 >= vec2<i32>(0i, 0i)));
                                    phi_404_ = false;
                                    local_4 = _e344;
                                    if _e344 {
                                        let _e346 = cbPolyShadeFG.polyFlowSize;
                                        phi_404_ = all((_e341 < _e346));
                                    }
                                    let _e350 = phi_404_;
                                    if _e350 {
                                        let _e354 = cbPolyShadeFG.polyFlowSize[0i];
                                        let _e361 = rw_optical_flow.member[bitcast<u32>(((_e341.y * _e354) + _e341.x))];
                                        phi_416_ = _e361;
                                        break;
                                    }
                                    phi_416_ = vec2<i32>(0i, 0i);
                                    break;
                                }
                            }
                            let _e363 = phi_416_;
                            let _e366 = select(_e363, vec2<i32>(0i, 0i), vec2((_e128 == (_e130 - 1u))));
                            let _e369 = ((_e338.y * 2i) + _e338.x);
                            if (_e85 == _e369) {
                                pixels[(_e74 & 7i)][(_e70 & 1i)] = _e221;
                            }
                            let _e377 = ((_e87 + (_e338 * vec2<i32>(8i, 8i))) + _e366);
                            phi_437_ = _e66;
                            loop {
                                let _e383 = phi_437_;
                                if (_e383 < 144i) {
                                    let _e388 = ((_e377.x - 8i) + ((_e383 % 6i) * 4i));
                                    let _e394 = vec2<i32>(max(0i, min(_e142, _e388)), max(0i, min(_e146, ((_e377.y - 8i) + (_e383 / 6i)))));
                                    let _e396 = textureLoad(r_optical_flow_previous_input, bitcast<vec2<u32>>(_e394), 0u);
                                    let _e400 = textureLoad(r_optical_flow_previous_input, bitcast<vec2<u32>>((_e394 + vec2<i32>(1i, 0i))), 0u);
                                    let _e404 = textureLoad(r_optical_flow_previous_input, bitcast<vec2<u32>>((_e394 + vec2<i32>(2i, 0i))), 0u);
                                    let _e408 = textureLoad(r_optical_flow_previous_input, bitcast<vec2<u32>>((_e394 + vec2<i32>(3i, 0i))), 0u);
                                    let _e418 = (((_e396.x | (_e400.x << bitcast<u32>(8u))) | (_e404.x << bitcast<u32>(16u))) | (_e408.x << bitcast<u32>(24u)));
                                    if (_e388 < 0i) {
                                        let _e445 = (_e418 & 255u);
                                        phi_514_ = _e418;
                                        if (_e388 <= -1i) {
                                            phi_514_ = ((_e418 << bitcast<u32>(8u)) | _e445);
                                        }
                                        let _e451 = phi_514_;
                                        phi_520_ = _e451;
                                        if (_e388 <= -2i) {
                                            phi_520_ = ((_e451 << bitcast<u32>(8u)) | _e445);
                                        }
                                        let _e457 = phi_520_;
                                        phi_526_ = _e457;
                                        if (_e388 <= -3i) {
                                            phi_526_ = ((_e457 << bitcast<u32>(8u)) | _e445);
                                        }
                                        let _e463 = phi_526_;
                                        phi_527_ = _e463;
                                    } else {
                                        phi_507_ = _e418;
                                        if (_e388 > _e142) {
                                            let _e421 = (_e418 & 4278190080u);
                                            phi_492_ = _e418;
                                            if (_e388 >= (_e138 - 3i)) {
                                                phi_492_ = ((_e418 >> bitcast<u32>(8u)) | _e421);
                                            }
                                            let _e428 = phi_492_;
                                            phi_499_ = _e428;
                                            if (_e388 >= (_e138 - 2i)) {
                                                phi_499_ = ((_e428 >> bitcast<u32>(8u)) | _e421);
                                            }
                                            let _e435 = phi_499_;
                                            phi_506_ = _e435;
                                            if (_e388 >= (_e138 - 1i)) {
                                                phi_506_ = ((_e435 >> bitcast<u32>(8u)) | _e421);
                                            }
                                            let _e442 = phi_506_;
                                            phi_507_ = _e442;
                                        }
                                        let _e444 = phi_507_;
                                        phi_527_ = _e444;
                                    }
                                    let _e465 = phi_527_;
                                    searchBuffer[0i][_e383] = _e465;
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    phi_437_ = (_e383 + 64i);
                                }
                            }
                            workgroupBarrier();
                            phi_530_ = vec4<u32>(0u, 0u, 0u, 0u);
                            phi_533_ = 0i;
                            loop {
                                let _e470 = phi_530_;
                                let _e472 = phi_533_;
                                local = _e470;
                                local_1 = _e470;
                                local_2 = _e470;
                                local_3 = _e470;
                                if (_e472 < 8i) {
                                    continue;
                                } else {
                                    break;
                                }
                                continuing {
                                    let _e476 = (((_e74 + _e472) * 6i) + _e70);
                                    let _e479 = searchBuffer[0i][_e476];
                                    let _e483 = searchBuffer[0i][(_e476 + 1i)];
                                    let _e487 = searchBuffer[0i][(_e476 + 2i)];
                                    let _e490 = pixels[_e472][0i];
                                    let _e494 = bitcast<i32>((_e490 & 255u));
                                    let _e498 = (_e479 >> bitcast<u32>(8u));
                                    let _e504 = bitcast<i32>(((_e490 >> bitcast<u32>(8u)) & 255u));
                                    let _e515 = bitcast<i32>(((_e490 >> bitcast<u32>(16u)) & 255u));
                                    let _e526 = bitcast<i32>(((_e490 >> bitcast<u32>(24u)) & 255u));
                                    let _e531 = (_e483 & 255u);
                                    let _e534 = (_e498 | (_e531 << bitcast<u32>(24u)));
                                    let _e536 = (_e483 >> bitcast<u32>(8u));
                                    let _e542 = (_e534 >> bitcast<u32>(8u));
                                    let _e563 = (_e536 & 255u);
                                    let _e566 = (_e542 | (_e563 << bitcast<u32>(24u)));
                                    let _e574 = (_e566 >> bitcast<u32>(8u));
                                    let _e598 = (_e574 | (((_e536 >> bitcast<u32>(8u)) & 255u) << bitcast<u32>(24u)));
                                    let _e629 = pixels[_e472][1i];
                                    let _e632 = bitcast<i32>((_e629 & 255u));
                                    let _e639 = bitcast<i32>(((_e629 >> bitcast<u32>(8u)) & 255u));
                                    let _e650 = bitcast<i32>(((_e629 >> bitcast<u32>(16u)) & 255u));
                                    let _e661 = bitcast<i32>(((_e629 >> bitcast<u32>(24u)) & 255u));
                                    let _e669 = (_e536 | ((_e487 & 255u) << bitcast<u32>(24u)));
                                    let _e671 = (_e487 >> bitcast<u32>(8u));
                                    let _e677 = (_e669 >> bitcast<u32>(8u));
                                    let _e701 = (_e677 | ((_e671 & 255u) << bitcast<u32>(24u)));
                                    let _e709 = (_e701 >> bitcast<u32>(8u));
                                    let _e733 = (_e709 | (((_e671 >> bitcast<u32>(8u)) & 255u) << bitcast<u32>(24u)));
                                    phi_530_ = ((_e470 + vec4<u32>(bitcast<u32>((((abs((bitcast<i32>((_e479 & 255u)) - _e494)) + abs((bitcast<i32>((_e498 & 255u)) - _e504))) + abs((bitcast<i32>(((_e479 >> bitcast<u32>(16u)) & 255u)) - _e515))) + abs((bitcast<i32>(((_e479 >> bitcast<u32>(24u)) & 255u)) - _e526)))), bitcast<u32>((((abs((bitcast<i32>((_e534 & 255u)) - _e494)) + abs((bitcast<i32>((_e542 & 255u)) - _e504))) + abs((bitcast<i32>(((_e534 >> bitcast<u32>(16u)) & 255u)) - _e515))) + abs((bitcast<i32>(((_e534 >> bitcast<u32>(24u)) & 255u)) - _e526)))), bitcast<u32>((((abs((bitcast<i32>((_e566 & 255u)) - _e494)) + abs((bitcast<i32>((_e574 & 255u)) - _e504))) + abs((bitcast<i32>(((_e566 >> bitcast<u32>(16u)) & 255u)) - _e515))) + abs((bitcast<i32>(((_e566 >> bitcast<u32>(24u)) & 255u)) - _e526)))), bitcast<u32>((((abs((bitcast<i32>((_e598 & 255u)) - _e494)) + abs((bitcast<i32>(((_e598 >> bitcast<u32>(8u)) & 255u)) - _e504))) + abs((bitcast<i32>(((_e598 >> bitcast<u32>(16u)) & 255u)) - _e515))) + abs((bitcast<i32>(((_e598 >> bitcast<u32>(24u)) & 255u)) - _e526)))))) + vec4<u32>(bitcast<u32>((((abs((bitcast<i32>(_e531) - _e632)) + abs((bitcast<i32>(_e563) - _e639))) + abs((bitcast<i32>(((_e483 >> bitcast<u32>(16u)) & 255u)) - _e650))) + abs((bitcast<i32>(((_e483 >> bitcast<u32>(24u)) & 255u)) - _e661)))), bitcast<u32>((((abs((bitcast<i32>((_e669 & 255u)) - _e632)) + abs((bitcast<i32>((_e677 & 255u)) - _e639))) + abs((bitcast<i32>(((_e669 >> bitcast<u32>(16u)) & 255u)) - _e650))) + abs((bitcast<i32>(((_e669 >> bitcast<u32>(24u)) & 255u)) - _e661)))), bitcast<u32>((((abs((bitcast<i32>((_e701 & 255u)) - _e632)) + abs((bitcast<i32>((_e709 & 255u)) - _e639))) + abs((bitcast<i32>(((_e701 >> bitcast<u32>(16u)) & 255u)) - _e650))) + abs((bitcast<i32>(((_e701 >> bitcast<u32>(24u)) & 255u)) - _e661)))), bitcast<u32>((((abs((bitcast<i32>((_e733 & 255u)) - _e632)) + abs((bitcast<i32>(((_e733 >> bitcast<u32>(8u)) & 255u)) - _e639))) + abs((bitcast<i32>(((_e733 >> bitcast<u32>(16u)) & 255u)) - _e650))) + abs((bitcast<i32>(((_e733 >> bitcast<u32>(24u)) & 255u)) - _e661))))));
                                    phi_533_ = (_e472 + 1i);
                                }
                            }
                            let _e764 = local;
                            let _e768 = (_e70 * 4i);
                            let _e770 = (vec2<i32>(_e768, _e74) - vec2<i32>(8i, 8i));
                            let _e772 = (_e770 >> bitcast<vec2<u32>>(vec2<i32>(31i, 31i)));
                            let _e775 = bitcast<vec2<u32>>(((_e770 + _e772) ^ _e772));
                            let _e785 = bitcast<u32>((_e74 << bitcast<u32>(4i)));
                            sadMapBuffer[0i][_e74][_e70] = ((_e764.x << bitcast<u32>(16u)) | ((((_e775.y << bitcast<u32>(12u)) | (_e775.x << bitcast<u32>(8u))) | _e785) | bitcast<u32>(_e768)));
                            let _e794 = local_1;
                            let _e798 = (_e768 + 1i);
                            let _e800 = (vec2<i32>(_e798, _e74) - vec2<i32>(8i, 8i));
                            let _e802 = (_e800 >> bitcast<vec2<u32>>(vec2<i32>(31i, 31i)));
                            let _e805 = bitcast<vec2<u32>>(((_e800 + _e802) ^ _e802));
                            sadMapBuffer[1i][_e74][_e70] = ((_e794.y << bitcast<u32>(16u)) | ((((_e805.y << bitcast<u32>(12u)) | (_e805.x << bitcast<u32>(8u))) | _e785) | bitcast<u32>(_e798)));
                            let _e821 = local_2;
                            let _e825 = (_e768 + 2i);
                            let _e827 = (vec2<i32>(_e825, _e74) - vec2<i32>(8i, 8i));
                            let _e829 = (_e827 >> bitcast<vec2<u32>>(vec2<i32>(31i, 31i)));
                            let _e832 = bitcast<vec2<u32>>(((_e827 + _e829) ^ _e829));
                            sadMapBuffer[2i][_e74][_e70] = ((_e821.z << bitcast<u32>(16u)) | ((((_e832.y << bitcast<u32>(12u)) | (_e832.x << bitcast<u32>(8u))) | _e785) | bitcast<u32>(_e825)));
                            let _e848 = local_3;
                            let _e852 = (_e768 + 3i);
                            let _e854 = (vec2<i32>(_e852, _e74) - vec2<i32>(8i, 8i));
                            let _e856 = (_e854 >> bitcast<vec2<u32>>(vec2<i32>(31i, 31i)));
                            let _e859 = bitcast<vec2<u32>>(((_e854 + _e856) ^ _e856));
                            sadMapBuffer[3i][_e74][_e70] = ((_e848.w << bitcast<u32>(16u)) | ((((_e859.y << bitcast<u32>(12u)) | (_e859.x << bitcast<u32>(8u))) | _e785) | bitcast<u32>(_e852)));
                            workgroupBarrier();
                            let _e874 = sadMapBuffer[0i][_e74][_e70];
                            let _e875 = sadMapBuffer[1i][_e74][_e70];
                            let _e877 = sadMapBuffer[2i][_e74][_e70];
                            let _e878 = sadMapBuffer[3i][_e74][_e70];
                            let _e881 = subgroupMin(min(min(_e874, _e875), min(_e877, _e878)));
                            let _e882 = global_2;
                            let _e883 = (_e882 == 32u);
                            phi_880_ = _e881;
                            if _e883 {
                                let _e885 = (_e66 >> bitcast<u32>(5i));
                                let _e886 = global_3;
                                if (_e886 == 0u) {
                                    sWaveMin[_e885] = _e881;
                                }
                                workgroupBarrier();
                                let _e891 = sWaveMin[(_e885 ^ 1i)];
                                phi_880_ = min(_e881, _e891);
                            }
                            let _e894 = phi_880_;
                            let _e907 = subgroupAdd(select(bitcast<u32>((((abs((bitcast<i32>((_e221 & 255u)) - bitcast<i32>((_e284 & 255u)))) + abs((bitcast<i32>(((_e221 >> bitcast<u32>(8u)) & 255u)) - bitcast<i32>(((_e284 >> bitcast<u32>(8u)) & 255u))))) + abs((bitcast<i32>(((_e221 >> bitcast<u32>(16u)) & 255u)) - bitcast<i32>(((_e284 >> bitcast<u32>(16u)) & 255u))))) + abs((bitcast<i32>(((_e221 >> bitcast<u32>(24u)) & 255u)) - bitcast<i32>(((_e284 >> bitcast<u32>(24u)) & 255u)))))), 0u, (_e85 != _e369)));
                            phi_905_ = _e907;
                            if _e883 {
                                let _e909 = (_e66 >> bitcast<u32>(5i));
                                let _e910 = global_3;
                                if (_e910 == 0u) {
                                    sWaveSad[_e909] = _e907;
                                }
                                workgroupBarrier();
                                let _e915 = sWaveSad[(_e909 ^ 1i)];
                                phi_905_ = (_e907 + _e915);
                            }
                            let _e918 = phi_905_;
                            phi_911_ = false;
                            if (_e128 == 0u) {
                                phi_911_ = (_e918 <= (_e894 >> bitcast<u32>(16u)));
                            }
                            let _e924 = phi_911_;
                            let _e928 = local_4;
                            phi_920_ = false;
                            if _e928 {
                                let _e930 = cbPolyShadeFG.polyFlowSize;
                                phi_920_ = all((_e341 < _e930));
                            }
                            let _e934 = phi_920_;
                            if _e934 {
                                let _e939 = cbPolyShadeFG.polyFlowSize[0i];
                                rw_optical_flow.member[bitcast<u32>(((_e341.y * _e939) + _e341.x))] = clamp(select((_e366 + vec2<i32>((bitcast<i32>((_e894 & 15u)) - 8i), (bitcast<i32>(((_e894 >> bitcast<u32>(4u)) & 15u)) - 8i))), vec2<i32>(0i, 0i), vec2(_e924)), vec2<i32>(-32768i, -32768i), vec2<i32>(32767i, 32767i));
                            }
                            continue;
                        } else {
                            break;
                        }
                        continuing {
                            phi_386_ = vec2<i32>((_e338.x + 1i), _e338.y);
                        }
                    }
                    continue;
                } else {
                    break;
                }
                continuing {
                    let _e951 = local_5;
                    let _e955 = local_6;
                    phi_377_ = vec2<i32>(_e955.x, (_e951.y + 1i));
                }
            }
            break;
        }
    }
    return;

}
`;
