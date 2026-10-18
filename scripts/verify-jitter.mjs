// Deterministic stationary real-game test. GPU waits/readbacks are test-only.
import {openUpscalingHarness} from './upscaling-harness.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import assert from 'node:assert/strict';
process.env.POLYSHADE_BUNDLE??='experimental/0.6.0-fsr31.1/main.mod.js';
process.env.POLYSHADE_HEADED??='1';
const label=process.env.JITTER_LABEL??'current',directory=`${process.env.TEMP}/polyshade-jitter-${label}`;
await mkdir(directory,{recursive:true});
const {browser,page,errors}=await openUpscalingHarness();
const report={label,date:new Date().toISOString(),headed:process.env.POLYSHADE_HEADED==='1',
  temporalClockFPS:Number(process.env.JITTER_FPS??60),axis:process.env.JITTER_AXIS??'both',raw:process.env.JITTER_RAW==='1',
  note:'Logical temporal time-step test; readback/encoding wall time is excluded. This does not claim monitor scan-out at the configured time step.',
  bundle:process.env.POLYSHADE_BUNDLE,sha256:createHash('sha256').update(await readFile(process.env.POLYSHADE_BUNDLE)).digest('hex'),cases:[]};
try {
  await page.evaluate(({fps,axis,probes,objectMotion})=>{
    window.__freezeGame=true;
    const c=window.__controller,g=c.backends.gpu;
    if(!objectMotion)g.motion.render=()=>{}; // Frozen-object diagnostic only.
    const state=window.__jitterTest={scene:c.activeScene,camera:c.camera,clock:1000,sourceFrames:0,reference:null,fps};
    const begin=g.temporal.begin.bind(g.temporal);
    g.temporal.begin=(...args)=>{
      args[7]=state.clock;begin(...args);
      if(axis!=='both') {
        // Test-only axis isolation: restore the base before reapplying the
        // selected sample, updating all derived matrices consistently.
        const t=g.temporal,cam=t.camera;
        if(axis==='x'||axis==='zero')t.jitter.y=0;
        if(axis==='y'||axis==='zero')t.jitter.x=0;
        cam.projectionMatrix.copy(t.projection);
        cam.projectionMatrix.elements[8]-=2*t.jitter.x/t.width;
        cam.projectionMatrix.elements[9]+=2*t.jitter.y/t.height;
        cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
        t.currentJitteredVP.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);
        t.inverseJitteredVP.copy(t.currentJitteredVP).invert();
        t.jitterUV.set(t.jitter.x/t.width,t.jitter.y/t.height,t.previousJitter.x/t.width,t.previousJitter.y/t.height);
        t.clipToPrevious.multiplyMatrices(t.previousJitteredVP,t.inverseJitteredVP);
      }
    };
    const render=g.renderer.render.bind(g.renderer);
    g.renderer.render=(scene,camera)=>{
      const before=camera.projectionMatrix.elements.slice();const result=render(scene,camera);
      state.projectionChangedDuringDraw=before.some((v,i)=>Math.abs(v-camera.projectionMatrix.elements[i])>1e-10);
      state.rasterJitter=[-(before[8]-g.temporal.projection.elements[8])*g.temporal.width/2,
        (before[9]-g.temporal.projection.elements[9])*g.temporal.height/2];
      return result;
    };
    state.probe=async()=>{
      const width=g.temporal.width,height=g.temporal.height,nx=Math.ceil(width/4),ny=Math.ceil(height/4),bytes=nx*ny*16;
      const device=g.device;
      if(!state.probePipeline) {
        const code=`@group(0) @binding(0) var v:texture_2d<f32>;
          @group(0) @binding(1) var rejection:texture_2d<f32>;
          @group(0) @binding(2) var<storage,read_write> result:array<vec4f>;
          @compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) id:vec3u){
          let size=textureDimensions(v);let grid=(size+3u)/4u;if(any(id.xy>=grid)){return;}
          let at=min(id.xy*4u+2u,size-1u);let m=textureLoad(v,vec2i(at),0);
          let r=textureLoad(rejection,vec2i(min(at,textureDimensions(rejection)-1u)),0).r;
          result[id.y*grid.x+id.x]=vec4f(m.xy,r,m.z);}`;
        state.probePipeline=await device.createComputePipelineAsync({layout:'auto',compute:{module:device.createShaderModule({code}),entryPoint:'main'}});
      }
      const output=device.createBuffer({size:bytes,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});
      const read=device.createBuffer({size:bytes,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
      const velocity=g.resources.targets.get('velocity'),rejection=g.selection.backend==='sgsr2-compute'?g.compute.rejection:
        g.selection.backend==='fsr31'?{view:g.fsrMaskTexture.createView()}:g.passes.zero;
      const group=device.createBindGroup({layout:state.probePipeline.getBindGroupLayout(0),entries:[
        {binding:0,resource:velocity.view},{binding:1,resource:rejection.view},{binding:2,resource:{buffer:output}}]});
      const encoder=device.createCommandEncoder(),pass=encoder.beginComputePass();pass.setPipeline(state.probePipeline);pass.setBindGroup(0,group);pass.dispatchWorkgroups(Math.ceil(nx/8),Math.ceil(ny/8));pass.end();
      encoder.copyBufferToBuffer(output,0,read,0,bytes);device.queue.submit([encoder.finish()]);await read.mapAsync(GPUMapMode.READ);
      const data=new Float32Array(read.getMappedRange());let max=0,sq=0,rejected=0,car=0,carRejected=0,road=0,roadRejected=0,backgroundMax=0,carMax=0;
      for(let i=0;i<nx*ny;i++) {
        const motion=Math.hypot(data[i*4]*g.temporal.outputWidth/2,data[i*4+1]*g.temporal.outputHeight/2);
        max=Math.max(max,motion);sq+=motion*motion;const reject=data[i*4+2]>.5;rejected+=reject;
        if(data[i*4+3]>.5){car++;carRejected+=reject;carMax=Math.max(carMax,motion);}else{road++;roadRejected+=reject;backgroundMax=Math.max(backgroundMax,motion);}
      }
      const samples=[[.596,.808],[.595,.78],[.55,.82],[.50,.70],[.2,.7],[.8,.8]].map(([u,v])=>{
        const i=Math.min(ny-1,Math.floor(v*ny))*nx+Math.min(nx-1,Math.floor(u*nx));
        return {uv:[u,v],data:Array.from(data.subarray(i*4,i*4+4))};
      });
      read.unmap();read.destroy();output.destroy();
      return {velocityOutputPixels:{max,rms:Math.sqrt(sq/(nx*ny)),backgroundMax,carMax},
        samples,rejection:g.selection.backend==='sgsr2-compute'?{all:rejected/(nx*ny),car:carRejected/Math.max(1,car),background:roadRejected/Math.max(1,road)}:null,
        reactive:g.selection.backend==='fsr31'?{aboveHalf:rejected/(nx*ny),car:carRejected/Math.max(1,car),background:roadRejected/Math.max(1,road)}:null};
    };
    state.render=async(capture=false)=>{
      const before=g.frames;
      await g.device.queue.onSubmittedWorkDone(); // Isolated numerical verifier.
      for(let attempt=0;g.frames===before;attempt++) {
        if(attempt>300)throw Error('No real source frame rendered');
        await new Promise(resolve=>window.__testRAF(()=>{
          state.clock+=1000/(state.fps??60);
          c.activeRenderer.render(state.scene,state.camera);resolve();
        }));
        if(c.backends.failure||g.fsrFailure)throw Error(c.backends.failure??g.fsrFailure);
      }
      state.sourceFrames++;
      if(!capture)return null;
      // Same canvas texture, copied before the current task's presentation.
      const texture=g.renderer.backend.getContext().getCurrentTexture(),width=texture.width,height=texture.height;
      const stride=Math.ceil(width*4/256)*256;
      if(state.width!==width||state.height!==height){state.read?.destroy();state.width=width;state.height=height;state.read=g.device.createBuffer({size:stride*height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});}
      const encoder=g.device.createCommandEncoder();encoder.copyTextureToBuffer({texture},{buffer:state.read,bytesPerRow:stride},[width,height]);
      g.device.queue.submit([encoder.finish()]);await state.read.mapAsync(GPUMapMode.READ);
      const raw=new Uint8Array(state.read.getMappedRange()),rgba=new Uint8Array(width*height*4),gray=new Float32Array(width*height);
      const bgra=texture.format.startsWith('bgra');
      for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
        const s=y*stride+x*4,d=(y*width+x)*4;
        const r=raw[s+(bgra?2:0)],green=raw[s+1],b=raw[s+(bgra?0:2)];
        rgba[d]=r;rgba[d+1]=green;rgba[d+2]=b;rgba[d+3]=raw[s+3];gray[y*width+x]=.2126*r+.7152*green+.0722*b;
      }
      state.read.unmap();
      if(!state.reference)state.reference=gray.slice();
      const ref=state.reference;let xx=0,xy=0,yy=0,xd=0,yd=0,n=0,mae=0,sq=0;
      // Exclude sky animation and image borders. Includes track edges/car/fences.
      for(let y=Math.floor(height*.25);y<height-10;y++)for(let x=10;x<width-10;x++) {
        const i=y*width+x,gx=(ref[i+1]-ref[i-1])*.5,gy=(ref[i+width]-ref[i-width])*.5,d=gray[i]-ref[i];
        mae+=Math.abs(d);sq+=d*d;n++;
        if(gx*gx+gy*gy>25){xx+=gx*gx;xy+=gx*gy;yy+=gy*gy;xd+=gx*d;yd+=gy*d;}
      }
      const determinant=xx*yy-xy*xy;
      const displacement=determinant>1e-5?[-(yy*xd-xy*yd)/determinant,-(xx*yd-xy*xd)/determinant]:[0,0];
      // Lossless PNG inside the verifier avoids transferring 44 MB of JSON
      // base64 per 4K frame. Decode must retain the exact RGBA readback.
      const captureCanvas=new OffscreenCanvas(width,height),ctx=captureCanvas.getContext('2d');
      ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer),width,height),0,0);
      const compressed=new Uint8Array(await (await captureCanvas.convertToBlob({type:'image/png'})).arrayBuffer());
      let encoded='';for(let i=0;i<compressed.length;i+=32768)encoded+=String.fromCharCode(...compressed.subarray(i,i+32768));
      const rgbaSHA256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',rgba))).map(x=>x.toString(16).padStart(2,'0')).join('');
      return {width,height,pngBase64:btoa(encoded),rgbaSHA256,displacement,mae:mae/n,rmse:Math.sqrt(sq/n),
        gpuProbe:state.probes?await state.probe():undefined,
        projectionChangedDuringDraw:state.projectionChangedDuringDraw,rasterJitter:state.rasterJitter,temporal:g.temporal.report(),sourceFrames:state.sourceFrames};
    };
    state.probes=probes;
  },{fps:Number(process.env.JITTER_FPS??60),axis:process.env.JITTER_AXIS??'both',probes:process.env.JITTER_PROBES==='1',objectMotion:process.env.JITTER_OBJECT_MOTION!=='0'});
  const scales=(process.env.JITTER_SCALES??'1,.77,.67,.59,.5').split(',').map(Number);
  const modes=(process.env.JITTER_MODES??'native,sgsr2-compute,fsr31').split(',');
  for(const mode of modes)for(const scale of mode==='native'?[1]:scales) {
    const name=mode+'-'+Math.round(scale*100);console.log('JITTER',name);
    await page.evaluate(({mode,scale,raw,isolate,filters})=>{
      const c=window.__controller,s=c.getSettings();s.overrides={upscaling:mode,upscaleQuality:'custom',upscaleCustomScale:scale,
        motionBlurEnabled:false,cloudsEnabled:false,
        ...(isolate?{aoEnabled:false,bloomEnabled:false,sunRaysEnabled:false,
          volumetricEnabled:false,atmosphereEnabled:false,lensFlareEnabled:false,shadowQuality:'off'}:{}),
        ...(!filters?{fxaaEnabled:false,sharpenEnabled:false}:{}),frameGeneration:false,
        upscaleDebugView:raw?'low-resolution':'final'};
      c.notifySettingsChanged();window.__jitterTest.reference=null;
    },{mode,scale,raw:process.env.JITTER_RAW==='1',isolate:process.env.JITTER_EFFECTS==='isolated',filters:process.env.JITTER_FILTERS!=='0'});
    await page.evaluate(async mode=>{for(let i=0;window.__controller.backends.gpu.selection?.backend!==mode;i++){
      if(i>400)throw Error('Requested upscaler did not initialize');await window.__jitterTest.render();
    }},mode);
    for(let i=0;i<72;i++)await page.evaluate(()=>window.__jitterTest.render());
    const count=await page.evaluate(()=>Math.max(8,window.__controller.backends.gpu.temporal.phaseCount));
    const frames=[];let lumaSum,lumaSquares,firstLuma;await mkdir(`${directory}/${name}`,{recursive:true});
    for(let i=0;i<count;i++) {
      const frame=await page.evaluate(()=>window.__jitterTest.render(true));
      const png=Buffer.from(frame.pngBase64,'base64');
      const decoded=PNG.sync.read(png).data;
      assert.equal(createHash('sha256').update(decoded).digest('hex'),frame.rgbaSHA256,'lossless capture preserves every readback byte');
      lumaSum??=new Float64Array(frame.width*frame.height);lumaSquares??=new Float64Array(lumaSum.length);firstLuma??=new Float32Array(lumaSum.length);
      for(let pixel=0;pixel<lumaSum.length;pixel++) {
        const l=.2126*decoded[pixel*4]+.7152*decoded[pixel*4+1]+.0722*decoded[pixel*4+2];
        lumaSum[pixel]+=l;lumaSquares[pixel]+=l*l;if(i===0)firstLuma[pixel]=l;
      }
      assert.equal(frame.projectionChangedDuringDraw,false,'scene render must not overwrite the jittered projection');
      assert.equal(frame.temporal.valid,true,'stationary history must remain valid after warmup');
      await writeFile(`${directory}/${name}/${String(i).padStart(3,'0')}.png`,png);
      delete frame.pngBase64;frames.push(frame);
    }
    const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
    const sd=a=>Math.sqrt(mean(a.map(v=>(v-mean(a))**2)));
    const correlation=(a,b)=>{const ma=mean(a),mb=mean(b);return mean(a.map((v,i)=>(v-ma)*(b[i]-mb)))/Math.max(1e-10,sd(a)*sd(b));};
    const x=frames.map(f=>f.displacement[0]),y=frames.map(f=>f.displacement[1]);
    const {width,height}=frames[0],edge=[];
    for(let y=Math.floor(height*.43);y<height-10;y++)for(let x=10;x<width-10;x++) {
      const i=y*width+x,gradient=Math.hypot((firstLuma[i+1]-firstLuma[i-1])/2,(firstLuma[i+width]-firstLuma[i-width])/2);
      if(gradient>=10)edge.push(Math.sqrt(Math.max(0,lumaSquares[i]/count-(lumaSum[i]/count)**2)));
    }
    edge.sort((a,b)=>a-b);
    const flicker={units:'8-bit display luminance SD',edge:{pixels:edge.length,mean:mean(edge),p95:edge[Math.floor(edge.length*.95)],p99:edge[Math.floor(edge.length*.99)],above10:edge.filter(v=>v>10).length/edge.length}};
    const row={name,mode,scale,frames,flicker,stability:{stdX:sd(x),stdY:sd(y),
      correlationX:correlation(x,frames.map(f=>f.temporal.jitter[0])),correlationY:correlation(y,frames.map(f=>f.temporal.jitter[1])),
      maxFrameRMSE:Math.max(...frames.map(f=>f.rmse))}};
    report.cases.push(row);console.log(JSON.stringify({name,...row.stability,edgeFlicker:flicker.edge}));
    await writeFile(`${directory}/report.json`,JSON.stringify({...report,errors},null,2)+'\n');
    if(process.env.JITTER_RECORD_ONLY!=='1') {
      assert.ok(Math.max(sd(x),sd(y))<.1,`${name} coherent edge displacement exceeds .1 output pixel`);
      // Translation alone passed the broken implementation. The fixed real
      // scene's edge variance must also reject its observed crawling pixels.
      if(!report.raw&&mode==='sgsr2-compute')assert.ok(flicker.edge.mean<3.5,`${name} stationary edge flicker mean exceeds 3.5 display-code values`);
      if(!report.raw&&mode==='fsr31')assert.ok(flicker.edge.p99<8,`${name} stationary edge flicker p99 exceeds 8 display-code values`);
      if(mode==='native')assert.ok(frames.every(f=>f.rgbaSHA256===frames[0].rgbaSHA256),'Native static frames are byte-identical');
    }
  }
  assert.deepEqual(errors,[]);
}finally {await writeFile(`${directory}/report.json`,JSON.stringify({...report,errors},null,2)+'\n');await browser.close();}
