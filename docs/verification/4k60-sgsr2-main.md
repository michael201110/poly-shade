# 4K60 SGSR2 result on main

## Comparison

FSR 3.1 and SGSR2 were compared from the same current-source build, on the same
frozen game scene, at 3840x2160 output. Each mode rendered 32 settled frames with
Golden Hour enabled; clouds and motion blur were disabled to isolate image
reconstruction. Mean absolute RGB error against Native was:

| Mode | Scale | Mean absolute error (8-bit display codes) |
|---|---:|---:|
| SGSR2 Compute | 50% | 1.45255 |
| FSR 3.1 | 50% | 0.29886 |

FSR is closer to the Native reference in this still-scene comparison. SGSR2 was
visually close, but the numeric comparison is not evidence that the images are
identical or that either mode has better moving-image temporal quality.

## Moving gameplay performance

The current `main` source was bundled to a temporary file and run in Edge on the
NVIDIA T500 at 3840x2160 output with SGSR2 Compute at 50% (1920x1080 internal).
Golden Hour, AO, bloom, sun rays, motion blur, clouds and FXAA were enabled;
frame generation was off. The camera and car were moving during a 30.65-second
unprofiled run:

- 1,839 rendered frames; effective rate **59.9986 FPS**.
- Render interval: median 16.8 ms, p95 18.9 ms, p99 20.2 ms, maximum 23.1 ms.
- NVIDIA T500 utilization was 81–94% during sampled portions; temperature was
  61–64 C.

A separate short GPU-timestamp run measured total GPU work at median 9.11 ms,
p95 11.53 ms, p99 13.50 ms. Median pass timings were 1.25 ms scene, 1.18 ms
grade, 1.38 ms SGSR convert, 2.75 ms SGSR upscale and 0.92 ms finish. Timestamp
collection itself perturbs throughput, so the long unprofiled run is the FPS
result.

The exact profiled current-source bundle before version relabeling had SHA-256
`6fc7fd9bdcd6181b348417e4df18de360f91afb77233635ab1dcff07970c0db9`. The
versioned `.2` artifact contains the same rendering source with only its version
metadata updated; its separately generated hash is recorded by the build.

## FSR performance context

FSR 3.1 at 50% rendered approximately 27–28 FPS on this T500 in the moving
gameplay profile. Its principal GPU passes were shading-change pyramid
(14.5 ms), temporal accumulation (8.8 ms), prepare inputs (about 1.8 ms),
prepare reactivity (about 1.8 ms), and luma instability (about 1.0 ms). Thus,
FSR's better still-reference error does not make it the suitable path for the
4K60 target on this hardware. Frame generation remains off; its measured cost
does not reach the target either.

Reports and captures are retained under the local `%TEMP%` directories
`polyshade-performance/4k-main-sgsr50-sustained`,
`polyshade-performance/4k-main-sgsr50-pass-profile`, and
`polyshade-fsr31-matched`. These machine-local raw artifacts are not part of the
repository.

## Follow-up optimization (`0.6.0-fsr31.3`)

The SGSR2 conversion shader now dispatches 16x16 workgroups instead of 8x8.
Each output pixel performs the same shader arithmetic and stores the same
values; only the number of invocations per dispatched workgroup changes.
Matched performance profiles at 3840x2160 measured conversion median time:

| Render scale | 8x8 | 16x16 | Change |
|---:|---:|---:|---:|
| 50% | 1.376 ms | 0.983 ms | -28.6% |
| 67% | 2.687 ms | 2.032 ms | -24.4% |

At 67%, total GPU time changed from 15.73 to 14.35 ms median and 16.58 to
14.94 ms p95. Effective rendered rate in the unprofiled 10-second check was
57.03 FPS, so 67% still misses 60. At 53% with the 16x16 conversion tile, the
built `.3` bundle submitted 1,844 frames in 30.74 seconds (59.991 FPS); p95 and
p99 render intervals were 18.9 and 20.0 ms. At 55%, the 30.75-second run was
59.58 FPS, so 53% is the higher tested scale that stays closest to 60 over a
longer run. The built-in Performance scale remains 50% for more margin.

Native 4K with all cinematic settings enabled was also measured: 36.84 FPS over
10.88 seconds. GPU total was 25.49 ms median / 29.75 ms p95; the grade pass was
13.43 ms median, dominated by motion blur. Disabling motion blur for diagnosis
reduced grade to 4.65 ms and total GPU time to 16.65 ms, but still produced only
49.78 FPS and is not an acceptable quality change. Native 4K/60 is therefore
not yet achieved; the 4K60 claim applies to 4K output reconstructed with SGSR2.

