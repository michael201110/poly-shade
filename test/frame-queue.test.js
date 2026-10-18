import test from 'node:test';
import assert from 'node:assert/strict';
import { FrameQueue } from '../src/rendering/webgpu/frame-queue.js';
import { RenderController } from '../src/controller.js';

test('GPU admission is synchronous and bounded while completion stays asynchronous', async () => {
  const pending=[];
  const queue={onSubmittedWorkDone(){return new Promise((resolve,reject)=>pending.push({resolve,reject}));}};
  const frames=new FrameQueue();
  assert.equal(frames.available(),true);
  assert.equal(frames.submitted(queue),undefined);
  assert.equal(frames.available(),true);frames.submitted(queue);
  for(let i=0;i<20;i++)assert.equal(frames.available(),false);
  assert.equal(pending.length,2,'skipped game frames add no GPU work or callbacks');
  assert.equal(frames.pending,2);
  pending[0].resolve();await Promise.resolve();
  assert.equal(frames.available(),true);frames.submitted(queue);
  assert.equal(frames.peak,2);
  pending[1].reject(new Error('device retired'));await Promise.resolve();
  assert.equal(frames.pending,1,'loss/rejection cannot strand a full admission queue');
  frames.dispose();pending[2].resolve();await Promise.resolve();
  assert.equal(frames.pending,0,'late completions cannot corrupt disposed state');
});

test('a synchronous device error releases admission without throwing into the game', () => {
  const frames=new FrameQueue();
  frames.submitted({onSubmittedWorkDone(){throw Error('device lost');}});
  assert.equal(frames.pending,0);assert.equal(frames.available(),true);
});

test('renderer metrics count submitted images rather than skipped simulation callbacks', () => {
  const c=new RenderController({},()=>({enabled:true,preset:'cinematic',overrides:{}}));
  const renderer={},scene={};c.activeRenderer=renderer;c.activeScene=scene;
  const gpu={frames:0};c.backends={gpu};const durations=[];c.recordFrame=d=>durations.push(d);
  c.onFrame(renderer,scene,1);assert.equal(c.renderCount,0);
  gpu.frames=1;c.onFrame(renderer,scene,6);
  for(let i=0;i<10;i++)c.onFrame(renderer,scene,.1);
  gpu.frames=2;c.onFrame(renderer,scene,7);
  assert.equal(c.renderCount,2);assert.deepEqual(durations,[6,7]);
});
