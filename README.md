# PolyShade 0.2.0 ? Cinematic Rendering

A rendering-only PolyModLoader mod for **PolyTrack 0.6.3**. PolyShade enhances the game?s actual Three.js renderer. It never changes track geometry, camera transforms/FOV, physics, input, simulation workers, replay timing, or PolyBot messages.

## Install

Install [PolyModLoader](https://polymodloader.com/), then add the [PolyShade install URL](https://cdn.polymodloader.com/gh/michael201110/poly-shade/main/) in its mod manager:

```text
https://cdn.polymodloader.com/gh/michael201110/poly-shade/main/
```

Enable PolyShade, select **0.2.0 / latest**, and reload the game. Remove older duplicate entries first. The URL follows PML?s [documented GitHub CDN format](https://wiki.polymodloader.com/sharing-your-mod/). If the CDN still serves an older manifest, substitute the latest commit SHA for `main` in the URL; find that SHA in [the commit history](https://github.com/michael201110/poly-shade/commits/main/).

The root manifest maps PolyTrack 0.6.3 to `0.2.0/version.json` and `0.2.0/main.mod.js`. The three earlier release directories remain unchanged. Versions before 0.1.2 had a renderer connection bug; 0.2.0 retains the corrected PML lifecycle and constructor-assigned render interception.

## Visual direction

A **cinematic low-poly world**: cream surfaces, readable blue-grey shadows, warm sunlight, broad sky gradients and restrained highlights. The procedural sky fits PolyTrack?s stylized geometry. Clouds are enabled in Golden Hour and Capture, and remain optional in Lite. They use two layers of smooth, broad noise, with sunlight tint rather than fine photographic detail. There are no HDRI downloads, replacement art assets, or runtime Three.js dependencies.

One sun elevation/azimuth drives the sky disc, glow, lighting, shadows, environment, atmospheric tint and optional sun shafts. Automatic sun colour warms low elevations; manual palettes are available.

| Preset | Resolution scale | Shadows | AO / bloom / sun rays | Environment |
| --- | --- | --- | --- | --- |
| Vanilla | Native | Native | Restored native rendering | Native |
| Golden Hour Lite | 1.00x | 1024 | Off / off / off | 128?64 source |
| Golden Hour | 1.00x | 2048 | Low AO / subtle bloom / very subtle rays | 256?128 source |
| Golden Hour Capture | 1.25x | 4096 near | Higher AO / subtle bloom / stronger subtle rays; sharpening | 512?256 source |

Capture really renders the scene at 1600?900 on a native 1280?720 canvas and downsamples for output. Scale can reach 1.5x. Keeping supersampling in render targets avoids fighting PolyTrack?s per-frame pixel-ratio reset. Supersampling requires the post-processing path; disabling that path returns to native canvas resolution.

## Lighting, materials and reflections

A warm directional sun and cool hemisphere fill shape ordinary shadow modes. Real red point lights at the car?s brake-lamp geometry illuminate nearby road/surfaces when the game?s existing BrakeLight emissive state turns on. Power and reach are adjustable. Up to two unshadowed lamps per car are supported on the three nearest opaque cars; ghosts are excluded, and the lights are removed on disable. No controls or physics state are read or changed. Native directional/fill lights are temporarily muted and restored on disable. Sky and ground fill colours are adjustable.

The mod generates a small linear floating-point equirectangular sky environment, using the actual game?s UV convention. PolyTrack?s internal `WebGLCubeUVMaps` converts it to a filtered PMREM environment. Exported `CubeCamera` and `PMREMGenerator` are absent, so the mod uses the engine?s existing internal conversion rather than importing another Three.js build. Approximate cube face sizes are 32 / 64 / 128. The environment regenerates only when sky, sun, clouds or environment quality change; exposure and camera movement do not regenerate it. Slowly moving clouds use a static reflection snapshot between settings changes.

Car paint and metal receive stronger reflections; rubber and terrain stay matte. The game?s custom Main paint shader is preserved, with only its environment intensity adjusted and restored. Classification combines explicit material names, mesh/ancestor names, PBR properties, and corroborating geometry/colour evidence. Green alone never classifies an object as grass. Every result includes confidence and evidence.

Categories include road, grass, concrete, barriers, car paint, metal, tires, glass, markings, signage, emissive surfaces, architecture and unknowns. Opaque Basic materials with normals convert to Standard first, then Phong/Lambert if available. Selected named Lambert surfaces also gain PBR response. Existing normals and flat-shading choices are preserved. Maps, vertex colours, sidedness, transparency and render flags are preserved; source colour/visibility changes continue to synchronize.

Replay/ghost/translucent materials, wireframes and arbitrary custom shader callbacks are excluded from replacement. Subtle procedural roughness variation applies only to compatible matte PBR surfaces. No geometry or vertex positions are changed.

## Shadows

**Local path:** a forward-biased region follows the camera rather than fitting an entire track. Coverage adapts to observed camera displacement, height and FOV, remains bounded, changes in quantized steps, smooths its focus, and snaps to the light-space texel grid. Teleports reset the focus. Map sizes are 1024 / 2048 / 4096, clamped to GPU limits; bias, normal bias and PCF softness are adjustable. Geometry beyond this region can lose local shadows; wider coverage trades detail for reach.

**Native CSM path:** the extra sun is removed, preserving native cascade counts, split distances and shader hooks. The public CSM object receives the same sun direction, colour, near-cascade quality, bias and softness. Capture upgrades the first two maps to 4096 and keeps distant maps at 2048. Distant normal bias retains the native conservative values to avoid large-cascade acne. Native splits/frustum construction remain owned by the game. Turning native tuning off restores original map sizes/bias/softness while retaining the coherent sun direction; disabling PolyShade restores captured light/shadow settings.

## Post-processing and colour pipeline

The original renderer draws the game scene once into an HDR half-float target with depth and up to 4? MSAA when supported. Fullscreen passes reuse that renderer; they do not recurse through the game hook. Targets resize only when dimensions change, clamp to GPU limits, and are released when effects or the mod are disabled.

1. Scene rendering uses linear output and no tone mapping.
2. Reduced-resolution SSAO reconstructs view-space positions/normals from depth and samples 8/12/16 directions. Two bilateral blur passes preserve depth edges. It is restrained contact occlusion, not global illumination.
3. Quarter-resolution bloom thresholds HDR highlights and uses two small blur passes.
4. Optional quarter-resolution sun shafts sample depth around the projected procedural sun. They fade with partial occlusion and off-screen/behind-camera position, reject foreground surfaces, and stay quiet for fully clear/hidden suns. Lite disables them. Strength, decay, density and exposure are adjustable; no volumetric raymarching is used.
5. Depth-based aerial perspective grows with distance, favours the horizon, and warms toward the sun. Near road/car contrast stays clear. Fog is available explicitly and used as a depth-unavailable fallback.
6. Linear grading combines AO, bloom and shafts, then applies exposure, contrast, saturation, vibrance, temperature/tint, shadow lift, highlight shoulder, black/white levels and a small vignette. Filmic tone mapping occurs exactly once.
7. Optional FXAA and restrained sharpening run after grading; the final shader converts to sRGB exactly once.

The direct-render fallback uses Three?s ACES tone mapping and sRGB output. The original output mode is restored on disable, even though PolyTrack?s native scene uses linear output. Post passes restore render target/face/mip, viewport, scissor, clear colour/alpha, auto-clear, tone mapping/exposure, output colour space and XR state in `finally`. Native off-screen/XR renders bypass this pipeline. Failed optional passes are isolated; a failed final pass falls back to direct rendering.

## Controls and diagnostics

**F7** toggles the mod; Vanilla and Disable also restore native state. F7 is ignored while editing a text/select/input control. The panel collapses and groups controls into Sky, Lighting, Shadows, Materials, Atmosphere, Post Processing, Quality and Debug.

The material inspector lists categories, confidence, evidence, names and types. Use **Pick from canvas**, then Alt-click a surface. Persistent override patterns accept `material:`, `mesh:` or `parent:` with `*`, for example `mesh:Car*`. Save or remove a pattern in the inspector. Synthetic unnamed descriptors use geometry type/vertex count rather than UUIDs; identical anonymous geometry may share a descriptor, so such overrides can affect multiple meshes. `ignore` excludes replacement.

Settings are serializable JSON at `localStorage["polyshade.settings"]`, schema 2. Schemas 0 and 1 migrate valid settings without changing the saved enabled state. Selecting/resetting a preset clears overrides.

Diagnostics show CPU render submission average/p95, render-call rate, GPU query timings when available, active passes, HDR/depth support, target allocation/disposal counts, environment generation/resolution and failures. GPU queries are asynchronous and sampled every twelfth frame; disjoint results are discarded. CPU submission time is **not** complete GPU/frame time or a physics benchmark.

## Runtime support and cost

Live PML 0.6.3 testing found WebGL2, half-float render targets, depth textures, Standard/Physical materials, PointLight, ShaderMaterial, render targets, Raycaster and GPU timer queries. Exported CubeCamera, PMREMGenerator, Phong, AmbientLight, RawShaderMaterial, FogExp2 and Clock were unavailable. The native internal PMREM route works despite missing public constructors. Runtime capability detection gates optional effects; absent half-float support uses an LDR post target and disables the native HDR environment conversion, and absent depth disables AO/shafts with fog fallback.

Render scale and shadow resolution are the largest costs; AO, bloom and shafts add fullscreen work. Environment generation runs only after relevant setting changes. Lite allocates two post targets and omits AO/bloom/shafts entirely. Measured results and test conditions are in [the 0.2.0 verification report](docs/0.2.0-verification.md); they are observations from one headless Edge run, not hardware-independent promises.

This is screen-space lighting enhancement: no ray tracing, physically simulated volumetrics, SSR, full-scene reflection probes or global illumination. Screen-space AO cannot see off-screen geometry. Sun shafts represent sky-space scattering and deliberately avoid beams across foreground solids. The sky environment reflects the sky rather than nearby track geometry. Multiplayer and a separately installed PolyBot have not been exercised in the automated run; no messages, simulation or external HUD elements are modified.

PML has no general guaranteed unload callback. F7, Vanilla, Disable, explicit `dispose()` and page exit restore state and dispose owned resources; a manager-only unload can require a reload to remove the lightweight hook. Scene/material discovery is throttled to once per second, bounds to five seconds; owned sky geometry does not contribute to track bounds.

## Build and verify

```sh
npm ci
npm run check
npm run verify:live
```

`check` runs Node tests and builds the self-contained ESM entry from `src/mod.js`. Three.js, Playwright and PNG tools are development-only dependencies.

The live test needs Microsoft Edge and network access to the official PML CDN. It uses a fresh profile and intercepts only a test mod origin to serve this repository?s built entry. Test-only instrumentation captures frames/diagnostics; it is absent from the published mod. It verifies all presets, actual Capture resolution, resize, F7 state/material/environment restoration, disposal, native CSM/Capture maps, driving/restart, Summer 1?Summer 2, and shader failures. Login requests from the CDN test origin can fail while local tracks still load.

Screenshots and machine-readable timings/capabilities are generated in `%TEMP%/polyshade-0.2.0/`: `vanilla-before.png`, `cinematic-lite.png`, `cinematic.png`, `recording.png`, `vanilla-restored.png`, `stylized-sky-sun-rays.png`, `driving.png`, `brake-lights-on.png`, `brake-lights-off.png`, `summer-2.png`, `native-csm.png`, and `report.json`. PNG comparisons use real RGB error/brightness statistics. Restoration compares stable road geometry separately because the native sky and welcome arrow animate. These temporary images are not committed.
