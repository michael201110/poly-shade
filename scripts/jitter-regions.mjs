import {PNG} from 'pngjs';
import {readFile,writeFile} from 'node:fs/promises';
const root=process.argv[2];const report=JSON.parse(await readFile(root+'/report.json','utf8'));
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length,sd=a=>Math.sqrt(mean(a.map(v=>(v-mean(a))**2)));
const corr=(a,b)=>mean(a.map((v,i)=>(v-mean(a))*(b[i]-mean(b))))/Math.max(1e-10,sd(a)*sd(b));
for(const row of report.cases) {
  let reference;
  const series={car:[],road:[],distant:[],stripe:[]};
  for(let frame=0;frame<row.frames.length;frame++) {
    const p=PNG.sync.read(await readFile(`${root}/${row.name}/${String(frame).padStart(3,'0')}.png`));
    const gray=new Float32Array(p.width*p.height);
    for(let i=0;i<gray.length;i++)gray[i]=.2126*p.data[i*4]+.7152*p.data[i*4+1]+.0722*p.data[i*4+2];
    reference??=gray;
    for(const [name,[x0,y0,x1,y1]]of Object.entries({car:[500,435,780,635],road:[20,450,500,690],distant:[200,310,1100,430]})) {
      let xx=0,xy=0,yy=0,xd=0,yd=0;
      for(let y=Math.round(y0*p.height/720);y<Math.round(y1*p.height/720);y++)for(let x=Math.round(x0*p.width/1280);x<Math.round(x1*p.width/1280);x++){
        const i=y*p.width+x,gx=(reference[i+1]-reference[i-1])/2,gy=(reference[i+p.width]-reference[i-p.width])/2,d=gray[i]-reference[i];
        if(gx*gx+gy*gy>25){xx+=gx*gx;xy+=gx*gy;yy+=gy*gy;xd+=gx*d;yd+=gy*d;}
      }
      const det=xx*yy-xy*xy;
      series[name].push([-(yy*xd-xy*yd)/det,-(xx*yd-xy*xd)/det]);
    }
    let sum=0,position=0;
    for(let y=Math.round(470*p.height/720);y<Math.round(510*p.height/720);y++)for(let x=Math.round(320*p.width/1280);x<Math.round(500*p.width/1280);x++){
      const i=(y*p.width+x)*4,weight=Math.max(0,Math.min(p.data[i]-p.data[i+2],p.data[i+1]-p.data[i+2])-35);
      sum+=weight;position+=weight*y;
    }
    series.stripe.push(position/Math.max(1,sum));
  }
  row.regions={};
  for(const name of ['car','road','distant']){
    const x=series[name].map(v=>v[0]),y=series[name].map(v=>v[1]);
    row.regions[name]={stdX:sd(x),stdY:sd(y),correlationX:corr(x,row.frames.map(f=>f.temporal.jitter[0])),correlationY:corr(y,row.frames.map(f=>f.temporal.jitter[1]))};
  }
  row.regions.stripe={stdY:sd(series.stripe),correlationY:corr(series.stripe,row.frames.map(f=>f.temporal.jitter[1])),values:series.stripe};
  console.log(row.name,JSON.stringify(row.regions));
}
await writeFile(root+'/regions.json',JSON.stringify(report,null,2)+'\n');
