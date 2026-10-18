import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
const directory='docs/verification/jitter';await mkdir(directory,{recursive:true});
const rows=[];
for(const resolution of ['1280x720','1920x1080','2560x1440','3840x2160']) {
  let root=`${process.env.TEMP}/polyshade-jitter-release-${resolution}`;
  try{await access(root+'/report.json');}catch{
    root=`${process.env.TEMP}/polyshade-jitter-final-${resolution==='1280x720'?'720':resolution}`;
    try{await access(root+'/report.json');}catch{root=`${process.env.TEMP}/polyshade-jitter-after-${resolution}-full`;}
  }
  const report=JSON.parse(await readFile(root+'/report.json','utf8'));
  let regions,flicker;
  try{regions=JSON.parse(await readFile(root+'/regions.json','utf8'));}catch{}
  try{flicker=JSON.parse(await readFile(root+'/flicker.json','utf8'));}catch{}
  for(const c of report.cases) {
    const row={resolution,mode:c.mode,scale:c.scale,sha256:report.sha256,frames:c.frames.length,
      phaseCount:c.frames[0].temporal.phaseCount,stability:c.stability,
      regions:regions?.cases.find(r=>r.name===c.name)?.regions,
      flicker:flicker?.cases.find(r=>r.name===c.name)?.flicker??c.flicker,
      allHistoriesValid:c.frames.every(f=>f.temporal.valid),
      projectionNeverOverwritten:c.frames.every(f=>!f.projectionChangedDuringDraw),
      maxVelocityOutputPixels:Math.max(...c.frames.map(f=>f.gpuProbe?.velocityOutputPixels.max??0)),errors:report.errors};
    assert.ok(Math.max(row.stability.stdX,row.stability.stdY)<.1);
    assert.ok(row.frames>=row.phaseCount);assert.ok(row.allHistoriesValid&&row.projectionNeverOverwritten);
    assert.deepEqual(row.errors,[]);rows.push(row);
  }
}
await writeFile(directory+'/static-cycles.json',JSON.stringify({date:new Date().toISOString(),
  method:'Complete consecutive real-render jitter cycle after 72 warm frames, actual PML game, fixed camera/car/world, Golden Hour with animation disabled, lossless RGBA-verified PNGs. Native plus five scales in both modes at four actual backing resolutions. Capture wall time is not an FPS measurement.',rows},null,2)+'\n');
const phaseReports=[];
let afterFolder='polyshade-jitter-release-1280x720';
try{await access(`${process.env.TEMP}/${afterFolder}/report.json`);}catch{afterFolder='polyshade-jitter-final-720';}
for(const [label,folder]of [['before','polyshade-jitter-before-probes'],['after',afterFolder]]) {
  const r=JSON.parse(await readFile(`${process.env.TEMP}/${folder}/report.json`,'utf8'));
  phaseReports.push({...r,label,cases:r.cases.filter(c=>c.mode!=='native'&&c.scale===.5)});
}
await writeFile(directory+'/phase-probes.json',JSON.stringify(phaseReports,null,2)+'\n');
console.log('PASS',rows.length,'complete-cycle configurations');
