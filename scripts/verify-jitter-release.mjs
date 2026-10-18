// Final qualification after the late lazy-skid MRT integration correction.
// GPU work is serial. Prior outcomes/hashes remain in the archived reports.
import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='docs/verification/jitter',temporary=process.env.TEMP,bundle='experimental/0.6.0-fsr31.1/main.mod.js';
const sha256=createHash('sha256').update(await readFile(bundle)).digest('hex'),results=[],swarms=[];
await mkdir(root,{recursive:true});
async function run(label,args,extra={}) {
  const log=`${temporary}/polyshade-${label}.log`,stream=createWriteStream(log),started=Date.now();
  console.log('START',label);
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{env:{...process.env,POLYSHADE_BUNDLE:bundle,
      POLYSHADE_HEADED:'1',POLYSHADE_VIEWPORT:'1280x720',...extra},windowsHide:true});
    child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});child.on('error',reject);
    child.on('close',code=>{stream.end();stream.on('finish',()=>resolve(code));});
  });
  results.push({label,args,exitCode:code,durationMs:Date.now()-started,log});
  await writeFile(root+'/release-checks.json',JSON.stringify({date:new Date().toISOString(),bundle,sha256,results},null,2)+'\n');
  assert.equal(code,0,`See ${log}`);console.log('PASS',label);
}
for(const frameGeneration of [false,true])for(const mode of ['fsr31','sgsr2-compute'])for(const count of [1,100,500]) {
  const label=`release-swarm-${mode}-${count}${frameGeneration?'-fg':''}`;
  await run(label,['scripts/profile-swarm.mjs'],{POLYBOT_ROOT:process.env.POLYBOT_ROOT??'C:/Users/michael/Documents/GitHub/poly-bot',
    POLYBOT_COUNT:String(count),POLYSHADE_SCALE:'.5',POLYSHADE_TEMPORAL_MODE:mode,
    POLYSHADE_FRAME_GENERATION:frameGeneration?'1':'0',POLYSHADE_PROFILE_MS:'8000',POLYSHADE_PROFILE_LABEL:label});
  const report=JSON.parse(await readFile(`${temporary}/polyshade-performance/${label}/report.json`,'utf8'));
  assert.ok(report.final.cars.colourDraws>0&&report.final.cars.triangles>0);
  assert.equal(report.final.status.result.loaded_ghosts,count);
  swarms.push(report);
  await writeFile(root+'/swarm-regression.json',JSON.stringify({bundle,sha256,
    note:'Renderer-only fixtures in the default Summer 1 host scene, not lap/track-coordinate validation. Loaded counts differ from visible counts as short recordings finish/coast/disappear; no visibility is forced for the benchmark. No trainer or bridge connection.',swarms},null,2)+'\n');
}
await run('release-stack',['scripts/verify-fsr-stack.mjs']);
for(const resolution of ['1280x720','1920x1080','2560x1440','3840x2160']) {
  const label=`release-${resolution}`,directory=`${temporary}/polyshade-jitter-${label}`;
  await run('jitter-'+label,['scripts/verify-jitter.mjs'],{POLYSHADE_VIEWPORT:resolution,JITTER_LABEL:label,
    JITTER_MODES:'native,sgsr2-compute,fsr31',JITTER_SCALES:'1,.77,.67,.59,.5',JITTER_PROBES:'1',
    JITTER_EFFECTS:'full',JITTER_FILTERS:'1',JITTER_RECORD_ONLY:'0',JITTER_RAW:'0',
    JITTER_AXIS:'both',JITTER_FPS:'60',JITTER_OBJECT_MOTION:'1'});
  // The verifier already measures whole-image displacement and edge flicker.
  // Extra regional/contact-sheet diagnostics are only needed for the primary
  // 720p comparison; avoid repeatedly decoding every 4K PNG a second time.
  if(resolution==='1280x720') {
    await run('release-regions',['scripts/jitter-regions.mjs',directory]);
    await run('release-flicker',['scripts/jitter-flicker.mjs',directory]);
  }
}
await run('release-collect',['scripts/collect-jitter-results.mjs']);
