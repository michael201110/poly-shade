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
