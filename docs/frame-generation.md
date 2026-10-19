# FSR 3.1 frame generation — experimental

The `experiment/fsr31-webgpu` branch adds optional AMD analytical frame generation
to Native, SGSR2 and FSR Super Resolution. It is **off by default**. Stable PML
latest remains 0.5.6; this work does not replace a historical release bundle.
The new controls are in **Upscaling**. The complete SR reference and port notes
are in [fsr31-webgpu.md](fsr31-webgpu.md).

## Source and stages

AMD FidelityFX SDK `v2.3.0`, commit
`60f4ea81909200d8542eca14dccb2628b763a9a3`, Frame Interpolation **3.1.6**.
The same SDK contains SR **3.1.5**. All reference blobs and their hashes remain
unchanged in `vendor/fidelityfx`; AMD's MIT notice is retained in the bundle.

The runtime runs the official advanced-v5 optical-flow path: linear input to
quantized luma, seven luma levels, 3×3 scene-change histograms and divergence,
then coarse-to-fine search, filtering and scaling across seven flow levels.
The native wave-32/wave-64 reductions are retained, including the wave-32
cross-wave shared reduction used by Turing.

Frame interpolation runs reconstruction/dilation, setup/counters and field
clears, previous-depth reconstruction, game-vector field, its inpainting
pyramid, optical-flow field, disocclusion, interpolation, color inpainting
pyramid and final inpainting. This is not a renamed SGSR2 shader or a generic
two-image warp. The official diagnostic shader is also compiled; the UI offers
separate full-screen flow, game motion, disocclusion and inpainting views.

## WebGPU mappings and deviations

`npm run compile:framegen` stages the pinned HLSL and uses DXC v1.9.2609,
SPIR-V, and Naga 30.0.1 (`naga-wasm@30.2.0`) to generate checked-in WGSL.
No HLSL compiler is downloaded or run during gameplay.

- Integer image atomics become row-major storage-buffer atomics. Explicit
  two-dimensional bounds preserve zero reads and dropped out-of-bounds writes;
  flattening must not let an invalid X coordinate alias the next row.
- Signed two-channel optical flow uses `vec2<i32>` buffers with original
  R16G16_SINT saturation. It does not use float motion approximations.
- R8_UINT luma is carried in R32_UINT textures; the original shader's integer
  luma values are unchanged. Masks use the R/RG channels of RGBA8_UNORM.
  Dilated RG16F motion uses RGBA16F with identical active-channel precision.
- Linear scRGB input is a fixed official transfer-function permutation, with
  luminance range `(0,80)`. Scene color is already linear before the final sRGB
  transfer. The unused sRGB/PQ branch is not translated into invalid infinities.
- The SCD histogram uses DXC `-Od`: its optimized SPIR-V failed the translator's
  dominance validation. No algorithm or histogram bins are removed.
- Compute builtin inputs are inlined into the entry point where necessary to
  preserve WGSL uniformity. The GPU scene-change value is snapshotted with a
  workgroup-uniform load after its producing pass; no CPU readback is involved.
- Converged first-lane wave election maps to lane index zero. The two call
  sites are the full-wave `BlockSad64` and `SadMapMinReduction256` reductions.
- SPD's device-scope last-workgroup election becomes an ordered dispatch
  boundary after mip 5 followed by AMD's unchanged tail reduction functions.
  Game-field and color pyramids have separate logical sizes.
- Final inpainting samples its original color/mask through separate read-only
  bindings and writes a new output. Unchanged pixels are copied by the same
  dispatch; conditional writes retain their original color/mask result.
- The browser DOM HUD is outside the interpolation surface. The game-HUD
  attachment factor is therefore zero. No text is rendered into generated
  frames, and native HUD resolution is unchanged.
- The runtime captures its input into one of two display-sized RGBA16F real
  surfaces. Equal-sized inputs use exact texture loads; Reduced mode uses a
  spatial resolve to display size. This supports render/storage targets without
  COPY_SRC usage and never transfers image data to the CPU.

Depth remains finite WebGPU `[0,1]`, using the actual camera near/far and
projection. PolyShade's unjittered current-minus-previous NDC velocity maps to
AMD previous-minus-current UV with `(-0.5,+0.5)`. Jitter is supplied separately.
Internal dimensions must each be at least 64 pixels. Unsupported subgroups,
float32 filtering, or six storage-image bindings disable FG with a reason and
leave ordinary rendering available.

