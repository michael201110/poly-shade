// Generated from AMD FidelityFX SDK v2.3.0, SR 3.1.5.
// Copyright (C) 2026 Advanced Micro Devices, Inc. MIT: vendor/fidelityfx/LICENSE.txt
// DXC -> SPIR-V -> Naga 30.0.1 -> WGSL. See scripts/fsr/compile.mjs.
export default String.raw`struct type_u002e_cbRCAS {
    rcasConfig: vec4<u32>,
}

@group(0) @binding(1) 
var<uniform> cbRCAS: type_u002e_cbRCAS;
@group(0) @binding(9) 
var r_rcas_input: texture_2d<f32>;
@group(0) @binding(32) 
var rw_upscaled_output: texture_storage_2d<rgba16float,write>;
@group(0) @binding(8) 
var r_input_exposure: texture_2d<f32>;
var<private> global: vec3<u32>;
var<private> global_1: vec3<u32>;

fn CS_1() {
    let _e32 = global[0i];
    let _e43 = global_1[0i];
    let _e47 = global_1[1i];
    let _e51 = (vec2<u32>(((_e32 >> bitcast<u32>(1u)) & 7u), ((_e32 & 1u) | ((_e32 >> bitcast<u32>(3u)) & 6u))) + vec2<u32>((_e43 << bitcast<u32>(4u)), (_e47 << bitcast<u32>(4u))));
    let _e53 = cbRCAS.rcasConfig;
    let _e54 = bitcast<vec2<i32>>(_e51);
    let _e57 = textureLoad(r_rcas_input, bitcast<vec2<u32>>((_e54 + vec2<i32>(0i, -1i))), 0u);
    let _e58 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e63 = (_e57.xyz * select(_e58.x, 1f, (_e58.x == 0f)));
    let _e66 = textureLoad(r_rcas_input, bitcast<vec2<u32>>((_e54 + vec2<i32>(-1i, 0i))), 0u);
    let _e67 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e72 = (_e66.xyz * select(_e67.x, 1f, (_e67.x == 0f)));
    let _e73 = textureLoad(r_rcas_input, _e51, 0u);
    let _e74 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e79 = (_e73.xyz * select(_e74.x, 1f, (_e74.x == 0f)));
    let _e82 = textureLoad(r_rcas_input, bitcast<vec2<u32>>((_e54 + vec2<i32>(1i, 0i))), 0u);
    let _e83 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e88 = (_e82.xyz * select(_e83.x, 1f, (_e83.x == 0f)));
    let _e91 = textureLoad(r_rcas_input, bitcast<vec2<u32>>((_e54 + vec2<i32>(0i, 1i))), 0u);
    let _e92 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e97 = (_e91.xyz * select(_e92.x, 1f, (_e92.x == 0f)));
    let _e116 = ((_e63.z * 0.5f) + ((_e63.x * 0.5f) + _e63.y));
    let _e120 = ((_e72.z * 0.5f) + ((_e72.x * 0.5f) + _e72.y));
    let _e124 = ((_e79.z * 0.5f) + ((_e79.x * 0.5f) + _e79.y));
    let _e128 = ((_e88.z * 0.5f) + ((_e88.x * 0.5f) + _e88.y));
    let _e132 = ((_e97.z * 0.5f) + ((_e97.x * 0.5f) + _e97.y));
    let _e147 = (max(max(_e116, max(_e120, _e124)), max(_e128, _e132)) - min(min(_e116, min(_e120, _e124)), min(_e128, _e132)));
    let _e150 = bitcast<f32>((2129764351u - bitcast<u32>(_e147)));
    let _e161 = min(min(_e63.x, min(_e72.x, _e88.x)), _e97.x);
    let _e164 = min(min(_e63.y, min(_e72.y, _e88.y)), _e97.y);
    let _e167 = min(min(_e63.z, min(_e72.z, _e88.z)), _e97.z);
    let _e170 = max(max(_e63.x, max(_e72.x, _e88.x)), _e97.x);
    let _e173 = max(max(_e63.y, max(_e72.y, _e88.y)), _e97.y);
    let _e176 = max(max(_e63.z, max(_e72.z, _e88.z)), _e97.z);
    let _e181 = clamp((_e124 / min(min(_e116, min(_e120, _e128)), _e132)), 0f, 1f);
    let _e217 = bitcast<f32>(_e53.x);
    let _e219 = ((max(-0.1875f, min(max(max(-(((_e161 * (0.25f / _e170)) * _e181)), ((1f - _e170) * (1f / ((4f * _e161) + -4f)))), max(max(-(((_e164 * (0.25f / _e173)) * _e181)), ((1f - _e173) * (1f / ((4f * _e164) + -4f)))), max(-(((_e167 * (0.25f / _e176)) * _e181)), ((1f - _e176) * (1f / ((4f * _e167) + -4f)))))), 0f)) * _e217) * ((-0.5f * clamp((abs(((0.25f * (((_e116 + _e120) + _e128) + _e132)) - _e124)) * (_e150 * ((-(_e150) * _e147) + 2f))), 0f, 1f)) + 1f));
    let _e221 = ((4f * _e219) + 1f);
    let _e224 = bitcast<f32>((2129764351u - bitcast<u32>(_e221)));
    let _e228 = (_e224 * ((-(_e224) * _e221) + 2f));
    let _e248 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e253 = (vec3<f32>((((_e219 * (((_e63.x + _e72.x) + _e97.x) + _e88.x)) + _e79.x) * _e228), (((_e219 * (((_e63.y + _e72.y) + _e97.y) + _e88.y)) + _e79.y) * _e228), (((_e219 * (((_e63.z + _e72.z) + _e97.z) + _e88.z)) + _e79.z) * _e228)) / vec3(select(_e248.x, 1f, (_e248.x == 0f))));
    textureStore(rw_upscaled_output, _e51, vec4<f32>(_e253.x, _e253.y, _e253.z, 1f));
    let _e259 = (_e51.x + 8u);
    let _e262 = vec2<u32>(_e259, _e51.y);
    let _e263 = bitcast<vec2<i32>>(_e262);
    let _e266 = textureLoad(r_rcas_input, bitcast<vec2<u32>>((_e263 + vec2<i32>(0i, -1i))), 0u);
    let _e267 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e272 = (_e266.xyz * select(_e267.x, 1f, (_e267.x == 0f)));
    let _e275 = textureLoad(r_rcas_input, bitcast<vec2<u32>>((_e263 + vec2<i32>(-1i, 0i))), 0u);
    let _e276 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e281 = (_e275.xyz * select(_e276.x, 1f, (_e276.x == 0f)));
    let _e282 = textureLoad(r_rcas_input, _e262, 0u);
    let _e283 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e288 = (_e282.xyz * select(_e283.x, 1f, (_e283.x == 0f)));
    let _e291 = textureLoad(r_rcas_input, bitcast<vec2<u32>>((_e263 + vec2<i32>(1i, 0i))), 0u);
    let _e292 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e297 = (_e291.xyz * select(_e292.x, 1f, (_e292.x == 0f)));
    let _e300 = textureLoad(r_rcas_input, bitcast<vec2<u32>>((_e263 + vec2<i32>(0i, 1i))), 0u);
    let _e301 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e306 = (_e300.xyz * select(_e301.x, 1f, (_e301.x == 0f)));
    let _e325 = ((_e272.z * 0.5f) + ((_e272.x * 0.5f) + _e272.y));
    let _e329 = ((_e281.z * 0.5f) + ((_e281.x * 0.5f) + _e281.y));
    let _e333 = ((_e288.z * 0.5f) + ((_e288.x * 0.5f) + _e288.y));
    let _e337 = ((_e297.z * 0.5f) + ((_e297.x * 0.5f) + _e297.y));
    let _e341 = ((_e306.z * 0.5f) + ((_e306.x * 0.5f) + _e306.y));
    let _e356 = (max(max(_e325, max(_e329, _e333)), max(_e337, _e341)) - min(min(_e325, min(_e329, _e333)), min(_e337, _e341)));
    let _e359 = bitcast<f32>((2129764351u - bitcast<u32>(_e356)));
    let _e370 = min(min(_e272.x, min(_e281.x, _e297.x)), _e306.x);
    let _e373 = min(min(_e272.y, min(_e281.y, _e297.y)), _e306.y);
    let _e376 = min(min(_e272.z, min(_e281.z, _e297.z)), _e306.z);
    let _e379 = max(max(_e272.x, max(_e281.x, _e297.x)), _e306.x);
    let _e382 = max(max(_e272.y, max(_e281.y, _e297.y)), _e306.y);
    let _e385 = max(max(_e272.z, max(_e281.z, _e297.z)), _e306.z);
    let _e390 = clamp((_e333 / min(min(_e325, min(_e329, _e337)), _e341)), 0f, 1f);
    let _e426 = ((max(-0.1875f, min(max(max(-(((_e370 * (0.25f / _e379)) * _e390)), ((1f - _e379) * (1f / ((4f * _e370) + -4f)))), max(max(-(((_e373 * (0.25f / _e382)) * _e390)), ((1f - _e382) * (1f / ((4f * _e373) + -4f)))), max(-(((_e376 * (0.25f / _e385)) * _e390)), ((1f - _e385) * (1f / ((4f * _e376) + -4f)))))), 0f)) * _e217) * ((-0.5f * clamp((abs(((0.25f * (((_e325 + _e329) + _e337) + _e341)) - _e333)) * (_e359 * ((-(_e359) * _e356) + 2f))), 0f, 1f)) + 1f));
    let _e428 = ((4f * _e426) + 1f);
    let _e431 = bitcast<f32>((2129764351u - bitcast<u32>(_e428)));
    let _e435 = (_e431 * ((-(_e431) * _e428) + 2f));
    let _e455 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e460 = (vec3<f32>((((_e426 * (((_e272.x + _e281.x) + _e306.x) + _e297.x)) + _e288.x) * _e435), (((_e426 * (((_e272.y + _e281.y) + _e306.y) + _e297.y)) + _e288.y) * _e435), (((_e426 * (((_e272.z + _e281.z) + _e306.z) + _e297.z)) + _e288.z) * _e435)) / vec3(select(_e455.x, 1f, (_e455.x == 0f))));
    textureStore(rw_upscaled_output, _e262, vec4<f32>(_e460.x, _e460.y, _e460.z, 1f));
    let _e467 = vec2<u32>(_e259, (_e51.y + 8u));
    let _e468 = bitcast<vec2<i32>>(_e467);
    let _e471 = textureLoad(r_rcas_input, bitcast<vec2<u32>>((_e468 + vec2<i32>(0i, -1i))), 0u);
    let _e472 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e477 = (_e471.xyz * select(_e472.x, 1f, (_e472.x == 0f)));
    let _e480 = textureLoad(r_rcas_input, bitcast<vec2<u32>>((_e468 + vec2<i32>(-1i, 0i))), 0u);
    let _e481 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e486 = (_e480.xyz * select(_e481.x, 1f, (_e481.x == 0f)));
    let _e487 = textureLoad(r_rcas_input, _e467, 0u);
    let _e488 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e493 = (_e487.xyz * select(_e488.x, 1f, (_e488.x == 0f)));
    let _e496 = textureLoad(r_rcas_input, bitcast<vec2<u32>>((_e468 + vec2<i32>(1i, 0i))), 0u);
    let _e497 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e502 = (_e496.xyz * select(_e497.x, 1f, (_e497.x == 0f)));
    let _e505 = textureLoad(r_rcas_input, bitcast<vec2<u32>>((_e468 + vec2<i32>(0i, 1i))), 0u);
    let _e506 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e511 = (_e505.xyz * select(_e506.x, 1f, (_e506.x == 0f)));
    let _e530 = ((_e477.z * 0.5f) + ((_e477.x * 0.5f) + _e477.y));
    let _e534 = ((_e486.z * 0.5f) + ((_e486.x * 0.5f) + _e486.y));
    let _e538 = ((_e493.z * 0.5f) + ((_e493.x * 0.5f) + _e493.y));
    let _e542 = ((_e502.z * 0.5f) + ((_e502.x * 0.5f) + _e502.y));
    let _e546 = ((_e511.z * 0.5f) + ((_e511.x * 0.5f) + _e511.y));
    let _e561 = (max(max(_e530, max(_e534, _e538)), max(_e542, _e546)) - min(min(_e530, min(_e534, _e538)), min(_e542, _e546)));
    let _e564 = bitcast<f32>((2129764351u - bitcast<u32>(_e561)));
    let _e575 = min(min(_e477.x, min(_e486.x, _e502.x)), _e511.x);
    let _e578 = min(min(_e477.y, min(_e486.y, _e502.y)), _e511.y);
    let _e581 = min(min(_e477.z, min(_e486.z, _e502.z)), _e511.z);
    let _e584 = max(max(_e477.x, max(_e486.x, _e502.x)), _e511.x);
    let _e587 = max(max(_e477.y, max(_e486.y, _e502.y)), _e511.y);
    let _e590 = max(max(_e477.z, max(_e486.z, _e502.z)), _e511.z);
    let _e595 = clamp((_e538 / min(min(_e530, min(_e534, _e542)), _e546)), 0f, 1f);
    let _e631 = ((max(-0.1875f, min(max(max(-(((_e575 * (0.25f / _e584)) * _e595)), ((1f - _e584) * (1f / ((4f * _e575) + -4f)))), max(max(-(((_e578 * (0.25f / _e587)) * _e595)), ((1f - _e587) * (1f / ((4f * _e578) + -4f)))), max(-(((_e581 * (0.25f / _e590)) * _e595)), ((1f - _e590) * (1f / ((4f * _e581) + -4f)))))), 0f)) * _e217) * ((-0.5f * clamp((abs(((0.25f * (((_e530 + _e534) + _e542) + _e546)) - _e538)) * (_e564 * ((-(_e564) * _e561) + 2f))), 0f, 1f)) + 1f));
    let _e633 = ((4f * _e631) + 1f);
    let _e636 = bitcast<f32>((2129764351u - bitcast<u32>(_e633)));
    let _e640 = (_e636 * ((-(_e636) * _e633) + 2f));
    let _e660 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e665 = (vec3<f32>((((_e631 * (((_e477.x + _e486.x) + _e511.x) + _e502.x)) + _e493.x) * _e640), (((_e631 * (((_e477.y + _e486.y) + _e511.y) + _e502.y)) + _e493.y) * _e640), (((_e631 * (((_e477.z + _e486.z) + _e511.z) + _e502.z)) + _e493.z) * _e640)) / vec3(select(_e660.x, 1f, (_e660.x == 0f))));
    textureStore(rw_upscaled_output, _e467, vec4<f32>(_e665.x, _e665.y, _e665.z, 1f));
    let _e672 = vec2<u32>(_e51.x, _e467.y);
    let _e673 = bitcast<vec2<i32>>(_e672);
    let _e676 = textureLoad(r_rcas_input, bitcast<vec2<u32>>((_e673 + vec2<i32>(0i, -1i))), 0u);
    let _e677 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e682 = (_e676.xyz * select(_e677.x, 1f, (_e677.x == 0f)));
    let _e685 = textureLoad(r_rcas_input, bitcast<vec2<u32>>((_e673 + vec2<i32>(-1i, 0i))), 0u);
    let _e686 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e691 = (_e685.xyz * select(_e686.x, 1f, (_e686.x == 0f)));
    let _e692 = textureLoad(r_rcas_input, _e672, 0u);
    let _e693 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e698 = (_e692.xyz * select(_e693.x, 1f, (_e693.x == 0f)));
    let _e701 = textureLoad(r_rcas_input, bitcast<vec2<u32>>((_e673 + vec2<i32>(1i, 0i))), 0u);
    let _e702 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e707 = (_e701.xyz * select(_e702.x, 1f, (_e702.x == 0f)));
    let _e710 = textureLoad(r_rcas_input, bitcast<vec2<u32>>((_e673 + vec2<i32>(0i, 1i))), 0u);
    let _e711 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e716 = (_e710.xyz * select(_e711.x, 1f, (_e711.x == 0f)));
    let _e735 = ((_e682.z * 0.5f) + ((_e682.x * 0.5f) + _e682.y));
    let _e739 = ((_e691.z * 0.5f) + ((_e691.x * 0.5f) + _e691.y));
    let _e743 = ((_e698.z * 0.5f) + ((_e698.x * 0.5f) + _e698.y));
    let _e747 = ((_e707.z * 0.5f) + ((_e707.x * 0.5f) + _e707.y));
    let _e751 = ((_e716.z * 0.5f) + ((_e716.x * 0.5f) + _e716.y));
    let _e766 = (max(max(_e735, max(_e739, _e743)), max(_e747, _e751)) - min(min(_e735, min(_e739, _e743)), min(_e747, _e751)));
    let _e769 = bitcast<f32>((2129764351u - bitcast<u32>(_e766)));
    let _e780 = min(min(_e682.x, min(_e691.x, _e707.x)), _e716.x);
    let _e783 = min(min(_e682.y, min(_e691.y, _e707.y)), _e716.y);
    let _e786 = min(min(_e682.z, min(_e691.z, _e707.z)), _e716.z);
    let _e789 = max(max(_e682.x, max(_e691.x, _e707.x)), _e716.x);
    let _e792 = max(max(_e682.y, max(_e691.y, _e707.y)), _e716.y);
    let _e795 = max(max(_e682.z, max(_e691.z, _e707.z)), _e716.z);
    let _e800 = clamp((_e743 / min(min(_e735, min(_e739, _e747)), _e751)), 0f, 1f);
    let _e836 = ((max(-0.1875f, min(max(max(-(((_e780 * (0.25f / _e789)) * _e800)), ((1f - _e789) * (1f / ((4f * _e780) + -4f)))), max(max(-(((_e783 * (0.25f / _e792)) * _e800)), ((1f - _e792) * (1f / ((4f * _e783) + -4f)))), max(-(((_e786 * (0.25f / _e795)) * _e800)), ((1f - _e795) * (1f / ((4f * _e786) + -4f)))))), 0f)) * _e217) * ((-0.5f * clamp((abs(((0.25f * (((_e735 + _e739) + _e747) + _e751)) - _e743)) * (_e769 * ((-(_e769) * _e766) + 2f))), 0f, 1f)) + 1f));
    let _e838 = ((4f * _e836) + 1f);
    let _e841 = bitcast<f32>((2129764351u - bitcast<u32>(_e838)));
    let _e845 = (_e841 * ((-(_e841) * _e838) + 2f));
    let _e865 = textureLoad(r_input_exposure, vec2<u32>(0u, 0u), 0u);
    let _e870 = (vec3<f32>((((_e836 * (((_e682.x + _e691.x) + _e716.x) + _e707.x)) + _e698.x) * _e845), (((_e836 * (((_e682.y + _e691.y) + _e716.y) + _e707.y)) + _e698.y) * _e845), (((_e836 * (((_e682.z + _e691.z) + _e716.z) + _e707.z)) + _e698.z) * _e845)) / vec3(select(_e865.x, 1f, (_e865.x == 0f))));
    textureStore(rw_upscaled_output, _e672, vec4<f32>(_e870.x, _e870.y, _e870.z, 1f));
    return;
}

@compute @workgroup_size(64, 1, 1) 
fn CS(@builtin(local_invocation_id) param: vec3<u32>, @builtin(workgroup_id) param_1: vec3<u32>) {
    global = param;
    global_1 = param_1;
    CS_1();
}
`;
