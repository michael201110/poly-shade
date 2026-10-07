import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
const renderingErrors=[];
try {
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.on('console',m=>{if(/PolyShade|Shader Error|WebGLProgram/.test(m.text()))console.log(m.type(),m.text());});
page.on('pageerror',e=>{renderingErrors.push(e.message);console.log('PAGE ERROR',e.message);});
page.on('console',m=>{if(m.type()==='error' && /PolyShade|Shader Error|WebGLProgram/.test(m.text()))renderingErrors.push(m.text());});
await page.route('https://polyshade.test/**',async route=>{
 const path=new URL(route.request().url()).pathname.slice(1);
 try{
 let body=await readFile(path,'utf8');
 if(path.endsWith('.js'))body=body.replace('controller = new RenderController','controller = globalThis.__polyShadeController = new RenderController').replace('instances.set(renderer, { original, wrapper });','globalThis.__polyShadeCapturedRenderer = renderer; instances.set(renderer, { original, wrapper });');
 await route.fulfill({body,headers:{'access-control-allow-origin':'*'},contentType:path.endsWith('.json')?'application/json':'application/javascript'});
 }catch{await route.fulfill({status:404,body:''});}
});
await page.addInitScript(()=>{window.pmlversion='web'; localStorage.setItem('polyMods',JSON.stringify([{base:'https://polyshade.test',version:'latest',loaded:true}]));});
await page.goto('https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/index.html');
await page.waitForFunction(() => window.__polyShadeController?.sampleCount > 3, { timeout: 60000 });
await page.waitForTimeout(4000);
const enhanced = await page.evaluate(() => {
 const c=window.__polyShadeController;
 return {samples:c.sampleCount,materials:c.modifiedMaterials,tone:c.activeRenderer.toneMapping,shadows:c.activeRenderer.shadowMap.enabled,ownedSun:c.sceneState.sun?.castShadow};
});
console.log('Live renderer:', { frames: enhanced.samples, tunedMeshes: enhanced.materials, toneMapping: enhanced.tone, shadows: enhanced.shadows });
assert.ok(enhanced.samples > 3); assert.ok(enhanced.materials > 0);
assert.equal(enhanced.tone,4); assert.equal(enhanced.shadows,true); assert.equal(enhanced.ownedSun,true);
await page.locator('#polyshade-panel button').filter({hasText:/^Hide$/}).click();
await page.screenshot({path:process.env.TEMP+'/polyshade-golden.png'});
await page.keyboard.press('F7');
await page.waitForTimeout(500);
assert.equal(await page.evaluate(() => window.__polyShadeController.activeScene),null);
await page.screenshot({path:process.env.TEMP+'/polyshade-vanilla.png'});
await page.keyboard.press('F7');
await page.waitForFunction(() => window.__polyShadeController?.activeScene != null);
await page.evaluate(() => {
 const pml=window.polyModLoader;
 const key=pml.getFromPolyTrack('P.A.ShadowQuality');
 pml.settingClass.updateSettings([[key,'3']]);
 window.__polyShadeCapturedRenderer.debug.checkShaderErrors=true;
});
await page.waitForFunction(() => window.__polyShadeController?.sceneState?.nativeCSM === true);
await page.waitForTimeout(1500);
assert.ok(await page.evaluate(() => window.__polyShadeController.activeScene.children.filter(o=>o.isDirectionalLight && o.intensity>0).length > 1));
assert.deepEqual(renderingErrors, []);
console.log('PASS: native cascaded shadow mode preserved without shader errors.');
console.log('PASS: actual PML renderer captured; enhanced frames, materials, shadows, disable and re-enable verified.');
} finally {
  await browser.close();
}

