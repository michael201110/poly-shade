// Serial final-artifact qualification. Never competes with another GPU suite.
import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const output='docs/verification/jitter',temporary=process.env.TEMP;
await mkdir(output,{recursive:true});
const bundle='experimental/0.6.0-fsr31.1/main.mod.js',results=[],swarms=[];
async function run(label,args,extra={}) {
  console.log('START',label);const started=Date.now(),log=`${temporary}/polyshade-${label}.log`,stream=createWriteStream(log);
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{env:{...process.env,POLYSHADE_BUNDLE:bundle,
      POLYSHADE_HEADED:'1',POLYSHADE_VIEWPORT:'1280x720',...extra},windowsHide:true});
    child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});child.on('error',reject);
    child.on('close',code=>{stream.end();stream.on('finish',()=>resolve(code));});
  });
  results.push({label,args,exitCode:code,durationMs:Date.now()-started,log});
  await writeFile(`${output}/final-checks.json`,JSON.stringify({date:new Date().toISOString(),bundle,
    sha256:createHash('sha256').update(await readFile(bundle)).digest('hex'),results},null,2)+'\n');
  assert.equal(code,0,`${label}: see ${log}`);console.log('PASS',label);
}
await run('jitter-profile-100',['scripts/profile-jitter-100.mjs']);
await run('jitter-performance-report',['scripts/report-jitter-performance.mjs']);
await run('fg-temporal-presentation',['scripts/verify-framegen-live.mjs']);
for(const resolution of ['1280x720','1920x1080','2560x1440','3840x2160']) {
  const label=`final-${resolution==='1280x720'?'720':resolution}`,root=`${temporary}/polyshade-jitter-${label}`;
  await run(`jitter-${label}`,['scripts/verify-jitter.mjs'],{
    POLYSHADE_VIEWPORT:resolution,JITTER_LABEL:label,JITTER_MODES:'native,sgsr2-compute,fsr31',
    JITTER_SCALES:'1,.77,.67,.59,.5',JITTER_PROBES:'1',JITTER_EFFECTS:'full',JITTER_FILTERS:'1',
    JITTER_RECORD_ONLY:'0',JITTER_RAW:'0',JITTER_AXIS:'both',JITTER_FPS:'60',JITTER_OBJECT_MOTION:'1'});
  await run(`jitter-regions-${resolution}`,['scripts/jitter-regions.mjs',root]);
  await run(`jitter-flicker-${resolution}`,['scripts/jitter-flicker.mjs',root]);
}
await run('collect-jitter',['scripts/collect-jitter-results.mjs']);
for(const frameGeneration of [false,true])for(const mode of ['sgsr2-compute','fsr31'])for(const count of [1,100,500]) {
  const label=`final-swarm-${mode}-${count}${frameGeneration?'-fg':''}`;
  await run(label,['scripts/profile-swarm.mjs'],{POLYBOT_ROOT:process.env.POLYBOT_ROOT??'C:/Users/michael/Documents/GitHub/poly-bot',
    POLYBOT_COUNT:String(count),POLYSHADE_SCALE:'.5',POLYSHADE_TEMPORAL_MODE:mode,
    POLYSHADE_FRAME_GENERATION:frameGeneration?'1':'0',POLYSHADE_PROFILE_MS:'8000',POLYSHADE_PROFILE_LABEL:label});
  const report=JSON.parse(await readFile(`${temporary}/polyshade-performance/${label}/report.json`,'utf8'));
  swarms.push({mode,...report});
  await writeFile(`${output}/swarm-regression.json`,JSON.stringify({bundle,
    sha256:createHash('sha256').update(await readFile(bundle)).digest('hex'),
    note:'Renderer-only fixture playback in fresh headed Edge; no trainer or bridge connection. Ordinary live-game physics is not supplied by ghost instances.',swarms},null,2)+'\n');
}
await run('jitter-grade-outlier',['scripts/profile-jitter-outlier.mjs']);
