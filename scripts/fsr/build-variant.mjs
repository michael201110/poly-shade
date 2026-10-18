// Isolated compiler study. Does not change the experiment's canonical shaders.
import { build } from 'esbuild';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const name = process.argv[2] ?? 'no-unroll';
if (name !== 'no-unroll') throw new Error('Unknown variant');
const directory = join(tmpdir(), 'polyshade-fsr31-experimental', name);
await mkdir(directory, {recursive:true});
await build({ entryPoints:['src/mod.js'],bundle:true,format:'esm',platform:'browser',target:'es2022',
  alias:{'three/webgpu':'three/src/Three.WebGPU.js','three/tsl':'three/src/Three.TSL.js'},external:['https://*'],
  outfile:join(directory,'main.mod.js'),plugins:[{name:'isolated-shading-loop',setup(build){
    build.onLoad({filter:/generated[\\/]shading_change_pyramid\.wgsl\.js$/},async()=>({
      contents:await readFile(join(directory,'shading_change_pyramid.wgsl.js'),'utf8'),loader:'js',
    }));
  }}],
});
console.log(join(directory,'main.mod.js'));
