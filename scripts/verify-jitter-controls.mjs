// Verifier-only axis/clock controls and proof that the old shimmer fails.
import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
const rows=[],temporary=process.env.TEMP;
async function run(label,{bundle,mode='sgsr2-compute,fsr31',axis='both',fps=60,expectFailure=false}={}) {
  const log=`${temporary}/polyshade-jitter-${label}.log`,stream=createWriteStream(log);
  const env={...process.env,POLYSHADE_BUNDLE:bundle??'experimental/0.6.0-fsr31.1/main.mod.js',POLYSHADE_VIEWPORT:'1280x720',
    JITTER_LABEL:label,JITTER_MODES:mode,JITTER_SCALES:'.5',JITTER_AXIS:axis,JITTER_FPS:String(fps),
    JITTER_RAW:'0',JITTER_RECORD_ONLY:'0',JITTER_OBJECT_MOTION:'1',JITTER_PROBES:'1',JITTER_EFFECTS:'full',JITTER_FILTERS:'1'};
  console.log('START',label);
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['scripts/verify-jitter.mjs'],{env,windowsHide:true});
    child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});child.on('error',reject);
    child.on('close',code=>{stream.end();stream.on('finish',()=>resolve(code));});
  });
  const report=JSON.parse(await readFile(`${temporary}/polyshade-jitter-${label}/report.json`,'utf8'));
  if(expectFailure){assert.notEqual(code,0);assert.match(await readFile(log,'utf8'),/stationary edge flicker/);}
  else assert.equal(code,0,`See ${log}`);
  rows.push({label,axis,logicalClockFPS:fps,expectedOldFailure:expectFailure,exitCode:code,report});
  console.log('PASS',label,expectFailure?'old shimmer rejected':'');
}
try {
  let before=process.env.JITTER_BEFORE_BUNDLE??`${temporary}/polyshade-jitter-before/experimental/main.mod.js`;
  try{await access(before);}catch{before='experimental/0.6.0-fsr31.0/main.mod.js';}
  for(const mode of ['sgsr2-compute','fsr31'])await run(`old-rejected-${mode}`,{bundle:before,mode,expectFailure:true});
  for(const axis of ['x','y','zero'])await run(`axis-${axis}`,{axis});
  for(const fps of [15,30,120])await run(`clock-${fps}`,{fps});
}finally{
  await mkdir('docs/verification/jitter',{recursive:true});
  await writeFile('docs/verification/jitter/controls.json',JSON.stringify({rows,
    note:'Axis/zero modes exist only in the verifier. Logical time-step tests exclude readback wall time; actual admitted-render cadence is measured separately.'},null,2)+'\n');
}
