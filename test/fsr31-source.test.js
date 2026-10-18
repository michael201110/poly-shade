import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { SR_SHADERS, shaderBindings } from '../src/rendering/fsr31/super-resolution.js';
import { selectUpscaling } from '../src/rendering/temporal-state.js';
import { includeMrtPipelineKey } from '../src/rendering/webgpu/three-adapter.js';
import { GPUScene } from '../src/rendering/webgpu/scene.js';
import * as T from 'three/src/Three.WebGPU.js';

test('every vendored AMD reference file retains its pinned upstream hash', async () => {
  const reference = JSON.parse(await readFile('vendor/fidelityfx/reference.json', 'utf8'));
  assert.equal(reference.revision, '60f4ea81909200d8542eca14dccb2628b763a9a3');
  assert.ok(!reference.files['reference.json'], 'manifest cannot hash itself');
  for (const [path, hash] of Object.entries(reference.files)) {
    const bytes = await readFile(`vendor/fidelityfx/${path}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hash, path);
  }
});
test('SR uses actual compiled AMD passes and unique reflected bindings', () => {
  assert.equal(Object.keys(SR_SHADERS).length, 11);
  for (const [name, code] of Object.entries(SR_SHADERS)) {
    assert.match(code, /@compute/); assert.match(code, /fn CS\(/);
    const bindings = shaderBindings(code);
    assert.ok(bindings.length >= 3, name);
    assert.equal(new Set(bindings.map(b => b.binding)).size, bindings.length);
  }
});
test('explicit FSR selection retains SGSR2 and Native fallbacks without changing Auto', () => {
  const capabilities = { webgpu: true, compute: true, fsr31: true };
  const settings = { upscaling: 'fsr31', upscaleQuality: 'performance' };
  assert.equal(selectUpscaling(settings, capabilities).backend, 'fsr31');
  assert.equal(selectUpscaling(settings, capabilities).scale, .5);
  assert.equal(selectUpscaling(settings, { ...capabilities, fsr31: false }).backend, 'sgsr2-compute');
  assert.equal(selectUpscaling(settings, { ...capabilities, fsr31: false, compute: false }).backend, 'native');
  assert.equal(selectUpscaling({ ...settings, upscaling: 'auto' }, capabilities).backend, 'sgsr2-compute');
});
test('pinned Three adapter separates MRT PSOs and restores original backend', () => {
  const original = () => 'original-key';
  const renderer = { backend: { getRenderCacheKey: original, utils: {
    getCurrentColorFormats: context => context.textures.map(t => t.format),
  } } };
  const remove = includeMrtPipelineKey(renderer);
  const single = { context: { textures: [{ format: 'rgba16float' }] } };
  const multi = { context: { textures: [{ format: 'rgba16float' }, { format: 'rgba8unorm' }] } };
  assert.equal(renderer.backend.getRenderCacheKey(single), 'original-key');
  assert.notEqual(renderer.backend.getRenderCacheKey(single), renderer.backend.getRenderCacheKey(multi));
  remove(); assert.equal(renderer.backend.getRenderCacheKey, original);
});
test('replacement car materials inherit active MRT state without topology changes', () => {
  const scene = new GPUScene();
  const source = new T.MeshBasicMaterial(); source.name = 'AirIntake';
  const old = scene.material(source), mrt = { isNode: true };
  scene.setMRT(mrt); assert.equal(old.mrtNode, mrt);
  const topology = scene.topologyVersion;
  const replacement = scene.material(source.clone());
  assert.equal(scene.topologyVersion, topology);
  assert.equal(replacement.mrtNode, mrt, 'new material must write the reactive attachment immediately');
  scene.setMRT(null); assert.equal(old.mrtNode, null); assert.equal(replacement.mrtNode, null);
  scene.dispose();
});
