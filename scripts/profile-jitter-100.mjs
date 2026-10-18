// Supplement the Native control with true full-resolution temporal GPU costs.
import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {readFile,writeFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
const temporary=process.env.TEMP,file='docs/verification/jitter/gameplay-performance.json';
const combined=JSON.parse(await readFile(file,'utf8'));
let before=process.env.JITTER_BEFORE_BUNDLE??`${temporary}/polyshade-jitter-before/experimental/main.mod.js`;
try{await access(before);}catch{before='experimental/0.6.0-fsr31.0/main.mod.js';}
for(const mode of ['sgsr2-compute','fsr31'])for(const [variant,bundle]of [['before',before],['after','experimental/0.6.0-fsr31.1/main.mod.js']]) {
  const label=`jitter-${variant}-${mode}-100`,log=`${temporary}/${label}-profile.log`,stream=createWriteStream(log);
  console.log('START',label);
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['scripts/profile-gameplay.mjs'],{env:{...process.env,POLYSHADE_BUNDLE:bundle,
      POLYSHADE_TEMPORAL_MODE:mode,POLYSHADE_TEMPORAL_AT_100:'1',POLYSHADE_PROFILE_LABEL:label,
      POLYSHADE_PROFILE_MS:'3500',POLYSHADE_FRAME_GENERATION:'0',POLYSHADE_FG_FORCE:'0',POLYSHADE_WARM_INPUT:'1',
      POLYSHADE_VIEWPORT:'1280x720',POLYSHADE_RESOLUTIONS:'1280x720,1920x1080,2560x1440,3840x2160',
      POLYSHADE_SCALES:'1',POLYSHADE_HEADED:'1'},windowsHide:true});
    child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});child.on('error',reject);
    child.on('close',code=>{stream.end();stream.on('finish',()=>resolve(code));});
  });
  const report=JSON.parse(await readFile(`${temporary}/polyshade-performance/${label}/report.json`,'utf8'));
  for(const c of report.cases){
    const row={variant,mode,name:c.name,scale:c.scale,output:c.gpu.output,internal:c.gpu.internal,
      bundle:report.bundle,sha256:report.sha256,realFPS:c.effectiveFPS,frameIntervals:c.frames,renderIntervals:c.renderIntervals,
      gpu:c.gpu.profile,cpu:c.cpu,queue:c.gpu.frameQueue,input:c.input,hardware:c.hardware,errors:report.errors};
    const at=combined.rows.findIndex(r=>r.variant===variant&&r.mode===mode&&r.name===c.name);
    if(at<0)combined.rows.push(row);else combined.rows[at]=row;
  }
  await writeFile(file,JSON.stringify(combined,null,2)+'\n');
  assert.equal(code,0,`See ${log}`);console.log('PASS',label);
}
