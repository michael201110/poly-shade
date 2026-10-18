// Time-boxed follow-up of the 4K/full-resolution moving grade-pass outlier.
import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {access,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const temporary=process.env.TEMP,rows=[];
let before=process.env.JITTER_BEFORE_BUNDLE??`${temporary}/polyshade-jitter-before/experimental/main.mod.js`;
try{await access(before);}catch{before='experimental/0.6.0-fsr31.0/main.mod.js';}
for(const [attempt,motionBlur]of [[1,true],[2,true],[3,true],['isolation',false]]) {
  for(const [variant,bundle]of [['before',before],['after','experimental/0.6.0-fsr31.1/main.mod.js']]) {
    const label=`jitter-outlier-${attempt}-${variant}`,log=`${temporary}/${label}.log`,stream=createWriteStream(log);
    console.log('START',label);
    const code=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,['scripts/profile-gameplay.mjs'],{env:{...process.env,POLYSHADE_BUNDLE:bundle,
        POLYSHADE_TEMPORAL_MODE:'sgsr2-compute',POLYSHADE_TEMPORAL_AT_100:'1',POLYSHADE_PROFILE_LABEL:label,
        POLYSHADE_PROFILE_MS:'8000',POLYSHADE_PROFILE_MOTION_BLUR:motionBlur?'1':'0',
        POLYSHADE_FRAME_GENERATION:'0',POLYSHADE_FG_FORCE:'0',POLYSHADE_WARM_INPUT:'1',
        POLYSHADE_VIEWPORT:'3840x2160',POLYSHADE_RESOLUTIONS:'3840x2160',POLYSHADE_SCALES:'1',POLYSHADE_HEADED:'1'},windowsHide:true});
      child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});child.on('error',reject);
      child.on('close',code=>{stream.end();stream.on('finish',()=>resolve(code));});
    });
    const report=JSON.parse(await readFile(`${temporary}/polyshade-performance/${label}/report.json`,'utf8'));
    for(const c of report.cases)assert.equal(c.settings.motionBlurEnabled,motionBlur,'verify the actual diagnostic setting');
    rows.push({attempt,motionBlur,variant,exitCode:code,log,report});
    await writeFile('docs/verification/jitter/grade-outlier.json',JSON.stringify({rows,
      note:'Three repeated full-quality moving before/after pairs; one motion-blur-off diagnostic pair. The diagnostic is not the shipped configuration or a claimed performance improvement. Actual clocks and GPU pass distributions retained.'},null,2)+'\n');
    assert.equal(code,0,`See ${log}`);console.log('PASS',label);
  }
}
