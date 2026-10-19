// Real headed Edge, trusted keyboard input, and ordinary game simulation.
// No replaced RAF, fixed camera, PolyBot replay, or renderer settings in this
// diagnostic are installed into the shipped mod.
import { openUpscalingHarness, currentBundlePath } from './upscaling-harness.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { freemem, totalmem } from 'node:os';
import assert from 'node:assert/strict';

process.env.POLYSHADE_HEADED ??= '1';
const label = process.env.POLYSHADE_PROFILE_LABEL ?? 'gameplay-baseline';
const output = `${process.env.TEMP}/polyshade-performance/${label}`;
const resolutions = (process.env.POLYSHADE_RESOLUTIONS ?? '1280x720,1920x1080,2560x1440,3840x2160').split(',');
const scales = (process.env.POLYSHADE_SCALES ?? '1,.77,.67,.59,.5').split(',').map(Number);
const duration = Number(process.env.POLYSHADE_PROFILE_MS ?? 8000);
const noMod = process.env.POLYSHADE_NO_MOD === '1';
const hotDisable = process.env.POLYSHADE_HOT_DISABLE === '1';
const profiling = process.env.POLYSHADE_TIMESTAMPS !== '0';
const queueProbe = process.env.POLYSHADE_QUEUE_PROBE !== '0';
const frameLimit = Number(process.env.POLYSHADE_FRAME_LIMIT ?? 0);
const temporalMode = process.env.POLYSHADE_TEMPORAL_MODE ?? 'sgsr2-compute';
const temporalAt100=process.env.POLYSHADE_TEMPORAL_AT_100==='1';
const motionBlurOverride=process.env.POLYSHADE_PROFILE_MOTION_BLUR==='0'?false:null;
const frameGeneration=process.env.POLYSHADE_FRAME_GENERATION==='1';
const frameGenerationPacing=process.env.POLYSHADE_FG_PACING??'smooth';
const forceFG=frameGeneration&&process.env.POLYSHADE_FG_FORCE==='1';
const featureOverrides=process.env.POLYSHADE_EXPERIMENT_OVERRIDES?JSON.parse(process.env.POLYSHADE_EXPERIMENT_OVERRIDES):{};
const csmMaxFar=Number(process.env.POLYSHADE_CSM_MAX_FAR??0);
const lightweight=process.env.POLYSHADE_LIGHTWEIGHT==='1';
const bundle = process.env.POLYSHADE_BUNDLE ?? await currentBundlePath();
await mkdir(output, { recursive: true });
const hardware = () => {
  try { return execFileSync('nvidia-smi', ['--query-gpu=name,temperature.gpu,utilization.gpu,memory.used,clocks.gr,clocks.mem,pstate,clocks_event_reasons.sw_power_cap', '--format=csv,noheader'], { encoding:'utf8' }).trim(); }
  catch { return null; }
};
const report = { label, date:new Date().toISOString(), bundle, noMod, hotDisable, headed:process.env.POLYSHADE_HEADED === '1',
  sha256:createHash('sha256').update(await readFile(bundle)).digest('hex'), profiling, queueProbe, frameLimit,frameGeneration,forceFG,featureOverrides,csmMaxFar,lightweight,
  method:'Ordinary Summer 1 simulation; trusted keyboard acceleration and alternating left/right steering; no fixed-camera RAF loop. Input-to-render is an event delivery/next render proxy, NOT input-to-photon or a subjective feel measurement. Queue completion is asynchronous diagnostic-only and never awaited by rendering.',
  ram:{total:totalmem(),free:freemem()}, hardwareBefore:hardware(), cases:[] };
