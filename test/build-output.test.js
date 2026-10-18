import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

test('build preserves committed versioned bundles and requires a new version for changed output', async () => {
  const directory=await mkdtemp(join(tmpdir(),'polyshade-build-guard-'));
  const script=fileURLToPath(new URL('../scripts/build.mjs',import.meta.url));
  const env={...process.env};delete env.POLYSHADE_BUILD_OUTPUT;
  const run=(command,args)=>spawnSync(command,args,{cwd:directory,env,encoding:'utf8'});
  const git=(...args)=>{const r=run('git',args);assert.equal(r.status,0,r.stderr);};
  try {
    git('-c','init.defaultBranch=main','init','--quiet');
    await mkdir(join(directory,'src'));
    await writeFile(join(directory,'package.json'),JSON.stringify({version:'0.0.0-build-test'}));
    await writeFile(join(directory,'src/mod.js'),'export const value=1;');
    let result=run(process.execPath,[script]);assert.equal(result.status,0,result.stderr);
    const path=join(directory,'experimental/0.0.0-build-test/main.mod.js');
    const original=await readFile(path);
    git('add','.');
    git('-c','user.name=PolyShade build test','-c','user.email=build-test@example.invalid','commit','--quiet','-m','Fixture');
    result=run(process.execPath,[script]);assert.equal(result.status,0,result.stderr);
    await writeFile(join(directory,'src/mod.js'),'export const value=2;');
    result=run(process.execPath,[script]);assert.notEqual(result.status,0);
    assert.match(result.stderr,/Refusing to overwrite committed bundle/);
    assert.deepEqual(await readFile(path),original);
    await writeFile(join(directory,'package.json'),JSON.stringify({version:'0.0.1-build-test'}));
    result=run(process.execPath,[script]);assert.equal(result.status,0,result.stderr);
    assert.deepEqual(await readFile(path),original);
    assert.notDeepEqual(await readFile(join(directory,'experimental/0.0.1-build-test/main.mod.js')),original);
  } finally {
    if(!resolve(directory).startsWith(resolve(tmpdir())+sep))throw Error('Fixture escaped temporary directory');
    await rm(directory,{recursive:true,force:true});
  }
});
