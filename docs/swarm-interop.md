# Optional swarm interface (0.5.0 prototype)

`globalThis.polyShadeSwarm` exposes optional API version 1. Normal PolyShade use
does not require PolyBot. PolyBot 0.1.48 can use the interface when capabilities
report a ready WebGPU backend; older callers retain their own renderer.

- `capabilities()` reports readiness, version, backend and maximum 500 cars.
- `registerSwarmSource({version:1,maxCars,groups,scene,onUnavailable})` registers
  shared geometry/material groups in the existing GPU world scene.
- `updateSwarmInstances(id,Float32Array,offsets,counts)` uploads 24 floats per
  instance: matrix16, linear RGB3, opacity1, parameters4.
- `updateSwarmTrails(id,Float32Array,offset,count,reset)` uploads native skid-ring
  deltas: ring identifier followed by four projected 3D corners.
- `unregisterSwarmSource(id)` releases the source's meshes, geometry and materials.
- `diagnostics()` reports shared draw counts, triangles and upload timings.

Groups preserve native material families (Standard, Physical, Basic or Phong),
flat shading and authored surface parameters. Suspension morphs are interleaved
to stay below the minimum WebGPU vertex-buffer limit. Mirrored wheel geometry
uses corrected winding and positive-determinant instance matrices. Instanced
motion vectors preserve stable slot identity for temporal reconstruction.

These objects share PolyShade depth, shadows and post processing. No separate
PolyShade canvas/backend is created for the swarm. No game physics, replay clock,
training or PolyBot imports are part of this interface. Source removal, backend
failure and track changes notify callers so they can fall back.

81 Node tests pass after the material and skid-ring fixes. Final performance
matrix, complete smoke/effect equivalence and live standalone fallback checks
remain in progress; early smoothness is not final acceptance evidence.
