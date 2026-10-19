# FSR 3.1 WebGPU integration — experimental work in progress

The FSR implementation and its frame-generation features have been merged into
`main`. The original port was based on `d76c056` (PolyShade 0.5.6).
Historical experimental source versions: `.0` and `.1`. The current preview is
`0.6.0-fsr31.4`; the stable PML manifest remains **0.5.6**.
Historical release bundles are untouched. The original SR preview is
`0.6.0-fsr31.0`; `.1` added the official analytical FG pipeline and temporal
stability corrections. See the separate
[FG report](frame-generation.md) and [shimmer audit](temporal-jitter-stability.md)
for current qualification and measured limitations.

## Reference and reproducibility

Official AMD FidelityFX SDK tag `v2.3.0`, revision
`60f4ea81909200d8542eca14dccb2628b763a9a3`, contains SR **3.1.5** and frame
interpolation **3.1.6**. Those component versions differ intentionally. FSR 4 ML
is outside this work. Unmodified reference files, MIT notice and hashes are in
`vendor/fidelityfx/`. `scripts/import-fidelityfx.mjs` refuses another revision.
Imports read the exact upstream Git blobs, and `.gitattributes` prevents line-
ending conversion from breaking that byte/hash identity on Windows or Linux.

`npm run compile:fsr` uses Microsoft DXC `v1.9.2609` (2026-09-29 Windows build),
then Naga 30.0.1 via pinned `naga-wasm@30.2.0`, to produce WGSL offline.
Set `DXC` to the executable. The immutable reference is copied to a temporary
staging directory; adapters are applied there. Generated `.wgsl` and matching
`.wgsl.js` wrappers are committed, so normal mod builds require no compiler.
The build refuses to replace a committed bundle with different bytes. Increment
the experimental version for the next snapshot or use a new temporary output.

## SR stages currently represented

AMD prepare inputs, luma pyramid / auto exposure statistics, shading-change
pyramid, shading-change resolve, prepare reactivity / disocclusion / new locks,
luma instability, and temporal accumulation. The official accumulate/sharpen
variant and RCAS dispatch have a separate sharpening control, off by default.
The automatic reactive shader also compiles; the current path uses application-
authored MRT masks. No SGSR2 code was renamed or used as a replacement for FSR.

## WebGPU adaptations

- Reconstructed depth image atomics become a row-major `atomic<u32>` storage
  buffer. Addressing, float depth bit patterns and atomic min/max are preserved.
- AMD SPD uses its official `FFX_SPD_NO_WAVE_OPERATIONS` implementation. Its
  device-scope last-workgroup election is replaced by an ordered compute pass
  boundary after mip 5, followed by AMD's original tail reduction functions.
  This avoids unsupported device-scope image coherency; no CPU wait is used.
- Shading-change needs only the first six SPD mip outputs; unused tail work is
  omitted. Luma's mip-5 scratch is reused by shading-change after its final read.
- T500/D3D12 rejects RG16F storage images, so RG16F and R16F intermediates use
  RGBA16F carriers with identical precision in the active channels. This wastes
  channels and remains a memory/performance optimization target.
- R8_UNORM masks/accumulation use the red channel of RGBA8_UNORM. New-lock
  read/write storage uses an R32F carrier with explicit 8-bit UNORM write
  quantization. Float32 frame-info's 1x1 RGBA resource becomes a 16-byte buffer.
- Input scene depth is directly sampled as a WebGPU depth texture, avoiding a
  duplicate depth copy. FLT_MAX uses its exact hexadecimal WGSL representation
  because the translator's rounded decimal spelling exceeds WGSL's f32 range.
- The pinned Three r181 PSO key omits secondary color attachment formats. The
  adapter appends all MRT formats and material MRT state changes invalidate
  shader variants. No third-party package file is modified.

## Input mapping

