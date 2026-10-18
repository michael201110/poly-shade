// Consecutive-frame luminance variance at stationary high-contrast edges.
// This complements displacement: an edge can flicker without translating.
import {PNG} from 'pngjs';
import {readFile,writeFile} from 'node:fs/promises';
const root=process.argv[2],report=JSON.parse(await readFile(root+'/report.json','utf8'));
for(const row of report.cases) {
  let sum,squares,width,height,reference;
  for(let frame=0;frame<row.frames.length;frame++) {
    const p=PNG.sync.read(await readFile(`${root}/${row.name}/${String(frame).padStart(3,'0')}.png`));
    width=p.width;height=p.height;sum??=new Float64Array(width*height);squares??=new Float64Array(width*height);
    reference??=new Float32Array(width*height);
    for(let i=0;i<sum.length;i++) {
      const l=.2126*p.data[i*4]+.7152*p.data[i*4+1]+.0722*p.data[i*4+2];
      sum[i]+=l;squares[i]+=l*l;if(frame===0)reference[i]=l;
    }
  }
  const n=row.frames.length,edge=[],all=[];
  const map=new PNG({width,height}),hot=[];
  for(let y=Math.floor(height*.43);y<height-10;y++)for(let x=10;x<width-10;x++) {
    const i=y*width+x,sd=Math.sqrt(Math.max(0,squares[i]/n-(sum[i]/n)**2));all.push(sd);
    const gradient=Math.hypot((reference[i+1]-reference[i-1])/2,(reference[i+width]-reference[i-width])/2);
    if(gradient>=10)edge.push(sd);
    if(sd>20)hot.push({x,y,sd});
    const at=i*4;map.data[at]=Math.min(255,sd*6);map.data[at+1]=Math.min(255,sd*2);map.data[at+2]=0;map.data[at+3]=255;
  }
  const stats=a=>{a.sort((a,b)=>a-b);return {pixels:a.length,mean:a.reduce((s,x)=>s+x,0)/a.length,
    p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],
    above5:a.filter(v=>v>5).length/a.length,above10:a.filter(v=>v>10).length/a.length};};
  row.flicker={units:'8-bit display luminance standard deviation',edge:stats(edge),all:stats(all)};
  row.flicker.hotspots=hot.sort((a,b)=>b.sd-a.sd).slice(0,20);
  await writeFile(`${root}/${row.name}/flicker.png`,PNG.sync.write(map));
  console.log(row.name,JSON.stringify(row.flicker));
}
await writeFile(root+'/flicker.json',JSON.stringify(report,null,2)+'\n');
