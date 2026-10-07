export class GpuTimer {
  constructor(renderer, capabilities) {
    this.gl = renderer.getContext();
    this.ext = capabilities.timerExtension;
    this.pending = [];
    this.samples = [];
    this.frame = 0;
  }
  begin() {
    if (!this.ext || this.pending.length >= 8 || this.frame++ % 12 !== 0)
      return;
    const gl = this.gl,
      ext = this.ext;
    if (gl.getQuery(ext.TIME_ELAPSED_EXT, gl.CURRENT_QUERY)) return;
    this.active = gl.createQuery();
    gl.beginQuery(ext.TIME_ELAPSED_EXT, this.active);
  }
  end() {
    if (this.active) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.pending.push(this.active);
      this.active = null;
    }
    this.collect();
  }
  collect() {
    if (!this.ext) return;
    const gl = this.gl,
      disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    if (disjoint) {
      for (const query of this.pending) gl.deleteQuery(query);
      this.pending = [];
      return;
    }
    while (
      this.pending.length &&
      gl.getQueryParameter(this.pending[0], gl.QUERY_RESULT_AVAILABLE)
    ) {
      const q = this.pending.shift();
      if (!disjoint) {
        this.samples.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
        if (this.samples.length > 120) this.samples.shift();
      }
      gl.deleteQuery(q);
    }
  }
  metrics() {
    if (!this.samples.length) return null;
    const values = [...this.samples].sort((a, b) => a - b);
    return {
      average: values.reduce((s, v) => s + v, 0) / values.length,
      p95: values[Math.ceil(values.length * 0.95) - 1],
      samples: values.length,
    };
  }
  dispose() {
    if (this.active) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.gl.deleteQuery(this.active);
      this.active = null;
    }
    for (const q of this.pending) this.gl.deleteQuery(q);
    this.pending = [];
  }
}

// Debug-only, non-nested timer queries. Poll availability on later frames.
export class PassProfiler {
  constructor(renderer, capabilities) {
    this.renderer = renderer;
    this.capabilities = capabilities;
    this.timers = new Map();
    this.cpu = new Map();
  }
  measure(name, fn, gpu = true) {
    let timer = this.timers.get(name);
    if (!timer) {
      timer = new GpuTimer(this.renderer, this.capabilities);
      this.timers.set(name, timer);
    }
    if (gpu) timer.begin();
    const start = performance.now();
    try {
      return fn();
    } finally {
      timer.end();
      const values = this.cpu.get(name) ?? [];
      values.push(performance.now() - start);
      if (values.length > 120) values.shift();
      this.cpu.set(name, values);
    }
  }
  scene(fn) {
    this.sceneFrame = (this.sceneFrame ?? 0) + 1;
    if (this.sceneFrame % 2 === 0 || !this.renderer.shadowMap?.render)
      return this.measure("scene-including-shadows", fn);
    const shadowMap = this.renderer.shadowMap,
      original = shadowMap.render,
      profiler = this;
    shadowMap.render = function (...args) {
      return args[0]?.length
        ? profiler.measure("shadows", () => original.apply(this, args))
        : original.apply(this, args);
    };
    try {
      return this.measure("scene-including-shadows", fn, false);
    } finally {
      shadowMap.render = original;
    }
  }
  report() {
    return Object.fromEntries(
      [...this.timers].map(([name, timer]) => {
        timer.collect();
        const a = [...this.cpu.get(name)].sort((a, b) => a - b);
        return [
          name,
          {
            gpu: timer.metrics(),
            cpu: {
              average: a.reduce((s, v) => s + v, 0) / a.length,
              p95: a[Math.ceil(a.length * 0.95) - 1],
              samples: a.length,
            },
          },
        ];
      }),
    );
  }
  dispose() {
    for (const timer of this.timers.values()) timer.dispose();
  }
}
