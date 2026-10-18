// AMD FidelityFX SDK v2.3.0, Frame Interpolation 3.1.6.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL; scripts/fg/compile.mjs.
struct type_u002e_cbFI {
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

struct type_u002e_StructuredBuffer_u002e_uint {
    member: array<u32>,
}

@group(0) @binding(0) 
var<uniform> cbFI: type_u002e_cbFI;
@group(0) @binding(22) 
var r_polyshade_inpaint_color: texture_2d<f32>;
@group(0) @binding(23) 
var r_polyshade_inpaint_mask: texture_2d<f32>;
@group(0) @binding(8) 
var<storage> r_optical_flow_scd: type_u002e_StructuredBuffer_u002e_uint;
@group(0) @binding(9) 
var r_inpainting_pyramid: texture_2d<f32>;
@group(0) @binding(32) 
var rw_output: texture_storage_2d<rgba16float,write>;
@group(0) @binding(33) 
var rw_inpainting_mask: texture_storage_2d<rgba8unorm,write>;
var<private> global: vec3<i32>;

fn CS_1() {
    var local: array<f32, 4>;
    var local_1: array<vec2<i32>, 4>;
    var phi_104_: vec2<i32>;
    var phi_107_: vec4<f32>;
    var phi_109_: i32;
    var phi_130_: vec4<f32>;
    var phi_133_: i32;
    var phi_131_: vec4<f32>;
    var local_2: vec4<f32>;
    var local_3: vec4<f32>;
    var local_4: vec4<f32>;
    var phi_108_: vec4<f32>;
    var local_5: vec4<f32>;
    var local_6: vec4<f32>;
    var local_7: vec4<f32>;
    var phi_192_: vec4<f32>;
    var phi_215_: vec3<f32>;
    var phi_218_: bool;
    var phi_219_: vec3<f32>;
    var phi_221_: bool;
    var phi_222_: vec4<f32>;
    var phi_235_: bool;
    var phi_243_: bool;
    var phi_250_: bool;
    var phi_254_: vec3<f32>;
    var phi_257_: bool;
    var phi_258_: vec3<f32>;
    var phi_260_: bool;
    var phi_261_: vec4<f32>;
    var phi_266_: f32;
    var local_8: vec2<i32>;
    var local_9: vec4<f32>;
    var local_10: vec4<f32>;

    let _e42 = global;
    let _e43 = _e42.xy;
    let _e44 = bitcast<vec2<u32>>(_e43);
    let _e45 = textureLoad(r_polyshade_inpaint_color, _e44, 0u);
    let _e46 = textureLoad(r_polyshade_inpaint_mask, _e44, 0u);
    let _e51 = vec4<f32>(_e45.x, _e45.y, _e45.z, _e46.x);
    let _e52 = (_e46.x > 0.001f);
    phi_192_ = _e51;
    if _e52 {
        let _e57 = cbFI.displaySize;
        phi_104_ = _e57;
        phi_107_ = vec4<f32>(0f, 0f, 0f, 0f);
        phi_109_ = 0i;
        loop {
            let _e61 = phi_104_;
            let _e63 = phi_107_;
            let _e65 = phi_109_;
            local_5 = _e63;
            local_6 = _e63;
            local_7 = _e63;
            if (_e65 < 10i) {
                let _e67 = (_e61 / vec2<i32>(2i, 2i));
                let _e70 = ((((vec2<f32>(_e43) + vec2<f32>(0.5f, 0.5f)) / vec2<f32>(_e57)) * vec2<f32>(_e67)) - vec2<f32>(0.5f, 0.5f));
                let _e71 = floor(_e70);
                let _e73 = (_e70 - _e71);
                let _e75 = (1f - _e73.x);
                let _e77 = (1f - _e73.y);
                local_1 = array<vec2<i32>, 4>(vec2<i32>(0i, 0i), vec2<i32>(1i, 0i), vec2<i32>(0i, 1i), vec2<i32>(1i, 1i));
                local = array<f32, 4>((_e75 * _e77), (_e73.x * _e77), (_e75 * _e73.y), (_e73.x * _e73.y));
                local_8 = _e67;
                phi_130_ = vec4<f32>(0f, 0f, 0f, 0f);
                phi_133_ = 0i;
                loop {
                    let _e84 = phi_130_;
                    let _e86 = phi_133_;
                    local_2 = _e84;
                    local_3 = _e84;
                    local_4 = _e84;
                    if (_e86 < 4i) {
                        let _e89 = local_1[_e86];
                        let _e91 = bitcast<vec2<u32>>((vec2<i32>(_e71) + _e89));
                        phi_131_ = _e84;
                        if all((_e91 < bitcast<vec2<u32>>(_e67))) {
                            let _e96 = textureLoad(r_inpainting_pyramid, _e91, bitcast<u32>(_e65));
                            let _e98 = local[_e86];
                            let _e102 = (_e98 * select(0f, 1f, (_e96.w > 0f)));
                            let _e104 = (_e96.xyz * _e102);
                            phi_131_ = (_e84 + vec4<f32>(_e104.x, _e104.y, _e104.z, _e102));
                        }
                        let _e111 = phi_131_;
                        local_10 = _e111;
                        continue;
                    } else {
                        break;
                    }
                    continuing {
                        let _e258 = local_10;
                        phi_130_ = _e258;
                        phi_133_ = (_e86 + 1i);
                    }
                }
                let _e114 = local_2;
                phi_108_ = _e63;
                if (_e114.w > 0f) {
                    let _e118 = local_3;
                    let _e123 = (_e118.xyz / vec3(_e114.w));
                    phi_108_ = (_e63 + (vec4<f32>(_e123.x, _e123.y, _e123.z, 1f) * (pow((1f - (f32(_e65) * 0.1f)), 3f) * _e114.w)));
                }
                let _e136 = phi_108_;
                local_9 = _e136;
                continue;
            } else {
                break;
            }
            continuing {
                let _e251 = local_8;
                phi_104_ = _e251;
                let _e254 = local_9;
                phi_107_ = _e254;
                phi_109_ = (_e65 + 1i);
            }
        }
        let _e139 = local_5;
        let _e144 = local_7;
        let _e153 = mix(_e51.xyz, ((_e139.xyz / vec3(_e144.w)) * select(0f, 1f, (_e57.x > 0i))), vec3(_e46.x));
        phi_192_ = vec4<f32>(_e153.x, _e153.y, _e153.z, _e51.w);
    }
    let _e160 = phi_192_;
    let _e162 = cbFI.dispatchFlags;
    phi_221_ = _e52;
    phi_222_ = _e160;
    if ((_e162 & 1u) != 0u) {
        let _e165 = _e160.xyz;
        if (_e42.x < 16i) {
            phi_218_ = true;
            phi_219_ = vec3<f32>(_e165.x, 1f, _e165.z);
        } else {
            let _e169 = cbFI.displaySize;
            let _e172 = (_e42.x > (_e169.x - 16i));
            phi_215_ = _e165;
            if _e172 {
                let _e174 = cbFI.debugBarColor;
                phi_215_ = (_e165 + _e174);
            }
            let _e177 = phi_215_;
            phi_218_ = select(_e52, true, _e172);
            phi_219_ = _e177;
        }
        let _e184 = phi_218_;
        let _e186 = phi_219_;
        phi_221_ = _e184;
        phi_222_ = vec4<f32>(_e186.x, _e186.y, _e186.z, _e160.w);
    }
    let _e193 = phi_221_;
    let _e195 = phi_222_;
    phi_260_ = _e193;
    phi_261_ = _e195;
    if ((_e162 & 2u) != 0u) {
        let _e198 = _e195.xyz;
        phi_235_ = false;
        if (_e42.y < 32i) {
            let _e202 = cbFI.reset;
            phi_235_ = (_e202 == 1i);
        }
        let _e205 = phi_235_;
        if _e205 {
            phi_257_ = true;
            phi_258_ = vec3<f32>(1f, _e198.y, _e198.z);
        } else {
            phi_243_ = false;
            if (_e42.y > 32i) {
                phi_243_ = (_e42.y < 64i);
            }
            let _e209 = phi_243_;
            phi_250_ = false;
            if _e209 {
                let _e212 = r_optical_flow_scd.member[1u];
                phi_250_ = ((_e212 & 15u) != 0u);
            }
            let _e216 = phi_250_;
            phi_254_ = _e198;
            if _e216 {
                phi_254_ = vec3<f32>(_e198.x, _e198.y, 1f);
            }
            let _e222 = phi_254_;
            phi_257_ = select(_e193, true, _e216);
            phi_258_ = _e222;
        }
        let _e229 = phi_257_;
        let _e231 = phi_258_;
        phi_260_ = _e229;
        phi_261_ = vec4<f32>(_e231.x, _e231.y, _e231.z, _e195.w);
    }
    let _e238 = phi_260_;
    let _e240 = phi_261_;
    if _e238 {
        phi_266_ = 1f;
    } else {
        phi_266_ = _e240.w;
    }
    let _e243 = phi_266_;
    textureStore(rw_output, _e44, vec4<f32>(_e240.x, _e240.y, _e240.z, 1f));
    textureStore(rw_inpainting_mask, _e44, vec4(_e243));
    return;
}

@compute @workgroup_size(8, 8, 1) 
fn CS(@builtin(global_invocation_id) param: vec3<u32>) {
    global = vec3<i32>(param);
    CS_1();
}
