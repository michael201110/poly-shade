// Preserve builtin uniformity lost by Naga's SPIR-V entry-point wrapper.
// No shader arithmetic changes: move the inlined body into the entry point.
export function inlineComputeInputs(code) {
  const start=code.indexOf('fn CS_1() {');
  if(start<0)throw Error('Unexpected Naga compute entry');
  const open=code.indexOf('{',start);let end=open+1,depth=1;
  for(;depth;end++){if(code[end]==='{')depth++;else if(code[end]==='}')depth--;}
  const body=code.slice(open+1,end-1);
  code=code.slice(0,start)+code.slice(end);
  const variables=[...code.matchAll(/var<private> (\w+):[^;]+;/g)].map(m=>m[1]);
  code=code.replace(/var<private> \w+:[^;]+;\n/g,'');
  for(const variable of variables)code=code.replace(new RegExp(`^(\\s*)${variable} =`,'m'),`$1let ${variable} =`);
  code=code.replace('CS_1();',body);
  return code;
}

export function uniformSceneChange(code) {
  const marker='rw_optical_flow_scd_output.member[1u]';
  if(!code.includes(marker))throw Error('AMD SCD slot changed');
  code=code.replaceAll(marker,'polyUniformSceneChange');
  const start=code.indexOf('fn CS('),open=code.indexOf('{',start);
  const signature=code.slice(start,open);
  const index=signature.match(/@builtin\(local_invocation_index\) (\w+): u32/)?.[1];
  const arg=index?'':', @builtin(local_invocation_index) polyInvocation: u32';
  const patched=signature.replace(/\)\s*$/,arg+') ');
  code=code.slice(0,start)+patched+'{\n'+
    `if (${index??'polyInvocation'} == 0u) { polySharedSceneChange = ${marker}; }\n`+
    'let polyUniformSceneChange = workgroupUniformLoad(&polySharedSceneChange);\n'+code.slice(open+1);
  return 'var<workgroup> polySharedSceneChange:u32;\n'+code;
}
