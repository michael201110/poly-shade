import test from "node:test";
import assert from "node:assert/strict";

const offsets = [[0, 1], [1, 0], [-1, 0], [0, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
function halton(index, base) {
  let value = 0, fraction = 1;
  while (index > 0) {
    fraction /= base;
    value += fraction * (index % base);
    index = Math.floor(index / base);
  }
  return value;
}

test("SGSR workgroup cache covers the exact clamped source taps at every upscale ratio", () => {
  const output = [3840, 2160];
  for (const scale of [0.77, 0.67, 0.59, 0.5]) {
    const render = output.map((size) => Math.round(size * scale));
    const phaseCount = Math.ceil(8 * (output[0] / render[0]) ** 2);
    const groupColumns = Math.ceil(output[0] / 8), groupRows = Math.ceil(output[1] / 8);
    const sampleColumns = Array.from({ length: 10 }, (_, i) => Math.floor(i * (groupColumns - 1) / 9));
    const sampleRows = Array.from({ length: 10 }, (_, i) => Math.floor(i * (groupRows - 1) / 9));
    for (let phase = 1; phase <= phaseCount; phase++) {
      const jitter = [halton(phase, 2) - 0.5, halton(phase, 3) - 0.5];
      const at = ([x, y]) => {
        const uv = [
          Math.max(0, Math.min(1, (x + 0.5) / output[0] + jitter[0] / render[0])),
          Math.max(0, Math.min(1, (y + 0.5) / output[1] + jitter[1] / render[1])),
        ];
        return [Math.trunc(uv[0] * render[0]), Math.trunc(uv[1] * render[1])];
      };
      for (const groupY of sampleRows) {
        for (const groupX of sampleColumns) {
          const gx = groupX * 8, gy = groupY * 8;
          const first = [gx, gy];
          const last = [Math.min(gx + 7, output[0] - 1), Math.min(gy + 7, output[1] - 1)];
          const firstAt = at(first), lastAt = at(last);
          const origin = [firstAt[0] - 1, firstAt[1] - 1];
          const extent = [lastAt[0] - firstAt[0] + 3, lastAt[1] - firstAt[1] + 3];
          assert.ok(extent[0] <= 10 && extent[1] <= 10, `tile stays within 10x10 at ${scale}, phase ${phase}`);
          assert.ok(extent[0] * extent[1] <= 100);
          for (let y = gy; y < Math.min(gy + 8, output[1]); y++) {
            for (let x = gx; x < Math.min(gx + 8, output[0]); x++) {
              const center = at([x, y]);
              for (const [ox, oy] of offsets) {
                const original = [
                  Math.max(0, Math.min(render[0] - 1, center[0] + ox)),
                  Math.max(0, Math.min(render[1] - 1, center[1] + oy)),
                ];
                const cached = [original[0] - origin[0], original[1] - origin[1]];
                assert.ok(cached[0] >= 0 && cached[0] < extent[0]);
                assert.ok(cached[1] >= 0 && cached[1] < extent[1]);
                assert.deepEqual([origin[0] + cached[0], origin[1] + cached[1]], original);
              }
            }
          }
        }
      }
    }
  }
});
