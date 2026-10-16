import { openUpscalingHarness } from "./upscaling-harness.mjs";
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";

const { browser, page, errors } = await openUpscalingHarness({backend:"webgl",reference:true});
const output = `${process.env.TEMP}/polyshade-sgsr2`;
await mkdir(output, { recursive: true });
try {
  const report = await page.evaluate(async () => {
    const { PostProcess } = await import("https://polyshade.test/test/reference/postprocess.js");
    const c = window.__controller, t = c.three, r = c.activeRenderer;
    const ext = r.getContext().getExtension("WEBGL_debug_renderer_info");
    const gpu = ext ? r.getContext().getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unavailable";
    const scene = new t.Scene(), camera = new t.PerspectiveCamera(60, 1280 / 720, 0.1, 100);
    const geometry = new t.BufferGeometry();
    geometry.setAttribute("position", new t.BufferAttribute(new Float32Array([
      -1,-1,0, 1,-1,0, -1,1,0, -1,1,0, 1,-1,0, 1,1,0,
    ]), 3));
    const make = (name, z, scale, rgb) => {
      const material = new t.ShaderMaterial({ name, vertexShader:
        "void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: `void main(){gl_FragColor=vec4(${rgb},1.0);}`, toneMapped: false });
      const mesh = new t.Mesh(geometry, material); mesh.position.z = z; mesh.scale.setScalar(scale); scene.add(mesh); return mesh;
    };
    const road = make("Road", -12, 20, "0.5,0.5,0.5");
    const car = make("BrakeLight", -5, 0.5, "1.0,0.0,0.0");
    const marking = make("Marking", -11.5, 1, "1.0,1.0,1.0");
    marking.position.x=-3;marking.scale.set(0.025,2,1);
    const guard = c.cinematic.guard;
    const post = new PostProcess(t, r, c.cinematic.capabilities, guard);
    // Synchronous GPU test frames are faster than browser clock quantization.
    // Give them deterministic 60 Hz timestamps, preserving the rendered matrix
    // sequence instead of accidentally triggering zero-delta frame resets.
    const begin=post.temporal.begin.bind(post.temporal);let frameTime=100;
    post.temporal.begin=(...args)=>{args[7]=frameTime;frameTime+=1000/60;return begin(...args);};
    const settings = { ...c.resolveSettings(), upscaling: "sgsr2-fragment", upscaleQuality: "quality",
      upscaleJitter: true, upscaleDebugView: "combined-velocity", sceneSamples: "0",
      aoEnabled: false, bloomEnabled: false, sunRaysEnabled: false, lensFlareEnabled: false,
      volumetricEnabled: false, atmosphereEnabled: false, motionBlurEnabled: false, gradeEnabled: false };
    const draw = (s = scene, cam = camera) => r.__nativeDraw.call(r, s, cam);
    const projection = camera.projectionMatrix.clone(), inverse = camera.projectionMatrixInverse.clone();
    function half(h) {
      const e = (h >> 10) & 31, m = h & 1023, sign = h & 32768 ? -1 : 1;
      return sign * (e === 0 ? m * 2 ** -24 : e === 31 ? m ? NaN : Infinity : (1 + m / 1024) * 2 ** (e - 15));
    }
    const probe = (u, v) => {
      const target = post.pool.targets.get("sgsr-velocity"), p = new Uint16Array(4);
      r.readRenderTargetPixels(target, Math.floor(u * target.width), Math.floor(v * target.height), 1, 1, p);
      return { x: half(p[0]), y: half(p[1]), alpha: half(p[3]) };
    };
    const frame = () => {
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      post.render(scene, camera, settings, draw, c.cinematic.palette);
      if (!camera.projectionMatrix.equals(projection) || !camera.projectionMatrixInverse.equals(inverse))
        throw new Error("Jitter leaked into the game camera");
      if (post.disabled) throw new Error("Temporal input render failed");
    };
    const results = { gpu, threeRevision:window.__THREE__, syntheticFrameMs:1000/60, fields: {}, invalidation: {}, failures: {}, images: {} };
    try {
      for (const view of ["static-velocity", "car-velocity", "combined-velocity"]) {
        settings.upscaleDebugView = view;
        camera.position.x = 0; car.position.x = 0;
        frame(); frame(); camera.position.x += 0.2; car.position.x += 0.2; frame();
        results.fields[view] = { car: probe(0.5, 0.5), road: probe(0.15, 0.5),
          valid: post.temporal.valid, jitter: post.temporal.jitter.toArray() };
        results.images[view] = r.domElement.toDataURL();
      }
      camera.position.x = 0; car.position.x = 0; frame(); frame();
      const jitterOnly = [];
      for (let i = 0; i < 8; i++) { frame(); jitterOnly.push(probe(0.5, 0.5)); }
      results.jitterOnly = jitterOnly;
      car.position.x += 0.2; frame(); results.movingCar = probe(0.52, 0.5);
      road.position.z = -3; frame(); results.occludedCar = probe(0.52, 0.5);
      road.position.z = -12;
      camera.position.x += 40; frame(); results.invalidation.teleport = post.temporal.report();
      settings.upscaleCustomScale = 0.59; settings.upscaleQuality = "custom";
      frame(); results.invalidation.scale = post.temporal.report();
      frame(); results.invalidation.recovered = post.temporal.report();
      post.temporal.invalidate("run reset"); frame(); results.invalidation.explicit = post.temporal.report();
      // Exercise the actual reconstruction, including disocclusion and a dense
      // opaque rigid swarm. GPU readbacks exist only in this development script.
      camera.position.x = 0; car.position.x = 0;
      settings.upscaleDebugView = "final";settings.upscaleJitter=false;
      for(let i=0;i<12;i++)frame();
      const readOutput = (u, v) => {
        const target = [...post.pool.targets.values()].find(target => target.texture === post.upscaler.output);
        const pixels = new Uint16Array(4);
        r.readRenderTargetPixels(target,Math.floor(u*target.width),Math.floor(v*target.height),1,1,pixels);
        return Array.from(pixels,half);
      };
      results.output = { car:readOutput(0.5,0.5),road:readOutput(0.15,0.5) };
      car.position.x = 2; frame(); results.output.disoccluded = readOutput(0.5,0.5);
      const rejection = (u,v) => {
        const target=post.pool.targets.get('sgsr-convert'),pixels=new Uint16Array(4);
        r.readRenderTargetPixels(target,Math.floor(u*target.width),Math.floor(v*target.height),1,1,pixels);
        return half(pixels[3]);
      };
      results.rejection={revealedRoad:rejection(0.5,0.5),staticRoad:rejection(0.15,0.5),
        cameraStillHistoryWeight:post.materials.get('sgsr2-upscale').uniforms.minLerpContribution.value,
        globalHistoryValid:post.temporal.valid};
      settings.upscaleJitter=true;
      const markingVariance = moving => {
        post.temporal.invalidate('same-phase stability comparison');
        car.position.x=0;
        const count=32*32*3,sum=new Float64Array(count),squared=new Float64Array(count);
        let maxRejection=0;
        for(let f=0;f<48;f++){
          if(moving)car.position.x+=0.025;
          frame();
          if(f<32)continue;
          const target=[...post.pool.targets.values()].find(target=>target.texture===post.upscaler.output);
          const pixels=new Uint16Array(32*32*4),center=new t.Vector3(-3,0,-11.5).project(camera);
          r.readRenderTargetPixels(target,Math.floor((center.x*.5+.5)*target.width)-16,target.height/2-16,32,32,pixels);
          for(let p=0,j=0;p<pixels.length;p+=4)for(let channel=0;channel<3;channel++,j++){
            const value=half(pixels[p+channel]);sum[j]+=value;squared[j]+=value*value;
          }
          maxRejection=Math.max(maxRejection,rejection(center.x*.5+.5,0.5));
        }
        let variance=0;
        for(let i=0;i<count;i++)variance+=Math.max(0,squared[i]/16-(sum[i]/16)**2);
        return {variance:variance/count,maxRejection};
      };
      results.staticMarkings={withoutCarMotion:markingVariance(false),withCarMotion:markingVariance(true)};
      const swarm=[];
      for(let i=0;i<160;i++){
        const mesh=new t.Mesh(geometry,car.material);
        mesh.name=`training-${i}`;
        mesh.position.set((i%20-10)*0.7, (Math.floor(i/20)-4)*0.3, -15-Math.floor(i/20)*3);
        mesh.scale.setScalar(0.13);scene.add(mesh);swarm.push(mesh);
      }
      // Put the background behind the swarm, so the distant objects actually
      // contribute visible pixels instead of only exercising proxy discovery.
      road.position.z=-80;road.scale.setScalar(100);
      post.objectMotion.lastScan=-Infinity;frame();
      results.spawnKeepsStaticHistory=post.temporal.valid;
      frame();
      for(const mesh of swarm)mesh.position.x+=0.1;
      frame();
      const farPoint=swarm[10].position.clone().project(camera);
      results.swarm={parts:post.objectMotion.entries.length,valid:post.temporal.valid,
        visibleVelocity:probe(farPoint.x*.5+.5+post.temporal.jitter.x/post.temporal.width,
          farPoint.y*.5+.5+post.temporal.jitter.y/post.temporal.height)};
      results.images.swarm=r.domElement.toDataURL();
      results.failures = Object.fromEntries(guard.failures);
      results.canvas = [r.domElement.width, r.domElement.height];
      results.internal = post.active.sceneSize;
      const originalError=console.error;
      try {
        console.error=()=>{};
        post.upscaler.reconstruct=()=>{throw new Error("Injected SGSR2 init failure");};
        frame();
        results.fallback={active:post.active.upscaling,sceneSize:post.active.sceneSize,
          projectionRestored:camera.projectionMatrix.equals(projection),
          temporalTargets:[...post.pool.targets.keys()].filter(k=>k.startsWith('sgsr'))};
      }finally{console.error=originalError;}
      const loader = window.polyModLoader;
      for (const key of ["i", "n"]) {
        let req; try { req = loader.getFromPolyTrack(key); } catch {}
        if (!req?.m) continue;
        const factories = Object.entries(req.m).filter(([, f]) => /\.isWebGLRenderer\s*=/.test(String(f)));
        results.threeRevisionCandidates = factories.map(([id, f]) => ({ id,
          versionExports: Object.entries(req(id)).filter(([, v]) => typeof v === "string" && /^\d{3}$/.test(v)),
          revisionContext: String(f).match(/.{0,100}__THREE__.{0,150}/g),
        }));
        results.nativeWrapperKeys = Object.keys(c.nativeWrapper ?? {});
      }
      return results;
    } finally { post.dispose(); for (const mesh of [road, car, marking]) mesh.material.dispose(); geometry.dispose(); }
  });
  for(const [name,data] of Object.entries(report.images))
    await writeFile(`${output}/input-${name}.png`,Buffer.from(data.split(',')[1],'base64'));
  delete report.images;
  await writeFile(`${output}/temporal-inputs.json`, JSON.stringify({ ...report, errors }, null, 2));
  const sources = await page.evaluate(() => {
    const p = window.polyModLoader;
    for (const key of ["i", "n"]) {
      let req; try { req = p.getFromPolyTrack(key); } catch {}
      if (req?.m) return Object.entries(req.m).filter(([, f]) => /\.isWebGLRenderer\s*=|\.isScene\s*=/.test(String(f)))
        .map(([id, f]) => `MODULE ${id}\n${String(f)}`).join("\n");
    }
  });
  await writeFile(`${output}/three-factories.txt`, sources);
  console.log(JSON.stringify(report, null, 2));
  const fields = report.fields;
  assert.ok(Math.abs(fields["combined-velocity"].car.x) < 0.002, "followed car has zero velocity");
  assert.ok(fields["combined-velocity"].road.x < -0.01, "camera movement reaches static road");
  assert.ok(fields["static-velocity"].car.x < -0.02, "camera-only field differs on moving car");
  assert.equal(fields["car-velocity"].road.alpha, 0, "car-only field has no static geometry");
  assert.ok(report.jitterOnly.every(v => Math.abs(v.x) < 0.00001 && Math.abs(v.y) < 0.00001), "jitter does not become motion");
  assert.ok(report.movingCar.x > 0.02, "independent car motion is included");
  assert.ok(Math.abs(report.occludedCar.x) < 0.002, "wall occludes moving car velocity");
  assert.equal(report.invalidation.teleport.valid, false);
  assert.equal(report.invalidation.scale.valid, false);
  assert.equal(report.invalidation.recovered.valid, true);
  assert.equal(report.invalidation.explicit.valid, false);
  assert.deepEqual(report.canvas, [1280, 720]);
  assert.deepEqual(report.internal, [755, 425]);
  assert.ok(report.output.car[0]>0.8&&report.output.car[1]<0.01,"reconstruction preserves the tone-mapped followed car");
  assert.ok(report.output.disoccluded.slice(0,3).every(v=>Math.abs(v-report.output.road[0])<0.01),"newly exposed road rejects red car history");
  assert.equal(report.rejection.revealedRoad,1,"revealed road is explicitly rejected per pixel");
  assert.equal(report.rejection.staticRoad,0,"static road retains history");
  assert.equal(report.rejection.cameraStillHistoryWeight,0.3,"the normal static-camera history weight is retained");
  assert.equal(report.rejection.globalHistoryValid,true,"car disocclusion does not reset global history");
  assert.equal(report.staticMarkings.withCarMotion.maxRejection,0);
  assert.ok(report.staticMarkings.withCarMotion.variance<=report.staticMarkings.withoutCarMotion.variance*1.3+1e-7,"local car rejection does not increase static marking shimmer");
  assert.equal(report.swarm.parts,161,"opaque named training cars receive independent velocity");
  assert.ok(report.swarm.visibleVelocity.x>0.004,"a visible distant swarm car contributes independent screen velocity");
  assert.equal(report.spawnKeepsStaticHistory,true,"spawning cars invalidates object history locally, preserving track history");
  assert.equal(report.fallback.active.backend,"native");
  assert.deepEqual(report.fallback.sceneSize,[1280,720]);
  assert.equal(report.fallback.projectionRestored,true);
  assert.deepEqual(report.fallback.temporalTargets,[]);
  assert.deepEqual(errors, []);
  console.log(`Temporal input checks passed; report: ${output}/temporal-inputs.json`);
} finally { await browser.close(); }
