import {chromium} from '@playwright/test';
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const baseline=execFileSync('git',['show','e62b9d3:src/shaders/webgpu-post.wgsl.js'],{encoding:'utf8'});
const old=await import('data:text/javascript;base64,'+Buffer.from(baseline).toString('base64'));
const code=await build({entryPoints:['scripts/post-equivalence-entry.js'],bundle:true,format:'esm',write:false});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--force_high_performance_gpu']});
try{
 const page=await browser.newPage();
 await page.route('https://polyshade.test/**',route=>route.fulfill({body:route.request().url().endsWith('.js')?code.outputFiles[0].text:'<!doctype html>',contentType:route.request().url().endsWith('.js')?'application/javascript':'text/html'}));
 await page.goto('https://polyshade.test/');
 const report=await page.evaluate(async old=>{const m=await import('/test.js');return m.verifyPost(old);},{GRADE:old.GRADE,FINISH:old.FINISH});
 await writeFile(`${process.env.TEMP}/polyshade-post-equivalence.json`,JSON.stringify(report,null,2));
 assert.deepEqual(report.errors,[]);
 for(const c of report.cases){assert.ok(c.maximum<=1,`${c.effect}/${c.scenario}: maximum ${c.maximum}`);assert.ok(c.mean<.01,`${c.effect}/${c.scenario}: mean ${c.mean}`);}
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