A diagnostic exact-tap unrolled motion-blur variant reduced grade median to
2.62 ms in one timestamp profile, but p95 reached 20.97 ms and unprofiled
native throughput remained about 37 FPS. It was not adopted because it failed
to improve the end-to-end result reliably.

### Shared-memory motion-blur cache trial

A compute prototype cached a 42x42 RGBA16F source-color tile in 16-bit
workgroup storage, then applied the same per-pixel tap counts, tap positions,
depth rejection, velocity rejection and accumulation order. At 3840x2160, its
cache pass cost 32.05 ms median / 43.71 ms p95. The following grade pass fell
to 4.33 ms median, but total GPU work rose to 47.64 ms median and measured
throughput fell to 19.73 FPS. The prototype was discarded. The per-pixel cache
load and workgroup synchronization outweighed the avoided filtered texture
samples on Turing; no visual-quality claim is made for this prototype.

### Follow-up shader micro-profiles

Two additional exact-output candidates were time-boxed. A direct scalar
reciprocal-depth expression replaced the full `viewPosition` call in the
motion-blur rejection test. Its decision mask matched the original for every
tested tap in a live 4K drive, but a controlled repeat did not improve timing:
both baseline and candidate measured 25.428 ms total GPU median and 13.304 ms
grade median; effective live throughput was 37.87 versus 37.30 FPS. One earlier
short sample looked substantially faster, but that result did not reproduce and
was rejected. The production shader remains unchanged.

The four fixed lens-flare iterations were also explicitly expanded while
preserving their equations and accumulation order. On a matched 12-second live
drive, total GPU median changed from 17.105 to 16.974 ms (-0.131 ms); grade
median changed from 5.112 to 4.981 ms (-0.131 ms); effective throughput changed
from 45.53 to 45.65 FPS (+0.12). This is below the 1 ms priority threshold and
was rejected. Disabling lens flare diagnostically reduced one short sample's
grade median by 1.51 ms, but changes the image and was not adopted.

The follow-up confirms the remaining work is architectural: native 4K remains
below 60 FPS, while SGSR2 at 53% continues to be the only tested full-effects
4K-output path near 60 FPS. No training, replay, or renderer fidelity behavior
was changed by these profiling trials.

### SGSR2 upscale workgroup sweep at 53%

At 3840x2160 output with the cinematic effects enabled, the current 16x16
upscale tile measured 2.753 ms median / 2.949 ms p95 for SGSR2 upscale, and
9.503 ms median total GPU work. Exact-math tile variants produced:

| Upscale tile | Upscale median | Delta | Total GPU median | Effective live FPS |
|---|---:|---:|---:|---:|
| 16x16 (current) | 2.753 ms | — | 9.503 ms | 59.94 |
| 8x8 | 3.146 ms | +0.393 ms | 10.158 ms | 59.85 |
| 16x8 | 3.080 ms | +0.328 ms | 11.338 ms | 59.88 |
| 32x8 | 2.949 ms | +0.197 ms | 9.699 ms | 59.98 |

A second prototype removed the decoded source workgroup cache and sampled the
packed source texture directly. Upscale median and p95 were unchanged at 2.753
and 2.949 ms; total median was 9.896 ms. The small whole-frame differences are
within live-run variance and do not establish a win. The 16x16 cache remains in
place; no tile variant was adopted. These timestamped profiles confirm 53%
still sustains about 60 FPS, but this work did not raise the resolution scale.

A 32x8 conversion-only tile was also measured at 53%. Conversion median fell
from 1.245 to 1.114 ms (-0.131 ms), while upscale median rose from 2.753 to
2.884 ms (+0.131 ms). Total GPU median increased from 9.503 to 10.551 ms and
effective live throughput moved from 59.94 to 59.87 FPS. This single short
profile did not show an end-to-end benefit; the existing 16x16 conversion tile
remains unchanged.

### Latest long-run confirmation

