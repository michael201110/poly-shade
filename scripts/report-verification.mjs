import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { PNG } from "pngjs";
const root = process.env.TEMP + "/polyshade-0.2.1";
await mkdir("docs/images/0.2.1", { recursive: true });
for (const [source, name] of [
  [
    process.env.TEMP + "/polyshade-0.2.1-baseline/cinematic.png",
    "golden-before",
  ],
  [root + "/cinematic.png", "golden-after"],
  [root + "/brake-lights-on.png", "braking"],
  [root + "/arch-partial-volume-on.png", "arch-volume-on"],
  [root + "/arch-partial-volume-off.png", "arch-volume-off"],
])
  await copyFile(source, `docs/images/0.2.1/${name}.png`);
const json = async (path) =>
  JSON.parse(await readFile(process.env.TEMP + path, "utf8"));
const baseline = await json("/polyshade-0.2.1-matched-baseline/benchmark.json");
const final = await json("/polyshade-0.2.1-matched-final/benchmark.json");
const regression = await json("/polyshade-0.2.1/report.json");
const initial = await json("/polyshade-0.2.1-baseline/report.json");
const profile = await json("/polyshade-0.2.1-profile-final/profile.json");
const beforeProfile = await json(
  "/polyshade-0.2.1-profile-baseline/profile.json",
);
const experiments = await json("/polyshade-0.2.1-experiments/experiments.json");
const compact = (x) => ({
  cpuAverage: x.cpuAverage,
  cpuP95: x.cpuP95,
  gpu: x.gpu,
  frames: x.frames,
});
const map = (o, fn) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fn(v)]));
function stats(p, mask = false) {
  const values = [];
  let square = 0;
  for (let i = 0; i < p.data.length; i += 4) {
    const x = (i / 4) % p.width,
      y = Math.floor(i / 4 / p.width);
    if (mask && (y < 360 || (x > 490 && x < 800 && y > 420))) continue;
    const v =
      (0.2126 * p.data[i] + 0.7152 * p.data[i + 1] + 0.0722 * p.data[i + 2]) /
      255;
    values.push(v);
    square += v * v;
  }
  values.sort((a, b) => a - b);
  const q = (p) => values[Math.floor((values.length - 1) * p)];
  return {
    mean: values.reduce((s, v) => s + v, 0) / values.length,
    rms: Math.sqrt(square / values.length),
    p01: q(0.01),
    p10: q(0.1),
    p50: q(0.5),
    p90: q(0.9),
    p99: q(0.99),
    contrast: q(0.9) - q(0.1),
  };
}
const imageMetrics = {};
for (const [name, path] of [
  ["0.2.0 Golden", "/polyshade-0.2.1-baseline/cinematic.png"],
  ["0.2.1 Golden", "/polyshade-0.2.1/cinematic.png"],
  ["0.2.1 Capture", "/polyshade-0.2.1/recording.png"],
  ["Vanilla", "/polyshade-0.2.1/vanilla-before.png"],
]) {
  const p = PNG.sync.read(await readFile(process.env.TEMP + path));
  imageMetrics[name] = { full: stats(p), road: stats(p, true) };
}
const measurements = {
  startingCommit: "bebffb560abad570592f1c2b81567079e634b8dc",
  environment: final.environment,
  initialBaseline: map(initial.presets, compact),
  baseline: map(baseline.presets, compact),
  final: map(final.presets, compact),
  opticsCost: map(final.opticsCost, compact),
  volumetricCost: map(final.volumetricCost ?? {}, compact),
  experiments: map(experiments.experiments, compact),
  baselineProfile: map(beforeProfile.profiles, (p) => p.profile),
  finalProfile: map(profile.profiles, (p) => p.profile),
  resources: map(final.presets, (p) => p.capabilities?.resources ?? null),
  imageMetrics,
  regression: {
    optics: regression.optics,
    volumeStructures: regression.volumeStructures,
    volumetricDriving: regression.volumetricDriving,
    glError: regression.glError,
    brakeGeometry: regression.brakeGeometry,
    transitions: regression.transitions,
    restoration: regression.comparisons.restoration,
    additionalTrack: regression.additionalTrack,
    nativeCSM: regression.nativeCSM,
    nativeCSMCapture: regression.nativeCSMCapture,
  },
};
await writeFile(
  "docs/0.2.1-measurements.json",
  JSON.stringify(measurements, null, 2) + "\n",
);
const f = (n) => (Number.isFinite(n) ? n.toFixed(2) : "n/a");
const delta = (a, b) => f((b / a - 1) * 100) + "%";
const labels = {
  vanilla: "Vanilla",
  "cinematic-lite": "Lite",
  cinematic: "Golden",
  recording: "Capture",
};
const performanceRows = Object.entries(baseline.presets)
  .map(([id, b]) => {
    const a = final.presets[id];
    return `| ${labels[id]} | ${f(b.cpuAverage)} / ${f(b.cpuP95)} | ${f(a.cpuAverage)} / ${f(a.cpuP95)} | ${delta(b.cpuAverage, a.cpuAverage)} | ${f(b.gpu?.average)} / ${f(b.gpu?.p95)} | ${f(a.gpu?.average)} / ${f(a.gpu?.p95)} | ${delta(b.gpu?.average, a.gpu?.average)} |`;
  })
  .join("\n");
