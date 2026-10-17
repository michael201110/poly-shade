import {GPUPasses} from '../src/rendering/webgpu/passes.js';
import * as current from '../src/shaders/webgpu-post.wgsl.js';

// Test-only readback compares the immutable 0.5.0 shaders with current output.
export async function verifyPost(old) {
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
  const device=await adapter.requestDevice(),errors=[];
  device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
  const entries=new Map(),w=65,h=49;
  const resources={resizes:0,get(name,width,height,format='rgba16float'){
    let e=entries.get(name);if(e)return e;
    const texture=device.createTexture({size:[width,height],format,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST});
    e={texture,view:texture.createView(),width,height};entries.set(name,e);return e;
  }};
  const passes=new GPUPasses(device,resources);
  await passes.compile('old-grade',old.GRADE,'rgba8unorm');await passes.compile('grade',current.GRADE,'rgba8unorm');
  await passes.compile('old-finish',old.FINISH,'rgba8unorm');await passes.compile('finish',current.FINISH,'rgba8unorm');
  const color=resources.get('color',w,h,'rgba8unorm'),pattern=new Uint8Array(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const at=(y*w+x)*4;pattern[at]=(x*13+y*7)%256;pattern[at+1]=(x*3+y*17)%256;pattern[at+2]=(x*11+y*5)%256;pattern[at+3]=255;}
  device.queue.writeTexture({texture:color.texture},pattern,{bytesPerRow:w*4},[w,h]);
  const depth=device.createTexture({size:[w,h],format:'depth32float',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT});
  const velocity=resources.get('velocity',w,h),ao=resources.get('ao',w,h),bloom=resources.get('bloom',w,h),rays=resources.get('rays',w,h),volume=resources.get('volume',w,h),sun=resources.get('sun',1,1);
  const encoder=device.createCommandEncoder();
  encoder.beginRenderPass({colorAttachments:[],depthStencilAttachment:{view:depth.createView(),depthLoadOp:'clear',depthStoreOp:'store',depthClearValue:.55}}).end();
  for(const [target,value]of [[velocity,[.018,-.009,1,1]],[ao,[.8,.8,.8,1]],[bloom,[.1,.07,.03,1]],[rays,[.02,.04,.06,1]],[volume,[.03,.02,.01,.1]],[sun,[.7,.9,.8,1]]])encoder.beginRenderPass({colorAttachments:[{view:target.view,loadOp:'clear',storeOp:'store',clearValue:value}]}).end();
  device.queue.submit([encoder.finish()]);
  const params=new Float32Array(184),identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  for(let i=0;i<6;i++)params.set(identity,i*16);
  params.set([1,0,0,0,0,1,0,0,0,0,0,-9.999,0,0,-1,10]);
  params.set([w,h,w,h],96);params.set([.5,.4,w/h,1],104);params.set([0,.5,-1,0],108);
  params.set([.7,.8,.9,0],112);params.set([1,.8,.6,0],116);
  const cfg=[[1.06,1.075,1.06,.08],[.015,0,.004,.04],[.003,1,.035,.7],[.42,1.1,.04,12],[1.5,.055,1.2,1],[.34,.96,.8,.5],[.08,.008,.96,16],[80,.13,80,.25],[.32,.55,.65,.12],[22,32,16.7,1],[.44,0,1,1],[1,0,0,0],[.96,1,0,0],[1.5,0,0,0]];
  cfg.forEach((v,i)=>params.set(v,120+i*4));
  const a=resources.get('proof-a',w,h,'rgba8unorm'),b=resources.get('proof-b',w,h,'rgba8unorm');
  const row=Math.ceil(w*4/256)*256,size=row*h,read=device.createBuffer({size:size*2,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
  const cases=[];
  for(const effect of ['grade','finish'])for(const scenario of ['active','sun-hidden','sun-occluded','no-blur','no-optics','fxaa','sharpen']) {
    const p=params.slice();let inputs={color,depth,velocity,ao,bloom,rays,volume,sun};
    if(scenario==='sun-hidden'){p[107]=0;inputs={...inputs,rays:passes.zero,volume:passes.zero};}
    if(scenario==='sun-occluded')inputs={...inputs,sun:passes.zero};
    if(scenario==='no-blur')p[156]=0;
    if(scenario==='no-optics'){p[140]=0;p[144]=0;p[152]=0;}
    if(scenario==='fxaa')p[167]=1;
    if(scenario==='sharpen')p[166]=.08;
    device.queue.writeBuffer(passes.uniform,0,p);
    const command=device.createCommandEncoder();
    passes.draw(command,`old-${effect}`,a,inputs);passes.draw(command,effect,b,inputs);
    command.copyTextureToBuffer({texture:a.texture},{buffer:read,bytesPerRow:row},[w,h]);
    command.copyTextureToBuffer({texture:b.texture},{buffer:read,offset:size,bytesPerRow:row},[w,h]);
    device.queue.submit([command.finish()]);await read.mapAsync(GPUMapMode.READ);
    const data=new Uint8Array(read.getMappedRange());let maximum=0,total=0,changed=0;
    for(let y=0;y<h;y++)for(let x=0;x<w*4;x++){const d=Math.abs(data[y*row+x]-data[size+y*row+x]);maximum=Math.max(maximum,d);total+=d;if(d)changed++;}
    cases.push({effect,scenario,maximum,mean:total/(w*h*4),changed});read.unmap();
  }
  passes.dispose();read.destroy();depth.destroy();for(const e of entries.values())e.texture.destroy();device.destroy();
  return {cases,errors};
}
