// The velocity shader consumes position and morph deltas only. Weld identical
// float bit patterns without tolerances; retain every original triangle/index.
export function packMotionGeometry(geometry, suspension = false) {
  const position = geometry.attributes.position;
  const attributes = [position];
  if (suspension) for (let i=0;i<4;i++) attributes.push(geometry.attributes[`swarmMorph${i}`]);
  const values = new Float32Array(attributes.length*3), bits = new Uint32Array(values.buffer);
  const unique = [], remap = new Uint32Array(position.count), known = new Map();
  for(let vertex=0;vertex<position.count;vertex++) {
    for(let a=0;a<attributes.length;a++) {
      const source=attributes[a];
      values[a*3]=source.getX(vertex);values[a*3+1]=source.getY(vertex);values[a*3+2]=source.getZ(vertex);
    }
    const key=bits.join(',');let id=known.get(key);
    if(id===undefined){id=unique.length;known.set(key,id);unique.push(vertex);}
    remap[vertex]=id;
  }
  const count=geometry.index?.count??position.count;
  const indices=unique.length>65535?new Uint32Array(count):new Uint16Array((count+1)&~1);
  for(let i=0;i<count;i++)indices[i]=remap[geometry.index?geometry.index.getX(i):i];
  const positions=new Float32Array(unique.length*3);
  const morphs=new Float32Array(suspension?unique.length*4*4:4);
  for(let i=0;i<unique.length;i++) {
    const vertex=unique[i];positions[i*3]=position.getX(vertex);positions[i*3+1]=position.getY(vertex);positions[i*3+2]=position.getZ(vertex);
    if(suspension)for(let m=0;m<4;m++) {
      const a=attributes[m+1],offset=(m*unique.length+i)*4;
      morphs[offset]=a.getX(vertex);morphs[offset+1]=a.getY(vertex);morphs[offset+2]=a.getZ(vertex);
    }
  }
  return {positions,morphs,indices,count,vertexCount:unique.length,indexFormat:indices instanceof Uint16Array?'uint16':'uint32'};
}