Fresh 30-second, unprofiled live runs on the current pinned `.3` bundle measured
59.824 FPS at 55% (1,844 rendered frames in 30.82 seconds; 2112x1188 internal)
and 59.930 FPS at 53% (1,837 frames in 30.65 seconds; 2035x1145 internal).
Both kept the cinematic effects enabled and reported no browser or GPU errors.
The earlier 53% run at 59.991 FPS remains the best measured result. The small
shortfall varies across runs, and the workgroup experiments above did not
produce a repeatable improvement.

### Frame admission depth trial

The normal frame-admission limit is two submissions. Raising it to three
produced one 60-second diagnostic run at 60.003 FPS, but the same diagnostic
bundle later measured 59.985 FPS over 30 seconds and the packaged candidate
measured 59.814 FPS over 60 seconds. The two-frame baseline at 55% measured
59.824 FPS over 30 seconds. A four-frame queue measured 59.963 FPS over 60
seconds. These runs do not show a repeatable gain above 60.

The 12-second queue tests reduced skipped submissions (17 at limit two, 7 at
limit three, and 4 at limit four), but input-to-submit p95 increased from 20.8
ms at limit two to 23.0 ms at limit three; queue-completion p95 reached 44 ms
at limit four. The queue-depth change was not retained because its throughput
gain was inconsistent and it adds latency. The shipped limit remains two.

### Geometry-history fusion trial

A preview fused SGSR2's separate geometry-history draw into its conversion
compute pass using two storage textures so the current frame never aliases the
previous-frame input. WebGPU validation passed. At 55%, the separate pass was
0.262 ms median; after fusion, conversion rose from 1.245 to 1.507 ms while the
geometry pass disappeared. Those component deltas cancel, and the two short
live profiles varied in other passes, so they do not establish a total-frame
win. The trial also required a second history texture and a larger uniform
block. I did not retain it: the tested evidence did not prove a speedup, and a
pixel-by-pixel history comparison was not completed.

### Current-source FSR/SGSR recheck and tile candidate (2026-10-19)

I repeated the comparison with the current pinned `.3` bundle at 3840x2160.
The frozen-scene capture again used Native, SGSR2 at 50%, and FSR 3.1 at 50%,
with Golden Hour on, clouds and motion blur off, and 32 settled frames per
mode. Mean absolute RGB error against Native was **1.456** display codes for
SGSR2 and **0.299** for FSR. This confirms FSR's closer still-image match; it
does not establish superior temporal quality while driving.

I also ran separate 15-second moving-gameplay profiles at 3840x2160 with the
same scene, T500, full cinematic effects, 50% internal scale, and frame
timestamps disabled. SGSR2 rendered 905 frames in 15.091 seconds (**59.968
FPS**); its render-interval p95 was 18.3 ms. FSR rendered 446 frames in 15.856
seconds (**28.128 FPS**) and its render-interval p95 was 48.9 ms while GPU
utilization sampled at 100%. SGSR2 remains the usable 4K-output performance
path on this adapter; FSR remains a visual-quality option when its lower rate
is acceptable.

An additional SGSR2 upscale workgroup experiment compared 16x16 with 8x32 at
3840x2160 output and 50% internal scale, using the same shader equations and
source-sample order. The corrected 8x32 dispatch measured **3.277 ms** upscale
median / **3.473 ms** p95, unchanged from 16x16; total GPU median changed from
8.126 to 8.192 ms (+0.066 ms). The candidate was discarded. Its workgroup
geometry required matching the output tile origin and extent as well as the
dispatch dimensions; the first diagnostic had a harness mismatch and its
invalid output and timings are excluded. The corrected captures were taken at
different temporal history phases, so they are not used as a per-pixel
equivalence result. No production shader or workgroup setting changed.

### Native 4K moving-gameplay recheck

A fresh 15-second Native 3840x2160 run with all cinematic effects and ordinary
driving rendered 688 frames in 15.086 seconds (**45.60 FPS**). Render intervals
were 17.6 ms median, 33.8 ms p95, and 35.3 ms p99; the T500 sampled at 98-100%
GPU utilization. A separate timestamped run measured **25.56 ms** total GPU
work median (30.61 ms p95); timestamps lowered effective throughput to 37.41
FPS and are not the live-FPS result. The largest timestamped passes were grade
at **13.89 ms median / 18.48 ms p95**, scene at 4.33 / 5.24 ms, and finish at
1.97 / 2.29 ms. This confirms Native 4K is still GPU-bound, with grading and
scene rendering the main targets. The current 4K60 objective remains unmet on
the Native path; the near-60 result applies to SGSR2 output reconstruction.
