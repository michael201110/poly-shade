# Third-party notices

## AMD FidelityFX FSR 3.1 (experimental)

The experimental branch includes AMD's SR 3.1.5 reference shaders translated to
WGSL, and the unmodified frame interpolation 3.1.6 / optical-flow reference for
the subsequent frame-generation phase. This is a community WebGPU port, not AMD
certification. Frame generation is not enabled by this initial SR experiment.

- Official repository: https://github.com/GPUOpen-LibrariesAndSDKs/FidelityFX-SDK
- SDK tag: `v2.3.0`; revision `60f4ea81909200d8542eca14dccb2628b763a9a3`.
- Copyright (C) 2026 Advanced Micro Devices, Inc.
- MIT license: [vendor/fidelityfx/LICENSE.txt](vendor/fidelityfx/LICENSE.txt).
- Unchanged sources and individual SHA-256 checksums: [vendor/fidelityfx/reference.json](vendor/fidelityfx/reference.json).
- Adaptations and qualification status: [docs/fsr31-webgpu.md](docs/fsr31-webgpu.md).
- Offline translation uses Microsoft DXC and Naga 30.0.1 through `naga-wasm`
  30.2.0 (MIT OR Apache-2.0). The compiler is development-only and is not included
  in the browser mod.

## Snapdragon Game Super Resolution 2

PolyShade includes Qualcomm Innovation Center's actual SGSR2 two-pass fragment shaders and a WGSL port of its two-pass compute shaders under the BSD 3-Clause license.

- Official source: https://github.com/SnapdragonGameStudios/snapdragon-gsr
- Pinned revision: `d926f074bcb9d714e179f1ce0fcb9ee2eeb5074e`
- Files: `sgsr/v2/include/glsl_2_pass_fs/sgsr2_convert.fs` and `sgsr2_upscale.fs`
- Compute reference: `sgsr/v2/include/glsl_2_pass_cs/sgsr2_convert.comp` and `sgsr2_upscale.comp`, retained unmodified in `src/vendor/sgsr2/`.
- Unmodified upstream shader text is wrapped in `src/vendor/sgsr2/reference.js`.
- Full license: [src/vendor/sgsr2/LICENSE](src/vendor/sgsr2/LICENSE). It is also retained as a legal comment in the distributed mod bundle.
- Copyright (c) 2023, 2024 Qualcomm Innovation Center, Inc. All rights reserved.

`src/shaders/sgsr2.js` contains the explicit WebGL2/input adapters and a local depth/coverage-based history rejection extension. These are PolyShade modifications. Qualcomm's reconstruction kernel, local depth clipping, variance clamp and temporal weighting are retained. Port details and deviations are documented in [docs/0.3.5.md](docs/0.3.5.md).

Reproduce the vendored wrapper with `node scripts/vendor-sgsr2.mjs <official-checkout-path>` at the pinned revision. This checks the checkout revision and preserves the upstream text and license.

The WGSL port and local rejection extension are in `src/shaders/sgsr2-compute.wgsl.js`. Integration differences are described in [docs/0.4.0-webgpu.md](docs/0.4.0-webgpu.md).

## Three.js

The WebGPU compatibility renderer bundles Three.js **0.181.2**, including the CSMShadowNode addon, under the MIT license. PolyTrack's native Three.js objects remain owned by the game; the isolated replacement renderer uses this pinned dependency. Full license: [src/vendor/three/LICENSE](src/vendor/three/LICENSE). Source: https://github.com/mrdoob/three.js/tree/r181 .
