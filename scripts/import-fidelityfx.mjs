// Development-only import of the pinned official AMD reference. Never fetches latest.
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const revision = '60f4ea81909200d8542eca14dccb2628b763a9a3';
const source = resolve(process.env.FIDELITYFX_SDK ?? process.argv[2] ?? '');
if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim() !== revision)
  throw new Error(`Reference must be FidelityFX SDK v2.3.0 (${revision})`);
const target = resolve('vendor/fidelityfx');
const paths = ['Kits/FidelityFX/api/internal/gpu',
  ...['upscalers', 'framegeneration'].flatMap(kind => [
    `Kits/FidelityFX/${kind}/fsr3/include`, `Kits/FidelityFX/${kind}/fsr3/internal/shaders`,
    ... (kind === 'upscalers' ? ['ffx_fsr3upscaler.cpp'] : ['ffx_frameinterpolation.cpp', 'ffx_opticalflow.cpp'])
      .map(file => `Kits/FidelityFX/${kind}/fsr3/internal/${file}`),
  ])];
for (const path of paths) {
  await mkdir(resolve(target, path, '..'), { recursive: true });
  await cp(resolve(source, path), resolve(target, path), { recursive: true });
}
const files = {};
const licenseSource = await readFile(resolve(target, 'Kits/FidelityFX/upscalers/fsr3/internal/shaders/ffx_fsr3upscaler_prepare_inputs_pass.hlsl'), 'utf8');
const license = licenseSource.slice(0, licenseSource.indexOf('#define')).split('\n')
  .filter(line => line.startsWith('//')).map(line => line.replace(/^\/\/ ?/, '')).join('\n').trim();
await writeFile(join(target, 'LICENSE.txt'), license + '\n');
async function inventory(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (dir === target && entry.name === 'reference.json') continue;
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await inventory(file);
    else files[relative(target, file).replaceAll('\\', '/')] = createHash('sha256').update(await readFile(file)).digest('hex');
  }
}
await inventory(target);
await writeFile(join(target, 'reference.json'), JSON.stringify({
  repository: 'https://github.com/GPUOpen-LibrariesAndSDKs/FidelityFX-SDK',
  tag: 'v2.3.0', revision, superResolution: '3.1.5', frameInterpolation: '3.1.6', files,
}, null, 2) + '\n');
console.log(`Imported ${Object.keys(files).length} unchanged AMD reference files.`);
