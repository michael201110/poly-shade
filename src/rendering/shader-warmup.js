// Submit cold shader variants through Three's public compile() API while
// KHR_parallel_shader_compile lets the driver compile in the background.
// No polling callbacks retain disposed materials; at most one job per frame.
export class ShaderWarmup {
  constructor(three, renderer) {
    this.three = three;
    this.renderer = renderer;
    this.supported = typeof renderer.compile === "function" &&
      !!renderer.getContext().getExtension?.("KHR_parallel_shader_compile");
    this.jobs = [];
    this.submitted = 0;
  }
  schedule(scene, camera, settings, post, brakes, meshCount, nativeCSM = false) {
    if (!this.supported) return;
    const lights = [];
    if (brakes?.lightPool) lights.push(...brakes.lightPool);
    else for (const { lights: lamps } of brakes?.cars.values() ?? []) lights.push(...lamps);
    if (this.settings === settings && this.meshCount === meshCount && this.nativeCSM === nativeCSM &&
      this.lights?.length === lights.length && lights.every((light, i) => this.lights[i] === light))
      return;
    this.settings = settings; this.meshCount = meshCount; this.lights = lights; this.nativeCSM = nativeCSM;
    this.jobs.length = 0;
    // Brake lights keep a stable visible count, including at zero power.
    // Only the actual configuration needs warming; avoid unused permutations.
    // Native CSM owns mutable scene compilation state, so only warm its post.
    if (!nativeCSM) this.jobs.push({ scene, camera, lights, count: lights.length,
      linear: !!post && settings.postEnabled && settings.postQuality !== "off" });
    if (post && settings.postEnabled && settings.postQuality !== "off") {
      for (const { material, linear } of post.warmupMaterials(settings)) {
        this.jobs.push({ scene: post.scene, camera: post.camera, mesh: post.quad, material, linear });
      }
    }
  }
  run() {
    const job = this.jobs.shift();
    if (!job) return;
    const r = this.renderer, t = this.three;
    const target = r.getRenderTarget(), face = r.getActiveCubeFace(), mip = r.getActiveMipmapLevel();
    const tone = r.toneMapping, output = r.outputColorSpace, material = job.mesh?.material;
    const visible = job.lights?.map((light) => light.visible);
    const parents = new Map();
    try {
      if (job.mesh) job.mesh.material = job.material;
      if (job.lights) job.lights.forEach((light, i) => { light.visible = i < job.count; });
      // PolyTrack can hide the lamp mesh while its emissive state is off.
      // traverseVisible() would then miss its lights even when forced visible.
      for (let i = 0; i < (job.count ?? 0); i++) {
        for (let node = job.lights[i].parent; node && node !== job.scene; node = node.parent) {
          if (!parents.has(node)) parents.set(node, node.visible);
          node.visible = true;
        }
      }
      r.setRenderTarget(null);
      if (job.linear) {
        r.toneMapping = t.NoToneMapping;
        r.outputColorSpace = t.LinearSRGBColorSpace;
      }
      r.compile(job.scene, job.camera);
      this.submitted++;
    } catch (error) {
      // Warming is optional. Actual rendering retains ShaderGuard fallbacks.
      this.jobs.length = 0;
      this.supported = false;
      console.warn("[PolyShade] Background shader warming unavailable.", error);
    } finally {
      if (job.mesh) job.mesh.material = material;
      if (job.lights) job.lights.forEach((light, i) => { light.visible = visible[i]; });
      for (const [node, value] of parents) node.visible = value;
      r.setRenderTarget(target, face, mip);
      r.toneMapping = tone;
      r.outputColorSpace = output;
    }
  }
  report() { return { supported: this.supported, submitted: this.submitted, queued: this.jobs.length }; }
  clear() { this.jobs.length = 0; this.settings = null; this.lights = null; }
}
