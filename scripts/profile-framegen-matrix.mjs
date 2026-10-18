// Serial headed gameplay matrix: never overlap GPU benchmark browsers.
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const rows=[];
for(const fg of [false,true])for(const mode of ['sgsr2-compute','fsr31']) {
  const label=`framegen-${fg?'on':'off'}-${mode}-smooth`;
  console.log('START',label);
  const env={...process.env,POLYSHADE_BUNDLE:'experimental/0.6.0-fsr31.1/main.mod.js',POLYSHADE_PROFILE_LABEL:label,
    POLYSHADE_FRAME_GENERATION:fg?'1':'0',POLYSHADE_FG_PACING:'smooth',POLYSHADE_TEMPORAL_MODE:mode,
    POLYSHADE_FG_FORCE:fg?'1':'0',
    POLYSHADE_SCALES:mode==='fsr31'?'.67,.5':'1,.67,.5',POLYSHADE_PROFILE_MS:process.env.POLYSHADE_PROFILE_MS??'6500'};
  const exit=!fg&&process.env.POLYSHADE_MATRIX_REUSE_OFF==='1'?0:await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['scripts/profile-gameplay.mjs'],{env,stdio:'inherit',windowsHide:true});
    child.on('error',reject);child.on('close',resolve);
  });
  if(exit!==0)throw Error(`${label} exited ${exit}`);
  const report=JSON.parse(await readFile(`${env.TEMP}/polyshade-performance/${label}/report.json`,'utf8'));
  for(const c of report.cases)rows.push({name:c.name,fgRequested:fg,guardBypassedForCostMeasurement:report.forceFG,mode:c.gpu.selection.backend,scale:c.scale,
    bundleSHA256:report.sha256,browser:report.browser,output:c.gpu.output,internal:c.gpu.internal,
    realFPS:c.effectiveFPS,presentation:c.presentation,fgState:c.gpu.presentation,
    gpuPasses:c.gpu.profile.passes,cpu:c.cpu,input:c.input,queueCompletionMs:c.queueCompletionMs,
    queue:c.gpu.frameQueue,frameIntervals:c.frames,renderIntervals:c.renderIntervals,
    resources:{postAndSceneBytes:c.logicalOwnedTextureBytes,fg:c.gpu.frameGeneration,fsr:c.gpu.fsr31},
    hardware:c.hardware,freeRAM:c.freeRAM,failures:{renderer:c.gpuFailure,fsr:c.gpu.fsr31Failure,fg:c.gpu.frameGenerationFailure},
    rawReport:`${env.TEMP}/polyshade-performance/${label}/report.json`});
  await mkdir('docs/verification/framegen',{recursive:true});
  await writeFile('docs/verification/framegen/gameplay-matrix.json',JSON.stringify({date:new Date().toISOString(),
    method:'Golden Hour, ordinary headed gameplay with trusted keyboard events. Canvas submission rates are not physical monitor scan-out. Forced FG rows bypass the product 25-FPS guard strictly for isolated cost measurement; low rates are not recommended settings. Default-guard operation is verified separately. Costs for named FG passes include only frames that ran those passes. Power-cap state and clocks are captured for every case.',rows},null,2)+'\n');
}
console.log('PASS',rows.length,'gameplay cases');