const profileRows = Object.entries(profile.profiles)
  .flatMap(([id, p]) =>
    Object.entries(p.profile).map(
      ([name, x]) =>
        `| ${labels[id]} | ${name} | ${f(x.cpu.average)} / ${f(x.cpu.p95)} | ${f(x.gpu?.average)} / ${f(x.gpu?.p95)} |`,
    ),
  )
  .join("\n");
const imageRows = Object.entries(imageMetrics)
  .map(([name, m]) => {
    const x = m.road;
    return `| ${name} | ${f(x.mean)} | ${f(x.rms)} | ${f(x.p01)} | ${f(x.p10)} | ${f(x.p50)} | ${f(x.p90)} | ${f(x.p99)} | ${f(x.contrast)} |`;
  })
  .join("\n");
const opticsRows = Object.entries(final.opticsCost)
  .map(
    ([name, x]) =>
      `| ${name} | ${f(x.cpuAverage)} / ${f(x.cpuP95)} | ${f(x.gpu?.average)} / ${f(x.gpu?.p95)} |`,
  )
  .join("\n");
const volumeRows = Object.entries(final.volumetricCost ?? {})
  .map(
    ([name, x]) =>
      `| ${name} | ${f(x.cpuAverage)} / ${f(x.cpuP95)} | ${f(x.gpu?.average)} / ${f(x.gpu?.p95)} |`,
  )
  .join("\n");
const poolRows = Object.entries(final.presets)
  .filter(([, p]) => p.capabilities?.resources)
  .map(([id, p]) => {
    const ts = p.capabilities.resources.targets;
    return `| ${labels[id]} | ${ts.length} | ${f(ts.reduce((n, t) => n + t.pixels, 0) / 1e6)} | ${f(ts.reduce((n, t) => n + t.estimatedBytes, 0) / 1048576)} |`;
  })
  .join("\n");
