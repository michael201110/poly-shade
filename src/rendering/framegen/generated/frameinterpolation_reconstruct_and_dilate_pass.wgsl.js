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

struct type_u002e_RWStructuredBuffer_u002e_uint {
    member: array<u32>,
}

struct type_u002e_RWStructuredBuffer_u002e_uint_1 {
    member: array<atomic<u32>>,
}

@group(0) @binding(0) 
var<uniform> cbFI: type_u002e_cbFI;
@group(0) @binding(9) 
var r_input_depth: texture_depth_2d;
@group(0) @binding(8) 
var r_input_motion_vectors: texture_2d<f32>;
@group(0) @binding(33) 
var rw_dilated_motion_vectors: texture_storage_2d<rgba16float,write>;
@group(0) @binding(34) 
var rw_dilated_depth: texture_storage_2d<r32float,write>;
@group(0) @binding(32) 
var<storage, read_write> rw_reconstructed_depth_previous_frame: type_u002e_RWStructuredBuffer_u002e_uint_1;
var<private> global: vec3<i32>;

fn CS_1() {
    var local: array<f32, 4>;
    var local_1: array<vec2<i32>, 4>;
    var phi_130_: f32;
    var phi_131_: vec2<i32>;
    var phi_140_: f32;
    var phi_141_: vec2<i32>;
    var phi_150_: f32;
    var phi_151_: vec2<i32>;
    var phi_160_: f32;
    var phi_161_: vec2<i32>;
    var phi_170_: f32;
    var phi_171_: vec2<i32>;
    var phi_180_: f32;
    var phi_181_: vec2<i32>;
    var phi_190_: f32;
    var phi_191_: vec2<i32>;
    var phi_200_: f32;
    var phi_201_: vec2<i32>;
    var phi_239_: i32;
    var phi_267_: bool;

    let _e35 = global;
    let _e36 = _e35.xy;
    let _e38 = cbFI.renderSize;
    let _e39 = bitcast<vec2<u32>>(_e36);
    let _e40 = polyshadeLoadDepth(vec2<i32>(_e39), i32(0u));
    let _e42 = (_e36 + vec2<i32>(1i, 0i));
    let _e43 = bitcast<vec2<u32>>(_e42);
    let _e44 = polyshadeLoadDepth(vec2<i32>(_e43), i32(0u));
    let _e46 = (_e36 + vec2<i32>(0i, 1i));
    let _e47 = bitcast<vec2<u32>>(_e46);
    let _e48 = polyshadeLoadDepth(vec2<i32>(_e47), i32(0u));
    let _e50 = (_e36 + vec2<i32>(0i, -1i));
    let _e51 = bitcast<vec2<u32>>(_e50);
    let _e52 = polyshadeLoadDepth(vec2<i32>(_e51), i32(0u));
    let _e54 = (_e36 + vec2<i32>(-1i, 0i));
    let _e55 = bitcast<vec2<u32>>(_e54);
    let _e56 = polyshadeLoadDepth(vec2<i32>(_e55), i32(0u));
    let _e58 = (_e36 + vec2<i32>(-1i, 1i));
    let _e59 = bitcast<vec2<u32>>(_e58);
    let _e60 = polyshadeLoadDepth(vec2<i32>(_e59), i32(0u));
    let _e62 = (_e36 + vec2<i32>(1i, 1i));
    let _e63 = bitcast<vec2<u32>>(_e62);
    let _e64 = polyshadeLoadDepth(vec2<i32>(_e63), i32(0u));
    let _e66 = (_e36 + vec2<i32>(-1i, -1i));
    let _e67 = bitcast<vec2<u32>>(_e66);
    let _e68 = polyshadeLoadDepth(vec2<i32>(_e67), i32(0u));
    let _e70 = (_e36 + vec2<i32>(1i, -1i));
    let _e71 = bitcast<vec2<u32>>(_e70);
    let _e72 = polyshadeLoadDepth(vec2<i32>(_e71), i32(0u));
    let _e74 = bitcast<vec2<u32>>(_e38);
    phi_130_ = _e40.x;
    phi_131_ = _e36;
    if all((_e43 < _e74)) {
        let _e77 = (_e44.x < _e40.x);
        phi_130_ = select(_e40.x, _e44.x, _e77);
        phi_131_ = select(_e36, _e42, vec2(_e77));
    }
    let _e82 = phi_130_;
    let _e84 = phi_131_;
    phi_140_ = _e82;
    phi_141_ = _e84;
    if all((_e47 < _e74)) {
        let _e87 = (_e48.x < _e82);
        phi_140_ = select(_e82, _e48.x, _e87);
        phi_141_ = select(_e84, _e46, vec2(_e87));
    }
    let _e92 = phi_140_;
    let _e94 = phi_141_;
    phi_150_ = _e92;
    phi_151_ = _e94;
    if all((_e51 < _e74)) {
        let _e97 = (_e52.x < _e92);
        phi_150_ = select(_e92, _e52.x, _e97);
        phi_151_ = select(_e94, _e50, vec2(_e97));
    }
    let _e102 = phi_150_;
    let _e104 = phi_151_;
    phi_160_ = _e102;
    phi_161_ = _e104;
    if all((_e55 < _e74)) {
        let _e107 = (_e56.x < _e102);
        phi_160_ = select(_e102, _e56.x, _e107);
        phi_161_ = select(_e104, _e54, vec2(_e107));
    }
    let _e112 = phi_160_;
    let _e114 = phi_161_;
    phi_170_ = _e112;
    phi_171_ = _e114;
    if all((_e59 < _e74)) {
        let _e117 = (_e60.x < _e112);
        phi_170_ = select(_e112, _e60.x, _e117);
        phi_171_ = select(_e114, _e58, vec2(_e117));
    }
    let _e122 = phi_170_;
    let _e124 = phi_171_;
    phi_180_ = _e122;
    phi_181_ = _e124;
    if all((_e63 < _e74)) {
        let _e127 = (_e64.x < _e122);
        phi_180_ = select(_e122, _e64.x, _e127);
        phi_181_ = select(_e124, _e62, vec2(_e127));
    }
    let _e132 = phi_180_;
    let _e134 = phi_181_;
    phi_190_ = _e132;
    phi_191_ = _e134;
    if all((_e67 < _e74)) {
        let _e137 = (_e68.x < _e132);
        phi_190_ = select(_e132, _e68.x, _e137);
        phi_191_ = select(_e134, _e66, vec2(_e137));
    }
    let _e142 = phi_190_;
    let _e144 = phi_191_;
    phi_200_ = _e142;
    phi_201_ = _e144;
    if all((_e71 < _e74)) {
        let _e147 = (_e72.x < _e142);
        phi_200_ = select(_e142, _e72.x, _e147);
        phi_201_ = select(_e144, _e70, vec2(_e147));
    }
    let _e152 = phi_200_;
    let _e154 = phi_201_;
    let _e156 = textureLoad(r_input_motion_vectors, bitcast<vec2<u32>>(_e154), 0u);
    let _e159 = cbFI.fMotionVectorScale;
    let _e160 = (_e156.xy * _e159);
    textureStore(rw_dilated_depth, _e39, vec4(_e152));
    textureStore(rw_dilated_motion_vectors, _e39, _e160.xyyy);
    let _e164 = cbFI.displaySize;
    let _e173 = vec2<f32>(_e38);
    let _e177 = (((((vec2<f32>(_e36) + vec2<f32>(0.5f, 0.5f)) / _e173) + (_e160 * select(0f, 1f, (length((_e160 * vec2<f32>(_e164))) > 0.1f)))) * _e173) - vec2<f32>(0.5f, 0.5f));
    let _e178 = floor(_e177);
    let _e180 = (_e177 - _e178);
    let _e182 = (1f - _e180.x);
    let _e184 = (1f - _e180.y);
    local_1 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
    local = array<f32, 4>((_e182 * _e184), (_e180.x * _e184), (_e182 * _e180.y), (_e180.x * _e180.y));
    phi_239_ = 0i;
    loop {
        let _e191 = phi_239_;
        if (_e191 < 4i) {
            let _e194 = local_1[_e191];
            let _e196 = local[_e191];
            if (_e196 > 0.001f) {
                let _e198 = (vec2<i32>(_e178) + _e194);
                if all((bitcast<vec2<u32>>(_e198) < _e74)) {
                    phi_267_ = false;
                    if all((_e198 >= vec2<i32>(0i, 0i))) {
                        let _e206 = cbFI.maxRenderSize;
                        phi_267_ = all((_e198 < _e206));
                    }
                    let _e210 = phi_267_;
                    if _e210 {
                        let _e213 = cbFI.maxRenderSize;
                        let _e221 = atomicMin((&rw_reconstructed_depth_previous_frame.member[bitcast<u32>(((_e198.y * _e213.x) + _e198.x))]), bitcast<u32>(_e152));
                    }
                }
            }
            continue;
        } else {
            break;
        }
        continuing {
            phi_239_ = (_e191 + 1i);
        }
    }
    return;
}

@compute @workgroup_size(8, 8, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>) {
    global = vec3<i32>(param);
    CS_1();
}

fn polyshadeLoadDepth(p:vec2<i32>,lod:i32)->vec4f{return vec4f(textureLoad(r_input_depth,p,lod),0,0,0);}
`;
