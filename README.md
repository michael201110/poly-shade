# PolyShade

PolyShade is a rendering-only PolyModLoader mod for PolyTrack 0.6.3. It enhances the live Three.js scene used by the game; it does not create a second renderer or replace game assets, geometry, physics, controls, timing, or simulation code.

The PML mirror used to establish the first compatibility target declares PolyTrack 0.6.3 and ships the game's WebGLRenderer/Three.js bundle. PolyShade discovers Three.js through PML's scoped `getFromPolyTrack` hook and instruments the real `WebGLRenderer.render(scene, camera)` call. It does not assume a global `THREE` object.

## Build and install

```sh
npm install
npm test
npm run build
```

The PML release entry is `0.1.0/version.json`; its generated `main.mod.js` is the browser-loadable mod entry. The repository root `manifest.json` maps PolyTrack 0.6.3 to that release. Host the repository root and version directory on a static HTTPS URL, then add that root URL in PML's mod manager. Do not edit the generated entry by hand; rebuild it from `src/`.

## Presets

| Preset | Intended use | Main differences |
| --- | --- | --- |
| Vanilla | Baseline / comparison | Restores captured renderer, scene, light, and material state. |
| Cinematic Lite | Normal gameplay | Modest fill/sunlight tuning, 1024 shadow map, restrained ACES tone mapping and optional subtle haze. |
| Cinematic | Higher-quality gameplay | More directional shaping, 2048 shadow map, slightly stronger haze. |
| Recording | Quality-first capture | 4096 shadow map; render scale remains 1.0 unless explicitly raised. |

The defaults keep bloom and ambient occlusion off. The inspected game bundle contains Three.js core rendering but no native EffectComposer, bloom, or SSAO/GTAO pass. PolyShade does not add a replacement post-processing renderer. PolyTrack already requests native WebGL antialiasing (defaulting on through its settings); PolyShade leaves that context-creation setting intact. It also leaves temporal effects, motion blur, depth of field, FOV, camera transforms, and canvas CSS filters alone.

## Controls and persistence

- F7 toggles PolyShade on/off for before/after comparison.
- The compact panel selects a preset and live-tunes sun intensity/azimuth/elevation/color, ambient fill/color, haze, exposure, shadow map size, and render scale.
- Selecting a preset clears its custom overrides. Changing a control stores an override.
- Settings are saved as versioned JSON in `localStorage` under `polyshade.settings`.
- Render diagnostics are opt-in and report render-call FPS, average/p95 WebGL render-call time, active preset, render scale, shadow map, and modified material count. These are runtime observations, not benchmark claims.

The HTML control panel and game HUD remain outside the WebGL canvas. Material clones preserve the source material's color, maps, alpha, transparency, and other copied properties; only roughness/metalness or legacy shininess are tuned. Named/translucent replay ghost materials are left untouched so their colors and tint updates remain under the game's control.

## Compatibility and limitations

- Supported target: PolyTrack 0.6.3 under a PML build exposing `getFromPolyTrack`, `preInit`, `postInit`, and `onGameLoad`.
- PolyShade only hooks the live Three.js renderer. It does not use simulation-worker or physics mixins and does not access controls or PolyBot messages.
- Scene discovery, bounds, and material classification run on scene attach and at most once per second; the frame hook otherwise only applies changed renderer settings and records render timing.
- Sun direction and lighting effects depend on the live scene's light-responsive materials. Unnamed materials are left unchanged rather than guessed, and glass is deliberately not modified.
- A track using unlit materials will not receive dynamic-light response. PolyShade does not convert unknown materials because that can break textures, alpha behavior, batching, or replay tints.
- Renderer features are detected at runtime. Unsupported effects are logged and skipped. The inspected Three.js bundle exposes tone mapping, scene background/fog, directional/ambient lights, and shadow-map controls; it does not include native bloom or AO passes.
- PML 0.6.3 does not expose a general mod-unload callback. F7, Vanilla, the Disable button, and page unload restore captured state; a PML unload while the page remains open may leave the lightweight hook installed until reload.
- No live PolyTrack visual test or GPU benchmark has been performed in this workspace.

## Live test checklist

1. Load PolyTrack with PolyShade disabled or Vanilla selected.
2. Capture a screenshot of a fixed scene for the baseline.
3. Enable Cinematic Lite.
4. Compare lighting, shadows, and material response against the baseline.
5. Select Cinematic.
6. Select Recording.
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
20. Measure FPS and frame time for Vanilla, Cinematic Lite, Cinematic, and Recording on the target GPU; record actual measurements rather than estimating them.
