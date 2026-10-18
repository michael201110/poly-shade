import test from 'node:test';
import assert from 'node:assert/strict';
import {WebGPUBackend} from '../src/rendering/backends/webgpu.js';

test('retired enhanced renderer destroys its owned GPU device once after caches',()=>{
 const events=[];
 const backend=Object.create(WebGPUBackend.prototype);
 backend.hide=()=>events.push('hide');
 backend.device={removeEventListener(){events.push('listener');},destroy(){assert.equal(backend.disposed,true);backend.renderer.onDeviceLost();events.push('device');}};
 backend.renderer={dispose(){events.push('renderer');},onDeviceLost(){throw Error('normal retirement must not report device failure');}};
 backend.scene={dispose(){events.push('scene');}};
 backend.canvas={remove(){events.push('canvas');}};
 backend.dispose();backend.dispose();
 assert.deepEqual(events,['hide','listener','scene','renderer','device','canvas']);
 assert.equal(backend.ready,false);
});