Scene color is graded/tone-mapped **linear RGB**, before the final sRGB transfer.
Pre-exposure is 1. FSR HDR-color-input mode is selected explicitly.
Depth is standard finite WebGPU `[0,1]` depth, near/far taken from the mirror
camera. The reconstruction factors follow AMD's host implementation.

PolyShade velocity stores unjittered **current minus previous NDC** with +Y up.
AMD expects **previous minus current UV**, +Y down. Its shader motion scale is
therefore `(-0.5, +0.5)`. Jitter is excluded from motion and supplied separately
in input pixel units. Numerical moving-camera, object-motion, depth, sign and
reset regressions supplement constant-color checks. Complete-cycle stationary
captures and edge-flicker measurements are recorded in the shimmer audit.

The experimental MRT attachment supplies application-authored reactive coverage
from final material alpha (including swarm opacity nodes) and emissive luminance.
It does not add a second scene draw. The conservative value is currently supplied
to both reactive and transparency inputs. Bloom halo coverage, reflections, glass,
and transparent overlapping ghosts still require explicit visual validation.

## Lifecycle and fallback

FSR initializes only when explicitly selected. Native and SGSR2 remain available.
Devices without six storage images per stage or `float32-filterable` fall back
to SGSR2 / Native with a reason. Histories invalidate on the existing temporal
boundaries; inactive FSR image resources are released. Device disposal also
disposes FSR. Validation scopes for FSR compute commands are asynchronous.
No gameplay shader compilation, profiling map, image readback, or GPU completion
is awaited by `reconstruct()`.

## Historical SR-preview verification (`0.6.0-fsr31.0`)

The movement regression had two causes:

- Replacement car materials could appear without any scene object topology
  change. Those mirrors now inherit the current MRT output immediately; the
  prior topology-only update missed them and produced invalid pipelines.
- Both SGSR2 and FSR discarded history for every small speed-related FOV change.
  In a short trusted-keyboard trace, 169 of 236 frames reset for projection changes.
  Smooth perspective zoom now reprojects using the actual previous projection.
  The same input trace retained 220 frames and reset once for a real FOV jump
  above five degrees, plus its initial settings reset. Frame counts differ with
  scheduling; this is a correctness check, not an FPS comparison.

The shared projection fix is pushed separately on `main` as `d16e439`. Abrupt FOV
cuts, aspect/depth changes, teleports, resize and explicit reset still invalidate.
Nine headed SGSR2/FSR/Native configurations, including RCAS, output resize and
27 repeated reset/acceleration/braking/steering sequences, passed with no GPU
errors and a maximum of two pending enhanced submissions. This was repeated
after the FOV fix: all nine cases passed, with 18 total history resets across
the mode changes and deliberate resets (rather than 1,069 before the fix).
The shared fix does not disable resets for camera cuts or change simulation.

`npm run verify:fsr`: all eleven generated variants compile on the actual NVIDIA
T500 in Edge. Four-frame constant-color reconstruction at 128x128 preserves
`(0.25, 0.5, 0.75)` exactly, with no non-finite values or WebGPU errors, and all
owned textures/buffers are released. Motion conversion, reconstructed depth,
reactive-mask coverage and release/reactivation also pass synthetic checks.
Reports: `docs/verification/fsr31/`.

`npm test`: 107/107 pass. `npm run verify:webgpu`: passes five scales,
debug views, resize, temporal reprojection, camera cuts and deliberate device
loss. The independent-motion probe sees 147 of 159 moving test cars (at least
120 required). The probe now waits for an actual completed enhanced frame;
bounded renderer backpressure must not make it sample a skipped callback.
That GPU wait is test-only. The intentional device-loss warning is recorded
separately; unexpected shader/validation warnings still fail the suite.
The additional smooth-FOV GPU probe preserves history and measures horizontal
motion `-0.0060539246` against the projection-derived `-0.0060563018` (NDC).
This verifies reprojection, rather than merely suppressing the reset counter.

