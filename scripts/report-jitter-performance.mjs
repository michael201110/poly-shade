import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='docs/verification/jitter';
const report=JSON.parse(await readFile(root+'/gameplay-performance.json','utf8'));
const rows=[];
for(const after of report.rows.filter(r=>r.variant==='after')) {
  const before=report.rows.find(r=>r.variant==='before'&&r.mode===after.mode&&r.name===after.name);
  assert.ok(before,`Missing baseline ${after.name}`);
  const passes={};
  for(const name of new Set([...Object.keys(before.gpu.passes),...Object.keys(after.gpu.passes)])) {
    const b=before.gpu.passes[name],a=after.gpu.passes[name];
    passes[name]={before:b??null,after:a??null,medianDeltaMs:b&&a?a.median-b.median:null};
  }
  rows.push({mode:after.name.endsWith('-native')?'native':after.mode,scale:after.scale,output:after.output,
    beforeSHA256:before.sha256,afterSHA256:after.sha256,beforeFPS:before.realFPS,afterFPS:after.realFPS,
    beforeHardware:before.hardware,afterHardware:after.hardware,passes});
}
assert.equal(rows.length,44);
const order={native:0,'sgsr2-compute':1,fsr31:2};
rows.sort((a,b)=>a.output[0]*a.output[1]-b.output[0]*b.output[1]||order[a.mode]-order[b.mode]||b.scale-a.scale);
await writeFile(root+'/gameplay-pass-deltas.json',JSON.stringify({date:report.date,
  note:'After minus before actual GPU pass medians, milliseconds. Medians of aggregates need not equal sums of individual medians. Sequential live traces and variable hardware clocks are not controlled shader microbenchmarks.',rows},null,2)+'\n');
const f=n=>n==null?'—':n.toFixed(3),delta=(r,n)=>f(r.passes[n]?.medianDeltaMs);
const lines=['# Matched Golden Hour gameplay measurements','',
  'Actual GPU timestamp medians in milliseconds, FG off, trusted acceleration/steering input. Each before/after run uses a fresh headed Edge profile. Negative deltas are faster. The exact source hashes, clocks, power state and pass distributions are retained in [raw rows](gameplay-performance.json) and [all pass deltas](gameplay-pass-deltas.json).',
  '', 'These sequential moving traces include clock and scheduling variation. Total GPU time is not frame latency or scan-out. The sun gate restores the reference image and skips invalid clear-sun work; it is separate from temporal correctness. No lower-quality preset is selected.', '',
  '| Output | Path / scale | Before GPU | After GPU | Δ total | Δ static velocity | Δ reconstruction | Δ SGSR convert | Δ grade | Δ rays |',
  '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|'];
for(const r of rows)lines.push(`| ${r.output.join('×')} | ${r.mode==='native'?'Native':r.mode==='fsr31'?'FSR':'SGSR2'} ${Math.round(r.scale*100)}% | ${f(r.passes.total?.before?.median)} | ${f(r.passes.total?.after?.median)} | ${delta(r,'total')} | ${delta(r,'staticVelocity')} | ${delta(r,'reconstruction')} | ${delta(r,'sgsr2-convert')} | ${delta(r,'grade')} | ${delta(r,'rays')} |`);
await writeFile(root+'/gameplay-performance.md',lines.join('\n')+'\n');
console.log('Saved',rows.length,'matched comparisons with every named pass delta');
