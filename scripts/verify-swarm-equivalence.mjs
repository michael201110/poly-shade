import {chromium} from '@playwright/test';
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const baseline=execFileSync('git',['show','e62b9d3:src/rendering/webgpu/swarm-motion.js'],{encoding:'utf8'});
const code=await build({entryPoints:['scripts/swarm-equivalence-entry.js'],bundle:true,format:'esm',write:false,plugins:[{name:'baseline',setup(b){b.onResolve({filter:/^baseline-motion$/},()=>({path:'baseline-motion',namespace:'baseline'}));b.onLoad({filter:/.*/,namespace:'baseline'},()=>({contents:baseline,resolveDir:resolve('src/rendering/webgpu'),loader:'js'}));}}]});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--force_high_performance_gpu']});
try{
 const page=await browser.newPage();await page.route('https://polyshade.test/**',route=>route.fulfill({body:route.request().url().endsWith('.js')?code.outputFiles[0].text:'<!doctype html>',contentType:route.request().url().endsWith('.js')?'application/javascript':'text/html'}));await page.goto('https://polyshade.test/');
 const report=await page.evaluate(async()=>{const m=await import('/test.js');return m.verifySwarm();});
 await writeFile(`${process.env.TEMP}/polyshade-swarm-equivalence.json`,JSON.stringify(report,null,2));
 assert.deepEqual(report.errors,[]);for(const c of report.cases){assert.ok(c.nonzeroBytes>0,'geometry must actually cover pixels');assert.equal(c.changedBytes,0,'velocity outputs must match bit for bit');}console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
