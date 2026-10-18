// HLSL staging adapter. Preserve 2D zero/drop bounds semantics when WebGPU
// integer atomics require storage buffers instead of texture UAV atomics.
export function bufferImages(source,family) {
  const scalar=family==='frameinterpolation' ? [
    'reconstructed_depth_previous_frame','reconstructed_depth_interpolated_frame',
    'game_motion_vector_field_x','game_motion_vector_field_y',
    'optical_flow_motion_vector_field_x','optical_flow_motion_vector_field_y','optical_flow_scd',
  ] : ['optical_flow_histogram','optical_flow_global_motion_search',
    'optical_flow_scd_histogram','optical_flow_scd_temp','optical_flow_scd_output'];
  const shapes={r_optical_flow:'polyFlowSize',rw_optical_flow:'polyFlowSize',
    r_optical_flow_previous:'polyPreviousFlowSize',rw_optical_flow_next_level:'polyNextFlowSize'};
  source=source.replace(/(#if defined\(FFX_GPU\)\s*\n)/,
    '$1cbuffer cbPolyShadeFG : register(b2) { int2 polyFlowSize; int2 polyPreviousFlowSize; int2 polyNextFlowSize; int2 polyReserved; };\n');
  for(const [type,names]of [['FfxUInt32',scalar.flatMap(n=>['r_'+n,'rw_'+n])],
    ['FfxInt32x2',Object.keys(shapes)]])for(const name of names) {
    const declaration=new RegExp(`(RW)?Texture2D<${type}>\\s+${name}\\s+([^;]+);`);
    const match=source.match(declaration);if(!match)continue;
    const writable=!!match[1],shape=shapes[name]??(name.includes('scd')||family==='opticalflow'?null:'GetMaxRenderSize()');
    const inside=p=>shape?`all(FfxInt32x2(${p}) >= 0) && all(FfxInt32x2(${p}) < ${shape})`:
      `(FfxInt32x2(${p}).x >= 0 && FfxInt32x2(${p}).y == 0)`;
    const index=p=>shape?`(FfxInt32x2(${p}).y * ${shape}.x + FfxInt32x2(${p}).x)`:`FfxInt32x2(${p}).x`;
    const protectedTargets=[];
    const protect=code=>{const token=`POLYSHADE_TARGET_${protectedTargets.length}_`;protectedTargets.push(code);return token;};
    if(writable) {
      source=source.replace(new RegExp(`Interlocked(\\w+)\\(\\s*${name}\\[([^\\]]+)\\]\\s*,([^;]+)\\);`,'g'),
        (_,operation,p,args)=>{
          const parts=args.split(',');const miss=parts.length===2?`else { ${parts[1]} = 0; }`:'';
          return protect(`if (${inside(p)}) { Interlocked${operation}(${name}[${index(p)}],${args}); } ${miss}`);
        });
      source=source.replace(new RegExp(`${name}\\[([^\\]]+)\\]\\s*=\\s*([^;]+);`,'g'),
        (_,p,value)=>protect(`if (${inside(p)}) { ${name}[${index(p)}] = ${type==='FfxInt32x2'?`clamp(${value},-32768,32767)`:value}; }`));
    }
    source=source.replace(new RegExp(`\\b${name}\\[([^\\]]+)\\]`,'g'),(_,p)=>`PolyLoad_${name}(${p})`);
    source=source.replace(declaration,`${writable?'RW':''}StructuredBuffer<${type}> ${name} ${match[2]};\n`+
      `${type} PolyLoad_${name}(FfxInt32x2 p) { if (${inside('p')}) return ${name}[${index('p')}]; return 0; }`);
    protectedTargets.forEach((code,i)=>{source=source.replace(`POLYSHADE_TARGET_${i}_`,code);});
  }
  return source;
}
