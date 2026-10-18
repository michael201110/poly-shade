import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const directory=process.env.TEMP+'/polyshade-fsr-stack-verification';await mkdir(directory,{recursive:true});
const env={...process.env,POLYSHADE_BUNDLE:'experimental/0.6.0-fsr31.1/main.mod.js',POLYSHADE_VIEWPORT:'1280x720',POLYSHADE_HEADED:'1'};
const checks=[['unit',['--test']],['fg-synthetic',['scripts/verify-framegen.mjs']],['fg-live',['scripts/verify-framegen-live.mjs']],
  ['fsr-synthetic',['scripts/verify-fsr.mjs']],['fsr-mask',['scripts/verify-fsr-mask.mjs']],['fsr-live',['scripts/verify-fsr-live.mjs']],['fsr-visual',['scripts/fsr/compare-modes.mjs']],
  ['compute',['scripts/verify-compute-kernel.mjs']],['webgpu',['scripts/verify-webgpu.mjs']],['visual',['scripts/verify-visual-match.mjs']],
  ['upscaling',['scripts/benchmark-upscaling.mjs']],['4k',['scripts/verify-4k.mjs']],
  ['reference-temporal',['scripts/verify-temporal-inputs.mjs']],['reference-live',['scripts/verify-live.mjs']],['reference-replay',['scripts/verify-replay.mjs']]];
const results=[];
for(const [name,args]of checks) {
  console.log('START',name);const start=Date.now(),log=`${directory}/${name}.log`,stream=createWriteStream(log);
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{env,windowsHide:true});child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});
    child.on('error',reject);child.on('close',code=>{stream.end();stream.on('finish',()=>resolve(code));});
  });
  const result={name,args,exitCode:code,durationMs:Date.now()-start,log};results.push(result);console.log(code===0?'PASS':'FAIL',name,result.durationMs+' ms');
  await mkdir('docs/verification/framegen',{recursive:true});
  await writeFile('docs/verification/framegen/stack-tests.json',JSON.stringify({date:new Date().toISOString(),
    bundle:env.POLYSHADE_BUNDLE,sha256:createHash('sha256').update(await readFile(env.POLYSHADE_BUNDLE)).digest('hex'),
    note:'Reference checks deliberately exercise their archived renderer versions; other checks use the candidate bundle. Fresh test browsers run serially.',results},null,2)+'\n');
}
if(results.some(r=>r.exitCode!==0))process.exitCode=1;
