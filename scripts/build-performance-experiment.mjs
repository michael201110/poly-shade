// Isolated diagnostic bundles. Never overwrites a published version directory.
import { build } from 'esbuild';
import { readFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { relative } from 'node:path';
const variants=(process.argv[2]??'rays-quarter,hoisted-uniform,sky-depth,sgsr-unroll,ao-scalar,f16-tile').split(',');
const dir=`${process.env.TEMP}/polyshade-experiments`;
await mkdir(dir,{recursive:true});
const replace=(s,a,b)=>{if(!s.includes(a))throw Error(`Experiment anchor missing: ${a.slice(0,80)}`);return s.replace(a,b);};
for(const variant of variants){
 const features=new Set(variant.split('+'));
 await build({entryPoints:['src/mod.js'],bundle:true,format:'esm',platform:'browser',target:'es2022',
  alias:{'three/webgpu':'three/src/Three.WebGPU.js','three/tsl':'three/src/Three.TSL.js'},external:['https://*'],outfile:`${dir}/${variant}.js`,
  plugins:[{name:'isolated-experiment',setup(b){b.onLoad({filter:/src[\\/](rendering[\\/](backends[\\/]webgpu|webgpu[\\/]scene|sgsr2-compute)|shaders[\\/](?:sgsr2-compute|webgpu-post)\.wgsl)\.js$/},async args=>{
    // Every experiment starts with the immutable baseline, even after the
    // working source has retained another independent optimization.
    const source=relative(process.cwd(),args.path).replaceAll('\\','/');
    let s=execFileSync('git',['show',`v0.5.6:${source}`],{encoding:'utf8'}).replaceAll('\r\n','\n');
    if(features.has('uniform-batch')&&args.path.endsWith('backends\\webgpu.js')){
      s='import { UniformUploads } from "../../../scripts/experiments/uniform-uploads.js";\n'+s;
      s=replace(s,'this.device = this.renderer.backend.device;','this.device = this.renderer.backend.device;\n    this.uniformUploads=new UniformUploads(this.device);');
      s=replace(s,'this.renderer.render(this.scene.scene, c);','this.uniformUploads.begin();\n      try { this.renderer.render(this.scene.scene, c); } finally { this.uniformUploads.end(); }');
      s=replace(s,'this.compute?.dispose();','this.uniformUploads?.dispose();\n    this.compute?.dispose();');
    }
    if(features.has('rays-quarter')&&args.path.endsWith('backends\\webgpu.js'))s=replace(s,'this.resources.get("rays", w, h)','this.resources.get("rays", Math.ceil(w / 4), Math.ceil(h / 4))');
    if(features.has('rays-prefilter')){
      if(args.path.endsWith('backends\\webgpu.js')){
        s=replace(s,'rays: SH.RAYS,','rays: SH.RAYS,\n      raysBlur: SH.RAYS_BLUR,');
        s=replace(s,'this.resources.get("rays", w, h)','this.resources.get("rays", Math.ceil(w / 4), Math.ceil(h / 4))');
        s=replace(s,'this.passes.draw(encoder, "rays", inputs.rays, inputs, this.profiler);',`this.passes.draw(encoder, "rays", inputs.rays, inputs, this.profiler);
        const softened=this.resources.get("rays-softened",inputs.rays.width,inputs.rays.height);
        this.passes.draw(encoder,"raysBlur",softened,{...inputs,color:inputs.rays},this.profiler);
        inputs.rays=softened;`);
      }
      if(args.path.endsWith('shaders\\webgpu-post.wgsl.js')){
        const start=s.indexOf('fn softenedRays('),end=s.indexOf('\nfn motionBlur(',start);
        if(start<0||end<0)throw Error('Ray filter missing');
        const original=s.slice(start,end);
        s=s.slice(0,start)+'fn softenedRays(uv:vec2f)->vec3f{return textureSampleLevel(rays,linearSampler,uv,0).rgb;}'+s.slice(end);
        const filter=original.replaceAll('textureDimensions(rays)','textureDimensions(inputColor)').replaceAll('textureSampleLevel(rays,','textureSampleLevel(inputColor,');
        s+='\nexport const RAYS_BLUR = `'+filter+'\n@fragment fn fragment(v:Vertex)->@location(0)vec4f{return vec4f(softenedRays(v.uv),1);}`;\n';
      }
    }
    if(features.has('hoisted-uniform')){
      if(args.path.endsWith('rendering\\sgsr2-compute.js'))s=replace(replace(replace(s,'new ArrayBuffer(80)','new ArrayBuffer(96)'),'size: 80','size: 96'),'this.device.queue.writeBuffer(this.uniform, 0, this.params);','this.floats[20] = Math.min(20, Math.pow((ow / w) * (oh / h), 3));\n    this.device.queue.writeBuffer(this.uniform, 0, this.params);');
      if(args.path.endsWith('shaders\\sgsr2-compute.wgsl.js'))s=replace(replace(s,'jitterUV:vec4f,','jitterUV:vec4f,scale:f32,'),'let scale=min(20.0,pow((f32(p.displaySize.x)/f32(p.renderSize.x))*(f32(p.displaySize.y)/f32(p.renderSize.y)),3.0));','let scale=p.scale;');
    }
    if((features.has('sky-depth')||features.has('sky-depth-fixed'))&&args.path.endsWith('webgpu\\scene.js')){
      s=replace(s,'  wgslFn,','  wgslFn,\n  modelViewProjection,\n  vec4,');
      s=replace(s,'depthTest: false,','depthTest: true,');
      s=replace(s,'      m.colorNode = fn({','      m.vertexNode = vec4(modelViewProjection.xy, modelViewProjection.w, modelViewProjection.w);\n      m.colorNode = fn({');
      s=replace(s,'this.skyMesh.renderOrder = -10000','this.skyMesh.renderOrder = 10000');
      if(features.has('sky-depth-fixed'))s=replace(s,'mesh.renderOrder = o.renderOrder;',`mesh.renderOrder = o.renderOrder + ([].concat(mesh.material).some(m=>!m.transparent&&m.depthWrite===false)?20000:0);`);
    }
    if(features.has('sgsr-unroll')&&args.path.endsWith('shaders\\sgsr2-compute.wgsl.js')){
      const start=s.indexOf(' for(var i=0u;i<count;i++){');const end=s.indexOf('\n center/=boxWeight;',start);
      if(start<0||end<0)throw Error('SGSR loop missing');
      const offsets=['0,1','1,0','-1,0','0,0','0,-1','1,1','-1,1','1,-1','-1,-1'];
      const blocks=offsets.map((o,i)=>`${i===5?' if(p.still!=0u){\n':''} {let sample=decodeCached(at+vec2i(${o}));let offset=src+vec2f(${o});let radius=dot(offset,offset);
 let weight=lanczos(clamp(radius*kernel*kernel,0.0,1.0));sum+=vec4f(sample*weight,weight);
 let bw=exp(radius*curve);center+=sample*bw;variance+=sample*sample*bw;boxWeight+=bw;lo=min(lo,sample);hi=max(hi,sample);}${i===8?'\n }':''}`).join('\n');
      s=s.slice(0,start)+blocks+s.slice(end);
    }
    const workgroup=[...features].find(name=>/^wg\d+x\d+$/.test(name));
    if(workgroup){
      const [x,y]=workgroup.slice(2).split('x').map(Number);
      if(args.path.endsWith('shaders\\sgsr2-compute.wgsl.js')){
        s=replace(s,'@builtin(local_invocation_id) local:vec3u','@builtin(local_invocation_index) localIndex:u32');
        s=replace(s,'if(local.x==0u&&local.y==0u){','if(localIndex==0u){');
        s=replace(s,'let linear=local.y*8u+local.x;','let linear=localIndex;');
        s=replace(s,'i+=64u',`i+=${x*y}u`);
        s=replace(s,'var<workgroup> sourceTile:array<vec3f,100>;',
          `var<workgroup> sourceTile:array<vec3f,${(x+2)*(y+2)}>;`);
        s=replace(s,'let first=group.xy*8u;let last=min(first+vec2u(7),p.displaySize-1u);',
          `let first=group.xy*vec2u(${x}u,${y}u);let last=min(first+vec2u(${x-1}u,${y-1}u),p.displaySize-1u);`);
        const token='@compute @workgroup_size(8,8,1)',at=s.lastIndexOf(token);
        if(at<0)throw Error('SGSR upscale workgroup missing');
        s=s.slice(0,at)+`@compute @workgroup_size(${x},${y},1)`+s.slice(at+token.length);
      }
      if(args.path.endsWith('rendering\\sgsr2-compute.js'))
        s=replace(s,'pass.dispatchWorkgroups(Math.ceil(x / 8), Math.ceil(y / 8));',
          `pass.dispatchWorkgroups(name==="upscale"?Math.ceil(x/${x}):Math.ceil(x/8),name==="upscale"?Math.ceil(y/${y}):Math.ceil(y/8));`);
    }
    if(features.has('ao-scalar')&&args.path.endsWith('backends\\webgpu.js')){
      s=replace(s,'name === "finish"','name.startsWith("ao") ? "r16float" : name === "finish"');
      s=replace(s,'Math.ceil(h / 2),\n          )','Math.ceil(h / 2), "r16float",\n          )');
      s=replace(s,'this.resources.get("ao", a.width, a.height)','this.resources.get("ao", a.width, a.height, "r16float")');
    }
    if(features.has('f16-tile')&&args.path.endsWith('shaders\\sgsr2-compute.wgsl.js')){
      // Keep depth, velocity, coordinates, reprojection, rejection and all
      // accumulation f32. Only cached colour values change representation.
      s=replace(s,'  COMPUTE_PARAMS +\n  `\n@group(0) @binding(1) var history','  "enable f16;\\n" + COMPUTE_PARAMS +\n  `\n@group(0) @binding(1) var history');
      s=replace(s,'sourceTile:array<vec3f,100>','sourceTile:array<vec3h,100>');
      s=replace(s,'return sourceTile[u32(at.y)*sourceExtent.x+u32(at.x)];','return vec3f(sourceTile[u32(at.y)*sourceExtent.x+u32(at.x)]);');
      s=replace(s,'sourceTile[i]=decode(at);','sourceTile[i]=vec3h(decode(at));');
    }
    return {contents:s,loader:'js'};
  });}}]});
 console.log(`${variant}: ${dir}/${variant}.js`);
}
