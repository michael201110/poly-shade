import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { DEPTH_HELPERS } from '../src/shaders/atmosphere.js';
const release = process.env.POLYSHADE_RELEASE ?? '0.3.0';
const testedHelpers = release === '0.3.0' ? DEPTH_HELPERS :
  (await readFile(`${release}/main.mod.js`,'utf8')).match(/var DEPTH_HELPERS = `([\s\S]*?)`;/)?.[1];
assert.ok(testedHelpers, 'depth helpers extracted from the tested release');
const output = `${process.env.TEMP}/${process.env.POLYSHADE_OUTPUT ?? `polyshade-replay-${release}`}`;
await mkdir(output, {recursive:true});
const browser = await chromium.launch({channel:'msedge', headless:true});
const errors = [], report = {release, track:'Summer 2', replay:'SpeedySebas (#1, 15.178s)', screenshots:[]};
try {
  const page = await browser.newPage({viewport:{width:1280,height:720}});
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {if(m.type()==='error' && /PolyShade|Shader Error|GL_INVALID/.test(m.text())) errors.push(m.text());});
  await page.route('https://polyshade.test/**', async route => {
    const path = new URL(route.request().url()).pathname.slice(1);
    try {
      let body=await readFile(path,'utf8');
      if(path==='manifest.json') {const m=JSON.parse(body);m.latest['0.6.3']=release;body=JSON.stringify(m);}
      if(path.endsWith('.js')) body=body
        .replace('controller = new RenderController','controller = globalThis.__controller = new RenderController')
        .replace('controller.onFrame(renderer, scene, duration);',`controller.onFrame(renderer, scene, duration);
          if(globalThis.__measure){const now=performance.now();globalThis.__cpu.push(duration);if(globalThis.__last)globalThis.__gaps.push(now-globalThis.__last);globalThis.__last=now;}
          if(globalThis.__capture){globalThis.__png=renderer.domElement.toDataURL();globalThis.__capture=false;}`)
        .replace('instances.set(renderer, { original, wrapper });','globalThis.__renderer=renderer;globalThis.__nativeDraw=original;instances.set(renderer, { original, wrapper });');
      await route.fulfill({body,headers:{'access-control-allow-origin':'*'},contentType:path.endsWith('.json')?'application/json':'application/javascript'});
    }catch{await route.fulfill({status:404,body:''});}
  });
  // Public replay requests need the official game's allowed origin. This
  // test-only bridge does not ship, change replay data or alter replay timing.
  await page.route('https://vps.kodub.com/**', async route => {
    const req=route.request();
    const response=await fetch(req.url(),{method:req.method(),headers:{...req.headers(),origin:'https://www.kodub.com',referer:'https://www.kodub.com/'},body:req.postData()??undefined});
    await route.fulfill({status:response.status,body:Buffer.from(await response.arrayBuffer()),headers:{'content-type':response.headers.get('content-type')??'application/json','access-control-allow-origin':'*'}});
  });
  await page.addInitScript(() => {
    window.pmlversion='web';
    localStorage.setItem('polyshade.settings',JSON.stringify({schemaVersion:2,preset:'cinematic',enabled:false,overrides:{}}));
    localStorage.setItem('polyMods',JSON.stringify([{base:'https://polyshade.test',version:'latest',loaded:true}]));
  });
  await page.goto('https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/index.html');
  await page.waitForFunction(()=>window.__renderer?.info.render.frame>3,undefined,{timeout:60000});
  await page.locator('#polyshade-panel button').filter({hasText:/^Hide$/}).click();
  await page.getByText('Next Track',{exact:true}).click();
  await page.getByText('Exit',{exact:true}).click();
  await page.getByText('Summer 2',{exact:true}).click();
  await page.locator('#polyshade-panel select').first().selectOption(process.env.POLYSHADE_PRESET??'recording',{force:true});
  await page.evaluate(()=>document.activeElement?.blur());
  await page.getByText('SpeedySebas',{exact:true}).waitFor({timeout:60000});
  await page.getByText('SpeedySebas',{exact:true}).click();
  await page.evaluate(quality => {
    const p=window.polyModLoader;p.settingClass.updateSettings([[p.getFromPolyTrack('P.A.ShadowQuality'),quality]]);
  },process.env.POLYSHADE_CSM??'3');
  await page.waitForTimeout(2500);
  await page.getByRole('button',{name:'Watch',exact:true}).click();
  await page.waitForFunction(()=>window.__controller?.activeScene?.getObjectByName('Body'),undefined,{timeout:60000});
  await page.evaluate(quality => {
    const p=window.polyModLoader;p.settingClass.updateSettings([[p.getFromPolyTrack('P.A.ShadowQuality'),quality]]);
    window.__measure=true;window.__cpu=[];window.__gaps=[];
  },process.env.POLYSHADE_CSM??'3');
  for(let i=0;i<14;i++) {
    await page.waitForTimeout(700);
    await page.evaluate(()=>window.__capture=true);
    await page.waitForFunction(()=>window.__capture===false);
    const image=await page.evaluate(()=>window.__png);
    const file=`replay-${i}.png`;
    await writeFile(`${output}/${file}`,Buffer.from(image.split(',')[1],'base64'));
    report.screenshots.push(file);
    if(i===3)report.moving=await page.evaluate(()=>({contact:window.__controller.cinematic.report().contactShadow,position:window.__controller.camera.position.toArray()}));
  }
  report.runtime=await page.evaluate(()=>{
    const c=window.__controller;window.__measure=false;
    const stats=a=>{a=a.slice().sort((a,b)=>a-b);return{samples:a.length,average:a.reduce((s,x)=>s+x,0)/a.length,p95:a[Math.ceil(a.length*.95)-1],max:a.at(-1)}};
    return {cpu:stats(window.__cpu),frameGaps:stats(window.__gaps),gpu:c.cinematic.timer.metrics(),graphics:c.cinematic.report(),cascades:c.nativeWrapper.csm?.lights.map(l=>({bias:l.shadow.normalBias,size:l.shadow.mapSize.x})),cameraRange:[c.camera.near,c.camera.far]};
  });
  // Direct GPU regression: exercise sky/near/far depth, including projection
  // matrices whose far-plane reciprocal rounds to zero in 32-bit floats.
  report.depthNumerics=await page.evaluate(helpers=>{
    const c=window.__controller,t=c.three,r=window.__renderer;
    const scene=new t.Scene(),camera=new t.OrthographicCamera(-1,1,1,-1,0,1);
    const values=[0,0.5,0.999,0.99999,0.99999994,1],data=new Float32Array(values.flatMap(d=>[d,d,d,1]));
    const depth=new t.DataTexture(data,6,1,t.RGBAFormat,t.FloatType);depth.needsUpdate=true;depth.minFilter=t.NearestFilter;depth.magFilter=t.NearestFilter;
    const material=new t.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
      fragmentShader:`varying vec2 vUv;${helpers}void main(){vec3 p=viewPosition(vUv);float d=viewDistance(vUv);vec3 n=normalize(p);bool valid=d>=nearFar.x&&d<=nearFar.y&&all(lessThan(abs(p),vec3(1e12)))&&all(lessThanEqual(abs(n),vec3(1.01)));gl_FragColor=valid?vec4(0,1,0,1):vec4(1,0,0,1);}`,
      uniforms:{tDepth:{value:depth},inverseProjection:{value:new t.Matrix4()},nearFar:{value:new t.Vector2()}}});
    const geometry=new t.PlaneGeometry(2,2),mesh=new t.Mesh(geometry,material);scene.add(mesh);
    const target=new t.WebGLRenderTarget(6,1,{type:t.UnsignedByteType,depthBuffer:false});
    const saved={target:r.getRenderTarget(),tone:r.toneMapping,output:r.outputColorSpace,viewport:r.getViewport(new t.Vector4()),scissor:r.getScissorTest()};
    const rows=[];
    try {
      r.toneMapping=t.NoToneMapping;r.outputColorSpace=t.LinearSRGBColorSpace;r.setScissorTest(false);
      for(const far of [1000,10000,1e9]) {
        const perspective=new t.PerspectiveCamera(60,1,.1,far);
        material.uniforms.inverseProjection.value.copy(perspective.projectionMatrixInverse);material.uniforms.nearFar.value.set(.1,far);
        r.setRenderTarget(target);window.__nativeDraw.call(r,scene,camera);
        const pixels=new Uint8Array(24);r.readRenderTargetPixels(target,0,0,6,1,pixels);
        rows.push({far,valid:values.map((_,i)=>pixels[i*4+1]===255)});
      }
    } finally {
      r.setRenderTarget(saved.target);r.setViewport(saved.viewport);r.setScissorTest(saved.scissor);r.toneMapping=saved.tone;r.outputColorSpace=saved.output;
      geometry.dispose();material.dispose();target.dispose();depth.dispose();
    }
    return rows;
  }, testedHelpers);
  if(release==='0.3.0') {
    assert.ok(report.depthNumerics.every(r=>r.valid.every(Boolean)), 'near/far/sky reconstruction stays finite on the GPU');
    assert.equal(report.moving.contact?.available,true,'contact shadow exists through PML discovery');
  }
  const volume=report.runtime.graphics.resources.targets.find(t=>t.name==='volumetric');
  if(release==='0.3.0'&&volume)assert.deepEqual([volume.width,volume.height],[1280,720]);
  assert.deepEqual(errors,[]);
  report.errors=errors;
  await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({output,depthNumerics:report.depthNumerics,cpu:report.runtime.cpu,frameGaps:report.runtime.frameGaps,gpu:report.runtime.gpu,contact:report.moving.contact,errors},null,2));
} finally {await browser.close();}
