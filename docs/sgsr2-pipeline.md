# SGSR2 integration: inspected pipeline

## Existing pipeline (before implementation)

PolyShade 0.3.4 discovers the game's own Three.js classes through PML's Webpack exports (`src/rendering/capabilities.js`). It does not ship npm Three.js; npm Three r180 is used only by development tests. The PML-loaded PolyTrack 0.6.3 runtime reports **Three r181**, verified separately through the game's `window.__THREE__` revision marker on 15 October 2026.

`src/renderer.js` wraps `WebGLRenderer.render`. `RenderController.onRender` selects the main scene, preserves native material/CSM callbacks and applies lighting. `aroundRender` calls `CinematicRenderer.render`, then `PostProcess.render`. There is no EffectComposer, WebGPURenderer or compute path.

The main scene is drawn once into the pooled `scene` WebGLRenderTarget with HDR colour and an UnsignedInt DepthTexture. Its dimensions already use `drawingBufferSize * renderScale`, although the existing setting only allows 100–150%. The canvas remains at its selected output size. Optional AO/bloom/shafts feed the existing grade/tone-map pass, then optional FXAA/sharpen and colour-space presentation. PolyTrack's HTML HUD and PolyShade's HTML controls are outside this target.

The game owns its perspective camera. Before this work, projection matrices are not jittered. `PostProcess.prepareCameraMotion` records current/previous unjittered camera VP, projection and world transforms for blur; `ObjectMotion` discovers opaque car bodies using native BrakeLight materials and proxies their rigid body/wheel geometry. Each proxy records its own previous world matrix. Static track instances do not need a geometry velocity pass. Transparent replay ghosts, skinned/deformed meshes and moving instances are not supported by that existing pass.

## Planned insertion

Keep the canvas/HUD native. Add reduced internal resolutions, independent temporal state and depth-reconstructed camera velocity; composite rigid car velocity over that fullscreen field. Validate those inputs before adding reconstruction. Preserve the grade implementation and run it at internal resolution when SGSR2 is active, then reconstruct graded linear colour to output resolution before the existing final colour-space presentation. Native rendering retains its existing path.

Use actual previous/current **rendered jittered VP matrices** to reconstruct depth and previous position, then remove their respective pixel jitter offsets to express velocity as unjittered current-minus-previous NDC. SGSR2 reprojects a stable output history, so that field must not contain jitter movement. Restore the game's projection and inverse after every draw, including fallback/error paths.

Port Qualcomm's actual `sgsr/v2/include/glsl_2_pass_fs` shaders from pinned upstream source, preserving the algorithm, license and documented WebGL adaptations. Compute is unsupported in this pass. WebGL textures cannot be passed to WebGPU without a separate renderer/resource architecture.

Implementation details, input validation, benchmarks and known limitations will be recorded in `docs/0.3.5.md` after verification.
