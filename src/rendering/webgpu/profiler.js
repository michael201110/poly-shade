// Timestamp readback is diagnostic-only; scene colour/depth are never read back.
// Three scene passes and raw post/compute passes share this one query allocator.
export class GPUProfiler {
  constructor(device) {
    this.device = device;
    this.supported = device.features.has("timestamp-query");
    this.samples = new Map();
    this.frame = 0;
    // Keep normal diagnostics sparse. Dedicated benchmarks can set this to 1
    // for a full per-frame distribution; query consumption remains async.
    this.sampleInterval = 12;
    this.slots = [];
    if (this.supported)
      for (let i = 0; i < 3; i++)
        this.slots.push({
          querySet: device.createQuerySet({ type: "timestamp", count: 128 }),
          resolve: device.createBuffer({
            size: 1024,
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
          }),
          read: device.createBuffer({
            size: 1024,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
          }),
          busy: false,
        });
  }
  begin(enabled) {
    this.current = null;
    if (!enabled || !this.supported || ++this.frame % this.sampleInterval !== 0) return;
    const slot = this.slots.find((s) => !s.busy);
    if (slot) {
      slot.names = [];
      slot.used = 0;
      this.current = slot;
    }
  }
  descriptor(name) {
    const s = this.current;
    if (!s || s.used + 2 > 128) return {};
    const start = s.used;
    s.used += 2;
    s.names.push({ name, start });
    return {
      timestampWrites: {
        querySet: s.querySet,
        beginningOfPassWriteIndex: start,
        endOfPassWriteIndex: start + 1,
      },
    };
  }
  end(encoder) {
    const s = this.current;
    if (!s || !s.used) return null;
    s.busy = true;
    encoder.resolveQuerySet(s.querySet, 0, s.used, s.resolve, 0);
    encoder.copyBufferToBuffer(s.resolve, 0, s.read, 0, s.used * 8);
    this.current = null;
    return s;
  }
  submitted(s) {
    if (!s) return;
    void s.read
      .mapAsync(GPUMapMode.READ)
      .then(() => {
        const a = new BigUint64Array(s.read.getMappedRange());
        const frame = new Map();
        for (const { name, start } of s.names) {
          const ms = Number(a[start + 1] - a[start]) / 1e6;
          frame.set(name, (frame.get(name) ?? 0) + ms);
        }
        frame.set(
          "total",
          Array.from(frame.values()).reduce((a, b) => a + b, 0),
        );
        frame.set(
          "reconstruction",
          (frame.get("sgsr2-convert") ?? 0) + (frame.get("sgsr2-upscale") ?? 0) +
            [...frame].filter(([name]) => name.startsWith('fsr-')).reduce((sum, [, ms]) => sum + ms, 0),
        );
        for (const [name, ms] of frame) {
          const arr = this.samples.get(name) ?? [];
          arr.push(ms);
          if (arr.length > 300) arr.shift();
          this.samples.set(name, arr);
        }
        s.read.unmap();
        s.busy = false;
      })
      .catch((e) => {
        this.error = e.message;
        s.busy = false;
      });
  }
  report() {
    return {
      supported: this.supported,
      error: this.error,
      passes: Object.fromEntries(
        [...this.samples].map(([name, a]) => {
          const b = [...a].sort((x, y) => x - y);
          return [
            name,
            {
              samples: a.length,
              median: b[Math.floor(b.length * 0.5)],
              p95: b[Math.floor(b.length * 0.95)],
              p99: b[Math.floor(b.length * 0.99)],
            },
          ];
        }),
      ),
    };
  }
  dispose() {
    for (const s of this.slots) {
      s.querySet.destroy();
      s.resolve.destroy();
      s.read.destroy();
    }
    this.slots = [];
  }
}
