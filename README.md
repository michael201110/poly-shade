# PolyShade 0.2.6

A rendering-only PolyModLoader mod for **PolyTrack 0.6.3**. Warm sunlight, readable cool shadows, broad soft clouds and restrained camera optics preserve the game's low-poly appearance.

## Install

Install [PolyModLoader](https://polymodloader.com/), then add the [PolyShade install URL](https://cdn.polymodloader.com/gh/michael201110/poly-shade/main/) in its mod manager:

```text
https://cdn.polymodloader.com/gh/michael201110/poly-shade/main/
```

Select **0.2.6 / latest**, enable PolyShade and reload. Remove duplicate older entries. If the CDN caches an old manifest, replace `main` with the full latest SHA from [commit history](https://github.com/michael201110/poly-shade/commits/main/). This follows PML's [documented sharing format](https://wiki.polymodloader.com/sharing-your-mod/).

The root manifest maps 0.6.3 to `0.2.6/version.json` and `0.2.6/main.mod.js`. Earlier release directories are preserved. The corrected PML base class, lifecycle and constructor-assigned renderer interception remain intact.

**0.2.6 improves shadow readability and smoothness across the scene** with stronger shadow contrast and the maximum soft-shadow filter. Golden Hour rays are more visible, with a restrained increase for Capture. These are existing controls and passes; the adjustments add no rendering work. See [0.2.6 visual fixes](docs/0.2.6-visual-fixes.md).

**0.2.5 optimizes rendering without lowering the 0.2.4 presets.** It removes an invisible native sun's redundant shadow map, retains and preallocates configured shaft buffers, warms brake-light shader variants in the background when supported, and caches unchanged settings/material work. Ray masks are filtered before integration for smoother occlusion edges. See [measurements and verification](docs/0.2.5-optimization.md).

## Presets

| Preset              | Scene scale | Shadows   | Post effects                                                                          | Environment source |
| ------------------- | ----------- | --------- | ------------------------------------------------------------------------------------- | ------------------ |
| Vanilla             | Native      | Native    | Native rendering restored                                                             | Native             |
| Golden Hour Lite    | 1x          | 1024      | FXAA; AO/bloom/rays/flare off                                                         | 128 x 64           |
| Golden Hour         | 1x          | 2048      | Low AO, subtle bloom/rays, visible flare, FXAA                                        | 256 x 128          |
| Golden Hour Capture | 1x          | 2048      | High AO, visible rays/ghosts, volumetric sunlight, FXAA; optional sharpening         | 512 x 256          |

Capture renders at the 1280 x 720 canvas resolution with a 2048 shadow map and FXAA, avoiding costly supersampling while retaining clean edges. Grading writes directly to output by default; optional FXAA/sharpening enable an output-sized intermediate. Bloom and ray targets use output-based resolution. Auto scene MSAA uses no additional samples; Lite/Golden/Capture use FXAA. Manual 0/2/4 sample settings are available. The native context is unchanged.

The 0.2.0 cloud shader, broad silhouettes and sky palette are unchanged. Golden/Capture retain clouds at 0.4; Lite leaves them off. Slightly reduced fill, exposure and shadow lift improve tonal separation. Saved overrides remain valid; selecting/resetting a preset applies new defaults.

## Brake lights, lighting and materials

Brake lamps emit through **real unshadowed SpotLights**, replacing spherical spill. Lamp geometry supplies local positions and averaged outward normals; cones point rearward and downward. Both light and target attach to the car and follow turns, banking and inversion. The 45-degree angle, 0.7 penumbra, short reach and adjustable power keep illumination local. Only three nearby opaque cars can own lights; distance/frustum checks suppress irrelevant cars and ghosts are excluded. F7 and track changes remove lights and targets. If SpotLight is unavailable, native emissive lamps remain and spill is disabled with a diagnostic; no spherical fallback is used.

One sun azimuth/elevation drives the sky, directional shadows, cloud illumination, environment, atmosphere and optics. PCF soft shadows use a wider penumbra and 0.68 shadow strength to keep hard shadow-map edges and dark patches readable. Local shadows follow a bounded, texel-snapped camera region. Native CSM retains its cascade counts, splits and shader hooks; Capture uses 2048 maps for all cascades. The redundant native sun is suppressed only when using the mod's local sun; native CSM lights remain intact.

The game's own Three.js is used. A generated equirectangular sky uses its actual UV convention and internal PMREM conversion; no runtime Three.js copy, HDRI or art download is added. Environment generation is cached by sky/sun/cloud/quality settings, excluding animated cloud time and camera movement. Paint/metal reflect more; terrain/rubber stay matte. Compatible opaque materials preserve maps, vertex colours, normals, sidedness and source updates. The Main paint shader, ghosts, translucent surfaces and arbitrary shader callbacks are protected. The inspector supports Alt-click picking and persistent `material:`, `mesh:` and `parent:` patterns with `*` wildcards.

## Sun optics and scattering

Depth around the procedural sun is reduced to a **1 x 1 visibility mask**, shared by rays, flare and volumetric sunlight. Rays stay faint in open sky and grow strongest with partial occlusion. Scene depth identifies sky gaps near the sun, then shafts composite across road, barriers and architecture. Fully blocked and behind-camera suns suppress effects; offscreen, disabled and zero-strength cases skip unnecessary work. WebGL2 feedback transfers four bytes through a pixel-pack buffer and polls a fence without waiting. No synchronous scene-depth readback or heavy volumetric renderer is used.

Flare is composited in the existing grade shader: a localized sun halo, four soft ghost rings with restrained RGB separation, and an optional horizontal streak. Ghosts sit at four points along the sun-to-centre axis, including beyond screen centre. Cloud transmission softens the direct halo. There is no extra flare target. Lite disables optics; Golden uses clearly visible but restrained settings; Capture is stronger. Enable, strength, ghosts, iridescence and streak controls are independent.

## Pipeline, restoration and diagnostics

Optional **volumetric sunlight** uses half-resolution camera-ray slices, with two depth-tested sunlight probes per slice. Eight deterministic samples integrate scattering only up to the visible surface or maximum distance. Edge-aware upsampling and a light depth-aware blur smooth blocky shafts while preserving road and occluder boundaries. Sun rays also render at half resolution, use 48 radial taps and a broader soft filter. Both buffers are capped at 1024 pixels wide. Costly shaft passes now skip fully visible or fully blocked suns and run when the sun is partially occluded. Effects share the sun, depth, visibility and matching procedural cloud transmission; they add no world fog or temporal history. Strength, density, decay, samples and max distance are adjustable. Lite/Golden default off; Capture uses more perceptible but localized scattering. Radial rays remain strongest through partial occlusion and fade to a faint contribution in open sky. Their depth mask finds sky gaps around the sun, then shafts composite over road, barriers and architecture. Debug views expose the projected sun, visibility/cloud mask, ray buffer and volumetric buffer. The scattering remains a screen-space approximation, so offscreen occluders are unknown.

The original renderer draws the game scene once into a linear HDR target with depth. Reduced-resolution AO retains 8/12/16 samples and two bilateral blurs, with cheaper scalar depth reconstruction and byte AO storage. Bloom retains its two small blur passes. Atmosphere, AO, bloom, optics and linear grading precede one filmic tone map. Luminance-pivot contrast preserves hue. FXAA/sharpening run on an output-sized graded target; without either, grading writes directly to output and omits that target/pass. Final colour conversion occurs once. Fullscreen passes use one oversized triangle and omit redundant clears. Disabled/zero-strength optional effects release targets; configured shafts retain their targets while occluded or offscreen. Compatible resize reuses target objects and sample/depth changes dispose incompatible attachments.

Shadow maps may reuse an identical view, with exact transform, morph, geometry, light, coverage and topology checks. Moving cars and shadows still update normally; no reduced update rate or resolution is used. Whole-track bounds are computed only for fallback fog. Brake shader warming temporarily exposes hidden lamp parents for compilation, restores visibility immediately, and never adds idle lighting cost to gameplay. Native CSM owns scene shader compilation; only post shaders are warmed in that mode.

**F7**, Vanilla and Disable restore original materials, lighting, environment, background, shadows, resolution and renderer state. F7 is ignored while editing controls. Render target/viewport/scissor/clear/tone/output/XR state restores in `finally`. Optional shader failures are isolated; final-pass failure uses direct rendering. Native offscreen/XR rendering bypasses post processing.

Diagnostics report CPU submission average/p95, asynchronous GPU times, active passes, target sizes/estimated bytes, allocations/disposals/resizes, environment generations and failures. Opt-in **Per-pass profiling** reports scene, shadows, AO/blur, bloom/blur, visibility/transfer, rays, grade, finish and environment timings. Scene/shadow queries alternate to avoid nesting. CPU environment generation is separate; internal PMREM GPU work belongs to the scene. Profiling objects and shadow wrappers are absent during normal gameplay.

See [0.2.1 measurements and verification](docs/0.2.1-verification.md), [0.2.2 sun effects calibration](docs/0.2.2-sun-effects.md), [0.2.3 shadow and shaft fixes](docs/0.2.3-shadow-fixes.md) and [0.2.4 ray quality and performance](docs/0.2.4-ray-performance.md) for performance, effect tuning, screenshots and limitations. Screen-space effects cannot see offscreen geometry; reflections represent the sky rather than nearby track. Visibility feedback takes a few frames, while the current GPU mask immediately suppresses blocked optics. Missing capabilities gate effects or use existing direct/fog fallbacks.

Physics, input handling, simulation workers, replay timing, PolyBot messages and camera transforms/FOV are unchanged. Brake lights read only the visible native lamp emissive state. Multiplayer and a separately installed PolyBot were not exercised. PML does not guarantee an unload callback: F7, explicit disposal and page exit clean up; manager-only unload can require a reload. Settings remain schema 2; valid older saves migrate without rewriting their overrides.

## Build and verify

```sh
npm ci
npm run check
npm run verify:live
```

Three.js, Playwright and PNG tooling are development-only. Tests cover lifecycle/hooks, material preservation, settings, brake direction/rotation/cleanup, target reuse, pass skipping and asynchronous visibility. Live tests need Microsoft Edge and the official PML CDN. A fresh profile serves the local built mod through a test-only origin; instrumentation is absent from the release. Presets, resize, F7, braking, cockpit switching, driving/restart, multiple tracks, CSM and repeated resource cycles are checked. Screenshots/pixel statistics/reports go to `%TEMP%/polyshade-0.2.6/`.

Set `POLYSHADE_BENCHMARK=1` for longer matched measurements; `POLYSHADE_RELEASE=0.2.0` tests the immutable baseline. `POLYSHADE_PROFILE=1` records pass profiles, `POLYSHADE_EXPERIMENT=1` records MSAA/calibration comparisons, and `POLYSHADE_OUTPUT` chooses a separate folder. These switches affect the test harness only.

Set `POLYSHADE_OPTIMIZATION=1` and `POLYSHADE_RELEASE=0.2.4` or `0.2.5` for the matched optimization benchmark. It measures controller-inclusive CPU time, asynchronous GPU time, actual frame gaps, cold shaders and buffer churn during driving, braking and changing sun occlusion. Cloud animation is frozen only in this comparison harness.
