// AMD FidelityFX SDK v2.3.0, Frame Interpolation 3.1.6.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL; scripts/fg/compile.mjs.
export default String.raw`var<workgroup> polySharedSceneChange:u32;
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

struct type_u002e_StructuredBuffer_u002e_v2int {
    member: array<vec2<i32>>,
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
@group(0) @binding(10) 
var<storage> r_optical_flow: type_u002e_StructuredBuffer_u002e_v2int;
@group(0) @binding(32) 
var<storage, read_write> rw_optical_flow_next_level: type_u002e_RWStructuredBuffer_u002e_v2int;
@group(0) @binding(33) 
var<storage, read_write> rw_optical_flow_scd_output: type_u002e_RWStructuredBuffer_u002e_uint;
var<workgroup> nearestVectors: array<array<array<vec2<i32>, 4>, 4>, 4>;
var<workgroup> localRegion: array<array<array<u32, 4>, 4>, 4>;
var<workgroup> sads: array<array<array<u32, 4>, 4>, 4>;



@compute @workgroup_size(4, 4, 4) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>, @builtin(local_invocation_id) param_1: vec3<u32>, @builtin(local_invocation_index) polyInvocation: u32) {
if (polyInvocation == 0u) { polySharedSceneChange = rw_optical_flow_scd_output.member[1u]; }
let polyUniformSceneChange = workgroupUniformLoad(&polySharedSceneChange);

    let global = vec3<i32>(param);
    let global_1 = vec3<i32>(param_1);
    
    var phi_105_: bool;
    var phi_117_: bool;
    var phi_154_: bool;
    var phi_164_: vec2<i32>;
    var phi_170_: i32;
    var phi_235_: u32;
    var phi_242_: u32;
    var phi_249_: u32;
    var phi_250_: u32;
    var phi_257_: u32;
    var phi_263_: u32;
    var phi_269_: u32;
    var phi_270_: u32;
    var phi_273_: u32;
    var phi_276_: i32;
    var phi_344_: u32;
    var phi_351_: u32;
    var phi_358_: u32;
    var phi_359_: u32;
    var phi_366_: u32;
    var phi_372_: u32;
    var phi_378_: u32;
    var phi_379_: u32;
    var local: u32;
    var phi_421_: u32;
    var phi_424_: u32;
    var phi_426_: i32;
    var phi_422_: u32;
    var phi_425_: u32;
    var local_1: u32;
    var phi_449_: bool;
    var local_2: u32;
    var local_3: u32;
    var local_4: u32;

    let _e45 = global;
    let _e46 = global_1;
    switch bitcast<i32>(0u) {
        default: {
            switch bitcast<i32>(0u) {
                default: {
                    let _e50 = cbOF.iFrameIndex;
                    if (_e50 <= 5u) {
                        phi_105_ = true;
                        break;
                    } else {
                        let _e54 = polyUniformSceneChange;
                        phi_105_ = ((_e54 & 15u) != 0u);
                        break;
                    }
                }
            }
            let _e58 = phi_105_;
            if _e58 {
                let _e59 = _e45.xy;
                phi_117_ = false;
                if all((_e59 >= vec2<i32>(0i, 0i))) {
                    let _e63 = cbPolyShadeFG.polyNextFlowSize;
                    phi_117_ = all((_e59 < _e63));
                }
                let _e67 = phi_117_;
                if _e67 {
                    let _e71 = cbPolyShadeFG.polyNextFlowSize[0i];
                    rw_optical_flow_next_level.member[bitcast<u32>(((_e45.y * _e71) + _e45.x))] = vec2<i32>(0i, 0i);
                }
                break;
            }
            let _e90 = ((_e45.x / 2i) + (((_e46.z % 2i) - 1i) + (_e45.x % 2i)));
            let _e92 = ((_e45.y / 2i) + (((_e46.z / 2i) - 1i) + (_e45.y % 2i)));
            let _e93 = vec2<i32>(_e90, _e92);
            switch bitcast<i32>(0u) {
                default: {
                    phi_154_ = false;
                    if all((_e93 >= vec2<i32>(0i, 0i))) {
                        let _e98 = cbPolyShadeFG.polyFlowSize;
                        phi_154_ = all((_e93 < _e98));
                    }
                    let _e102 = phi_154_;
                    if _e102 {
                        let _e105 = cbPolyShadeFG.polyFlowSize[0i];
                        let _e111 = r_optical_flow.member[bitcast<u32>(((_e92 * _e105) + _e90))];
                        phi_164_ = _e111;
                        break;
                    }
                    phi_164_ = vec2<i32>(0i, 0i);
                    break;
                }
            }
            let _e113 = phi_164_;
            nearestVectors[_e46.z][_e46.y][_e46.x] = (_e113 * vec2<i32>(2i, 2i));
            phi_170_ = _e46.z;
            loop {
                let _e121 = phi_170_;
                if (_e121 < 4i) {
                    let _e123 = (_e45.x * 4i);
                    let _e127 = cbOF.iInputLumaResolution;
                    let _e130 = cbOF.uOpticalFlowPyramidLevel;
                    let _e132 = (bitcast<i32>(_e130) & 31i);
                    let _e134 = (_e127.x >> bitcast<u32>(_e132));
                    let _e138 = (_e134 - 4i);
                    let _e144 = vec2<i32>(max(0i, min(_e138, _e123)), max(0i, min(((_e127.y >> bitcast<u32>(_e132)) - 1i), ((_e45.y * 4i) + _e121))));
                    let _e146 = textureLoad(r_optical_flow_input, bitcast<vec2<u32>>(_e144), 0u);
                    let _e150 = textureLoad(r_optical_flow_input, bitcast<vec2<u32>>((_e144 + vec2<i32>(1i, 0i))), 0u);
                    let _e154 = textureLoad(r_optical_flow_input, bitcast<vec2<u32>>((_e144 + vec2<i32>(2i, 0i))), 0u);
                    let _e158 = textureLoad(r_optical_flow_input, bitcast<vec2<u32>>((_e144 + vec2<i32>(3i, 0i))), 0u);
                    let _e168 = (((_e146.x | (_e150.x << bitcast<u32>(8u))) | (_e154.x << bitcast<u32>(16u))) | (_e158.x << bitcast<u32>(24u)));
                    if (_e123 < 0i) {
                        let _e195 = (_e168 & 255u);
                        phi_257_ = _e168;
                        if (_e123 <= -1i) {
                            phi_257_ = ((_e168 << bitcast<u32>(8u)) | _e195);
                        }
                        let _e201 = phi_257_;
                        phi_263_ = _e201;
                        if (_e123 <= -2i) {
                            phi_263_ = ((_e201 << bitcast<u32>(8u)) | _e195);
                        }
                        let _e207 = phi_263_;
                        phi_269_ = _e207;
                        if (_e123 <= -3i) {
                            phi_269_ = ((_e207 << bitcast<u32>(8u)) | _e195);
                        }
                        let _e213 = phi_269_;
                        phi_270_ = _e213;
                    } else {
                        phi_250_ = _e168;
                        if (_e123 > _e138) {
                            let _e171 = (_e168 & 4278190080u);
                            phi_235_ = _e168;
                            if (_e123 >= (_e134 - 3i)) {
                                phi_235_ = ((_e168 >> bitcast<u32>(8u)) | _e171);
                            }
                            let _e178 = phi_235_;
                            phi_242_ = _e178;
                            if (_e123 >= (_e134 - 2i)) {
                                phi_242_ = ((_e178 >> bitcast<u32>(8u)) | _e171);
                            }
                            let _e185 = phi_242_;
                            phi_249_ = _e185;
                            if (_e123 >= (_e134 - 1i)) {
                                phi_249_ = ((_e185 >> bitcast<u32>(8u)) | _e171);
                            }
                            let _e192 = phi_249_;
                            phi_250_ = _e192;
                        }
                        let _e194 = phi_250_;
                        phi_270_ = _e194;
                    }
                    let _e215 = phi_270_;
                    localRegion[_e121][_e46.y][_e46.x] = _e215;
                    continue;
                } else {
                    break;
                }
                continuing {
                    phi_170_ = (_e121 + 4i);
                }
            }
            workgroupBarrier();
            phi_273_ = 0u;
            phi_276_ = 0i;
            loop {
                let _e221 = phi_273_;
                let _e223 = phi_276_;
                local = _e221;
                if (_e223 < 4i) {
                    let _e229 = (vec2<i32>((_e45.x * 4i), ((_e45.y * 4i) + _e223)) + _e113);
                    let _e231 = cbOF.iInputLumaResolution;
                    let _e234 = cbOF.uOpticalFlowPyramidLevel;
                    let _e236 = (bitcast<i32>(_e234) & 31i);
                    let _e238 = (_e231.x >> bitcast<u32>(_e236));
                    let _e242 = (_e238 - 4i);
                    let _e250 = vec2<i32>(max(0i, min(_e242, _e229.x)), max(0i, min(((_e231.y >> bitcast<u32>(_e236)) - 1i), _e229.y)));
                    let _e252 = textureLoad(r_optical_flow_previous_input, bitcast<vec2<u32>>(_e250), 0u);
                    let _e256 = textureLoad(r_optical_flow_previous_input, bitcast<vec2<u32>>((_e250 + vec2<i32>(1i, 0i))), 0u);
                    let _e260 = textureLoad(r_optical_flow_previous_input, bitcast<vec2<u32>>((_e250 + vec2<i32>(2i, 0i))), 0u);
                    let _e264 = textureLoad(r_optical_flow_previous_input, bitcast<vec2<u32>>((_e250 + vec2<i32>(3i, 0i))), 0u);
                    let _e274 = (((_e252.x | (_e256.x << bitcast<u32>(8u))) | (_e260.x << bitcast<u32>(16u))) | (_e264.x << bitcast<u32>(24u)));
                    if (_e229.x < 0i) {
                        let _e301 = (_e274 & 255u);
                        phi_366_ = _e274;
                        if (_e229.x <= -1i) {
                            phi_366_ = ((_e274 << bitcast<u32>(8u)) | _e301);
                        }
                        let _e307 = phi_366_;
                        phi_372_ = _e307;
                        if (_e229.x <= -2i) {
                            phi_372_ = ((_e307 << bitcast<u32>(8u)) | _e301);
                        }
                        let _e313 = phi_372_;
                        phi_378_ = _e313;
                        if (_e229.x <= -3i) {
                            phi_378_ = ((_e313 << bitcast<u32>(8u)) | _e301);
                        }
                        let _e319 = phi_378_;
                        phi_379_ = _e319;
                    } else {
                        phi_359_ = _e274;
                        if (_e229.x > _e242) {
                            let _e277 = (_e274 & 4278190080u);
                            phi_344_ = _e274;
                            if (_e229.x >= (_e238 - 3i)) {
                                phi_344_ = ((_e274 >> bitcast<u32>(8u)) | _e277);
                            }
                            let _e284 = phi_344_;
                            phi_351_ = _e284;
                            if (_e229.x >= (_e238 - 2i)) {
                                phi_351_ = ((_e284 >> bitcast<u32>(8u)) | _e277);
                            }
                            let _e291 = phi_351_;
                            phi_358_ = _e291;
                            if (_e229.x >= (_e238 - 1i)) {
                                phi_358_ = ((_e291 >> bitcast<u32>(8u)) | _e277);
                            }
                            let _e298 = phi_358_;
                            phi_359_ = _e298;
                        }
                        let _e300 = phi_359_;
                        phi_379_ = _e300;
                    }
                    let _e321 = phi_379_;
                    let _e325 = localRegion[_e223][_e46.y][_e46.x];
                    local_2 = (_e221 + bitcast<u32>((((abs((bitcast<i32>((_e325 & 255u)) - bitcast<i32>((_e321 & 255u)))) + abs((bitcast<i32>(((_e325 >> bitcast<u32>(8u)) & 255u)) - bitcast<i32>(((_e321 >> bitcast<u32>(8u)) & 255u))))) + abs((bitcast<i32>(((_e325 >> bitcast<u32>(16u)) & 255u)) - bitcast<i32>(((_e321 >> bitcast<u32>(16u)) & 255u))))) + abs((bitcast<i32>(((_e325 >> bitcast<u32>(24u)) & 255u)) - bitcast<i32>(((_e321 >> bitcast<u32>(24u)) & 255u)))))));
                    continue;
                } else {
                    break;
                }
                continuing {
                    let _e432 = local_2;
                    phi_273_ = _e432;
                    phi_276_ = (_e223 + 1i);
                }
            }
            let _e372 = local;
            sads[_e46.z][_e46.y][_e46.x] = _e372;
            workgroupBarrier();
            if (_e46.z == 0i) {
                phi_421_ = 4294967295u;
                phi_424_ = 0u;
                phi_426_ = 0i;
                loop {
                    let _e375 = phi_421_;
                    let _e377 = phi_424_;
                    let _e379 = phi_426_;
                    local_1 = _e377;
                    if (_e379 < 4i) {
                        let _e384 = sads[_e379][_e46.y][_e46.x];
                        phi_422_ = _e375;
                        phi_425_ = _e377;
                        if (_e384 < _e375) {
                            let _e386 = sads[_e379][_e46.y][_e46.x];
                            phi_422_ = _e386;
                            phi_425_ = bitcast<u32>(_e379);
                        }
                        let _e389 = phi_422_;
                        let _e391 = phi_425_;
                        local_3 = _e389;
                        local_4 = _e391;
                        continue;
                    } else {
                        break;
                    }
                    continuing {
                        let _e445 = local_3;
                        phi_421_ = _e445;
                        let _e448 = local_4;
                        phi_424_ = _e448;
                        phi_426_ = (_e379 + 1i);
                    }
                }
                let _e394 = local_1;
                let _e398 = nearestVectors[_e394][_e46.y][_e46.x];
                let _e399 = _e45.xy;
                phi_449_ = false;
                if all((_e399 >= vec2<i32>(0i, 0i))) {
                    let _e403 = cbPolyShadeFG.polyNextFlowSize;
                    phi_449_ = all((_e399 < _e403));
                }
                let _e407 = phi_449_;
                if _e407 {
                    let _e411 = cbPolyShadeFG.polyNextFlowSize[0i];
                    rw_optical_flow_next_level.member[bitcast<u32>(((_e45.y * _e411) + _e45.x))] = clamp(_e398, vec2<i32>(-32768i, -32768i), vec2<i32>(32767i, 32767i));
                }
            }
            break;
        }
    }
    return;

}
`;