const size = (await readFile("0.2.1/main.mod.js")).length;
const doc = `# PolyShade 0.2.1 verification

Starting commit: \`bebffb560abad570592f1c2b81567079e634b8dc\`. The initial 32 tests and unmodified 0.2.0 live route passed before optimizations. Fresh initial and longer matched baseline data, experiments, pass profiles and regression data are recorded in [measurements](0.2.1-measurements.json).

## Conditions and performance

Official PML 0.6.3, headless Microsoft Edge (${final.environment?.browser ?? "same installed Edge"}), Windows x64, fresh profiles, native 1280 x 720 canvas, Summer 1 starting camera. Lite/Golden scene: 1280 x 720; Capture: 1600 x 900. Same machine/browser/route for both builds; no simultaneous browser benchmarks. Each matched preset gets 2 seconds warm-up and 6 seconds sampling. GPU queries are asynchronous, sampled every twelfth frame; disjoint results are discarded. Vanilla GPU timing is test-only. CPU measures renderer submission, including driver waits, rather than whole game/simulation time. Short samples and host scheduling introduce noise; these are observations, not universal FPS promises.

Numbers are milliseconds, **average / p95**. Negative deltas mean reduced time.

| Preset | 0.2.0 CPU | 0.2.1 CPU | CPU avg delta | 0.2.0 GPU | 0.2.1 GPU | GPU avg delta |
| --- | --- | --- | --- | --- | --- | --- |
${performanceRows}

Capture CPU submission regressed in the longer comparison despite cheaper GPU rendering. This also appeared in the original MSAA-only experiment before the new visibility/volumetric features: Capture CPU was 9.66 ms at four samples versus 13.75 ms without scene MSAA. Do not describe this release as a universal CPU improvement. Driver backpressure/scheduling may contribute, but the cause has not been isolated. CPU submission excludes the renderer pre-hook and simulation. Golden and Lite are the gameplay choices; Capture retains heavier shadows and supersampling.

## Profile and optimization decisions

The initial diagnostic profile found scene/shadows dominating: approximately 12.16 ms GPU for Golden and 26.74 ms for Capture, excluding MSAA resolve; grade was 1.22 / 2.67 ms and finish 0.62 / 0.93 ms. AO was 0.21 / 0.46 ms, bloom extraction 0.57 / 0.93 ms, and rays 0.26 / 0.69 ms. Those initial scene/grade histories include earlier presets; use them to identify scale, not as matched total timings. Current diagnostics reset when settings change. Scene/shadow GPU queries alternate to avoid nesting; debug-only resolve timing explicitly measures the attachment resolve. Environment CPU generation is separate from native PMREM GPU work inside scene rendering.

| Preset | Current pass | CPU avg / p95 | GPU avg / p95 |
| --- | --- | --- | --- |
${profileRows}

- **Scene MSAA:** actual 4/2/0 comparisons and screenshots were captured before selecting defaults. Golden GPU: 13.44 / 13.83 / 8.78 ms; Capture: 29.43 / 30.25 / 24.27 ms in that experiment. Two samples did not save useful time on this implementation. Auto now omits scene MSAA, using FXAA for Lite/Golden and 1.25x supersampling for Capture. Native context antialiasing remains untouched; manual sample selection is available. Some diagonal edge response differs; inspected screenshots remained clean enough for the stylized geometry.
- **Full-resolution traffic:** Capture now grades directly to output by default. The former subtle sharpening pass is optional, preserving its control and saved overrides. Its removal saves the intermediate target and finish pass while 1.25x supersampling, high AO, environment and 4096 shadows preserve the Capture quality tier. If FXAA or sharpening is enabled, grading remains before neighbourhood filters on an output-sized intermediate, with one tone map and one output conversion. HDR filtering before output-sized grading differs mathematically from grading each supersampled pixel first; inspected highlights/edges remained restrained.
- **AO:** byte targets halve AO colour storage versus half float, and blur depth uses scalar inverse-projection reconstruction instead of full position reconstruction for every tap. Both bilateral passes remain. High AO keeps 16 samples: it is a comparatively small cost, so quality was retained rather than cutting samples without a convincing visual/performance case.
- **Bloom/rays:** Capture's auxiliary buffers now use output-based dimensions. Both cheap bloom blur stages remain. Their cost was small enough that dropping one did not justify a shape change. No reduced-shadow-resolution or static shadow caching was adopted: moving cars/shadows and the existing near-cascade quality are preserved.
- **Sun relevance:** one shared 1 x 1 depth mask replaces repeated per-pixel sun probes. Four-byte asynchronous feedback skips ray rendering at fully clear/hidden suns; the current GPU mask rejects blocked contributions immediately. Disabled/zero-strength/behind/offscreen cases skip work, and unused targets/PBO/fences are disposed. Flare stays inside grade, with no full-resolution target.
- **Resources:** compatible sizes reuse target objects; incompatible sample/depth changes dispose attachments. Zero-strength AO/bloom/rays release their targets. Environment updates remain settings-cached, not cloud-time driven. Material colour synchronization and native moving-shadow updates remain intact because no measured case justified weakening them. Shader strings are prepared once rather than replaced every frame.

## Brake light correction

0.2.0 attached up to six unshadowed PointLights to the lamp geometry, producing spherical spill. 0.2.1 discovers the actual game SpotLight export by semantic class signature. Live PML reports SpotLight supported. Two cones use the BrakeLight geometry centre/width and averaged vertex normals; the normal's horizontal rear direction is retained and its vertical component biased downward. Both light and target use mesh-local coordinates, following arbitrary car rotation/banking/inversion. Angle: 45 degrees; penumbra: 0.7; decay: 2; default power: 1.5; reach: 2.5; no shadow maps.

Only the three nearest opaque cars receive lamps. Per-frame distance/frustum and visible native-emissive checks suppress irrelevant cars. Ghosts are excluded; targets/lights are removed together on pruning, disable and track changes. Missing SpotLight keeps native emissive lamps with a diagnostic and disables spill rather than restoring omnidirectional lighting. Unit tests verify rotated cone direction and target disposal. Actual driving/braking screenshots show a compact red patch behind/below the rear lamps, without a forward puddle.

## Tonal calibration and visual regression

Controlled captures covered lighting only, then environment, atmosphere, AO, bloom, rays and grade, plus two calibration candidates. The additive 0.012 shadow lift was the clearest cause of raised dark surfaces; ambient 0.85 and exposure 1.1 further softened separation. Atmosphere contributed at distance; bloom/rays were comparatively small and not the main frame-wide cause. Contrast previously raised individual channels around 0.18; it now scales colour using a luminance pivot, preserving hue. Golden/Capture use exposure **1.04**, ambient **0.80**, contrast **1.045**, shadow lift **0.004**, black level **0.003**, atmosphere strength **0.13**, start **80**. Saturation/vibrance and sky/cloud shader/palette remain unchanged. Saved explicit overrides are preserved.

The inspected A/Bs retain cream roads, cool readable shadows and bright broad clouds. Dark barriers/tires separate better; the picture is not deliberately made orange or heavily saturated. Golden/Capture share tonal settings; quality and the explicitly requested slightly stronger Capture optics differ. Lite retains its lighter fill/exposure, omits expensive world effects and uses FXAA.

Captured images: [0.2.0 Golden](images/0.2.1/golden-before.png), [0.2.1 Golden](images/0.2.1/golden-after.png), [braking](images/0.2.1/braking.png), [arch scattering on](images/0.2.1/arch-volume-on.png) / [off](images/0.2.1/arch-volume-off.png). Clouds animate, so these are visual comparisons rather than exact frame-matched pixel differences. The arch effect is deliberately faint at default strength.

Metrics below use display-code luminance in [0,1], a fixed stable road region excluding sky and the animated car. Full-frame metrics are also in JSON. RMS here is RMS luminance, not image error. Quantiles and p90-p10 measure separation; they do not replace visual assessment.

| Image | Mean | RMS | p01 | p10 | p50 | p90 | p99 | p90-p10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${imageRows}

## Optional optics and costs

Rays and flare share the procedural sun projection and depth mask. Actual scene silhouettes were used for visible/partial/fully blocked/behind-camera/low-sun/open-sky screenshots. Clear sky skips rays; partially blocked sun enables shafts; fully blocked and behind-camera cases suppress both. Three soft ghost rings have mild RGB separation confined to the flare itself, with restrained optional streak/glow. Flare adds no full-frame chromatic aberration or separate rendering pass. Strength controls can make effects stronger; defaults deliberately stay subtle and preserve road/car readability.

These on/off samples use the same low-sun starting camera and longer sampling; changes include normal run noise and should not be interpreted as isolated instruction costs.

| Preset optics | CPU avg / p95 | GPU avg / p95 |
| --- | --- | --- |
${opticsRows}

## Optional volumetric sunlight

The user's follow-up explicitly added this feature to the optimization release. It is separate from flare and radial streaks: a quarter-resolution pass integrates 4-16 deterministic camera-ray slices, with two depth-tested sunlight probes per slice, exponential density and decay. The default is 8 slices, strength 0.045, density 0.006, decay 0.96 and maximum visible distance 80. Integration ends at the surface/max distance, so it does not accumulate behind visible solids. Soft depth comparison and four-tap depth-aware upsampling reduce stepping and edge spill; no random grain or temporal history is used.

The existing sun, depth and visibility mask are reused, including the same procedural cloud density/transmission formula and clock as the unchanged sky. Partially occluded geometry gives the strongest contribution; fully clear sky is subdued, and fully blocked/behind-camera cases skip it. Lite/Golden default off; Capture defaults on subtly. Active volumetric shafts replace the radial shaft pass and reduce aerial perspective by 20%. All six controls are exposed. Fully disabled/zero-strength/zero-density/irrelevant conditions allocate no volume target.

Actual PML screenshots cover open sky, partial/full/behind-camera occlusion, driving and camera motion. A controlled arch/lintel fixture was also rendered in the real PML scene to isolate gap/partial/bridge-blocked cases, then removed and disposed. These fixtures are graphics-only harness objects, not native track architecture or shipped assets; track collision/geometry and simulation were untouched. The effect has no history to leave ghost trails. Low strength and smooth deterministic slices kept the inspected road/geometry readable, with no obvious grain or large white beams.

| Volumetric setting | CPU avg / p95 | GPU avg / p95 |
| --- | --- | --- |
${volumeRows}

These matched low-sun samples include the automatic atmosphere adjustment; small GPU differences are within run noise. The dedicated pass cost is shown in the per-pass table. No claim of zero cost is made. Screen-space depth cannot reconstruct hidden/offscreen occluders or physical 3D clouds; offscreen light probes attenuate, and far occluders beyond the two tested distances can be missed. This is a restrained scattering approximation, not a world volumetric solver.

## Resources and live regressions

| Preset | Live pooled targets | Target megapixels | Estimated attachment MiB |
| --- | --- | --- | --- |
${poolRows}

Estimates count colour/depth/MSAA attachments, not driver padding, shadow maps, PMREM or total GPU memory. 0.2.0's equivalent pooled estimate was about 59.82 MiB Golden and 93.47 MiB Capture. Local shadow maps remain 1024/2048/4096; native CSM Golden was 2048 x4, Capture 4096/4096/2048/2048. Current target dimensions and bytes are recorded individually in JSON.

Three Lite/Golden/Capture/Vanilla/Golden/Capture cycles and three disable/enable cycles passed. Summer 2 counts plateaued: 51 tuned meshes, one sky, two brake lights and two targets while enabled; zero owned sky/brake objects in Vanilla. Renderer texture counts repeated 13 Lite / 18 Golden-Capture / 7 Vanilla, without monotonic growth. Logical target allocations minus disposals equal live targets; compatible dimension changes dispose GPU attachments through Three's setSize and are counted as resizes.

F7 restored original material/environment/background/renderer identities and native resolution; stable road restoration error was ${f(regression.comparisons.restoration.meanAbsolute)} RGB levels. Resize to 1024 x 640 and back, driving/braking, native cockpit toggle, longer acceleration, restart, Summer 1/2/3, CSM and re-enable passed. Additional Summer 3 contained ${regression.additionalTrack.meshes} native meshes / ${regression.additionalTrack.vertices} vertices. No PolyShade shader failures or uncaught exceptions occurred. Native PMREM compiler precision/division warnings also appeared in the 0.2.0 baseline, with successfully linked programs; they are not new mod shader failures.

37 Node tests pass, including sample-change disposal, size reuse, zero-strength/direct-output pass behavior, pending-fence nonblocking cleanup, SpotLight fallback, native-emissive behavior, rotated lamps and settings preservation. npm test, build, check, live verification and git diff --check passed. The bundle is **${size} bytes** (${f(size / 1024)} KiB), self-contained except the PML host base-class import. Previous release directories remain unchanged. Commit/remote SHA and final clean worktree are verified after publishing and reported with the release.

Artifacts: %TEMP%/polyshade-0.2.1/ (regression screenshots/report), -baseline (initial unmodified route), -experiments (MSAA/calibration), -profile-baseline / -profile-final (diagnostics), -matched-baseline / -matched-final (long comparisons). Multiplayer/PolyBot integration and exhaustive tracks were not tested. No game physics, controls, worker, timing, replay, message or camera-transform code was changed.
`;
await writeFile("docs/0.2.1-verification.md", doc);
console.log("Wrote verification report and measurements.");
