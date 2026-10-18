# Temporal jitter stability investigation

Status: three integration errors reproduced and corrected; all 44 stationary
configurations pass on the final artifact. Additional qualification and measured
limits are recorded below. Stable latest remains unchanged.

The user's clarification was **fine temporal shimmer** (small edge pixels
flickering/crawling), visible both stopped and moving, in **Final** on both
upscalers. Whole-image translation alone was therefore insufficient evidence.
We measure local edge luminance variance as well as geometric displacement.

## Reproduced causes

1. **Jitter-dependent false static velocity.** The static velocity shader
   reconstructed far world positions, divided by homogeneous W, then projected
   them with another f32 matrix. Cancellation/rounding generated apparent
   physical motion in a frozen scene. We now compose current clip to previous
   clip in CPU double precision, then apply that matrix once in WGSL. The
   existing separate jitter cancellation is retained. Sky uses the projection's
   infinite-depth direction, preserving translation-free sky reprojection.
   No motion threshold, jitter reduction, zero-motion override or history
   disable was introduced.
2. **SGSR2 geometry history sampled the wrong surface at silhouettes.** Its
   extra geometry rejection path selected one nearest old depth/coverage texel
   even though the reprojected position straddled old raster texel centres.
   Jitter could switch that sample between car and road, rejecting valid stable
   colour history. The correction tests the actual 2x2 bilinear footprint for
   compatible depth and surface coverage. It preserves the original moving-car
   neighborhood exclusion, outside-image rejection, fresh/teleported-object
   rejection and depth tolerance. It does not disable disocclusion rejection.
3. **FSR MRT reactive coverage ignored transparent fragment alpha.** The mask
   output used alpha **1**, independently of the colour output's alpha.
   Consequently invisible areas of transparent contact-shadow quads wrote full
   reactivity. At a flickering tire/road edge the measured mask was **1.0**;
   another nearby point was **0.9804**. The mask now outputs `diffuseColor.a`
   so attachment blending uses actual fragment coverage. The same points became
   **0** and **0.0157**. Reactivity math and AMD's reconstruction shaders are
   unchanged. A real Three/WebGPU MRT regression checks invisible, half-opacity
   and opaque geometry: mask R is respectively **0, 0.2471, 0** (R8 quantization).

There was also an independent FSR host-contract mismatch: its phase count used
`ceil` where AMD truncates. FSR now uses `floor` on the positive area-ratio
expression; SGSR2 retains its existing schedule. This was not claimed as the
main shimmer cause. PolyTrack's **T** restart is now an explicit history reset;
the listener only invalidates renderer history and never intercepts input.

## Initial matched 720p / 50% evidence

Golden Hour, stationary real game/car/camera, full effects, Final, complete
32-sample cycle after 72 warmup renders. Both use the same sampling amplitude.
Values below distinguish interim diagnostics from final-matrix qualification.

| Measurement | Before | Corrected candidate |
|---|---:|---:|
| SGSR2 whole-region X displacement SD, output pixels | 0.05963 | 0.01443 |
| SGSR2 car-region X displacement SD, output pixels | 0.09711 (isolated baseline) | 0.01638 |
| SGSR2 high-contrast edge luminance SD, mean | 5.103 | 2.352 |
| SGSR2 high-contrast edge luminance SD, p99 | 48.639 | 15.041 |
| FSR whole-region X displacement SD, output pixels | 0.00932 | 0.00262 |
| FSR high-contrast edge luminance SD, mean | 1.258 | 0.737 |
| FSR high-contrast edge luminance SD, p99 | 15.173 | 3.711 |
| Frozen-scene velocity RMS, output pixels | 0.01620 | 0.000461 |

Luminance is in 8-bit display-code units. Edge pixels are selected by a fixed
gradient threshold within the same geometric region; slight changes in the
first reconstructed image change the exact edge-mask count, so these are not
claims of a byte-identical mask across variants. Native consecutive captures
were byte-identical. The raw jittered control had X/Y displacement SD
**0.372/0.420** pixels and jitter correlations **0.980/0.999**, confirming that
the displacement probe detects the intended internal raster movement.

