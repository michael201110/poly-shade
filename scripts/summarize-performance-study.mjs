import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=`${process.env.TEMP}/polyshade-performance`;
const output=process.env.POLYSHADE_STUDY_REPORT??'docs/performance/0.5.6-study/results.json';
const names=process.argv.slice(2);
const runs=[];
for(const name of names){
 try{
  const r=JSON.parse(await readFile(`${root}/${name}/report.json`,'utf8'));
  runs.push({name,label:r.label,date:r.date,bundle:r.bundle,sha256:r.sha256,headed:r.headed,
   profiling:r.profiling,queueProbe:r.queueProbe,frameLimit:r.frameLimit,noMod:r.noMod,hotDisable:r.hotDisable,
   browser:r.browser,method:r.method,ram:r.ram,errors:r.errors,cases:r.cases.map(c=>{
    const {events,...input}=c.input??{};
    return{name:c.name,durationMs:c.durationMs,scale:c.scale,frames:c.frames,renderIntervals:c.renderIntervals,
     effectiveFPS:c.effectiveFPS,rafFPS:c.rafFPS,renderedFrames:c.renderedFrames,cpu:c.cpu,input,
     longTasks:c.longTasks,queueCompletionMs:c.queueCompletionMs,queuePeak:c.queuePeak,
     allocations:c.allocations,uploadBytes:c.uploadBytes,heap:c.heap,gpu:c.gpu,
     logicalPostTextureBytes:c.logicalPostTextureBytes,logicalOwnedTextureBytes:c.logicalOwnedTextureBytes,attachments:c.attachments,nativeGL:c.nativeGL,cdpMetricDelta:c.cdpMetricDelta,
     hardware:c.hardware,freeRAM:c.freeRAM,cameraStart:c.cameraStart,cameraEnd:c.cameraEnd,unavailable:c.unavailable};
   })});
 }catch(error){console.error(`${name}: ${error.message}`);}
}
await mkdir(output.slice(0,output.lastIndexOf('/')),{recursive:true});
await writeFile(output,JSON.stringify({generated:new Date().toISOString(),
 limitations:['Queue completion includes callback delivery, not presentation.','Live keyboard trajectories can vary with frame pacing; use deterministic paired captures for pass attribution.','Battery Saver was discovered during the first batch; ac-prefixed reports use the corrected power state.','GPU clocks vary under laptop power limits. Small isolated deltas are not treated as architectural wins.'],runs},null,2));
console.log(output);
