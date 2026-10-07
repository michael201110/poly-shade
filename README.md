# PolyShade

PolyShade is a rendering-only PolyModLoader mod for PolyTrack 0.6.3. It enhances the live Three.js scene used by the game; it does not create a second renderer or replace game assets, geometry, physics, controls, timing, or simulation code.

The PML mirror used to establish the first compatibility target declares PolyTrack 0.6.3 and ships the game's WebGLRenderer/Three.js bundle. PolyShade discovers Three.js through PML's scoped `getFromPolyTrack` hook and instruments the real `WebGLRenderer.render(scene, camera)` call. It does not assume a global `THREE` object.

## Build and install

Install [PolyModLoader](https://polymodloader.com/), then add this [PolyShade install URL](https://cdn.polymodloader.com/gh/michael201110/poly-shade/main/) in its mod manager:

```text
https://cdn.polymodloader.com/gh/michael201110/poly-shade/main/
```

The URL uses PolyModLoader's [documented GitHub CDN format](https://wiki.polymodloader.com/sharing-your-mod/) and serves the published `main` branch. Local changes become available through it after they are pushed.

PolyShade 0.1.2 fixes the renderer connection: it discovers the actual scoped Webpack require and intercepts constructor-assigned render methods before game initialization. Versions 0.1.0 and 0.1.1 could remain inactive despite being enabled. Remove the old entry, add the install URL using the latest version, enable it, and reload the game. Select Reset preset to clear old shadow coverage overrides.

To build from source:

```sh
npm install
npm test
npm run build
```

The PML release entry is `0.1.2/version.json`; its generated `main.mod.js` is the browser-loadable mod entry. The repository root `manifest.json` maps PolyTrack 0.6.3 to that release. Do not edit the generated entry by hand; rebuild it from `src/`.

## Reference look

The Golden Hour profiles target warm cream architecture, blue-grey shadows, low afternoon sunlight, matte roads and sharper car highlights. Golden Hour is the default for new installs. Existing saved preset IDs and overrides remain compatible; select a preset or Reset preset to clear old overrides.

| Preset | Intended use | Main differences |
| --- | --- | --- |
| Vanilla | Baseline / comparison | Restores captured renderer, scene, light, and material state. |
| Golden Hour Lite | Lower-cost gameplay | 30-degree sun, 1024 shadow map, lighter contrast. |
| Golden Hour | Default reference look | 26-degree sun, cooler hemisphere fill, 2048 shadow map. |
| Golden Hour Capture | Quality-first capture | Same palette with a 4096 shadow map. |

Opaque MeshBasicMaterial surfaces with normals are converted to the game's own lit material (Phong when available, otherwise Standard or Lambert) so sunlight and shadows actually affect previously unlit geometry. Maps, vertex colors, sidedness, alpha testing, depth flags and supported animation flags are preserved. Custom shader callbacks, wireframes, glass and translucent/replay materials are excluded. Named Standard/Phong surfaces receive matte road/concrete and brighter car highlight tuning. Neutral untextured surfaces get adjustable cream warmth; saturated paint colors stay intact. Color and common visibility/texture changes are synchronized each frame, including updates made directly through replacement materials during async model loading.

A fixed-size shadow region follows the camera and is aligned to shadow texels. Its coverage defaults to 30 game units on either side of the focus, avoiding the loss of resolution from fitting a single shadow map to an entire large track. Opaque geometry casts and receives shadows, including unnamed architecture. Geometry beyond this region can lose dynamic shadows; increase Shadow coverage for wider views at the expense of local detail. PCF filtering provides adjustable edge softness, rather than physical area-light shadows.

ACES tone mapping softens highlights. Haze is optional and off by default to keep the close track clear. There is no screen-space AO, bloom, motion blur or depth of field pass. PolyTrack's native context antialiasing is retained. Camera transforms, FOV and canvas CSS filters remain unchanged.

## Controls and persistence

- F7 toggles PolyShade on/off for before/after comparison.
- The compact panel selects a preset and live-tunes sun intensity/azimuth/elevation/color, ambient fill/color, cream warmth, shadow coverage/softness, haze, exposure, shadow map size, and render scale.
- Selecting a preset clears its custom overrides. Changing a control stores an override.
- Settings are saved as versioned JSON in `localStorage` under `polyshade.settings`.
- Render diagnostics are opt-in and report render-call FPS, average/p95 WebGL render-call time, active preset, render scale, shadow map, and modified material count. These are runtime observations, not benchmark claims.

The HTML control panel and game HUD remain outside the WebGL canvas. Material replacements preserve maps and rendering flags; original materials are retained and restored on disable. In the normal shadow mode, a dedicated sun and hemisphere fill shape the scene, and native lights are temporarily muted and restored on disable. Native cascaded shadow modes retain their directional light layout and material shader hooks; the extra sun is removed to avoid invalid cascade shader indices. In those modes, the game controls cascade coverage and map sizes. Named/translucent replay ghost materials are left untouched so their colors and tint updates remain under the game's control.

## Compatibility and limitations

- Supported target: PolyTrack 0.6.3 under a PML build exposing `getFromPolyTrack`, `preInit`, `postInit`, and `onGameLoad`.
- PolyShade only hooks the live Three.js renderer. It does not use simulation-worker or physics mixins and does not access controls or PolyBot messages.
- Scene/material discovery runs on attach and once per second; bounds refresh at most once every five seconds. The frame hook updates the shadow focus, synchronizes source material changes, applies changed settings and records render timing.
- Unnamed opaque Basic materials with normals can receive lighting. Unknown shader materials remain unchanged, and glass is deliberately not modified.
- The inspected 0.6.3 bundle exports Standard and Lambert materials, but not Phong. Conversion uses the available constructor; if none is available, it is skipped.
- Renderer features are detected at runtime. Unsupported effects are logged and skipped. The inspected Three.js bundle exposes tone mapping, scene background/fog, directional/ambient lights, and shadow-map controls; it does not include native bloom or AO passes.
- PML 0.6.3 does not expose a general mod-unload callback. F7, Vanilla, the Disable button, and page unload restore captured state; a PML unload while the page remains open may leave the lightweight hook installed until reload.
- Automated tests cover conversion and source updates using real Three.js classes, camera shadow coverage on large geometry, and restoration. Three.js is a development-only test dependency; the mod uses the game bundle at runtime. A live Edge browser test loads the actual PML 0.6.3 game with the local built mod, confirms rendered frames and 42 tuned mesh assignments on Summer 1, captures before/after images, checks F7 disable/re-enable, and switches to native cascaded shadows with shader diagnostics enabled. No GPU benchmark or multiplayer validation has been performed.

## Live test checklist

1. Load PolyTrack with PolyShade disabled or Vanilla selected.
2. Capture a screenshot of a fixed scene for the baseline.
3. Enable Golden Hour Lite.
4. Compare lighting, shadows, and material response against the baseline.
5. Select Golden Hour.
6. Select Golden Hour Capture.
7. Drive at speed through a section with barriers and varied track geometry.
8. Check for shadow flicker and unstable shadow edges.
9. Check for material corruption or incorrect transparency.
10. Check car visibility, body response, and paint color.
11. Check replay ghost colors and training-age tints.
12. Check that the AI HUD remains readable and unaffected.
13. Restart the current track.
14. Confirm there are no duplicate PolyShade lights, fog objects, or render hooks.
15. Change to a different track.
16. Confirm PolyShade attaches to the new live scene and reapplies the chosen preset.
17. Toggle PolyShade off using the Disable button.
18. Confirm the captured vanilla rendering state is restored.
19. Toggle PolyShade back on using F7.
20. Measure FPS and frame time for Vanilla, Golden Hour Lite, Golden Hour, and Golden Hour Capture on the target GPU; record actual measurements rather than estimating them.

## Repeat the live check

With Microsoft Edge installed, run `npm run verify:live`. The test uses a fresh browser profile, loads the official PML CDN game, intercepts only the test mod URL to serve the local build, and instruments that response for test assertions. It does not change the shipped bundle or your normal browser profile. Login requests from the CDN test origin may fail; the local Summer 1 track remains available. Screenshots are written to the system temporary directory as `polyshade-golden.png` and `polyshade-vanilla.png`.