Each build freezes its captured initial game pose independently. These figures
compare temporal variation within each run in the same normalized regions;
they are not a byte-aligned before/after image subtraction across builds.

Displacement is an aggregate gradient fit, not a claim that an individual
8-bit edge is located with thousandth-pixel accuracy. A high dimensionless
correlation can remain when the fitted amplitude is tiny (for example 0.001
pixel SD); the coefficient alone is not visible camera motion or a percentage
of failed compensation. Both its amplitude and local edge flicker are retained.

These measurements demonstrate reduced shimmer, not a guarantee that every
subpixel feature becomes temporally constant. Residual thin-feature variation
is recorded rather than removed with blur or reduced jitter.

The original SR preview is `0.6.0-fsr31.0`; this experimental snapshot is
`experiment/fsr31-webgpu`, version `0.6.0-fsr31.1`, which also contains the
FG implementation. Stable PML latest is 0.5.6. The main worktree has
pre-existing, uncommitted performance-study work and is being preserved.

The pre-fix candidate was copied to a temporary immutable comparison artifact:
SHA-256 `b987c87ae238b7e77838cb066ecd77a73c31b6f04eb5bddf36ebdbea0f383cf2`.
No historical release bundle is overwritten.

## References

- Qualcomm SGSR2 v2, pinned commit
  `d926f074bcb9d714e179f1ce0fcb9ee2eeb5074e`,
  [`glsl_2_pass_cs`](https://github.com/SnapdragonGameStudios/snapdragon-gsr/tree/d926f074bcb9d714e179f1ce0fcb9ee2eeb5074e/sgsr/v2/include/glsl_2_pass_cs).
  Exact source shaders are vendored in `src/vendor/sgsr2`.
- AMD SDK v2.3.0, commit `60f4ea81909200d8542eca14dccb2628b763a9a3`,
  SR 3.1.5. Exact host/shader sources are in `vendor/fidelityfx`.
- Three.js 0.181.2 WebGPU renderer source installed by the pinned dependency.

## Current sequence and units audit

The existing sequence is Halton bases 2 and 3, each recentered by subtracting
0.5, at index `(realSequence % phaseCount) + 1`. It uses render pixels, with
an intended amplitude of less than half a render pixel on each axis.
SGSR2's phase count is `ceil(8 * (outputWidth/renderWidth)^2)`; FSR now truncates
that expression as required by AMD's host reference. Qualcomm's shader accepts a centered Halton
offset and uses render-size reciprocals to locate the jittered source.

| Value | Units / current convention | Consumer |
|---|---|---|
| `temporal.jitter` | Render pixels; intended +X right, +Y down | Projection, SGSR2, FSR |
| `previousJitter` | Previous actual rendered frame's render pixels | Reprojection |
| `jitterUV.xy` | Current jitter / internal render dimensions | Physical velocity removal, geometry history |
| `jitterUV.zw` | Previous jitter / internal render dimensions | Same |
| Static/car/swarm velocity XY | Unjittered current-minus-previous NDC; +Y up | Motion blur, temporal adapters |
| SGSR2 motion | Same NDC; previous UV = current UV + `(-vx,+vy)/2` | Stable color history |
| Previous geometry UV | Raster UV - current jitter UV + physical previous offset + previous jitter UV | Depth/coverage rejection |
| AMD motion | Previous-minus-current UV, +Y down; scale `(-.5,+.5)` | SR and FG |
| Depth | Finite WebGPU [0,1], sampled at actual raster texel centers | Motion/depth/temporal passes |

For a perspective camera, column-major projection entries 8/9 are adjusted by
`(-2*jx/renderWidth, +2*jy/renderHeight)` in WebGPU. Dividing clip XY by `-viewZ`
then mapping NDC to top-down image coordinates should shift raster geometry by
`(+jx,+jy)` render pixels. The sequence verifier records the actual matrix at
the scene draw to test that relationship and detect any later overwrite.

SGSR2's current-color lookup uses `outputUV + jitter/renderSize`; its source
kernel subtracts the same render-pixel jitter. Stable color-history reprojection
excludes the raster jitter delta; geometry-history lookup includes that delta
because the geometry history remains in the jittered low-resolution grid.
These are distinct coordinate spaces, not two applications to the same lookup.

## Existing update order being tested

1. Synchronize the source scene/camera into the renderer-owned mirror.
2. Prepare shadows using the unjittered camera.
3. Save the current unjittered projection and inverse.
4. Detect history cuts, select one jitter sample and apply it to the mirror.
5. Render the real scene color/depth.
6. Produce static, car and swarm physical velocity and depth/coverage history.
7. Grade and reconstruct with SGSR2 or FSR.
8. Present the reconstructed image (or feed FG its real reconstructed surface).
9. Submit and commit the current state as the previous rendered state.
10. Restore the renderer-owned camera projection in `finally`.

FG presentation-only callbacks return before temporal begin/commit and do not
advance its sequence. Jitter is not applied to the source gameplay camera.

## Consecutive-frame regression

`scripts/verify-jitter.mjs` freezes a real PML game scene and camera, disables
unrelated animation for diagnosis, warms history, and captures a complete
jitter cycle from the presented WebGPU canvas. Test-only GPU readbacks occur in
the verifier, with no synchronization added to production rendering.

The verifier records per-frame jitter, history state, actual raster-projection
offset, and any projection overwrite during the scene draw. It fits static-edge
displacement against a fixed reference using image gradients, records frame
differences, and correlates displacement with each jitter axis. The initial
acceptance threshold is 0.1 output pixel displacement standard deviation for
the measured stable edge region. Thin/disoccluded features need additional
regional probes if a whole-region fit hides local motion.

`JITTER_RECORD_ONLY=1` records a failing pre-fix baseline without weakening the
normal assertion. `JITTER_RAW=1` selects the existing low-resolution debug view
to prove that the internal raster does move. Both are verifier controls, not a
production workaround. Full-cycle PNGs and JSON are stored in the temporary
`polyshade-jitter-<label>` directory.

`JITTER_AXIS=x/y/zero` is test-only axis isolation; `JITTER_FPS` controls the
logical temporal timestep. GPU readback/encoding time is excluded from that
clock, so it must not be reported as a measured real rendering or monitor rate.
`JITTER_PROBES=1` samples physical velocity and rejection/reactivity on the GPU.
`scripts/jitter-flicker.mjs` measures per-pixel luminance variance, including
high-contrast edges that a whole-image motion fit can average away.

Each lossless PNG is decoded and its full RGBA SHA-256 compared against the
actual GPU readback. Capture encoding does not alter screenshot pixels.
Production rendering contains no readback or awaited GPU fence.

## Diagnostics in the candidate

Detailed diagnostics expose the real-frame index, jitter index/length, current
and previous render-pixel jitter, delta, UV and NDC jitter, render/output sizes,
history validity and reset reason. Existing DOM metric updates are throttled
to once per second; `TemporalState.report()` supports per-render test capture.
The **source-vs-final** debug view shows the actual graded jittered source on
the left and reconstructed output on the right. It adds no extra scene render
or temporal advancement. Each half shows the complete view, compressed
horizontally to fit. Final presentation remains on its stable output grid.
Use FG off for an exact source/reconstruction pair; FG has its own real/generated
debug views and separate presentation timeline.

## Additional qualification findings

The full regression run exposed a Golden Hour sky-parity failure against the
archived renderer. Fixing the camera-copy harness alone did not resolve it
(cinematic error remained approximately 9.74 display codes). The GPU shaft/
volumetric path had lost the reference host's **partial sun occlusion** gate,
adding a veil even with a completely unobstructed sun. Restoring that gate
reduced the sky error to **0.150** codes; all four preset comparisons were below
**0.20**, with the existing five-code limit unchanged. Golden Hour effects
remain enabled and operate during partial occlusion. This restores reference
behavior without selecting a lower-quality preset.

Sun projection also used a finite point offset by the mirror camera's stale
`.position` field. It now projects a homogeneous world direction, matching the
reference and making it independent of camera translation. A regression checks
authoritative world matrices with untouched position metadata. This independent
coordinate error was not claimed as the main tire-shimmer cause.

The archived live verifier initially loaded stable latest while reporting that
it tested 0.4.0, then waited for a legacy counter absent from the newer backend.
Its manifest routing now pins the reported reference release. Candidate harness
defaults likewise select the actual package-version build, not an older preview.

A later **FSR + swarm** check found another real integration error: the first
lazy skid-strip `MeshBasicNodeMaterial` had no reactive MRT output. WebGPU
rejected attachment 1 and FSR fell back. Skid materials now inherit the mirror's
MRT node when created, and existing strips update on mode transitions along
with car materials. The update runs only when the MRT state changes; there is
no new per-frame traversal. A new unit regression covers pre-existing strips,
late strips, repeated unchanged state and return to Native. The failed run is
retained in `pre-skid-final-checks.json` / `pre-skid-swarm-failure.json`; the
subsequent release checks qualify the corrected bundle.

## Before/after image evidence

These are lossless crops from consecutive GPU readbacks, enlarged with nearest
neighbor solely to expose pixel changes. The full-cycle animations retain all
32 phases; the contact sheets show phases 0, 8, 16 and 24. Neither the runtime
nor capture pipeline blurs or reduces jitter.

- [SGSR2 complete-cycle comparison](verification/jitter/sgsr2-compute-50-cycle.png)
- [SGSR2 phase contact sheet](verification/jitter/sgsr2-compute-50-phases.png)
- [FSR complete-cycle comparison](verification/jitter/fsr31-50-cycle.png)
- [FSR phase contact sheet](verification/jitter/fsr31-50-phases.png)

The corrected tire/contact edges are substantially steadier. Residual subpixel
reconstruction differences remain, especially in SGSR2; this is a reduction in
the reproduced dust-like shimmer, not a claim of perfectly invariant temporal
pixels or equivalence to Native.

## Reproduction and interpretation

```powershell
npm ci
npm run check
npm run verify:jitter
node scripts/verify-jitter-controls.mjs
node scripts/verify-jitter-cadence.mjs
node scripts/verify-fsr-stack.mjs
node scripts/profile-jitter-matrix.mjs
node scripts/profile-jitter-100.mjs
node scripts/report-jitter-performance.mjs
node scripts/profile-jitter-outlier.mjs
node scripts/verify-jitter-release.mjs
python scripts/jitter-artifacts.py
```

Run GPU suites **serially**, with no other benchmark/game instance competing.
The final qualifier captures all four resolutions. Its swarm stage expects
local PolyBot replay fixtures in `%TEMP%/polyshade-perf/swarm-{1,100,500}.jsonl`
and a PolyBot checkout (`POLYBOT_ROOT` can override the local default).
The controls/profile helpers use the saved
pre-fix candidate when available, otherwise the immutable `.0` SR preview;
reports retain the actual hash, so these different baselines cannot be confused.

The per-edge flicker thresholds are fixture regressions, not a universal human
perception model: SGSR2 edge-luminance SD mean <3.5 and FSR edge p99 <8 display
codes, alongside displacement SD <0.1 output pixel. Both old 50% paths fail
their respective flicker limit. Native captures must be byte-identical.

Cadence tests separately measure admitted real-render wall time. Test-only
deadline admission produces roughly 15/30/60 FPS; uncapped test browser flags
permit >60. Logical 15/30/120-FPS capture clocks test how long jitter/history
states persist without counting PNG readback delays as rendering performance.
The first cadence attempt recorded cold FSR startup and limiter drift; the
corrected harness waits for 60 actual selected-mode frames and uses deadlines.
That failed attempt is retained in `cadence-first-attempt.json`. No production
reset rule or browser setting was changed to obtain the pass.

## Requested 21-point audit

| # | Question | Finding |
|---:|---|---|
| 1 | Was the visible problem reproduced? | Yes: stationary tire/road silhouettes flickered through the jitter cycle. Local luminance variance detected the issue even when whole-image displacement was below 0.1 pixel. |
| 2 | Exact root cause? | False physical velocity from f32 world-space cancellation; wrong SGSR2 geometry-history footprint at silhouettes; forced-alpha FSR reactive-mask writes from transparent quads. Each was isolated with GPU probes. |
| 3 | Wrong amplitude? | No. The centered Halton amplitude was retained. |
| 4 | Wrong render/output normalization? | No global ratio error was found. Jitter stays in render pixels; both adapters normalize with actual internal dimensions. |
| 5 | Wrong Y sign? | No. Axis-isolation controls, actual raster matrix capture and moving-camera tests agree with the documented top-down UV conversion. |
| 6 | Applied twice? | Not in the final presentation. Raster geometry and color/geometry histories intentionally use their distinct coordinate spaces. Final grading/presentation does not reapply jitter. |
| 7 | Missing reprojection jitter? | Cancellation was present, but false f32 motion contaminated it. The composed clip transform fixes numerical conditioning without deleting jitter terms. |
| 8 | Wrong motion units? | No global unit mismatch found: current-minus-previous NDC with explicit adapter scale to AMD UV. |
| 9 | Wrong motion direction? | No global direction reversal found. Synthetic signed/diagonal motion and camera-motion probes remain required. |
| 10 | Wrong pixel centre? | Yes in SGSR2's extra geometry rejection path: a nearest sample did not represent the old raster's bilinear footprint. Texel-centred 2x2 compatibility corrects it. |
| 11 | Jitter-correlated rejection? | Yes at stationary car edges. Frozen-car rejection fell from up to 4.48% to 0% in the isolated footprint probe. Moving-car neighborhood rejection remains active. |
| 12 | Jittered matrices stored as unjittered? | No. Separate projection/VP state is retained; actual draw-time matrices are checked and restored in finally. |
| 13 | Auxiliary renders advancing jitter? | No extra temporal loop was added. Commit happens only after a submitted real scene render. Presentation-only FG calls are explicitly instrumented by the live regression. |
| 14 | Code changed? | Temporal diagnostics/phase count, static-velocity shader and uniform mapping, SGSR2 geometry footprint, FSR MRT alpha, T-restart invalidation, diagnostic view, plus the independently found sun projection/gate corrections. Full FG implementation is documented separately. |
| 15 | Final sequence/amplitude? | Halton bases 2/3, index `(realSequence % phases)+1`, subtract 0.5. Less than half an internal pixel per axis. SGSR2 ceil and AMD floor of `8*(outputWidth/renderWidth)^2`. |
| 16 | Measured movement? | Matched 720p/50% whole-region X SD: SGSR2 0.05963→0.01443 px; FSR 0.00932→0.00262 px. Edge luminance p99: 48.639→15.041 and 15.173→3.711 codes respectively in the isolated comparison stages. Final artifact results are linked below. |
| 17 | Visual result? | Tire-edge speckle and breakup are markedly reduced in the lossless complete-cycle comparisons. No blur, zero jitter, reduced amplitude or disabled history is shipped as a fix. |
| 18 | GPU impact? | Measured with actual pass timestamps during headed gameplay; see the matched performance section and hash-bearing JSON. Hardware clock variation prevents interpreting every total-time difference as a shader optimization. |
| 19 | All scales? | Native plus temporal 100/77/67/59/50% are covered at 720p/1080p/1440p/4K. Complete-cycle final results include hashes and per-case maxima. |
| 20 | Moving objects/camera? | Existing camera/FOV, independent car/swarm velocity, newly revealed road, history-cut and live-input tests remain part of qualification. Ghost state is renderer-only; FG changes neither game physics nor replay time. |
| 21 | All tests? | The final qualification section records every suite, failure discovered along the way, rerun and final outcome. Synthetic tests alone are not called visual or performance acceptance. |

### Shadows and post coordinates

Shadow preparation/cache keys use the unjittered mirror camera before temporal
begin; jitter does not mutate gameplay or shadow cameras. AO, depth-based
scattering, bloom and pre-reconstruction grading sample the actual jittered
raster attachments. Physical velocity excludes sampling jitter. Reconstruction
produces stable output-space color; FINISH applies transfer/debug/filtering on
that output grid. The source comparison is diagnostic only. No normal rendering
path gained a blocking GPU fence, image readback or CPU history decision.

## GPU cost and existing-suite results

The [matched gameplay table](verification/jitter/gameplay-performance.md) lists
Native and both temporal paths at every requested scale/resolution, with
[every named pass delta](verification/jitter/gameplay-pass-deltas.json).
Measurements use Golden Hour, ordinary acceleration/steering and FG off.
They include the independent sun-gate correction, so a total-time reduction
cannot be attributed solely to the temporal fixes.

For the matched 4K/50% traces, SGSR2 total GPU median was **19.071→18.809 ms**;
its static-velocity pass stayed **0.328 ms**, convert was **1.704→1.966 ms**,
and upscale **6.226→6.357 ms**. The extra footprint checks are not free, but
the measured change is sub-millisecond. Rays fell **1.507→0.328 ms** with the
reference clear-sun gate. FSR total was **48.824→48.693 ms**. GPU timestamps
on this adapter are visibly quantized in approximately **0.065536-ms** steps;
tiny differences should not be overinterpreted. Clocks vary within/between
rows, and the driver reports an active software power cap. Those facts do not
identify a particular wattage or establish an isolated shader speedup.

`npm run check` passes **120/120 unit tests**. The full serial regression run
passes **15/15 suites**, including actual-device FG shader/numerical tests,
FG live input/fallback, FSR shader/numerical tests, alpha-mask MRT, FSR live
movement, Native/SR image comparisons, compute kernel, WebGPU scales/debug
views/motion/cuts/device-loss, reference visual parity, upscaling, actual 4K,
and the three archived renderer checks. The archived checks are intentionally
historical comparisons, not misrepresented as tests of current WebGPU code.

The [final stack record](verification/framegen/stack-tests.json) includes the
exact artifact hash and exit code of each suite. The
[pre-sun-gate failed run](verification/framegen/before-sun-gate-stack-tests.json)
is retained as a historical outcome; its temporary raw log paths were reused
by the final run. The sky mismatch was fixed without relaxing the threshold.

## Final artifact stability qualification

Bundle SHA-256:
`61803a37cc46f10e3ee353095123a48a4cfe25c4be5ca5c8d9c6f5e908ffee1e`.
All 44 configurations below use that same bundle. Each temporal case captures
at least one complete phase cycle after 72 actual warm renders, with valid
history, no draw-time projection overwrite and no unexpected GPU errors.
Native's consecutive output is byte-identical.

| Actual output | Cases | Largest fitted X/Y displacement SD |
|---|---:|---:|
| 1280×720 | 11 | 0.02399 output pixel |
| 1920×1080 | 11 | 0.02634 output pixel |
| 2560×1440 | 11 | 0.02098 output pixel |
| 3840×2160 | 11 | 0.02127 output pixel |

Each row includes Native and **100/77/67/59/50% in each upscaler**. The largest
value across the entire matrix is **0.02634**, below the 0.1-pixel fixture limit.
[Per-case records](verification/jitter/static-cycles.json) retain regions,
flicker, phase count, velocity probes and the actual hash.
Extra regional diagnostics are retained for the primary 720p comparison;
other final cases include the verifier's aggregate edge metrics and GPU probes.

On the final 720p/50% repeat, SGSR2 X displacement SD is **0.01414 px**, with
edge-luminance p99 SD **15.139** display codes; FSR is **0.00258 px** and
**3.735** codes. The pre-fix comparison was **0.05963 / 48.639** for SGSR2 and
**0.00932 / 15.173** for FSR. The final edge-p99 reductions are approximately
**69% and 75%** in this fixture. This does not imply those percentages apply
to all pixels or every gameplay scene.

The strengthened live FG regression recorded **265 real-endpoint and 271
generated presentation-only calls**, with **zero** temporal-frame/phase
advancement violations. Real rendered-frame count equals committed temporal
frame count through Native, SGSR2 and FSR mode changes. Low-rate pause releases
FG images, and deliberate FG failure retains ordinary SR rendering.
The [release qualification record](verification/jitter/release-checks.json)
contains all 20 final stage outcomes, including the 12 swarm checks, full
15-suite runner, four resolution captures and diagnostic collection. All pass.

Actual admitted-render cadence in the separate headed test was 14.97/29.98/
60.08/175.07 FPS for SGSR2 and 15.12/30.00/59.91/78.71 for FSR at requested
15/30/60/uncapped. This exercises real >60 rendering without claiming those
rates were physically scanned out by the display. Axis/zero and logical
15/30/120-FPS controls also pass; both old paths are rejected by the new
flicker regression. See [controls](verification/jitter/controls.json) and
[cadence](verification/jitter/render-cadence.json).

### Follow-up of the 4K/100% grading outlier

The original short trace showed SGSR2 100% total **46.399→53.412 ms**, with
grading **10.486→18.612 ms**. It was not discarded. Three longer, full-quality
before/after pairs measured total **56.820→50.856**, **45.416→49.676** and
**43.975→39.322 ms**; grade was **19.988→18.940**, **16.712→18.481** and
**7.668→7.602 ms**. A motion-blur-off isolation pair measured identical grading
cost, **6.750→6.750 ms**. That isolation is not the shipped setting or a claimed
quality-preserving speedup.

There is no repeatable +7-ms regression in these repeats. The dynamic trace and
adaptive blur workload vary substantially, alongside recorded GPU clocks; the
data are consistent with workload variation rather than a uniform new grading
cost. This is not proof that all scenes have identical cost. The GRADE shader
was not simplified, nor was blur removed from normal settings. All eight
follow-up traces and actual pass distributions are in
[grade-outlier.json](verification/jitter/grade-outlier.json).

The 88-case ordinary-gameplay matrix and this follow-up use the pre-skid-fix
artifact `0aaed20…`. The subsequent change only applies MRT state to optional
swarm skid materials; it does not change normal gameplay shaders or temporal
math. Final full-suite, static and swarm checks are separately hash-bearing.

## Final moving-swarm regression

All **12** cases pass on the post-skid-fix candidate: SGSR2/FSR 50%, each with
1/100/500 loaded recordings, FG off/on, 1280×720, Golden Hour. FG remains active
through every enabled case and generates hundreds of presentations; no shader
or validation errors occur. Each uses one shared swarm source and 12 colour
draws, including skids. Committed temporal-frame count equals real-render count.

| Path | Loaded recordings | Visible at end, FG off/on | GPU total median, FG off/on |
|---|---:|---:|---:|
| SGSR2 50% | 1 | 1 / 1 | 1.769 / 7.209 ms |
| SGSR2 50% | 100 | 61 / 61 | 2.228 / 7.406 ms |
| SGSR2 50% | 500 | 310 / 314 | 4.784 / 9.830 ms |
| FSR 50% | 1 | 1 / 1 | 4.456 / 9.175 ms |
| FSR 50% | 100 | 60 / 61 | 5.439 / 10.224 ms |
| FSR 50% | 500 | 304 / 313 | 8.323 / 13.238 ms |

These are current workload samples, not a matched FG speedup comparison or a
claim of 500 simultaneously visible cars throughout. Short recordings retain
their normal coast/disappear behavior. Existing worker visibility/LOD behavior
is retained; no cars, skid geometry or temporal samples were removed to improve
a result. The complete [swarm record](verification/jitter/swarm-regression.json)
includes loaded/visible counts, per-car status, actual submissions, worker data,
skid counts, shadow cascades, allocation and error state.

The fixture command stream is hosted in the default Summer 1 scene. It tests
renderer interoperability and moving packed geometry, not lap validity or
matching recording coordinates to a track. The renderer-only API remains
optional and unchanged. Neither source edits nor the FG presenter introduce
physics/training imports, simulation ticks, input polling or replay-clock writes.
The test harness has no trainer or live bridge connection. Native gameplay
continues to own simulation; presentation consumes its rendered state only.
