import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { verifyMotionGpu } from './motion-gpu.mjs';
import { GRADE_FRAGMENT } from '../src/shaders/grade.js';
import { DEPTH_HELPERS } from '../src/shaders/atmosphere.js';
const release = process.env.POLYSHADE_RELEASE ?? '0.3.2';
const testedHelpers = release === '0.3.2' ? DEPTH_HELPERS :
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
          if(globalThis.__capture){
            globalThis.__png=renderer.domElement.toDataURL();
            const p=controller.cinematic?.post;
            if(globalThis.__compareBlur && p?.motionFrameValid && p.active.motionBlur){
              const grade=p.materials.get('grade'),finish=p.materials.get('finish');
              if(grade && finish){
                const strength=grade.uniforms.motionBlurStrength.value,limit=grade.uniforms.motionBlurMaxPixels.value;
                const material=p.quad.material;
                const outputs={frameValid:p.motionFrameValid,exposureScale:p.motionExposureScale};
                p.state.capture(renderer);
                try{
                  renderer.autoClear=false;renderer.setScissorTest(false);renderer.toneMapping=controller.three.NoToneMapping;
                  for(const [name,value] of [['off',0],['max',64/(1000/60)]]){
                    grade.uniforms.motionBlurStrength.value=value;grade.uniforms.motionBlurMaxPixels.value=64;
                    renderer.outputColorSpace=controller.three.LinearSRGBColorSpace;
                    renderer.setRenderTarget(p.pool.targets.get('grade'));p.quad.material=grade;
                    renderer.__polyShadeNativeDraw.call(renderer,p.scene,p.camera);
                    renderer.outputColorSpace=p.state.output;
                    renderer.setRenderTarget(null);p.quad.material=finish;
                    renderer.__polyShadeNativeDraw.call(renderer,p.scene,p.camera);
                    outputs[name]=renderer.domElement.toDataURL();
                  }
                  globalThis.__blurPair=outputs;
                }finally{
                  grade.uniforms.motionBlurStrength.value=strength;grade.uniforms.motionBlurMaxPixels.value=limit;
                  p.quad.material=material;p.state.restore(renderer);
                }
              }
            }
            globalThis.__capture=false;
          }`)
        .replace('instances.set(renderer, { original, wrapper });','renderer.__polyShadeNativeDraw=original;globalThis.__renderer=renderer;globalThis.__nativeDraw=original;instances.set(renderer, { original, wrapper });');
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
    await page.evaluate(compare=>{window.__compareBlur=compare;window.__blurPair=null;window.__capture=true;},process.env.POLYSHADE_COMPARE_BLUR==='1' && [1,3,6].includes(i));
    await page.waitForFunction(()=>window.__capture===false);
    const image=await page.evaluate(()=>window.__png);
    const file=`replay-${i}.png`;
    await writeFile(`${output}/${file}`,Buffer.from(image.split(',')[1],'base64'));
    report.screenshots.push(file);
    const pair=await page.evaluate(()=>window.__blurPair);
    if(pair){
      const buffers={};
      for(const name of ['off','max']){
        buffers[name]=Buffer.from(pair[name].split(',')[1],'base64');
        await writeFile(`${output}/blur-${i}-${name}.png`,buffers[name]);
      }
      const off=PNG.sync.read(buffers.off),max=PNG.sync.read(buffers.max);
      let changed=0,total=0;
      for(let k=0;k<off.data.length;k+=4){
        const diff=Math.max(...[0,1,2].map(c=>Math.abs(off.data[k+c]-max.data[k+c])));
        if(diff>8)changed++;total+=diff;
      }
      (report.blurComparisons??=[]).push({frame:i,changedFraction:changed/(off.width*off.height),meanDifference:total/(off.width*off.height),exposureScale:pair.exposureScale});
    }
    if(i===3) {
      report.motion=await page.evaluate(helpers=>{
        const c=window.__controller,p=c.cinematic.post,t=c.three,r=c.cinematic.renderer;
        const target=p.pool.targets.get('object-motion');
        if(!target)return {available:false};
        const testTarget=new t.WebGLRenderTarget(target.width,target.height,{type:t.UnsignedByteType,depthBuffer:false});
        const material=new t.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,
          vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
          fragmentShader:`varying vec2 vUv;${helpers}
          uniform sampler2D objectMotion;uniform mat4 cameraWorld,previousVP;uniform vec2 texel,velocityRange;
          void main(){vec4 m=texture2D(objectMotion,vUv);vec4 world=cameraWorld*vec4(viewPosition(vUv),1.0);vec4 old=previousVP*world;
          vec2 cameraVelocity=vUv-old.xy/old.w*0.5-0.5;
          vec2 objectVelocity=(m.rg*2.0-1.0)*velocityRange;
          gl_FragColor=vec4(length(cameraVelocity/texel)/64.0,length(objectVelocity/texel)/64.0,m.a,1.0);}`,
          uniforms:{tDepth:{value:p.pool.targets.get('scene').depthTexture},inverseProjection:{value:c.camera.projectionMatrixInverse},nearFar:{value:new t.Vector2(c.camera.near,c.camera.far)},objectMotion:{value:target.texture},cameraWorld:{value:c.camera.matrixWorld},previousVP:{value:p.motionBlurViewProjection},texel:{value:p.objectMotion.texel},velocityRange:{value:p.objectMotion.velocityRange}}});
        const geometry=new t.PlaneGeometry(2,2),scene=new t.Scene(),camera=new t.OrthographicCamera(-1,1,1,-1,0,1);scene.add(new t.Mesh(geometry,material));
        const saved=new t.Vector4();r.getViewport(saved);const output=r.outputColorSpace,scissor=r.getScissorTest();
        let carPixels=0,cameraOnlyPixels=0,actualPixels=0;
        try {
          r.outputColorSpace=t.LinearSRGBColorSpace;r.setScissorTest(false);r.setRenderTarget(testTarget);r.__polyShadeNativeDraw.call(r,scene,camera);
          const pixels=new Uint8Array(target.width*target.height*4);r.readRenderTargetPixels(testTarget,0,0,target.width,target.height,pixels);
          for(let k=0;k<pixels.length;k+=4)if(pixels[k+2]>127){carPixels++;cameraOnlyPixels+=pixels[k]*64/255;actualPixels+=pixels[k+1]*64/255;}
        }finally{r.setRenderTarget(null);r.setViewport(saved);r.setScissorTest(scissor);r.outputColorSpace=output;testTarget.dispose();material.dispose();geometry.dispose();}
        return {available:true,meshes:p.objectMotion.entries.length,carPixels,cameraOnlyPixels:cameraOnlyPixels/carPixels,actualPixels:actualPixels/carPixels,frameValid:p.motionFrameValid};
      },testedHelpers);
    }
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
    const c=window.__controller,t=c.three,r=c.cinematic.renderer;
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
        r.setRenderTarget(target);r.__polyShadeNativeDraw.call(r,scene,camera);
        const pixels=new Uint8Array(24);r.readRenderTargetPixels(target,0,0,6,1,pixels);
        rows.push({far,valid:values.map((_,i)=>pixels[i*4+1]===255)});
      }
    } finally {
      r.setRenderTarget(saved.target);r.setViewport(saved.viewport);r.setScissorTest(saved.scissor);r.toneMapping=saved.tone;r.outputColorSpace=saved.output;
      geometry.dispose();material.dispose();target.dispose();depth.dispose();
    }
    return rows;
  }, testedHelpers);
  if(release==='0.3.2') {
    assert.ok(report.depthNumerics.every(r=>r.valid.every(Boolean)), 'near/far/sky reconstruction stays finite on the GPU');
    assert.equal(report.moving.contact?.available,true,'contact shadow exists through PML discovery');
  }
  const volume=report.runtime.graphics.resources.targets.find(t=>t.name==='volumetric');
  if(release==='0.3.2'&&volume)assert.deepEqual([volume.width,volume.height],[1280,720]);
  if(release==='0.3.2') {
    report.motionGpu=await verifyMotionGpu(page,GRADE_FRAGMENT);
    assert.ok(report.motionGpu.changedFraction>0.8,'long shutter visibly blurs a receding textured road');
    assert.ok(report.motionGpu.contrastEnergyRatio<0.35,'road blur retains enough samples to reduce contrast');
    assert.equal(report.motionGpu.edgeLeak,0,'foreground geometry does not leak into background blur');
    if(process.env.POLYSHADE_COMPARE_BLUR==='1')
      assert.ok(report.blurComparisons?.some(row=>row.changedFraction>0.02),'maximum exposure visibly changes the same replay frame');
    assert.equal(report.motion?.available,true,'opaque car velocity target is available');
    assert.ok(report.motion.carPixels>100,'velocity mask follows the visible car geometry');
    if(report.motion.frameValid && report.motion.cameraOnlyPixels>4)
      assert.ok(report.motion.actualPixels<report.motion.cameraOnlyPixels,'chase camera cancels car world motion');
  }
  assert.deepEqual(errors,[]);
  report.errors=errors;
  await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({output,depthNumerics:report.depthNumerics,cpu:report.runtime.cpu,frameGaps:report.runtime.frameGaps,gpu:report.runtime.gpu,motionGpu:report.motionGpu,blurComparisons:report.blurComparisons,motion:report.motion,contact:report.moving.contact,errors},null,2));
} finally {await browser.close();}
