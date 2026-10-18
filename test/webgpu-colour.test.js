import test from "node:test";
import assert from "node:assert/strict";
import { Color, Vector3, Vector4, PerspectiveCamera } from "three";
import {projectSunDirection} from '../src/rendering/sun-visibility.js';
import { copyLinearColour } from "../src/rendering/webgpu/scene.js";

test('directional sun projection is independent of camera world translation and stale position metadata',()=>{
  const camera=new PerspectiveCamera(70,16/9,.5,10000),view=new Vector3(),clip=new Vector4(),direction=new Vector3(.2,.1,-1).normalize();
  camera.updateMatrixWorld();const before=projectSunDirection(camera,direction,view,clip).clone();
  camera.matrixAutoUpdate=false;camera.matrixWorld.makeTranslation(1000,100,3000);camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  assert.ok(camera.position.length()===0,'mirror position remains untouched');
  const after=projectSunDirection(camera,direction,view,clip);
  assert.ok(after.clone().sub(before).length()<1e-12,'translation cannot move a directional sun');
  assert.ok(after.w>0);projectSunDirection(camera,direction.clone().negate(),view,clip);assert.ok(clip.w<0);
});

test("native car shader Vector3 and Color uniforms retain finite linear RGB", () => {
  for (const input of [
    new Color().setRGB(0.2, 0.4, 0.8),
    new Vector3(0.2, 0.4, 0.8),
    [0.2, 0.4, 0.8],
  ])
    assert.deepEqual(
      copyLinearColour(new Color(), input).toArray(),
      [0.2, 0.4, 0.8],
    );
  assert.deepEqual(
    copyLinearColour(new Color(), new Vector3()).toArray(),
    [0, 0, 0],
  );
  assert.throws(
    () => copyLinearColour(new Color(), { x: NaN, y: 0, z: 1 }),
    /finite RGB/,
  );
});
