import test from 'node:test';
import assert from 'node:assert/strict';
import {installHistoryEvents} from '../src/rendering/history-events.js';
test('PolyTrack T restart invalidates history without intercepting input',()=>{
  const listeners=new Map(),resets=[];
  const document={addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)};
  const dispose=installHistoryEvents(document,reason=>resets.push(reason));
  const event={code:'KeyT',repeat:false,target:{tagName:'CANVAS'}};
  listeners.get('keydown')(event);assert.deepEqual(resets,['run or menu key']);
  listeners.get('keydown')({...event,target:{tagName:'INPUT'}});assert.equal(resets.length,1);
  listeners.get('keydown')({...event,repeat:true});assert.equal(resets.length,1);
  assert.equal(event.defaultPrevented,undefined);dispose();assert.equal(listeners.size,0);
});
