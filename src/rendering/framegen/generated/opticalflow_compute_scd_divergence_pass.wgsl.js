// AMD FidelityFX SDK v2.3.0, Frame Interpolation 3.1.6.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL; scripts/fg/compile.mjs.
export default String.raw`struct type_u002e_RWStructuredBuffer_u002e_uint {
    member: array<u32>,
}

struct type_u002e_RWStructuredBuffer_u002e_uint_1 {
    member: array<atomic<u32>>,
}

@group(0) @binding(32) 
var<storage, read_write> rw_optical_flow_scd_histogram: type_u002e_RWStructuredBuffer_u002e_uint;
@group(0) @binding(33) 
var rw_optical_flow_scd_previous_histogram: texture_storage_2d<r32float,read_write>;
@group(0) @binding(34) 
var<storage, read_write> rw_optical_flow_scd_temp: type_u002e_RWStructuredBuffer_u002e_uint_1;
@group(0) @binding(35) 
var<storage, read_write> rw_optical_flow_scd_output: type_u002e_RWStructuredBuffer_u002e_uint_1;
var<workgroup> sourceHistogram: array<f32, 256>;
var<workgroup> filteredHistogram: array<f32, 256>;
var<workgroup> tempBuffer: array<f32, 256>;
var<workgroup> tempBuffer2_: array<vec2<f32>, 256>;
var<private> global: vec3<i32>;
var<private> global_1: i32;

fn CS_1() {
    var phi_86_: u32;
    var phi_365_: u32;
    var local: bool;

    let _e45 = global;
    let _e46 = global_1;
    switch bitcast<i32>(0u) {
        default: {
            let _e50 = (_e45.x >= 0i);
            local = _e50;
            if _e50 {
                let _e54 = rw_optical_flow_scd_histogram.member[bitcast<u32>(_e45.x)];
                phi_86_ = _e54;
                break;
            }
            phi_86_ = 0u;
            break;
        }
    }
    let _e56 = phi_86_;
    sourceHistogram[_e46] = f32(_e56);
    workgroupBarrier();
    let _e63 = sourceHistogram[max(0i, min(255i, (_e46 + -5i)))];
    let _e69 = sourceHistogram[max(0i, min(255i, (_e46 + -4i)))];
    let _e76 = sourceHistogram[max(0i, min(255i, (_e46 + -3i)))];
    let _e83 = sourceHistogram[max(0i, min(255i, (_e46 + -2i)))];
    let _e90 = sourceHistogram[max(0i, min(255i, (_e46 + -1i)))];
    let _e96 = sourceHistogram[max(0i, min(255i, _e46))];
    let _e99 = (_e46 + 1i);
    let _e103 = sourceHistogram[max(0i, min(255i, _e99))];
    let _e106 = (_e46 + 2i);
    let _e110 = sourceHistogram[max(0i, min(255i, _e106))];
    let _e117 = sourceHistogram[max(0i, min(255i, (_e46 + 3i)))];
    let _e120 = (_e46 + 4i);
    let _e124 = sourceHistogram[max(0i, min(255i, _e120))];
    let _e131 = sourceHistogram[max(0i, min(255i, (_e46 + 5i)))];
    let _e134 = ((((((((((((0.008812229f * _e63) + (0.027143577f * _e69)) + (0.06511406f * _e76)) + (0.12164907f * _e83)) + (0.17699835f * _e90)) + (0.20056541f * _e96)) + (0.17699835f * _e103)) + (0.12164907f * _e110)) + (0.06511406f * _e117)) + (0.027143577f * _e124)) + (0.008812229f * _e131)) + 1f);
    if (_e45.y == 0i) {
        if (_e46 == 0i) {
            filteredHistogram[255i] = 1f;
        } else {
            filteredHistogram[(_e46 - 1i)] = _e134;
        }
    } else {
        if (_e45.y == 1i) {
            filteredHistogram[_e46] = _e134;
        } else {
            if (_e45.y == 2i) {
                if (_e46 == 255i) {
                    filteredHistogram[0i] = 1f;
                } else {
                    filteredHistogram[_e99] = _e134;
                }
            }
        }
    }
    workgroupBarrier();
    let _e148 = filteredHistogram[_e46];
    tempBuffer[_e46] = _e148;
    workgroupBarrier();
    let _e150 = (_e46 < 128i);
    if _e150 {
        let _e153 = tempBuffer[(_e46 + 128i)];
        let _e154 = tempBuffer[_e46];
        tempBuffer[_e46] = (_e154 + _e153);
    }
    workgroupBarrier();
    let _e156 = (_e46 < 64i);
    if _e156 {
        let _e159 = tempBuffer[(_e46 + 64i)];
        let _e160 = tempBuffer[_e46];
        tempBuffer[_e46] = (_e160 + _e159);
    }
    workgroupBarrier();
    let _e162 = (_e46 < 32i);
    if _e162 {
        let _e165 = tempBuffer[(_e46 + 32i)];
        let _e166 = tempBuffer[_e46];
        tempBuffer[_e46] = (_e166 + _e165);
    }
    let _e168 = (_e46 < 16i);
    if _e168 {
        let _e171 = tempBuffer[(_e46 + 16i)];
        let _e172 = tempBuffer[_e46];
        tempBuffer[_e46] = (_e172 + _e171);
    }
    let _e174 = (_e46 < 8i);
    if _e174 {
        let _e177 = tempBuffer[(_e46 + 8i)];
        let _e178 = tempBuffer[_e46];
        tempBuffer[_e46] = (_e178 + _e177);
    }
    let _e180 = (_e46 < 4i);
    if _e180 {
        let _e182 = tempBuffer[_e120];
        let _e183 = tempBuffer[_e46];
        tempBuffer[_e46] = (_e183 + _e182);
    }
    let _e185 = (_e46 < 2i);
    if _e185 {
        let _e187 = tempBuffer[_e106];
        let _e188 = tempBuffer[_e46];
        tempBuffer[_e46] = (_e188 + _e187);
    }
    if (_e46 < 1i) {
        let _e192 = tempBuffer[_e99];
        let _e193 = tempBuffer[_e46];
        tempBuffer[_e46] = (_e193 + _e192);
    }
    workgroupBarrier();
    let _e196 = tempBuffer[0i];
    let _e197 = filteredHistogram[_e46];
    filteredHistogram[_e46] = (_e197 / _e196);
    let _e199 = filteredHistogram[_e46];
    let _e200 = bitcast<vec2<u32>>(vec2<i32>(_e45.x, 0i));
    let _e201 = textureLoad(rw_optical_flow_scd_previous_histogram, _e200);
    tempBuffer2_[_e46] = vec2<f32>((_e199 * log((_e199 / _e201.x))), (_e201.x * log((_e201.x / _e199))));
    workgroupBarrier();
    if _e150 {
        let _e213 = tempBuffer2_[(_e46 + 128i)];
        let _e214 = tempBuffer2_[_e46];
        tempBuffer2_[_e46] = (_e214 + _e213);
    }
    workgroupBarrier();
    if _e156 {
        let _e218 = tempBuffer2_[(_e46 + 64i)];
        let _e219 = tempBuffer2_[_e46];
        tempBuffer2_[_e46] = (_e219 + _e218);
    }
    workgroupBarrier();
    if _e162 {
        let _e223 = tempBuffer2_[(_e46 + 32i)];
        let _e224 = tempBuffer2_[_e46];
        tempBuffer2_[_e46] = (_e224 + _e223);
    }
    if _e168 {
        let _e228 = tempBuffer2_[(_e46 + 16i)];
        let _e229 = tempBuffer2_[_e46];
        tempBuffer2_[_e46] = (_e229 + _e228);
    }
    if _e174 {
        let _e233 = tempBuffer2_[(_e46 + 8i)];
        let _e234 = tempBuffer2_[_e46];
        tempBuffer2_[_e46] = (_e234 + _e233);
    }
    if _e180 {
        let _e237 = tempBuffer2_[_e120];
        let _e238 = tempBuffer2_[_e46];
        tempBuffer2_[_e46] = (_e238 + _e237);
    }
    if _e185 {
        let _e241 = tempBuffer2_[_e106];
        let _e242 = tempBuffer2_[_e46];
        tempBuffer2_[_e46] = (_e242 + _e241);
    }
    if (_e46 == 0i) {
        let _e246 = tempBuffer2_[0i];
        let _e248 = tempBuffer2_[1i];
        let _e249 = (_e246 + _e248);
        if (_e45.y >= 0i) {
            let _e264 = atomicAdd((&rw_optical_flow_scd_temp.member[bitcast<u32>(_e45.y)]), u32(((1f - exp(-((abs(_e249.x) + abs(_e249.y))))) * 111111.11f)));
        }
        let _e267 = atomicAdd((&rw_optical_flow_scd_output.member[2u]), 1u);
        if (_e267 == 26u) {
            let _e271 = atomicLoad((&rw_optical_flow_scd_temp.member[0u]));
            let _e274 = atomicLoad((&rw_optical_flow_scd_temp.member[1u]));
            let _e277 = atomicLoad((&rw_optical_flow_scd_temp.member[2u]));
            let _e281 = (f32(min(_e271, min(_e274, _e277))) * 0.000001f);
            let _e284 = atomicLoad((&rw_optical_flow_scd_output.member[1u]));
            let _e286 = (_e284 << bitcast<u32>(1u));
            phi_365_ = _e286;
            if (_e281 > 0.45f) {
                phi_365_ = (_e286 | 1u);
            }
            let _e290 = phi_365_;
            atomicStore((&rw_optical_flow_scd_output.member[0u]), bitcast<u32>(_e281));
            atomicStore((&rw_optical_flow_scd_output.member[1u]), _e290);
            atomicStore((&rw_optical_flow_scd_output.member[2u]), 0u);
            atomicStore((&rw_optical_flow_scd_temp.member[0u]), 0u);
            atomicStore((&rw_optical_flow_scd_temp.member[1u]), 0u);
            atomicStore((&rw_optical_flow_scd_temp.member[2u]), 0u);
        }
    }
    if (_e45.y == 1i) {
        textureStore(rw_optical_flow_scd_previous_histogram, _e200, vec4(_e199));
        let _e297 = local;
        if _e297 {
            rw_optical_flow_scd_histogram.member[bitcast<u32>(_e45.x)] = 0u;
        }
    }
    return;
}

@compute @workgroup_size(256, 1, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>, @builtin(local_invocation_index) param_1: u32) {
    global = vec3<i32>(param);
    global_1 = i32(param_1);
    CS_1();
}
`;
