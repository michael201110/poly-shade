// Generated from AMD FidelityFX SDK v2.3.0, SR 3.1.5.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL. See scripts/fsr/compile.mjs.
export default String.raw`struct type_u002e_cbFSR3Upscaler {
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

struct type_u002e_RWStructuredBuffer_u002e_uint {
    member: array<u32>,
}

struct type_u002e_RWStructuredBuffer_u002e_uint_1 {
    member: array<atomic<u32>>,
}

@group(0) @binding(0) 
var<uniform> cbFSR3Upscaler: type_u002e_cbFSR3Upscaler;
@group(0) @binding(9) 
var r_input_depth: texture_depth_2d;
@group(0) @binding(10) 
var r_input_color_jittered: texture_2d<f32>;
@group(0) @binding(8) 
var r_input_motion_vectors: texture_2d<f32>;
@group(0) @binding(35) 
var rw_farthest_depth: texture_storage_2d<rgba16float,write>;
@group(0) @binding(36) 
var rw_current_luma: texture_storage_2d<rgba16float,write>;
@group(0) @binding(34) 
var<storage, read_write> rw_reconstructed_previous_nearest_depth: type_u002e_RWStructuredBuffer_u002e_uint_1;
@group(0) @binding(33) 
var rw_dilated_depth: texture_storage_2d<r32float,write>;
@group(0) @binding(32) 
var rw_dilated_motion_vectors: texture_storage_2d<rgba16float,write>;
var<private> global: vec3<i32>;

fn CS_1() {
    var local: array<f32, 4>;
    var local_1: array<vec2<i32>, 4>;
    var phi_147_: f32;
    var phi_151_: f32;
    var phi_152_: vec2<i32>;
    var phi_153_: f32;
    var phi_162_: f32;
    var phi_166_: f32;
    var phi_167_: vec2<i32>;
    var phi_168_: f32;
    var phi_177_: f32;
    var phi_181_: f32;
    var phi_182_: vec2<i32>;
    var phi_183_: f32;
    var phi_192_: f32;
    var phi_196_: f32;
    var phi_197_: vec2<i32>;
    var phi_198_: f32;
    var phi_207_: f32;
    var phi_211_: f32;
    var phi_212_: vec2<i32>;
    var phi_213_: f32;
    var phi_222_: f32;
    var phi_226_: f32;
    var phi_227_: vec2<i32>;
    var phi_228_: f32;
    var phi_237_: f32;
    var phi_241_: f32;
    var phi_242_: vec2<i32>;
    var phi_243_: f32;
    var phi_252_: f32;
    var phi_256_: f32;
    var phi_257_: vec2<i32>;
    var phi_258_: f32;
    var phi_304_: i32;

    let _e49 = global;
    let _e50 = _e49.xy;
    let _e51 = bitcast<vec2<u32>>(_e50);
    let _e52 = polyshadeLoadDepth(vec2<i32>(_e51), i32(0u));
    let _e54 = (_e50 + vec2<i32>(1i, 0i));
    let _e55 = bitcast<vec2<u32>>(_e54);
    let _e56 = polyshadeLoadDepth(vec2<i32>(_e55), i32(0u));
    let _e58 = (_e50 + vec2<i32>(0i, 1i));
    let _e59 = bitcast<vec2<u32>>(_e58);
    let _e60 = polyshadeLoadDepth(vec2<i32>(_e59), i32(0u));
    let _e62 = (_e50 + vec2<i32>(0i, -1i));
    let _e63 = bitcast<vec2<u32>>(_e62);
    let _e64 = polyshadeLoadDepth(vec2<i32>(_e63), i32(0u));
    let _e66 = (_e50 + vec2<i32>(-1i, 0i));
    let _e67 = bitcast<vec2<u32>>(_e66);
    let _e68 = polyshadeLoadDepth(vec2<i32>(_e67), i32(0u));
    let _e70 = (_e50 + vec2<i32>(-1i, 1i));
    let _e71 = bitcast<vec2<u32>>(_e70);
    let _e72 = polyshadeLoadDepth(vec2<i32>(_e71), i32(0u));
    let _e74 = (_e50 + vec2<i32>(1i, 1i));
    let _e75 = bitcast<vec2<u32>>(_e74);
    let _e76 = polyshadeLoadDepth(vec2<i32>(_e75), i32(0u));
    let _e78 = (_e50 + vec2<i32>(-1i, -1i));
    let _e79 = bitcast<vec2<u32>>(_e78);
    let _e80 = polyshadeLoadDepth(vec2<i32>(_e79), i32(0u));
    let _e82 = (_e50 + vec2<i32>(1i, -1i));
    let _e83 = bitcast<vec2<u32>>(_e82);
    let _e84 = polyshadeLoadDepth(vec2<i32>(_e83), i32(0u));
    let _e87 = cbFSR3Upscaler.iRenderSize;
    let _e88 = bitcast<vec2<u32>>(_e87);
    phi_151_ = _e52.x;
    phi_152_ = _e50;
    phi_153_ = _e52.x;
    if all((_e55 < _e88)) {
        let _e91 = (_e56.x < _e52.x);
        phi_147_ = _e52.x;
        if _e91 {
            phi_147_ = max(_e52.x, _e56.x);
        }
        let _e94 = phi_147_;
        phi_151_ = select(_e52.x, _e56.x, _e91);
        phi_152_ = select(_e50, _e54, vec2(_e91));
        phi_153_ = _e94;
    }
    let _e99 = phi_151_;
    let _e101 = phi_152_;
    let _e103 = phi_153_;
    phi_166_ = _e99;
    phi_167_ = _e101;
    phi_168_ = _e103;
    if all((_e59 < _e88)) {
        let _e106 = (_e60.x < _e99);
        phi_162_ = _e103;
        if _e106 {
            phi_162_ = max(_e103, _e60.x);
        }
        let _e109 = phi_162_;
        phi_166_ = select(_e99, _e60.x, _e106);
        phi_167_ = select(_e101, _e58, vec2(_e106));
        phi_168_ = _e109;
    }
    let _e114 = phi_166_;
    let _e116 = phi_167_;
    let _e118 = phi_168_;
    phi_181_ = _e114;
    phi_182_ = _e116;
    phi_183_ = _e118;
    if all((_e63 < _e88)) {
        let _e121 = (_e64.x < _e114);
        phi_177_ = _e118;
        if _e121 {
            phi_177_ = max(_e118, _e64.x);
        }
        let _e124 = phi_177_;
        phi_181_ = select(_e114, _e64.x, _e121);
        phi_182_ = select(_e116, _e62, vec2(_e121));
        phi_183_ = _e124;
    }
    let _e129 = phi_181_;
    let _e131 = phi_182_;
    let _e133 = phi_183_;
    phi_196_ = _e129;
    phi_197_ = _e131;
    phi_198_ = _e133;
    if all((_e67 < _e88)) {
        let _e136 = (_e68.x < _e129);
        phi_192_ = _e133;
        if _e136 {
            phi_192_ = max(_e133, _e68.x);
        }
        let _e139 = phi_192_;
        phi_196_ = select(_e129, _e68.x, _e136);
        phi_197_ = select(_e131, _e66, vec2(_e136));
        phi_198_ = _e139;
    }
    let _e144 = phi_196_;
    let _e146 = phi_197_;
    let _e148 = phi_198_;
    phi_211_ = _e144;
    phi_212_ = _e146;
    phi_213_ = _e148;
    if all((_e71 < _e88)) {
        let _e151 = (_e72.x < _e144);
        phi_207_ = _e148;
        if _e151 {
            phi_207_ = max(_e148, _e72.x);
        }
        let _e154 = phi_207_;
        phi_211_ = select(_e144, _e72.x, _e151);
        phi_212_ = select(_e146, _e70, vec2(_e151));
        phi_213_ = _e154;
    }
    let _e159 = phi_211_;
    let _e161 = phi_212_;
    let _e163 = phi_213_;
    phi_226_ = _e159;
    phi_227_ = _e161;
    phi_228_ = _e163;
    if all((_e75 < _e88)) {
        let _e166 = (_e76.x < _e159);
        phi_222_ = _e163;
        if _e166 {
            phi_222_ = max(_e163, _e76.x);
        }
        let _e169 = phi_222_;
        phi_226_ = select(_e159, _e76.x, _e166);
        phi_227_ = select(_e161, _e74, vec2(_e166));
        phi_228_ = _e169;
    }
    let _e174 = phi_226_;
    let _e176 = phi_227_;
    let _e178 = phi_228_;
    phi_241_ = _e174;
    phi_242_ = _e176;
    phi_243_ = _e178;
    if all((_e79 < _e88)) {
        let _e181 = (_e80.x < _e174);
        phi_237_ = _e178;
        if _e181 {
            phi_237_ = max(_e178, _e80.x);
        }
        let _e184 = phi_237_;
        phi_241_ = select(_e174, _e80.x, _e181);
        phi_242_ = select(_e176, _e78, vec2(_e181));
        phi_243_ = _e184;
    }
    let _e189 = phi_241_;
    let _e191 = phi_242_;
    let _e193 = phi_243_;
    phi_256_ = _e189;
    phi_257_ = _e191;
    phi_258_ = _e193;
    if all((_e83 < _e88)) {
        let _e196 = (_e84.x < _e189);
        phi_252_ = _e193;
        if _e196 {
            phi_252_ = max(_e193, _e84.x);
        }
        let _e199 = phi_252_;
        phi_256_ = select(_e189, _e84.x, _e196);
        phi_257_ = select(_e191, _e82, vec2(_e196));
        phi_258_ = _e199;
    }
    let _e204 = phi_256_;
    let _e206 = phi_257_;
    let _e208 = phi_258_;
    let _e210 = textureLoad(r_input_motion_vectors, bitcast<vec2<u32>>(_e206), 0u);
    let _e213 = cbFSR3Upscaler.fMotionVectorScale;
    let _e214 = (_e210.xy * _e213);
    let _e216 = cbFSR3Upscaler.fDeviceToViewDepth;
    let _e222 = cbFSR3Upscaler.fViewSpaceToMetersFactor;
    let _e235 = vec2<f32>(_e87);
    let _e239 = (((((vec2<f32>(_e50) + vec2<f32>(0.5f, 0.5f)) / _e235) + (_e214 * select(0f, 1f, (length((_e214 * vec2<f32>(3840f, 2160f))) > mix(0.25f, 0.75f, clamp((min(((_e216.y / (_e204 - _e216.x)) * _e222), 65504f) * 0.01f), 0f, 1f)))))) * _e235) - vec2<f32>(0.5f, 0.5f));
    let _e240 = floor(_e239);
    let _e242 = (_e239 - _e240);
    let _e244 = (1f - _e242.x);
    let _e246 = (1f - _e242.y);
    local_1 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
    local = array<f32, 4>((_e244 * _e246), (_e242.x * _e246), (_e244 * _e242.y), (_e242.x * _e242.y));
    phi_304_ = 0i;
    loop {
        let _e253 = phi_304_;
        if (_e253 < 4i) {
            let _e256 = local_1[_e253];
            let _e258 = local[_e253];
            if (_e258 > 0.00061f) {
                let _e261 = bitcast<vec2<u32>>((vec2<i32>(_e240) + _e256));
                if all((_e261 < _e88)) {
                    let _e268 = cbFSR3Upscaler.iMaxRenderSize[0i];
                    let _e275 = atomicMin((&rw_reconstructed_previous_nearest_depth.member[((_e261.y * bitcast<u32>(_e268)) + _e261.x)]), bitcast<u32>(_e204));
                }
            }
            continue;
        } else {
            break;
        }
        continuing {
            phi_304_ = (_e253 + 1i);
        }
    }
    textureStore(rw_dilated_motion_vectors, _e51, _e214.xyyy);
    textureStore(rw_dilated_depth, _e51, vec4(_e204));
    textureStore(rw_farthest_depth, _e51, vec4(min(((_e216.y / (_e208 - _e216.x)) * _e222), 65504f)));
    let _e284 = textureLoad(r_input_color_jittered, _e51, 0u);
    textureStore(rw_current_luma, _e51, vec4(dot(max(vec3<f32>(0f, 0f, 0f), _e284.xyz), vec3<f32>(0.2126f, 0.7152f, 0.0722f))));
    return;
}

@compute @workgroup_size(8, 8, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>) {
    global = vec3<i32>(param);
    CS_1();
}

fn polyshadeLoadDepth(p: vec2<i32>, lod: i32) -> vec4<f32> { return vec4<f32>(textureLoad(r_input_depth, p, lod), 0.0, 0.0, 0.0); }
`;
