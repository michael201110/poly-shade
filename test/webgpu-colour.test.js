import test from "node:test";
import assert from "node:assert/strict";
import { Color, Vector3 } from "three";
import { copyLinearColour } from "../src/rendering/webgpu/scene.js";

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