const { browser, page, errors } = await openUpscalingHarness({ freezeSupport:false, polyshade:!noMod });
report.browser = browser.version();
const cdp = await page.context().newCDPSession(page);
await cdp.send('Performance.enable');
try {
  if(hotDisable)await page.keyboard.press('Home');
  await page.evaluate(({queueProbe,frameLimit,profiling,lightweight,csmMaxFar}) => {
    const d = window.__gameplay = { active:false, times:{}, frames:[], rendered:[], presented:[],input:[], longTasks:[], queue:[], queuePending:0, queuePeak:0, allocations:{}, originals:[] };
    const tick = t => { if(d.active && d.lastRAF) d.frames.push(t-d.lastRAF); d.lastRAF=t; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    try { new PerformanceObserver(list => { if(d.active) for(const e of list.getEntries()) d.longTasks.push(e.duration); }).observe({type:'longtask',buffered:false}); } catch {}
    window.addEventListener('keydown', event => {
      if(d.active && ['KeyW','KeyA','KeyD','ArrowUp','ArrowLeft','ArrowRight'].includes(event.code))
        d.input.push({code:event.code,trusted:event.isTrusted,eventTime:event.timeStamp,delivered:performance.now()});
    },true);
    const wrap = (o,key,name,{frame=false,resource=false}={}) => {
      if(!o || typeof o[key]!=='function')return;
      const original=o[key]; d.originals.push([o,key,original]);let nesting=0;
      o[key]=function(...args){
        const start=performance.now(),outer=nesting++===0,beforeFrame=frame?this.frames:0;
        if(frame)d.currentFGJob=null;
        try{return original.apply(this,args);}finally{
          nesting--;const end=performance.now(),rendered=frame&&this.frames>beforeFrame;
          if(d.active && outer){const values=d.times[name]??=[];values.push(end-start);
            if(resource)d.allocations[name]=(d.allocations[name]??0)+1;
            if(name==='uploads')d.uploadBytes=(d.uploadBytes??0)+(args[4]===undefined?args[2].byteLength-(args[3]??0)*(args[2].BYTES_PER_ELEMENT??1):args[4]*(args[2].BYTES_PER_ELEMENT??1));
            if(rendered){
              (d.times.submittedRendererCPU??=[]).push(end-start);
              const pendingInputs=d.input.filter(e=>e.submitted===undefined);
              for(const e of pendingInputs){e.renderStart=start;e.submitted=end;
                const deferred=d.currentFGJob&&this.presenter.pending?.frameIndex===d.currentFGJob.frameIndex;
                if(!deferred)e.endpointSubmit=end;
              }
              d.rendered.push(end);
              if(queueProbe && d.queuePending<32){d.queuePending++;d.queuePeak=Math.max(d.queuePeak,d.queuePending);
                // Diagnostic completion proxy, including queue backlog and JS
                // callback delivery. It is not a presentation timestamp.
                void this.device.queue.onSubmittedWorkDone().then(()=>{d.queuePending--;const complete=performance.now();for(const e of pendingInputs){e.queueComplete=complete;if(e.endpointSubmit===end)e.endpointComplete=complete;}if(d.active)d.queue.push(complete-end);});
              }
            }
          }
        }
      };
    };
    const c=window.__controller;
    wrap(c,'onRender','controllerCPU');
    const seen = new WeakSet();
    d.instrumentGpu = g => {
    if(!g || seen.has(g))return;
    seen.add(g);
    if(csmMaxFar>0&&g.scene?.sun?.shadow?.shadowNode)g.scene.sun.shadow.shadowNode.maxFar=csmMaxFar;
    if(frameLimit){const render=g.render;let pending=0;g.render=function(...args){
      if(pending>=frameLimit)return this.warmFrames>=4;
      const before=this.frames,result=render.apply(this,args);
      if(this.frames>before){pending++;void this.device.queue.onSubmittedWorkDone().then(()=>pending--,()=>pending--);}
      return result;
    };}
    wrap(g,'render','rendererCPU',{frame:true});
    if(lightweight)return;
    if(g.presenter){const present=g.presenter.presented;g.presenter.presented=function(kind,now){
      if(d.active)d.presented.push({kind,at:performance.now()});return present.call(this,kind,now);
    };}
    if(g.fg){
      const generate=g.fg.generate,byTexture=new WeakMap();
      g.fg.generate=function(...args){const inputs=d.input.filter(e=>e.submitted===undefined),result=generate.apply(this,args);
        byTexture.set(result.real.texture,inputs);d.currentFGJob=result;return result;};
      const queued=g.presentQueued;g.presentQueued=function(now,generated,...args){
        const inputs=!generated&&this.presenter.pending?byTexture.get(this.presenter.pending.inputs.color.texture):null;
        const result=queued.call(this,now,generated,...args);
        if(result&&inputs&&d.active){const at=performance.now();for(const e of inputs)e.endpointSubmit=at;
          if(queueProbe)void this.device.queue.onSubmittedWorkDone().then(()=>{const at=performance.now();for(const e of inputs)e.endpointComplete=at;});
        }return result;
      };
    }
    wrap(g.fg,'generate','framegenCPU');
    for(const [o,k,n] of [[g.scene,'sync','sceneSync'],[g.shadows,'prepare','shadowCPU'],[g.renderer,'render','threeCPU'],[g.passes,'draw','postCPU'],[g.compute,'reconstruct','sgsrCPU'],[g.motion,'render','velocityCPU'],[g.device.queue,'submit','submitCPU'],[g.device.queue,'writeBuffer','uploads'],[g.renderer.backend.getContext(),'getCurrentTexture','swapAcquireCPU'],[g,'updateParameters','uniformCPU'],[g.temporal,'begin','temporalCPU'],[g.nativeCanvas,'getBoundingClientRect','layoutCPU'],[GPUCommandEncoder.prototype,'finish','finishCPU']])wrap(o,k,n);
    // Presentation is a separate submission in FG modes. Time it independently
    // rather than mixing short display passes into the real-render distribution.
    const display=g.__presentationProfiler=new g.profiler.constructor(g.device);display.sampleInterval=1;
    const draw=g.passes.draw;g.passes.draw=function(encoder,name,target,inputs,profiler,...args){
      if(name!=='finish'||profiler||!profiling)return draw.call(this,encoder,name,target,inputs,profiler,...args);
      display.begin(true);draw.call(this,encoder,name,target,inputs,display,...args);
      const slot=display.end(encoder);queueMicrotask(()=>display.submitted(slot));
    };
    for(const [o,k] of [[g.device,'createBindGroup'],[g.device,'createTexture'],[g.device,'createBuffer'],[g.device,'createRenderPipeline'],[g.device,'createRenderPipelineAsync'],[g.device,'createComputePipelineAsync'],[g.device,'createShaderModule']])wrap(o,k,k,{resource:true});
    g.profiler.sampleInterval=1;
    };
    d.instrumentGpu(c?.backends?.gpu);
  },{queueProbe,frameLimit,profiling,lightweight,csmMaxFar});

  for(const resolution of resolutions) {
    const [width,height] = resolution.split('x').map(Number);
    await page.setViewportSize({width,height});
    for(const scale of noMod || hotDisable ? [1] : scales) {
      const native=scale===1&&!temporalAt100;
      const name = `${resolution}-${noMod?'game-only':hotDisable?'hot-disabled':native?'native':`${temporalMode==='fsr31'?'fsr':'sgsr'}${Math.round(scale*100)}`}${frameGeneration?'-fg':''}`;
      console.log(`${label}: ${name}`);
      if(!noMod&&!hotDisable) await page.evaluate(({scale,native,profiling,temporalMode,frameGeneration,frameGenerationPacing,forceFG,motionBlurOverride,featureOverrides})=>{
        // Isolated diagnostic only. Product validation clamps the floor to >=25.
        const c=window.__controller,s=c.getSettings();s.preset='cinematic';s.overrides={upscaling:native?'native':temporalMode,upscaleQuality:'custom',upscaleCustomScale:scale,debugProfile:profiling,frameGeneration,frameGenerationPacing,fgMinimumFPS:forceFG?1:25,
          ...(motionBlurOverride===null?{}:{motionBlurEnabled:motionBlurOverride}),...featureOverrides};c.notifySettingsChanged();
      },{scale,native,profiling,temporalMode,frameGeneration,frameGenerationPacing,forceFG,motionBlurOverride,featureOverrides});
      if(temporalMode==='fsr31' && !native) await page.waitForFunction(()=>{
        const g=window.__controller?.backends.gpu;
        if(g?.fsrFailure)throw Error(g.fsrFailure);
        return g?.selection?.backend==='fsr31';
      },null,{timeout:90000});
      if(frameGeneration)await page.waitForFunction(()=>{
        const g=window.__controller.backends.gpu;if(g.fgFailure)throw Error(g.fgFailure);return g.fg?.ready;
      },null,{timeout:90000});
      if(process.env.POLYSHADE_WARM_INPUT==='1') {
        // Warm the acceleration/brake material variants through real input,
        // then restart. Otherwise first-touch compilation pollutes the first
        // measured Native case despite an already-warm stationary renderer.
        await page.keyboard.press('t');await page.keyboard.down('w');await page.waitForTimeout(500);
        await page.keyboard.up('w');await page.keyboard.down('s');await page.waitForTimeout(150);await page.keyboard.up('s');
      }
      await page.keyboard.press('t');
      await page.waitForTimeout(2500);
      await page.evaluate(()=>window.__gameplay.instrumentGpu(window.__controller?.backends?.gpu));
      const before = await cdp.send('Performance.getMetrics');
      await page.evaluate(()=>{const d=window.__gameplay;d.active=true;d.times={};d.frames=[];d.rendered=[];d.presented=[];d.input=[];d.longTasks=[];d.queue=[];d.queuePeak=0;d.allocations={};d.uploadBytes=0;d.start=performance.now();d.cameraStart=window.__controller?.camera?.position.toArray();window.__controller?.backends?.gpu?.profiler.samples.clear();window.__controller?.backends?.gpu?.__presentationProfiler?.samples.clear();});
      const hwSamples=[hardware()];
      await page.keyboard.down('w');
      const start=Date.now();
      let left=false;
      while(Date.now()-start<duration){
        await page.keyboard.down(left?'a':'d');
        await page.waitForTimeout(150);
        await page.keyboard.up(left?'a':'d');left=!left;
        await page.waitForTimeout(650);
        if(hwSamples.length<4)hwSamples.push(hardware());
      }
      await page.keyboard.up('w');await page.keyboard.up('a');await page.keyboard.up('d');
      const after=await cdp.send('Performance.getMetrics');
      const result=await page.evaluate(()=>{
        const d=window.__gameplay,c=window.__controller,g=c?.backends?.gpu;d.active=false;
        const stat=a=>{a=[...a].sort((a,b)=>a-b);return{samples:a.length,mean:a.reduce((s,v)=>s+v,0)/Math.max(1,a.length),p50:a[Math.floor(a.length*.5)]??null,p95:a[Math.floor(a.length*.95)]??null,p99:a[Math.floor(a.length*.99)]??null,max:a.at(-1)??null};};
        const gpu=g?.report();const durationMs=performance.now()-d.start;
        const resources=gpu?.resources.map(r=>({...r,estimatedBytes:r.width*r.height*({rgba16float:8,r16float:2,r32float:4,r32uint:4}[r.format]??4)}));
        const bpp={rgba16float:8,r16float:2,r32float:4,r32uint:4,depth32float:4,depth24plus:4,rgba8unorm:4,bgra8unorm:4};
        const attachments=[];
        if(g){
          const add=(name,texture)=>{const raw=texture&&g.renderer.backend.get(texture).texture;if(raw)attachments.push({name,width:raw.width,height:raw.height,format:raw.format,samples:raw.sampleCount,estimatedBytes:raw.width*raw.height*(bpp[raw.format]??4)*raw.sampleCount});};
          add('scene-colour',g.target.texture);add('scene-depth',g.target.depthTexture);
          g.scene.sun.shadow.shadowNode.lights.forEach((light,i)=>{add(`shadow-${i}-colour`,light.shadow.map?.texture);add(`shadow-${i}-depth`,light.shadow.map?.depthTexture);});
        }
        const gl=document.querySelector('canvas')?.getContext('webgl2');const ext=gl?.getExtension('WEBGL_debug_renderer_info');
        return{durationMs,frames:stat(d.frames),rafFPS:d.frames.length*1000/d.frames.reduce((a,b)=>a+b,0),effectiveFPS:(g?d.rendered.length:d.frames.length)*1000/durationMs,renderIntervals:stat(d.rendered.slice(1).map((t,i)=>t-d.rendered[i])),renderedFrames:d.rendered.length,cpu:Object.fromEntries(Object.entries(d.times).map(([n,a])=>[n,stat(a)])),
          input:{events:d.input,trusted:d.input.every(e=>e.trusted),deliveryMs:stat(d.input.map(e=>e.delivered-e.eventTime)),nextRenderMs:stat(d.input.filter(e=>e.renderStart!==undefined).map(e=>e.renderStart-e.delivered)),toSubmitMs:stat(d.input.filter(e=>e.submitted!==undefined).map(e=>e.submitted-e.eventTime)),toCompletionMs:stat(d.input.filter(e=>e.queueComplete!==undefined).map(e=>e.queueComplete-e.eventTime)),
            toRealEndpointSubmitMs:stat(d.input.filter(e=>e.endpointSubmit!==undefined).map(e=>e.endpointSubmit-e.eventTime)),
            toRealEndpointCompleteMs:stat(d.input.filter(e=>e.endpointComplete!==undefined).map(e=>e.endpointComplete-e.eventTime))},
          presentation:{submittedFPS:d.presented.length*1000/durationMs,generated:d.presented.filter(p=>p.kind==='generated').length,
            real:d.presented.filter(p=>p.kind==='real').length,intervals:stat(d.presented.slice(1).map((p,i)=>p.at-d.presented[i].at)),
            gpu:g?.__presentationProfiler?.report(),method:'Canvas submissions on ordinary game RAF; not measured physical scan-out'},
          longTasks:stat(d.longTasks),queueCompletionMs:stat(d.queue),queuePeak:d.queuePeak,queuePending:d.queuePending,
          allocations:d.allocations,uploadBytes:d.uploadBytes,heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit}:null,
          cameraStart:d.cameraStart,cameraEnd:c?.camera?.position.toArray(),gpu,resources,attachments,logicalPostTextureBytes:resources?.reduce((s,r)=>s+r.estimatedBytes,0),logicalOwnedTextureBytes:resources?.reduce((s,r)=>s+r.estimatedBytes,attachments.reduce((s,r)=>s+r.estimatedBytes,0)),nativeGL:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,
          settings:c?.resolveSettings(),unavailable:['input-to-photon','physical GPU memory transactions','per-frame JS allocation bytes','GC attribution (CDP heap changes are not a GC trace)']};
      });
      const delta=Object.fromEntries(after.metrics.map(m=>[m.name,m.value-(before.metrics.find(b=>b.name===m.name)?.value??0)]));
      if(!noMod&&!hotDisable) {
        assert.deepEqual(result.gpu.output,[width,height]);
        assert.equal(result.gpu.ready,true,'renderer must remain active');
        assert.ok(result.renderedFrames>15,'must measure actual rendered images');
        assert.equal(result.gpu.selection.backend,native?'native':temporalMode,'requested reconstruction must actually run');
        assert.deepEqual(result.gpu.internal,[Math.round(width*scale),Math.round(height*scale)]);
        assert.ok(result.cameraStart.some((v,i)=>Math.abs(v-result.cameraEnd[i])>.001),'the camera must move during live driving');
      }
      assert.ok(result.input.trusted,'live keyboard events must be trusted');
      assert.ok(result.frames.samples>15,'must collect a moving frame distribution');
      report.cases.push({name,resolution,scale,...result,cdpMetricDelta:delta,hardware:hwSamples,freeRAM:freemem()});
      await page.screenshot({path:`${output}/${name}.png`});
      await writeFile(`${output}/report.json`,JSON.stringify({...report,errors},null,2));
      console.log(JSON.stringify({name,frame:result.frames,gpu:result.gpu?.profile?.passes?.total,queue:result.queueCompletionMs,queuePeak:result.queuePeak,hardware:hwSamples}));
    }
  }
  assert.deepEqual(errors,[],'renderer validation and browser errors');
} finally {
  report.hardwareAfter=hardware();report.errors=errors;
  await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));
  await browser.close();
}