## Presentation and latency

There is one WebGPU renderer, device and canvas. DOM interfaces remain native.
There is no extra RAF or simulation loop, no timer that advances the game, and
no normal-frame GPU wait or image readback.

Two pacing choices are available:

- **Smooth:** retain one real/generated pair. Present the prior real endpoint
  before submitting the next expensive render, then present the new midpoint
  on the intervening game RAF. This keeps a long compute job from blocking an
  endpoint queued behind it. Nominal software buffering is one real frame
  (about 33.3 ms at 30 real/60 canvas submissions per second).
- **Responsive:** submit a midpoint with the real render and its endpoint on
  the next game RAF. Nominal software buffering is one display interval
  (about 16.7 ms at 60 Hz). It needs the render/FG work to meet that shorter
  presentation deadline; a high counter alone does not prove smooth scan-out.

Only one pair can be retained. Stale frames, settings/resolution/scene/camera
changes, teleports, large projection changes and long visibility gaps flush it.
Slow GPU work is not allowed to create an accumulating queue. Smooth endpoint
submissions are prefixes of the next tracked render epoch and are covered by
that epoch's asynchronous completion notification. No new expensive render is
admitted while the previous pair's tracked work is pending.

The default minimum is 25 **real** FPS. Sustained rates below the threshold
pause FG, release its image resources and use the normal render path until
settings, resolution or a scene/camera reset changes. There is no recurring
costly retry. The threshold is adjustable upward. Scene changes
detected by AMD can output a duplicate real frame; a generated submission count
does not claim that every submitted image contains unique new information.

Counters distinguish actual real renders, generated submissions and total
canvas submissions. Browser APIs do not expose physical monitor scan-out or
input-to-photon latency. Reported software buffering and queue completion are
not substitutes for those measurements.

## Ownership and isolation

FG owns two real-color surfaces, one raw and one final interpolated surface,
raw/final masks, internal depth/motion/disocclusion, six scalar field buffers,
two seven-level luma/flow rings, SCD history, pyramids and small constant buffers.
`report()` lists every owned resource's format, dimensions and logical byte
estimate; this excludes driver allocation padding and the rest of the renderer.
Resources are released on dimensions changes, deactivation/low-FPS pause and dispose.
Initialization and validation failures fall back to ordinary rendering.

FG imports renderer utilities only. It reads render color, depth, velocity,
camera and temporal state. It does not alter car transforms, game time, input
polling, replay interpolation, PolyBot observations, physics or training.

## Verification and measurements

`npm run verify:framegen` compiles all 20 generated AMD variants on the actual
adapter, executes numerical fixtures and drives the real game in an isolated
Edge profile. Numerical tests cover constant-color preservation, zero flow,
positive/negative/diagonal translation, odd sizes, 50%/67% internal dimensions,
reset, resize, release/reactivation and dispose. The checked midpoint region
matches the known translated texture exactly in the initial fixtures, rather
than just duplicating the current real image.

`node scripts/profile-framegen-matrix.mjs` serially measures Golden Hour moving
gameplay at 720p, 1080p, 1440p and actual 4K output. Native, SGSR2 50/67% and FSR
50/67% are measured with FG off/on. Forced FG diagnostic rows bypass the product
25-FPS guard to expose costs even where FG is impractical; they are not playable
recommendations. Guard operation is verified separately. Reports retain trusted
input events, real and canvas rates, GPU pass distributions, CPU submission,
queue completion, pacing, logical memory and actual clocks/power-cap state.
Rows that include guard fallback must not be described as sustained 2× FG.

### T500 cost matrix (before the subsequent SR shimmer corrections)

The [40-row report](verification/framegen/gameplay-matrix.json) retains every
resolution/mode, exact bundle hash and actual clocks. These are canvas
submission rates, not measured monitor scan-out. All FG-on rows below were
forced cost diagnostics; the public 25-real-FPS guard must remain enabled.

