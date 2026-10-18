import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, relative } from 'node:path';
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const result = await build({ entryPoints: ['src/mod.js'], bundle: true, format: 'esm', platform: 'browser', target: 'es2022', write:false,
  alias: { 'three/webgpu': 'three/src/Three.WebGPU.js', 'three/tsl': 'three/src/Three.TSL.js' },
  external: ['https://*'], outfile: process.env.POLYSHADE_BUILD_OUTPUT ?? `experimental/${version}/main.mod.js` });
for (const output of result.outputFiles) {
  const path = relative(process.cwd(),output.path).replaceAll('\\','/');
  let committed;
  try { committed=execFileSync('git',['show',`HEAD:${path}`],{stdio:['ignore','pipe','ignore'],maxBuffer:32*1024*1024}); }
  catch { /* A new version or a temporary experiment has no committed bundle. */ }
  if(committed && !committed.equals(Buffer.from(output.contents)))
    throw new Error(`Refusing to overwrite committed bundle ${path}. Increment the version or build to a new temporary output.`);
  await mkdir(dirname(output.path),{recursive:true});
  await writeFile(output.path,output.contents);
}
