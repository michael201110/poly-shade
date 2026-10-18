import { openUpscalingHarness } from '../upscaling-harness.mjs';
import { writeFile } from 'node:fs/promises';
const { browser, page } = await openUpscalingHarness({freezeSupport:false});
try {
  await page.evaluate(() => {
    const c=window.__controller,s=c.getSettings();s.overrides={upscaling:'sgsr2-compute',upscaleQuality:'performance'};c.notifySettingsChanged();
    const t=c.backends.gpu.temporal,begin=t.begin;window.__temporalTrace=[];
    t.begin=function(...args){const before=this.resets;const value=begin.apply(this,args);
      window.__temporalTrace.push({reset:this.resets>before?this.lastReset:null,phase:this.sequence,
        fov:this.camera.fov,current:this.projection.elements.slice(),previous:this.previousProjection.elements.slice(),delta:this.deltaMs,
        width:this.width,height:this.height});return value;};
  });
  await page.waitForTimeout(1000);await page.keyboard.down('w');await page.waitForTimeout(2000);
  await page.keyboard.down('d');await page.waitForTimeout(150);await page.keyboard.up('d');
  await page.waitForTimeout(1000);await page.keyboard.up('w');
  const result=await page.evaluate(()=>({trace:window.__temporalTrace,
    failures:window.__controller.backends.report().webgpuFailure}));
  await writeFile('docs/verification/fsr31/temporal-trace.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result.trace.reduce((a,x)=>(a[x.reset??'valid']=(a[x.reset??'valid']??0)+1,a),{})));
  console.log(JSON.stringify(result.trace.filter(t=>t.reset).slice(0,3)));
}finally{await browser.close();}