`node scripts/fsr/compare-modes.mjs`: Native, SGSR2 50% and FSR 50% use the
same frozen scene/camera/materials at 1280x720, Golden Hour with clouds and
motion blur disabled. After at least 32 completed frames in the selected mode,
mean absolute RGB error versus Native is 1.80 display-code values for SGSR2
and 0.76 for FSR. FSR's mean channel shift is below 0.16. This is a static
scene check, not proof of moving-image fidelity. The script asserts scene
colour/exposure, settled history, selected mode and absence of GPU errors.

The archived 0.4.0 sky comparison initially failed, then passed on repeat after
strengthening the warmup. The subsequent `.1` qualification reproduced a real
missing partial-sun-occlusion gate in the GPU shaft/volume path; it was not
adequately explained by startup alone. Restoring reference gating reduces the
cinematic mismatch from about 9.74 to 0.150 display codes. All four presets pass
the original five-code limit. The harness now also copies the full camera pose
and projection, rather than only its position/quaternion fields.

`node scripts/benchmark-upscaling.mjs`: all eleven Native/Reduced/SGSR2
720p scale cases pass, including return from Native to SGSR2. These are frozen
scene measurements, not gameplay FPS measurements.

`node scripts/verify-4k.mjs`: Native and SGSR2 77/67/59/50% pass at actual
3840x2160 output, including dimensions, active mode and validation checks.
Frozen-scene median total GPU pass times are 22.41/28.05/24.05/21.23/18.42 ms
in that order. These are current-build checks, not matched performance gains.
The fixed-view harness's callback rate must not be interpreted as displayed FPS.

Verified bundle SHA-256:
`cc6dac7f2862f335b00cfedc92ed221b2822e2206dc3c662f41c9791240aadb8`.
The `0.6.0-fsr31.0` SR preview was subsequently installed in the user's normal
Edge PML tab and its heading verified. Development tests install their candidate
in fresh isolated profiles and close those browsers afterward.

Removing the DXC unroll annotation from the shading-change pyramid produced
byte-identical WGSL. The no-unroll variant is rejected as an optimization; no
performance gain is claimed for it.

The first live attempt found an MRT PSO-cache collision and was rejected. Later
live movement tests fixed replacement-material MRT state and smooth-FOV history
invalidation. The `.1` candidate additionally corrects false static velocity,
SGSR2 geometry-footprint rejection and transparent reactive-mask coverage.

## Current experimental qualification (`0.6.0-fsr31.1`)

The `.2` preview adds no rendering code changes. Current-source SGSR2 4K60
measurements and the matched 4K FSR comparison are recorded in
[the 4K60 verification](verification/4k60-sgsr2-main.md).

The `.3` preview uses 16x16 conversion workgroups instead of 8x8. Per-pixel
shader math is unchanged. On the T500 this reduced the SGSR2 conversion pass by
24% at 67% render scale; 4K at 53% scale sustained 59.96 submitted FPS for
30 seconds with cinematic effects enabled. Full-resolution Native remains below
60 FPS and is being investigated separately.

- Official optical flow and frame interpolation are implemented, with numerical
  translated-image midpoint fixtures, real/generated presentation, lifecycle,
  fallback and bounded-queue checks. FG stays optional and off by default.
- Golden Hour moving-gameplay cost matrices retain real render rates, canvas
  submission rates, named GPU passes and actual hardware clocks. They do not
  measure monitor scan-out or input-to-photon latency.
- Stationary temporal stability covers Native plus 100/77/67/59/50% in both
  upscalers at 720p, 1080p, 1440p and 4K. Axis/zero controls remain test-only.
- The reports above contain final test, performance and moving-swarm evidence.
  No image-quality equivalence or universal absence of temporal artifacts is
  claimed. In particular the T500 does not meet a 4K 30-real/60-presented FG
  target; an implementation can be correct and still too expensive there.