| Golden Hour path | FG off real FPS | FG on real / canvas FPS | FG GPU median |
|---|---:|---:|---:|
| 720p SGSR2 50% | 60.0 | 29.7 / 58.2 | 5.11 ms |
| 1080p SGSR2 50% | 59.8 | 29.8 / 58.3 | 10.35 ms |
| 1440p SGSR2 50% | 60.0 | 22.2 / 42.0 | 17.17 ms |
| 4K SGSR2 50% | 49.0 | 12.7 / 16.3 | 41.03 ms |
| 720p FSR 50% | 60.0 | 28.6 / 56.0 | 3.80 ms |
| 1080p FSR 50% | 59.7 | 21.7 / 42.3 | 8.00 ms |
| 1440p FSR 50% | 43.5 | 16.8 / 32.0 | 14.88 ms |
| 4K FSR 50% | 20.1 | 9.7 / 9.7 | 35.13 ms |

The first Native 720p baseline included a cold first-touch stall and is not
evidence of a steady-state FG speedup. Driving can hit barriers/camera cuts;
AMD scene-cut handling can duplicate current content and stale-pair handling
can drop presentations. Low-rate rows must not be described as sustained 2x.
The driver reported an active software power cap and varying clocks during the
matrix. A generic power-cap flag does not establish a specific wattage limit.

On this T500 the measured recommendation is **FG off** where the ordinary path
already reaches 60 FPS. The full official compute pipeline is functional, but
does not meet a 4K 30-real/60-presented target. Native 4K's game-vector-field pass
alone reached roughly 59 ms; its reference vector searches/atomics dominate.
We did not remove those searches or reduce fidelity to improve a counter.

At SGSR2 50%, FG's logical owned allocation is approximately 56.7 MiB at 720p,
127.5 MiB at 1080p, 226.6 MiB at 1440p and 509.9 MiB at 4K. These are additional
to ordinary scene/post/SR images and exclude driver padding. Resource release
on low-FPS pause is therefore material, not just a status change.

An offline native-f16 compilation experiment on interpolation, game motion,
game-field pyramid and inpainting produced byte-identical WGSL to the FP32
variants. [Hashes](verification/framegen/f16-study.json) are retained; no
runtime f16 variant or f16 speedup is claimed from that experiment.

The subsequent [temporal shimmer corrections](temporal-jitter-stability.md)
apply to the real SR inputs independently of FG. Synthetic correctness and
shader compilation alone are not release qualification; final regression and
moving-swarm results are recorded with the candidate qualification.

## Compatibility

| Installation | Expected behavior |
|---|---|
| PolyShade 0.5.6 stable | Existing Native/SGSR2 paths; this experimental FG is absent. |
| PolyShade 0.6.0-fsr31.0 | Historical SR preview, no FG; immutable. |
| PolyShade 0.6.0-fsr31.1 alone | Ordinary PolyTrack with optional SR/FG; no PolyBot requirement. |
| PolyShade 0.6.0-fsr31.2 alone | Same optional SR/FG preview; current-source SGSR2 meets 4K60 on the tested T500 with FG off. |
| PolyShade 0.6.0-fsr31.3 alone | Same preview with an exact-math SGSR2 conversion workgroup optimization; 4K/53% sustained at 59.99 FPS in a 30-second test. |
| PolyShade 0.6.0-fsr31.4 alone | Reuses motion-blur depth in native grade; native uncapped T500 remains below 60 FPS. |
| PolyShade 0.6.0-fsr31.5 alone | Exact haze-distance gate in native grade; SGSR2 50% remains the measured near-60-FPS 4K path. |
| `.1` with PolyBot bridge 0.1.51 | Optional packed swarm API v1, shared renderer/depth/lighting and independent render-only velocity. 1/100/500-car regression is separate from normal gameplay. |
| PolyBot without PolyShade | Its existing native fallback remains available; this change does not edit PolyBot or its protocol. |
| PolyCam | Uses the source camera as before. The mirror owns jitter; the gameplay/PolyCam camera is never jittered. Transform/projection cuts invalidate history. This is an integration contract, not a claim that every PolyCam mode has a dedicated visual fixture. |

Stable `manifest.json` remains on 0.5.6. The experimental manifest and versioned
tag select `.1`; settings and other mods remain installed when updating the
existing preview in PML. All development browser profiles are isolated and
closed after each check.
