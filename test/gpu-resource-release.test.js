import test from 'node:test';
import assert from 'node:assert/strict';
import {GPUResources} from '../src/rendering/webgpu/resources.js';
import {SGSR2Compute} from '../src/rendering/sgsr2-compute.js';

test('retiring reconstruction resources frees every temporal target and keeps native targets', () => {
  const oldUsage=globalThis.GPUTextureUsage;
  globalThis.GPUTextureUsage={TEXTURE_BINDING:1,STORAGE_BINDING:2,RENDER_ATTACHMENT:4};
  try {
    const destroyed=[];
    const device={createTexture({label}){return{createView(){return{};},destroy(){destroyed.push(label);}};}};
    const resources=new GPUResources(device);
    const native=resources.get('graded',1920,1080);
    for(const name of ['history-a','history-b','output','converted','geometry','ycocg','rejection'])resources.get(`sgsr-${name}`,3840,2160);
    resources.release('sgsr-');
    assert.equal(destroyed.length,7);
    assert.deepEqual(resources.report().map(r=>r.name),['graded']);
    assert.equal(resources.get('graded',1920,1080),native);
    resources.release('sgsr-');assert.equal(destroyed.length,7,'idempotent retirement');
    resources.get('sgsr-history-a',3840,2160);assert.equal(resources.allocations,9);
  } finally {globalThis.GPUTextureUsage=oldUsage;}
});

test('retired histories cannot remain bound as final-pass inputs or be reused after switching back', () => {
  const compute=Object.create(SGSR2Compute.prototype);
  for(const key of ['bindingTextures','convertGroup','upscaleGroups','previousHistory','geometry','output','rejection','converted'])compute[key]={old:true};
  compute.ping=1;compute.releaseResources();
  for(const key of ['bindingTextures','convertGroup','upscaleGroups','previousHistory','geometry','output','rejection','converted'])assert.equal(compute[key],null);
  assert.equal(compute.ping,0);
});
