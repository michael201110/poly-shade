// AMD FidelityFX SDK v2.3.0, Frame Interpolation 3.1.6.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL; scripts/fg/compile.mjs.
export default String.raw`struct type_u002e_cbPolyShadeFG {
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

struct type_u002e_RWStructuredBuffer_u002e_uint {
    member: array<u32>,
}

struct type_u002e_RWStructuredBuffer_u002e_uint_1 {
    member: array<atomic<u32>>,
}

@group(0) @binding(2) 
var<uniform> cbPolyShadeFG: type_u002e_cbPolyShadeFG;
@group(0) @binding(0) 
var<uniform> cbOF: type_u002e_cbOF;
@group(0) @binding(8) 
var r_optical_flow_input: texture_2d<u32>;
@group(0) @binding(32) 
var<storage, read_write> rw_optical_flow_scd_histogram: type_u002e_RWStructuredBuffer_u002e_uint_1;
var<workgroup> scdBuffer: array<atomic<u32>, 2560>;
var<private> global: vec3<i32>;
var<private> global_1: vec3<i32>;
var<private> global_2: vec3<i32>;
var<private> global_3: i32;

fn AtomicIncrementSCDHistogram(iIndex: ptr<function, i32>, valueToAdd: ptr<function, u32>) {
    var temp_u002e_var_u002e_logical: bool;

    let _e38 = (*iIndex);
    temp_u002e_var_u002e_logical = false;
    if (vec2<i32>(_e38, 0i).x >= 0i) {
        let _e42 = (*iIndex);
        temp_u002e_var_u002e_logical = (vec2<i32>(_e42, 0i).y == 0i);
    }
    let _e46 = temp_u002e_var_u002e_logical;
    if _e46 {
        let _e47 = (*iIndex);
        let _e53 = (*valueToAdd);
        let _e54 = atomicAdd((&rw_optical_flow_scd_histogram.member[bitcast<u32>(vec2<i32>(_e47, 0i).x)]), _e53);
    }
    return;
}

fn LoadOpticalFlowInput(iPxPos: ptr<function, vec2<i32>>) -> u32 {
    let _e36 = (*iPxPos);
    let _e38 = textureLoad(r_optical_flow_input, bitcast<vec2<u32>>(_e36), 0u);
    return _e38.x;
}

fn DisplaySize() -> vec2<i32> {
    let _e36 = cbOF.iInputLumaResolution;
    return _e36;
}

fn GenerateSceneChangeDetectionHistogram(iGlobalId: ptr<function, vec3<i32>>, iLocalId: ptr<function, vec2<i32>>, iLocalIndex: ptr<function, i32>, iGroupId: ptr<function, vec2<i32>>, iGroupSize: ptr<function, vec2<i32>>) {
    var divX: u32;
    var divY: u32;
    var nx: u32;
    var ny: u32;
    var startX: u32;
    var startY: u32;
    var stopX: u32;
    var stopY: u32;
    var bufferOffset: u32;
    var i: i32;
    var coord: vec2<i32>;
    var color: vec4<u32>;
    var param_u002e_var_u002e_iPxPos: vec2<i32>;
    var param_u002e_var_u002e_iPxPos_1: vec2<i32>;
    var param_u002e_var_u002e_iPxPos_2: vec2<i32>;
    var param_u002e_var_u002e_iPxPos_3: vec2<i32>;
    var scramblingOffset: u32;
    var value: u32;
    var i_1: i32;
    var histogramStart: u32;
    var param_u002e_var_u002e_iIndex: i32;
    var param_u002e_var_u002e_valueToAdd: u32;

    let _e62 = DisplaySize();
    divX = (bitcast<u32>(_e62.x) / 3u);
    let _e66 = DisplaySize();
    divY = (bitcast<u32>(_e66.y) / 3u);
    let _e71 = (*iGlobalId)[2i];
    nx = (bitcast<u32>(_e71) % 3u);
    let _e75 = (*iGlobalId)[2i];
    ny = (bitcast<u32>(_e75) / 3u);
    let _e78 = divX;
    let _e79 = nx;
    startX = (_e78 * _e79);
    let _e81 = divY;
    let _e82 = ny;
    startY = (_e81 * _e82);
    let _e84 = startX;
    let _e85 = divX;
    stopX = (_e84 + _e85);
    let _e87 = startY;
    let _e88 = divY;
    stopY = (_e87 + _e88);
    let _e90 = (*iLocalIndex);
    bufferOffset = bitcast<u32>((_e90 * 10i));
    i = 0i;
    loop {
        let _e93 = i;
        if (_e93 < 10i) {
            let _e95 = bufferOffset;
            let _e96 = i;
            atomicStore((&scdBuffer[(_e95 + bitcast<u32>(_e96))]), 0u);
            continue;
        } else {
            break;
        }
        continuing {
            let _e100 = i;
            i = (_e100 + 1i);
        }
    }
    workgroupBarrier();
    let _e102 = startX;
    let _e104 = (*iGlobalId)[0i];
    let _e109 = startY;
    let _e111 = (*iGlobalId)[1i];
    coord = vec2<i32>(bitcast<i32>((_e102 + bitcast<u32>((4i * _e104)))), bitcast<i32>((_e109 + bitcast<u32>(_e111))));
    let _e117 = coord[0i];
    let _e119 = stopX;
    if (bitcast<u32>(_e117) < _e119) {
        loop {
            let _e122 = coord[1i];
            let _e124 = stopY;
            if (bitcast<u32>(_e122) < _e124) {
                let _e126 = coord;
                param_u002e_var_u002e_iPxPos = (_e126 + vec2<i32>(0i, 0i));
                let _e128 = LoadOpticalFlowInput((&param_u002e_var_u002e_iPxPos));
                let _e129 = coord;
                param_u002e_var_u002e_iPxPos_1 = (_e129 + vec2<i32>(1i, 0i));
                let _e131 = LoadOpticalFlowInput((&param_u002e_var_u002e_iPxPos_1));
                let _e132 = coord;
                param_u002e_var_u002e_iPxPos_2 = (_e132 + vec2<i32>(2i, 0i));
                let _e134 = LoadOpticalFlowInput((&param_u002e_var_u002e_iPxPos_2));
                let _e135 = coord;
                param_u002e_var_u002e_iPxPos_3 = (_e135 + vec2<i32>(3i, 0i));
                let _e137 = LoadOpticalFlowInput((&param_u002e_var_u002e_iPxPos_3));
                color = vec4<u32>(_e128, _e131, _e134, _e137);
                let _e139 = color;
                color = (_e139 * vec4<u32>(10u, 10u, 10u, 10u));
                let _e141 = (*iLocalIndex);
                scramblingOffset = bitcast<u32>((_e141 % 10i));
                let _e145 = color[0i];
                let _e146 = scramblingOffset;
                let _e149 = atomicAdd((&scdBuffer[(_e145 + _e146)]), 1u);
                let _e151 = color[1i];
                let _e152 = scramblingOffset;
                let _e155 = atomicAdd((&scdBuffer[(_e151 + _e152)]), 1u);
                let _e157 = color[2i];
                let _e158 = scramblingOffset;
                let _e161 = atomicAdd((&scdBuffer[(_e157 + _e158)]), 1u);
                let _e163 = color[3i];
                let _e164 = scramblingOffset;
                let _e167 = atomicAdd((&scdBuffer[(_e163 + _e164)]), 1u);
                continue;
            } else {
                break;
            }
            continuing {
                let _e169 = coord[1i];
                coord[1i] = (_e169 + 128i);
            }
        }
    }
    workgroupBarrier();
    value = 0u;
    i_1 = 0i;
    loop {
        let _e171 = i_1;
        if (_e171 < 10i) {
            let _e173 = bufferOffset;
            let _e174 = i_1;
            let _e178 = atomicLoad((&scdBuffer[(_e173 + bitcast<u32>(_e174))]));
            let _e179 = value;
            value = (_e179 + _e178);
            continue;
        } else {
            break;
        }
        continuing {
            let _e181 = i_1;
            i_1 = (_e181 + 1i);
        }
    }
    let _e184 = (*iGroupSize)[0i];
    let _e186 = (*iGroupSize)[1i];
    let _e189 = (*iGlobalId)[2i];
    histogramStart = bitcast<u32>(((_e184 * _e186) * _e189));
    let _e192 = histogramStart;
    let _e193 = (*iLocalIndex);
    param_u002e_var_u002e_iIndex = bitcast<i32>((_e192 + bitcast<u32>(_e193)));
    let _e197 = value;
    param_u002e_var_u002e_valueToAdd = _e197;
    AtomicIncrementSCDHistogram((&param_u002e_var_u002e_iIndex), (&param_u002e_var_u002e_valueToAdd));
    return;
}

fn src_u002e_CS(iGlobalId_1: ptr<function, vec3<i32>>, iLocalId_1: ptr<function, vec2<i32>>, iGroupId_1: ptr<function, vec2<i32>>, iLocalIndex_1: ptr<function, i32>) {
    var iGroupSize_1: vec2<i32>;
    var param_u002e_var_u002e_iGlobalId: vec3<i32>;
    var param_u002e_var_u002e_iLocalId: vec2<i32>;
    var param_u002e_var_u002e_iLocalIndex: i32;
    var param_u002e_var_u002e_iGroupId: vec2<i32>;
    var param_u002e_var_u002e_iGroupSize: vec2<i32>;

    iGroupSize_1 = vec2<i32>(32i, 8i);
    let _e45 = (*iGlobalId_1);
    param_u002e_var_u002e_iGlobalId = _e45;
    let _e46 = (*iLocalId_1);
    param_u002e_var_u002e_iLocalId = _e46;
    let _e47 = (*iLocalIndex_1);
    param_u002e_var_u002e_iLocalIndex = _e47;
    let _e48 = (*iGroupId_1);
    param_u002e_var_u002e_iGroupId = _e48;
    let _e49 = iGroupSize_1;
    param_u002e_var_u002e_iGroupSize = _e49;
    GenerateSceneChangeDetectionHistogram((&param_u002e_var_u002e_iGlobalId), (&param_u002e_var_u002e_iLocalId), (&param_u002e_var_u002e_iLocalIndex), (&param_u002e_var_u002e_iGroupId), (&param_u002e_var_u002e_iGroupSize));
    return;
}

fn CS_1() {
    var param_u002e_var_u002e_iGlobalId_1: vec3<i32>;
    var param_u002e_var_u002e_iLocalId_1: vec2<i32>;
    var param_u002e_var_u002e_iGroupId_1: vec2<i32>;
    var param_u002e_var_u002e_iLocalIndex_1: i32;

    let _e39 = global;
    param_u002e_var_u002e_iGlobalId_1 = _e39;
    let _e40 = global_1;
    param_u002e_var_u002e_iLocalId_1 = _e40.xy;
    let _e42 = global_2;
    param_u002e_var_u002e_iGroupId_1 = _e42.xy;
    let _e44 = global_3;
    param_u002e_var_u002e_iLocalIndex_1 = _e44;
    src_u002e_CS((&param_u002e_var_u002e_iGlobalId_1), (&param_u002e_var_u002e_iLocalId_1), (&param_u002e_var_u002e_iGroupId_1), (&param_u002e_var_u002e_iLocalIndex_1));
    return;
}

@compute @workgroup_size(32, 8, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>, @builtin(local_invocation_id) param_1: vec3<u32>, @builtin(workgroup_id) param_2: vec3<u32>, @builtin(local_invocation_index) param_3: u32) {
    global = vec3<i32>(param);
    global_1 = vec3<i32>(param_1);
    global_2 = vec3<i32>(param_2);
    global_3 = i32(param_3);
    CS_1();
}
`;
