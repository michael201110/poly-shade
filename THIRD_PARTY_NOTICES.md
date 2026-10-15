# Third-party notices

## Snapdragon Game Super Resolution 2

PolyShade includes Qualcomm Innovation Center's actual SGSR2 two-pass fragment shader implementation under the BSD 3-Clause license.

- Official source: https://github.com/SnapdragonGameStudios/snapdragon-gsr
- Pinned revision: `d926f074bcb9d714e179f1ce0fcb9ee2eeb5074e`
- Files: `sgsr/v2/include/glsl_2_pass_fs/sgsr2_convert.fs` and `sgsr2_upscale.fs`
- Unmodified upstream shader text is wrapped in `src/vendor/sgsr2/reference.js`.
- Full license: [src/vendor/sgsr2/LICENSE](src/vendor/sgsr2/LICENSE). It is also retained as a legal comment in the distributed mod bundle.
- Copyright (c) 2023, 2024 Qualcomm Innovation Center, Inc. All rights reserved.

`src/shaders/sgsr2.js` contains the explicit WebGL2/input adapters and a local depth/coverage-based history rejection extension. These are PolyShade modifications. Qualcomm's reconstruction kernel, local depth clipping, variance clamp and temporal weighting are retained. Port details and deviations are documented in [docs/0.3.5.md](docs/0.3.5.md).

Reproduce the vendored wrapper with `node scripts/vendor-sgsr2.mjs <official-checkout-path>` at the pinned revision. This checks the checkout revision and preserves the upstream text and license.
