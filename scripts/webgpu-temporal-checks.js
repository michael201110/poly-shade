// Test-only GPU sampling. Production never reads scene pixels back to the CPU.
export async function verifyTemporalGPU(c) {
  const gpu = c.backends.gpu,
    t = c.three,
    device = gpu.device;
  // Diagnostic readbacks can stall longer than the production frame-gap
  // threshold. Like the fragment verifier, use a controlled 60 Hz clock for
  // these synthetic inputs so probe latency cannot reset the jitter sequence.
  const originalBegin = gpu.temporal.begin;
  let testTime = performance.now();
  gpu.temporal.begin = function (scene, camera, w, h, ow, oh, settings) {
    return originalBegin.call(
      this,
      scene,
      camera,
      w,
      h,
      ow,
      oh,
      settings,
      (testTime += 1000 / 60),
    );
  };
  try {
    const s = {
      ...c.resolveSettings(),
      renderBackend: "webgpu",
      upscaling: "sgsr2-compute",
      upscaleQuality: "quality",
      debugProfile: false,
      shadowQuality: "off",
      aoEnabled: false,
      bloomEnabled: false,
      sunRaysEnabled: false,
      lensFlareEnabled: false,
      volumetricEnabled: false,
      motionBlurEnabled: false,
      atmosphereEnabled: false,
    };
    const scene = new t.Scene(),
      camera = new t.PerspectiveCamera(60, 16 / 9, 0.1, 100);
    const road = new t.Mesh(
      new t.PlaneGeometry(30, 20),
      new t.MeshLambertMaterial({ color: 0x888888 }),
    );
    road.position.z = -12;
    scene.add(road);
    const car = new t.Mesh(
      new t.PlaneGeometry(2, 1.5),
      new t.MeshStandardMaterial({ color: 0xff2222 }),
    );
    car.userData.polyShadeDynamic = true;
    car.position.z = -6;
    scene.add(car);
    const marking = new t.Mesh(
      new t.PlaneGeometry(0.03, 3),
      new t.MeshLambertMaterial({ color: 0xffffff }),
    );
    marking.position.set(-3, 0, -11.9);
    scene.add(marking);
    const logical = { palette: c.cinematic.palette, sky: null };
    const frame = () =>
      new Promise((resolve) =>
        window.__testRAF(() => {
          gpu.render(scene, camera, s, logical);
          resolve();
        }),
      );
    const frames = async (n) => {
      for (let i = 0; i < n; i++) await frame();
    };
    const module = device.createShaderModule({
      code: `@group(0)@binding(0)var image:texture_2d<f32>;@group(0)@binding(1)var<storage,read_write> result:array<vec4f>;@group(0)@binding(2)var<storage,read> points:array<vec2u>;@compute @workgroup_size(1)fn main(@builtin(global_invocation_id)id:vec3u){result[id.x]=textureLoad(image,vec2i(points[id.x]),0);}`,
    });
    const pipeline = await device.createComputePipelineAsync({
      layout: "auto",
      compute: { module, entryPoint: "main" },
    });
    async function sample(target, uvs) {
      const texture = target.texture ?? target;
      const width = texture.width,
        height = texture.height;
      const coords = new Uint32Array(
        uvs.flatMap(([x, y]) => [
          Math.min(width - 1, Math.floor(x * width)),
          Math.min(height - 1, Math.floor(y * height)),
        ]),
      );
      const size = uvs.length * 16;
      const points = device.createBuffer({
        size: coords.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(points, 0, coords);
      const output = device.createBuffer({
          size,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        }),
        read = device.createBuffer({
          size,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
      const group = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: texture.createView() },
          { binding: 1, resource: { buffer: output } },
          { binding: 2, resource: { buffer: points } },
        ],
      });
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, group);
      pass.dispatchWorkgroups(uvs.length);
      pass.end();
      encoder.copyBufferToBuffer(output, 0, read, 0, size);
      device.queue.submit([encoder.finish()]);
      await read.mapAsync(GPUMapMode.READ);
      const data = new Float32Array(read.getMappedRange()).slice();
      read.unmap();
      points.destroy();
      output.destroy();
      read.destroy();
      return uvs.map((_, i) => Array.from(data.slice(i * 4, i * 4 + 4)));
    }
    await frames(10);
    const stationary = await sample(gpu.resources.targets.get("velocity"), [
      [0.5, 0.5],
      [0.2, 0.6],
    ]);
    const markingUV = [
      0.5 - (3 / 11.9) * camera.projectionMatrix.elements[0] * 0.5,
      0.5,
    ];
    const stability = async () => {
      const values = [];
      for (let i = 0; i < 18; i++) {
        await frame();
        values.push((await sample(gpu.compute.output, [markingUV]))[0][0]);
      }
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      return {
        mean,
        variance:
          values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length,
      };
    };
    const markingBefore = await stability();
    car.position.x = 3;
    await frame();
    const revealed = await sample(gpu.compute.rejection, [
      [0.5, 0.5],
      [0.2, 0.6],
    ]);
    const rejectionValid = gpu.temporal.valid;
    const markingAfter = await stability();
    const minLerp = gpu.compute.floats[12];
    await frames(8);
    camera.position.x = 0.2;
    await frame();
    const cameraMotion = await sample(gpu.resources.targets.get("velocity"), [
      [0.2, 0.6],
    ]);
    camera.position.x = 0.4;
    car.position.x = 3.2;
    await frame();
    const followUV = [
      0.5 + ((3.2 - 0.4) / 6) * camera.projectionMatrix.elements[0] * 0.5,
      0.5,
    ];
    const follow = await sample(gpu.resources.targets.get("velocity"), [
      followUV,
      [0.2, 0.6],
    ]);
    camera.position.x = 100;
    await frame();
    const cut = gpu.temporal.report();
    camera.position.x = 0;
    await frames(8);
    const phase = gpu.temporal.sequence;
    s.upscaleDebugView = "static-velocity";
    await frame();
    const debug = {
      valid: gpu.temporal.valid,
      phaseBefore: phase,
      phaseAfter: gpu.temporal.sequence,
    };
    s.upscaleDebugView = "final";
    const swarm = [],
      geometry = new t.PlaneGeometry(0.3, 0.22),
      material = new t.MeshStandardMaterial({ color: 0x55bbff });
    for (let i = 0; i < 159; i++) {
      const mesh = new t.Mesh(geometry, material);
      mesh.userData.polyShadeDynamic = true;
      mesh.position.set(
        ((i % 20) - 9.5) * 0.45,
        (Math.floor(i / 20) - 3.5) * 0.45,
        -10,
      );
      scene.add(mesh);
      swarm.push(mesh);
    }
    gpu.motion.lastScan = -Infinity;
    await frames(2);
    const spawnHistoryValid = gpu.temporal.valid;
    swarm.forEach((m) => (m.position.x += 0.1));
    await frame();
    const swarmMotion = await sample(
      gpu.resources.targets.get("velocity"),
      swarm.map((m) => [
        0.5 + (m.position.x / 10) * camera.projectionMatrix.elements[0] * 0.5,
        0.5 - (m.position.y / 10) * camera.projectionMatrix.elements[5] * 0.5,
      ]),
    );
    const visibleMovingCars = swarmMotion.filter(
      (v) => v[2] > 1.5 && v[0] > 0.005,
    ).length;
    return {
      clock: "controlled 60 Hz; diagnostic readback time excluded",
      stationary,
      revealed,
      rejectionValid,
      cameraMotion,
      follow,
      cut,
      debug,
      markingBefore,
      markingAfter,
      minLerp,
      spawnHistoryValid,
      swarmEntries: gpu.motion.entries.size,
      visibleMovingCars,
    };
  } finally {
    gpu.temporal.begin = originalBegin;
  }
}
