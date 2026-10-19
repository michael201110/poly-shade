// Sequential GPU experiments: never runs competing benchmark browsers.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
const dir=`${process.env.TEMP}/polyshade-performance`;
await mkdir(dir,{recursive:true});
const envBase=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('POLYSHADE_')&&!key.startsWith('POLYBOT_')));
const experiments={
 'game-only':{POLYSHADE_NO_MOD:'1',POLYSHADE_SCALES:'1'},
 '056-queue2':{POLYSHADE_FRAME_LIMIT:'2',POLYSHADE_SCALES:'1,.5'},
 '056-queue1':{POLYSHADE_FRAME_LIMIT:'1',POLYSHADE_SCALES:'1,.5'},
 '056-unprofiled':{POLYSHADE_TIMESTAMPS:'0',POLYSHADE_QUEUE_PROBE:'0',POLYSHADE_RESOLUTIONS:'1280x720,1920x1080',POLYSHADE_SCALES:'1,.5'},
 '055-original':{POLYSHADE_BUNDLE:'0.5.5/main.mod.js',POLYSHADE_SCALES:'1,.5'},
 'rays-quarter':{POLYSHADE_FRAME_LIMIT:'2',POLYSHADE_SCALES:'1,.5'},
 'rays-prefilter':{POLYSHADE_FRAME_LIMIT:'2',POLYSHADE_SCALES:'1,.5'},
 'hoisted-uniform':{POLYSHADE_FRAME_LIMIT:'2',POLYSHADE_SCALES:'.5'},
 'sky-depth':{POLYSHADE_FRAME_LIMIT:'2',POLYSHADE_SCALES:'1,.5'},
 'sgsr-unroll':{POLYSHADE_FRAME_LIMIT:'2',POLYSHADE_SCALES:'.5'},
 'ao-scalar':{POLYSHADE_FRAME_LIMIT:'2',POLYSHADE_SCALES:'1'},
 'f16-tile':{POLYSHADE_FRAME_LIMIT:'2',POLYSHADE_SCALES:'.5'},
 'uniform-batch':{POLYSHADE_SCALES:'1,.5'},
 'hot-disabled':{POLYSHADE_BUNDLE:'0.5.6/main.mod.js',POLYSHADE_HOT_DISABLE:'1',POLYSHADE_SCALES:'1'},
};
const results=[];
const prefix=process.env.POLYSHADE_STUDY_PREFIX??'ac-';
for(const name of process.argv.slice(2)){
 if(!experiments[name])throw Error(`Unknown experiment ${name}`);
 const env={...envBase,POLYSHADE_HEADED:'1',POLYSHADE_BUNDLE:'0.5.6/main.mod.js',POLYSHADE_PROFILE_MS:'6000',POLYSHADE_PROFILE_LABEL:prefix+name,
  ...(!name.startsWith('056-')&&name!=='055-original'&&name!=='game-only'?{POLYSHADE_BUNDLE:`${process.env.TEMP}/polyshade-experiments/${name}.js`}:{}),...experiments[name]};
 console.log(`Starting ${name}`);
 const code=await new Promise(resolve=>{const child=spawn(process.execPath,['scripts/profile-gameplay.mjs'],{env,stdio:'inherit'});child.on('exit',resolve);});
 results.push({name,code});await writeFile(`${dir}/${prefix}study-progress.json`,JSON.stringify(results,null,2));
 if(code!==0)console.error(`Experiment ${name} failed (${code}); result is not accepted`);
}
process.exitCode=results.some(r=>r.code!==0)?1:0;
