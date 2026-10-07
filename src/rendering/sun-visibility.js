// Four bytes, asynchronously transferred after a fence signals. Never wait for
// GPU work or synchronously read the scene depth buffer.
export class SunVisibility {
  constructor(renderer) {
    this.gl = renderer.getContext();
    this.result = new Uint8Array(4);
    this.clear = 1;
    this.partial = 1;
    this.frame = 0;
  }
  poll() {
    const g = this.gl;
    if (!this.fence) return;
    const status = g.clientWaitSync(this.fence, 0, 0);
    if (status !== g.ALREADY_SIGNALED && status !== g.CONDITION_SATISFIED)
      return;
    const previous = g.getParameter?.(g.PIXEL_PACK_BUFFER_BINDING) ?? null;
    g.bindBuffer(g.PIXEL_PACK_BUFFER, this.buffer);
    try {
      g.getBufferSubData(g.PIXEL_PACK_BUFFER, 0, this.result);
    } finally {
      g.bindBuffer(g.PIXEL_PACK_BUFFER, previous);
      g.deleteSync(this.fence);
      this.fence = null;
    }
    this.clear = this.result[0] / 255;
    this.partial = this.result[1] / 255;
  }
  capture(sunUv) {
    const g = this.gl;
    if (
      this.lastX === undefined ||
      Math.abs(sunUv.x - this.lastX) + Math.abs(sunUv.y - this.lastY) > 0.015
    ) {
      this.clear = 1;
      this.partial = 1;
    }
    this.lastX = sunUv.x;
    this.lastY = sunUv.y;
    this.poll();
    if (!g.fenceSync || this.fence || this.frame++ % 6 !== 0) return;
    const previous = g.getParameter?.(g.PIXEL_PACK_BUFFER_BINDING) ?? null;
    if (!this.buffer) {
      this.buffer = g.createBuffer();
      g.bindBuffer(g.PIXEL_PACK_BUFFER, this.buffer);
      g.bufferData(g.PIXEL_PACK_BUFFER, 4, g.STREAM_READ);
    } else g.bindBuffer(g.PIXEL_PACK_BUFFER, this.buffer);
    try {
      g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, 0);
      this.fence = g.fenceSync(g.SYNC_GPU_COMMANDS_COMPLETE, 0);
    } finally {
      g.bindBuffer(g.PIXEL_PACK_BUFFER, previous);
    }
  }
  dispose() {
    if (this.fence) this.gl.deleteSync(this.fence);
    if (this.buffer) this.gl.deleteBuffer(this.buffer);
    this.fence = null;
    this.buffer = null;
    this.lastX = undefined;
    this.lastY = undefined;
    this.clear = 1;
    this.partial = 1;
  }
}
