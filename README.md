# PolyShade 0.5.6

A graphics mod for **PolyTrack 0.6.3**, loaded through PolyModLoader. Warm directional sunlight, cool shaded faces, glossy car paint and broad soft clouds give the low-poly world a cinematic racing-game look.

## Install

Install [PolyModLoader](https://polymodloader.com/), then paste this **0.5.6 install link** into its mod manager:

```text
https://cdn.polymodloader.com/gh/michael201110/poly-shade/main/
```

[Install PolyShade 0.5.6](https://cdn.polymodloader.com/gh/michael201110/poly-shade/main/) · [Pinned 0.5.6](https://cdn.polymodloader.com/gh/michael201110/poly-shade/v0.5.6/)

Select **0.5.6 / latest**, move the mod to Loaded, and reload the game. The panel heading should say **PolyShade 0.5.6**. Remove duplicate old PolyShade entries. Saved settings stay in effect; choosing a preset resets its explicit overrides.

PML's [sharing format](https://wiki.polymodloader.com/sharing-your-mod/) uses the repository root as the install URL, rather than the JavaScript file or release directory. The root manifest maps 0.6.3 to `0.5.6/version.json` and `0.5.6/main.mod.js`; historical bundles are preserved.

## Experimental upscaling and frame generation

FSR 3.1 SR and AMD optical-flow/frame generation are integrated in this
repository's `main` branch. The FSR path remains opt-in, and frame generation is
off by default. The pinned preview includes bounded presentation, diagnostics,
fallback handling, movement fixes and temporal edge-shimmer corrections. See
[FSR port status](docs/fsr31-webgpu.md), [frame-generation implementation and
T500 measurements](docs/frame-generation.md), and
[temporal stability notes](docs/temporal-jitter-stability.md).

[Install the pinned preview](https://cdn.polymodloader.com/gh/michael201110/poly-shade/v0.6.0-fsr31.3/experimental/).
This includes the movement/history fixes and temporal edge-shimmer corrections.
FG does not deliver 4K/60 on the tested T500; leave it off when ordinary
rendering already reaches 60 FPS. The default stable root manifest remains on
0.5.6 until a stable release is promoted.

## What's changed in 0.5.6

This is a stability rollback to the 0.5.4 renderer after reports of severe input lag and frame drops on 0.5.5, including below 1080p. It removes the 0.5.5 ray-target and SGSR2 changes while retaining the prior 0.5.4 renderer. Please report whether this restores normal gameplay before performance work resumes.

## What's changed in 0.5.5

The 64-tap sun-ray integration renders into a quarter-resolution target; the existing screen-space softening keeps the rays smooth while removing redundant integration work. In the moving 4K Golden Hour profile this reduced the rays pass from 19.46 ms to 1.84 ms and total measured GPU work from 105.58 ms to 89.72 ms. SGSR2 also hoists its scale term out of the per-pixel kernel, reducing the 50% upscale median by about 1 ms. This is a material improvement, but native 4K still does not meet 60 FPS on the tested T500. See [the 4K GPU investigation](docs/0.5.5-4k-gpu-investigation.md).

## What's changed in 0.5.4

SGSR2 Compute now reuses decoded source texels within each 8×8 workgroup while preserving its filter taps and temporal behavior. On the NVIDIA T500 this reduces the 4K upscale pass by about 7–8% at 50–67% scales. Golden Hour effects, output resolution, swarm batching, and the 0.5.3 release bundle remain unchanged. See the [4K measurements and visual checks](docs/0.5.4-4k-performance.md).

## What's changed in 0.5.3

Liquid glass controls match PolyBot, with coordinated panel placement and shared **F2** recording visibility. Rendering quality, presets and GPU paths are unchanged. See [recording UI and compatibility](docs/recording-ui.md).

## What's changed in 0.5.2

Fixes high-count swarm renderer switching with **PolyBot bridge 0.1.49**: packed replay data stays in worker renderers instead of reconstructing hundreds of native ghost objects. PolyShade now explicitly retires its owned GPU device on disable. Install both updates for the complete fix; shaders, presets and replay interpolation are unchanged. See [handoff ownership, compatibility and verification](docs/0.5.2-renderer-handoff.md).

## What's changed in 0.5.1

Performance release based on **0.5.0**, with the same visuals and settings. Version-driven swarm/skid uploads, GPU motion history, exact indexed velocity geometry, cached scene discovery/material synchronization and persistent post/SGSR2 bindings reduce CPU work and frame spikes.

On the T500, live Golden Hour + SGSR2 50% + 500 recorded cars improved from **47.8 to 59.9 FPS**, p99 **70.3 to 20.1 ms**. No cars, geometry, skid marks or effect quality were removed. PolyBot remains optional; its API v1 and native fallback are unchanged. See [measurements, fidelity checks and remaining limits](docs/0.5.1-performance.md).

## What's changed in 0.4.1

**PolyShade now renders exclusively with WebGPU.** Fragment and renderer-backend controls, the active WebGL effects pipeline and Three's automatic WebGL fallback have been removed. Saved Fragment settings migrate to SGSR2 Compute. Native, Reduced, Auto and Compute all use WebGPU; the DOM HUD remains at native resolution.

The WebGPU shaders now follow the established Fragment presentation more closely: authored car gloss and texture maps, sky without world fog, bloom thresholds/colour, depth-aware AO filtering and softened sun rays. Interpolated shadow filtering removes the sparse shadow grid; depth reconstruction uses actual depth-texel centres to prevent AO stripes on smooth roads.

WebGPU failures stop enhanced rendering and display an error. Press Home to disable the mod and return to the native game. **PolyTrack's own bootstrap, utility renderers and disabled-mod renderer still use WebGL**; removing those would require changing PolyTrack itself. Historical release bundles and test-only GL comparison fixtures remain preserved.

See [visual comparisons, verification and limits](docs/0.4.1.md). Run `npm run verify:webgpu` for real-device temporal/lifecycle checks, `npm run verify:visual` for paired reference captures, or `npm run verify:upscaling` for the current GPU-only benchmark. Set `POLYSHADE_HEADED=1` to watch these browser checks.

## What's changed in 0.4.0

The entries below describe historical releases; their GL behavior does not apply to 0.4.1.

**WebGPU now renders the complete 3D scene, effects and native-resolution presentation on one GPUDevice.** The renderer defaults to Auto: compatible browsers use the isolated Three r181 WebGPU renderer; unavailable devices or unsupported material callbacks restore the established WebGL path. The original canvas keeps gameplay input, and the HTML HUD/panel stay sharp at native resolution.

Under **Upscaling**, **SGSR2 Compute** runs Qualcomm's actual two-pass compute algorithm, ported to WGSL. Auto prefers Compute on WebGPU and Fragment on WebGL. Explicit Fragment selects the WebGL reference renderer. Native remains the default upscaling mode. The 100%, 77%, 67%, 59% and 50% presets change internal 3D resolution while output stays native.

Static depth reprojection, rigid/morphed car velocity, local disocclusion rejection and actual previous-frame jitter feed persistent GPU histories. The port includes stylized sky, environment reflections, cascaded sun shadows, contact AO, bloom, shafts, volumetric sunlight, grading, motion blur and lens effects. No WebGL image copy or normal-frame CPU image readback bridges the renderers.

See [the WebGPU architecture, measurements, verification and compatibility limits](docs/0.4.0-webgpu.md). GPU mode uses a separate pinned Three dependency; arbitrary legacy shader callbacks, skinned meshes and moving instanced objects need dedicated adapters. Unsupported visible shader materials fall back to WebGL instead of rendering corrupted geometry. Transparent ghosts render, but their independent temporal motion remains a limitation.

Run `npm run verify:webgpu` for real-device, dispatch, five-scale, temporal, resize, debug and device-loss checks. `npm run verify:upscaling` compares both renderer backends and their genuine SGSR2 implementations. Historical **0.3.5** stays available at its [pinned install link](https://cdn.polymodloader.com/gh/michael201110/poly-shade/v0.3.5/).

## What's changed in 0.3.5

Optional **SGSR2 Fragment** temporal upscaling reconstructs a reduced-resolution scene to native canvas resolution before presentation. Under **Upscaling**, choose SGSR2 Fragment or Auto, then 100%, 77%, 67%, 59%, 50% or a custom scale. Native is the default. Auto selects Fragment when supported, otherwise Native. Compute is unsupported in this WebGL renderer and falls back to Native.

Static velocity comes from depth/camera reprojection, with independent rigid car and wheel motion composited over it. Jitter and both colour/geometry history reset across camera cuts, resize, run resets and mode changes. Depth consistency and previous moving-car coverage reject newly revealed road locally while static markings keep their history. The DOM HUD remains native and sharp. FXAA is bypassed during SGSR2; the existing colour grading and final colour-space presentation remain in use.

Diagnostic views expose static/car/combined velocity, depth, jitter, global history validity, per-pixel history rejection, previous colour history, low-resolution colour and a native comparison. Per-pass profiling reports scene, reconstruction and geometry-history costs; total GPU timing is sampled without nested queries or synchronous readbacks.

See [architecture, T500 measurements, visual checks and limitations](docs/0.3.5.md), [the inspected original pipeline](docs/sgsr2-pipeline.md), and [Qualcomm attribution and license](THIRD_PARTY_NOTICES.md). `npm run verify:temporal` checks the inputs and local disocclusion on the GPU; `npm run verify:upscaling` benchmarks all five scales in the real PML game.

In the documented 1280×720 T500 capture, SGSR2 at **50% reduced GPU frame time by 15.7%** (3.22 → 2.72 ms); **67% reduced it by 4.3%** (3.08 ms). These are view-specific rendering measurements, not gameplay FPS gains. The report includes scene/reconstruction costs and all five scales, including the extra cost of temporal reconstruction at 100%.

## What's changed in 0.3.4

Home now toggles PolyShade rendering. End hides or restores the panel, and the panel's close button fully dismisses it. These shortcuts work without toggling the other function.

## What's changed in 0.3.3

Shadow receivers now reject invalid or out-of-range light projections before sampling a shadow map, and native cascade fades avoid division by zero. Native shadow callbacks and material handles remain connected to the game. Contact-shadow searches use an incremental spatial index instead of raycasting every track instance.

The compact panel has a separate close button that hides it completely.

Exposure, blur and other uniform controls retain linked materials; hidden native cascade shaders are warmed, and auxiliary render scenes no longer discard the main scene's GPU resources. Full-resolution shafts and the existing visual presets are preserved.

Tested in Edge on an NVIDIA T500 with Summer 2's #1 replay, including Golden Hour / High shadows. See [the fixes, GPU tests and verification limits](docs/0.3.3.md). The exact reported black-box screenshot could not be reproduced, so this release does not establish that every cause of that symptom is resolved.

## What's changed in 0.3.2

Reworked motion blur to use actual movement relative to the camera, including per-part car velocity. A steady car in a follow camera stays sharp; passing scenery or a moving car in a fixed camera blurs. Shutter exposure is consistent across frame rates, with smoother sampling and depth-aware edges. Vanilla and Lite keep it off. This updates 0.3.2 without a new version.

See the [0.3.2 implementation notes](docs/0.3.2.md).

## What's changed in 0.3.1

The car's contact shadow is stronger when its wheels meet the track and fades smoothly as it rises. This fixes the visible switch from a dark airborne sun shadow to a faint ground shadow, including beneath overhead structures. Lens ghosts now vary in size, brightness and softness, with gentler rainbow colour separation. **Clear Day** and **Soft Overcast** add distinct looks without volumetric passes.

See the [0.3.1 screenshots and verification](docs/0.3.1.md).

## What's changed in 0.3.0

- **Shadow overhaul:** track instances keep their casting/receiving flags regardless of their object origin. Native cascades retain their calibrated normal biases, adjusted for resolution. Depth bias is converted to each cascade's actual world scale instead of applying a near-map bias across a 15 km frustum. Local shadows use texel-sized normal bias.
- **Grounding under structures:** the car's contact shadow now uses geometry PML actually exposes. It follows banked/inverted surfaces and the car on every frame, checks the contacted track instance first, and disappears over gaps. Stronger local AO supplies contact shading independently of the directional shadow map.
- **Black-patch safeguards:** depth reconstruction stays finite at distant surfaces and sky depth; degenerate AO normals and invalid optional-effect samples use neutral/fallback values. Distant AO fades out smoothly. Flare rings avoid undefined negative-base powers.
- **Mid-drive freeze fix:** brake lights keep a stable shader light count. Braking, distance culling and hidden cars change power to zero instead of toggling light visibility and triggering new scene shader compilations. Only the actual light configuration is warmed. Track/cars remain bounded to three nearby opaque vehicles.
- **Full-resolution shafts:** volumetric sunlight renders at the scene's complete resolution, including manual scene supersampling, up to GPU limits. Radial rays render at output resolution with 64 integration taps. The previous half-resolution/1024-wide caps are removed. Depth comparisons soften edges; a bilateral composite preserves occluder boundaries.
- **Art direction:** richer colour separation, cooler fill, stronger sun rays, more reflective paint/metal, stronger contact shading and restrained rainbow ghosts. Native paint/CSM shader handles stay intact; only their surface uniforms change.

See [verification, measurements and limitations](docs/0.3.0-overhaul.md).

## Presets

| Preset | Shadow map | Effects |
| --- | --- | --- |
| Vanilla | Native | Restore native rendering |
| Clear Day | 2048 | Higher white sun, blue sky, sparse clouds, modest optical effects, subtle motion blur |
| Soft Overcast | 2048 | Diffuse cool light, broad cloud cover, soft shadows; optics off, subtle motion blur |
| Golden Hour Lite | 1024 | Stylized sky/environment, car grounding, FXAA; AO/bloom/optics/motion blur off |
| Golden Hour | 2048 | Broad clouds, medium AO, subtle bloom, stronger rays, restrained flare and motion blur; volumetrics off |
| Golden Hour Capture | 2048 | High AO/environment, full-resolution volumetric sunlight, stronger rays, FXAA and subtle motion blur |

All enhanced presets use 1x scene resolution by default. Manual render scale and MSAA are available. Increasing resolution adds GPU cost, particularly when Capture's sun is partially occluded; Lite and Golden keep volumetric sunlight off by default. Full-resolution buffers are allocated once and retained through occlusion transitions, and shaft passes skip blocked/behind-camera/irrelevant views.

## Controls and lighting

**Home** toggles PolyShade; **End** hides or restores the panel. The panel exposes sky, sun direction, environment, shadows, materials, atmosphere, rays, volumetric strength/density/decay/samples/distance, colour grading and quality. Vanilla, Disable and Home restore original materials, surface uniforms, lighting, background, environment, shadow settings and renderer state. Track changes dispose owned effects.

Motion blur tracks screen movement, with depth-aware boundaries and a pixel limit. Under Post Processing, **Motion blur exposure (ms)** sets shutter duration directly: enhanced presets use 22 ms, and the maximum is 64 ms. The default trail limit is 32 pixels; use 32-48 ms / 64 pixels for a stronger visible effect. Saved shutter overrides are converted to their previous exposure duration, so selecting a preset again applies the stronger defaults.

A single sun direction drives the procedural disc, shadows, sky glow, cloud illumination, generated environment, aerial perspective and shafts. Clouds use broad smooth shapes. The environment is generated/cached from that sky; no photographic HDRI or external art asset is loaded.

Brake lamps use real short-range, unshadowed SpotLights aimed rearward/downward from the native lamp geometry. Car-local source/target points transform into world space each frame, including banking and inversion. Their scene-root light objects stay visible at zero power when inactive to avoid lighting-shader churn. Ghosts are excluded. Physics, inputs, replay timing and camera transforms are unchanged.

## Rendering and diagnostics

WebGPU draws the scene into GPU-owned HDR colour and depth through a synchronized scene/material compatibility layer. Reduced-resolution AO with bilateral filtering and small bloom buffers feed one colour-grade/tone-map pass and optional FXAA. Scattering uses a low-sample screen-space approximation rather than expensive world-space volumetrics. Extinction weights advance incrementally instead of evaluating exponential/power functions at every slice. Screen-space scattering cannot see offscreen occluders; reflections represent the generated sky.

The material inspector supports Alt-click picking and persistent `material:`, `mesh:` and `parent:` overrides with `*` wildcards. Known native paint, CSM, morph and PolyShade callbacks have GPU adapters. Unknown custom shader callbacks, skinned meshes and compressed textures need dedicated adapters and stop enhanced rendering. Transparent ghosts render, but independent ghost motion remains a temporal limitation.

Diagnostics expose target sizes/estimated bytes, allocations, temporal state, compute dispatches, CPU/GPU timings and failures. Per-pass profiling is optional. Asynchronous visibility/GPU feedback never waits for a GPU fence during gameplay. Compute reconstruction failures select native-resolution WebGPU rendering; renderer failures stop enhancement. Render state restores in `finally`. Native offscreen/XR rendering bypasses post effects. Manager-only unloading may require a reload if PML does not call the mod's disposal lifecycle.

## Build and verify

```sh
npm ci
npm run check
npm run verify:webgpu
npm run verify:visual
npm run verify:upscaling
```

Three.js 0.181.2 is pinned for the isolated WebGPU renderer. Playwright, esbuild and PNG tooling are development dependencies. Current verification uses Microsoft Edge and the official PML CDN with a fresh profile. The GPU verifier checks real-device dispatch, all five scales, presets, debug views, resize, history rejection, camera motion, static marking stability and device loss. It attempts Summer 2's #1 replay and records an offline live-driving substitute if the public leaderboard is unavailable.

To watch the tests, set `$env:POLYSHADE_HEADED='1'` in PowerShell. Reports and screenshots go to `%TEMP%/polyshade-webgpu`, `%TEMP%/polyshade-visual-match` and `%TEMP%/polyshade-sgsr2` respectively.

`verify:reference:live`, `verify:reference:replay` and `verify:reference:temporal` retain historical WebGL checks for comparison; they do not verify the current renderer. Earlier calibration reports and immutable bundles remain in [docs](docs/).
