import {FSR31FrameGeneration} from '../../src/rendering/framegen/frame-generation.js';

function half(v) {
  const s=v&0x8000?-1:1,e=v>>10&31,m=v&1023;
  return e===31?(m?NaN:s*Infinity):s*(e?2**(e-15)*(1+m/1024):2**-14*m/1024);
}
// Fixtures use multiples of 1/256, represented exactly by binary16.
function encode(v) { if(!v)return 0;const e=Math.floor(Math.log2(v));return ((e+15)<<10)|Math.round((v/2**e-1)*1024); }
function noise(x,y,c) {let a=(Math.floor(x)*374761393+Math.floor(y)*668265263+c*1274126177)|0;a=Math.imul(a^(a>>>13),1274126177);return ((a^(a>>>16))&255)/256;}

export async function verifySynthetic(options={}) {
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
  const device=await adapter.requestDevice({requiredFeatures:['subgroups','float32-filterable'],requiredLimits:{maxStorageTexturesPerShaderStage:6}});
  const errors=[],owned=[];device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
  const fg=new FSR31FrameGeneration(device);
  try {
    await fg.init();
    const w=options.width??128,h=options.height??128,iw=options.internalWidth??w,ih=options.internalHeight??h;
    const sx=options.speedX??4,sy=options.speedY??0;
    const texture=(format,usage,width=w,height=h)=>{const t=device.createTexture({size:[width,height],format,usage});owned.push(t);return t;};
    const color=texture('rgba16float',GPUTextureUsage.COPY_DST|GPUTextureUsage.COPY_SRC|GPUTextureUsage.TEXTURE_BINDING);
    const velocity=texture('rgba32float',GPUTextureUsage.COPY_DST|GPUTextureUsage.TEXTURE_BINDING,iw,ih);
    const depth=texture('depth32float',GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING,iw,ih);
    const pixels=new Uint16Array(w*h*4),motion=new Float32Array(iw*ih*4);
    const temporal={width:iw,height:ih,outputWidth:w,outputHeight:h,valid:false,jitter:{x:0,y:0},deltaMs:1000/30,
      camera:{near:.1,far:1000},projection:{elements:[1,0,0,0,0,1]}};
    async function frame(index=0,textured=false) {
      for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<4;c++)pixels[(y*w+x)*4+c]=encode(c===3?1:textured?noise(x-index*sx,y-index*sy,c):[.25,.5,.75][c]);
      for(let i=0;i<motion.length;i+=4)motion.set([textured?2*sx/w:0,textured?-2*sy/h:0,1,1],i);
      device.queue.writeTexture({texture:color},pixels,{bytesPerRow:w*8},[w,h]);
      device.queue.writeTexture({texture:velocity},motion,{bytesPerRow:iw*16},[iw,ih]);
      const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[],depthStencilAttachment:{view:depth.createView(),depthLoadOp:'clear',depthClearValue:.9,depthStoreOp:'store'}});pass.end();
      const result=fg.generate(encoder,color,depth,velocity,temporal);device.queue.submit([encoder.finish()]);
      await device.queue.onSubmittedWorkDone(); // Correctness tests only; runtime never waits.
      temporal.valid=true;return result;
    }
    async function readTexture(item) {
      const {width,height}=item,stride=Math.ceil(width*8/256)*256,b=device.createBuffer({size:stride*height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
      const e=device.createCommandEncoder();e.copyTextureToBuffer({texture:item.texture},{buffer:b,bytesPerRow:stride},[width,height]);
      device.queue.submit([e.finish()]);await b.mapAsync(GPUMapMode.READ);
      const raw=new Uint16Array(b.getMappedRange()),out=[];
      for(let y=0;y<height;y++)for(let x=0;x<width*4;x++)out.push(half(raw[y*stride/2+x]));b.unmap();b.destroy();return out;
    }
    async function readBuffer(source) {
      const b=device.createBuffer({size:source.size,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
      const e=device.createCommandEncoder();e.copyBufferToBuffer(source,0,b,0,source.size);device.queue.submit([e.finish()]);await b.mapAsync(GPUMapMode.READ);
      const out=[...new Int32Array(b.getMappedRange())];b.unmap();b.destroy();return out;
    }
    let output;
    for(let i=0;i<10;i++)output=await frame();
    const flat=await readTexture(output.generated),ranges=Array.from({length:4},()=>({min:Infinity,max:-Infinity,nonFinite:0}));
    flat.forEach((v,i)=>{const r=ranges[i%4];if(!Number.isFinite(v))r.nonFinite++;else{r.min=Math.min(r.min,v);r.max=Math.max(r.max,v);}});
    const flatFlow=await readBuffer(fg.debug.flow);
    temporal.valid=false;
    for(let i=0;i<12;i++)output=await frame(i,true);
    const moved=await readTexture(output.generated),flow=await readBuffer(fg.debug.flow),centerFlow=[];
    const fw=Math.ceil(w/8),fh=Math.ceil(h/8);
    for(let y=Math.ceil(fh/4);y<Math.floor(fh*3/4);y++)for(let x=Math.ceil(fw/4);x<Math.floor(fw*3/4);x++)centerFlow.push([flow[(y*fw+x)*2],flow[(y*fw+x)*2+1]]);
    let error=0,currentError=0,count=0,nonFinite=0;
    for(let y=24;y<h-24;y++)for(let x=24;x<w-24;x++)for(let c=0;c<3;c++){
      const actual=moved[(y*w+x)*4+c],expected=noise(x-10.5*sx,y-10.5*sy,c);
      if(!Number.isFinite(actual))nonFinite++;else{error+=Math.abs(actual-expected);currentError+=Math.abs(actual-noise(x-11*sx,y-11*sy,c));count++;}
    }
    const motionTexture=await readTexture(fg.textures.get('dilated-motion'));
    temporal.valid=false;const reset=await frame();const resetValues=await readTexture(reset.generated);
    const report=fg.report();
    temporal.width=Math.max(64,iw-8);temporal.height=Math.max(64,ih-8);temporal.outputWidth=w+2;temporal.outputHeight=h+2;
    const resized=await frame(),resizedValues=await readTexture(resized.generated);
    const resize={valid:resized.valid,frameIndex:resized.frameIndex,dimensions:[resized.real.width,resized.real.height],nonFinite:resizedValues.filter(v=>!Number.isFinite(v)).length};
    fg.releaseImages();const released=fg.report();
    const restored=await frame();fg.dispose();
    return {options,errors,ranges,flatFlowNonzero:flatFlow.filter(v=>v!==0).length,centerFlow,resize,
      midpoint:{mae:error/count,currentFrameMAE:currentError/count,nonFinite},
      dilatedMotion:motionTexture.slice((Math.floor(ih/2)*iw+Math.floor(iw/2))*4,(Math.floor(ih/2)*iw+Math.floor(iw/2))*4+4),
      reset:{valid:reset.valid,frameIndex:reset.frameIndex,center:resetValues.slice((Math.floor(h/2)*w+Math.floor(w/2))*4,(Math.floor(h/2)*w+Math.floor(w/2))*4+4)},
      restored:{valid:restored.valid,frameIndex:restored.frameIndex},report,released,cleanup:fg.report()};
  }finally {fg.dispose();for(const value of owned)value.destroy();device.destroy();}
}
