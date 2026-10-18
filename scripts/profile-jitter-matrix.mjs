// Matched live Golden Hour profiling; each fresh Edge instance runs serially.
import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
const output='docs/verification/jitter',temporary=process.env.TEMP;
await mkdir(output,{recursive:true});
let before=process.env.JITTER_BEFORE_BUNDLE??`${temporary}/polyshade-jitter-before/experimental/main.mod.js`;
try{await access(before);}catch{before='experimental/0.6.0-fsr31.0/main.mod.js';}
const rows=[];
for(const mode of ['sgsr2-compute','fsr31']) {
  for(const [variant,bundle] of [['before',before],['after','experimental/0.6.0-fsr31.1/main.mod.js']]) {
    const label=`jitter-${variant}-${mode}`,log=`${temporary}/${label}-profile.log`,stream=createWriteStream(log);
    const env={...process.env,POLYSHADE_BUNDLE:bundle,POLYSHADE_TEMPORAL_MODE:mode,POLYSHADE_PROFILE_LABEL:label,
      POLYSHADE_PROFILE_MS:process.env.JITTER_PROFILE_MS??'3500',POLYSHADE_FRAME_GENERATION:'0',POLYSHADE_FG_FORCE:'0',
      POLYSHADE_WARM_INPUT:'1',
      POLYSHADE_VIEWPORT:'1280x720',POLYSHADE_RESOLUTIONS:'1280x720,1920x1080,2560x1440,3840x2160',
      POLYSHADE_SCALES:mode==='fsr31'?'.77,.67,.59,.5':'1,.77,.67,.59,.5',POLYSHADE_HEADED:'1'};
    console.log('START',label);
    const code=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,['scripts/profile-gameplay.mjs'],{env,windowsHide:true});
      child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});child.on('error',reject);
      child.on('close',code=>{stream.end();stream.on('finish',()=>resolve(code));});
    });
    const report=JSON.parse(await readFile(`${temporary}/polyshade-performance/${label}/report.json`,'utf8'));
    for(const c of report.cases)rows.push({variant,mode,name:c.name,scale:c.scale,output:c.gpu.output,internal:c.gpu.internal,
      bundle:report.bundle,sha256:report.sha256,realFPS:c.effectiveFPS,frameIntervals:c.frames,renderIntervals:c.renderIntervals,
      gpu:c.gpu.profile,cpu:c.cpu,queue:c.gpu.frameQueue,input:c.input,hardware:c.hardware,errors:report.errors});
    await writeFile(`${output}/gameplay-performance.json`,JSON.stringify({date:new Date().toISOString(),
      method:'Ordinary headed Edge gameplay, trusted input, Golden Hour, no FG. Named GPU timestamps are actual pass costs; FPS is real rendered images, not claimed scan-out. Each row retains clocks/power state. Before/after absolute differences include hardware variation.',rows},null,2)+'\n');
    if(code!==0)throw Error(`${label} failed; see ${log}`);
    console.log('PASS',label,report.cases.length);
  }
}
