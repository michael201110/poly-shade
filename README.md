# PolyShade 0.3.2

A graphics mod for **PolyTrack 0.6.3**, loaded through PolyModLoader. Warm directional sunlight, cool shaded faces, glossy car paint and broad soft clouds give the low-poly world a cinematic racing-game look.

## Install

Install [PolyModLoader](https://polymodloader.com/), then paste this **versioned 0.3.2 install link** into its mod manager:

```text
https://cdn.polymodloader.com/gh/michael201110/poly-shade/v0.3.2/
```

[Install PolyShade 0.3.2](https://cdn.polymodloader.com/gh/michael201110/poly-shade/v0.3.2/)

Select **0.3.2 / latest**, move the mod to Loaded, and reload the game. Remove duplicate old PolyShade entries. Saved settings stay in effect; choosing a preset resets its explicit overrides.

For automatic future updates, use the [main install link](https://cdn.polymodloader.com/gh/michael201110/poly-shade/main/). PML's [sharing format](https://wiki.polymodloader.com/sharing-your-mod/) uses the repository root as the install URL, rather than the JavaScript file or release directory. The root manifest maps 0.6.3 to `0.3.2/version.json` and `0.3.2/main.mod.js`; historical bundles are preserved.

## What's changed in 0.3.2

Added depth-aware camera motion blur with an enable switch, strength and pixel limit. It is enabled subtly in the enhanced presets, skipped during camera cuts and capped to protect track readability. Vanilla and Lite keep it off. Motion blur is integrated into the existing colour pass and adds no render target.

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

**F7** toggles PolyShade. The panel exposes sky, sun direction, environment, shadows, materials, atmosphere, rays, volumetric strength/density/decay/samples/distance, colour grading and quality. Vanilla, Disable and F7 restore original materials, surface uniforms, lighting, background, environment, shadow settings and renderer state. Track changes dispose owned effects.

Camera motion blur is depth aware and capped by a pixel limit. It keeps the player's car near the focus point sharp and puts stronger trails on the distant scenery. Adjust its toggle, strength and maximum trail length under Post Processing.

A single sun direction drives the procedural disc, shadows, sky glow, cloud illumination, generated environment, aerial perspective and shafts. Clouds use broad smooth shapes. The environment is generated/cached from that sky; no photographic HDRI or external art asset is loaded.

Brake lamps use real short-range, unshadowed SpotLights aimed rearward/downward from the native lamp geometry. Car-local source/target points transform into world space each frame, including banking and inversion. Their scene-root light objects stay visible at zero power when inactive to avoid lighting-shader churn. Ghosts are excluded. Physics, inputs, replay timing and camera transforms are unchanged.

## Rendering and diagnostics

The native Three.js renderer draws the scene once into HDR colour and depth. Reduced-resolution AO with bilateral filtering and small bloom buffers feed one colour-grade/tone-map pass and optional FXAA. Scattering uses a low-sample screen-space approximation rather than expensive world-space volumetrics. Extinction weights advance incrementally instead of evaluating exponential/power functions at every slice. Screen-space scattering cannot see offscreen occluders; reflections represent the generated sky.

The material inspector supports Alt-click picking and persistent `material:`, `mesh:` and `parent:` overrides with `*` wildcards. Arbitrary shader callbacks, transparency, ghosts and brake emissive handles are preserved. Known native paint/metal/rubber materials receive reversible scalar surface tuning.

Diagnostics expose passes, target sizes/estimated bytes, allocation counts, contact shadows, shader warming, CPU/GPU timings and failures. Per-pass profiling is optional. Asynchronous visibility/GPU feedback never waits for a GPU fence during gameplay. Optional shader failures fall back safely, and render state restores in `finally`. Native offscreen/XR rendering bypasses post effects. Manager-only unloading may require a reload if PML does not call the mod's disposal lifecycle.

## Build and verify

```sh
npm ci
npm run check
npm run verify:live
npm run verify:replay
```

Development-only dependencies include Three.js, Playwright and PNG tooling. Live verification uses Microsoft Edge and the official PML CDN with a fresh profile. It checks presets, restoration, resizing, braking, cameras, driving, native CSM, occlusion and resource cycles. The replay verifier watches Summer 2's #1 replay and runs a GPU near/far/sky-depth regression; its public replay API bridge exists only in the test harness.

Reports/screenshots are written under `%TEMP%/polyshade-0.3.2/` and `%TEMP%/polyshade-replay-0.3.2/`. `POLYSHADE_RELEASE`, `POLYSHADE_OUTPUT`, `POLYSHADE_PRESET` and `POLYSHADE_CSM` select replay comparison settings. Older release calibration/optimization reports remain in [docs](docs/).
