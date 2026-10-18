// Development-only: a fresh Edge profile and locally routed mod in the real PML game.
import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";

export async function openUpscalingHarness({ backend = "webgpu", reference = false } = {}) {
  const browser = await chromium.launch({
    channel: "msedge",
    headless: process.env.POLYSHADE_HEADED !== "1",
    args: ["--force_high_performance_gpu"],
  });
  const viewport = process.env.POLYSHADE_VIEWPORT?.match(/^(\d+)x(\d+)$/);
  const page = await browser.newPage({
    // Keep CSS pixels, canvas backing pixels and reported output dimensions
    // identical. In particular this lets the offline GPU harness exercise a
    // real 3840x2160 render target without changing output resolution later.
    viewport: viewport
      ? { width: Number(viewport[1]), height: Number(viewport[2]) }
      : { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  // Keep public, version-pinned game assets identical across fresh profiles.
  // No game assets are committed; this cache lives in the local temp folder.
  const cache = `${process.env.TEMP}/polyshade-public-assets-063`;
  await mkdir(cache, {recursive:true});
  const pending = new Map();
  await page.route('https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/**', async route => {
    const url=route.request().url(),key=createHash('sha256').update(url).digest('hex');
    let task=pending.get(key);
    if(!task){task=(async()=>{
      try {
        const metadata=JSON.parse(await readFile(`${cache}/${key}.json`,'utf8'));
        const body=await readFile(`${cache}/${key}.bin`);
        if(createHash('sha256').update(body).digest('hex')!==metadata.sha256)throw Error('cache checksum');
        return {status:200,body,contentType:metadata.contentType};
      }catch { /* Fetch missing/incomplete cache entries normally. */ }
      let response;
      for(let attempt=0;attempt<3;attempt++) {
        try {
          response=await route.fetch({timeout:45000,maxRetries:2});
          if(response.status()<500&&response.status()!==429)break;
        }catch(error){if(attempt===2)throw error;}
      }
      const body=await response.body(),contentType=response.headers()['content-type']??'application/octet-stream';
      if(response.status()===200){
        await writeFile(`${cache}/${key}.bin`,body);
        await writeFile(`${cache}/${key}.json`,JSON.stringify({url,contentType,sha256:createHash('sha256').update(body).digest('hex')}));
      }
      return {status:response.status(),body,contentType};
    })();pending.set(key,task);}
    try{await route.fulfill(await task);}catch{await route.abort('failed');}
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      /PolyShade|Shader Error|GL_INVALID|WebGPU|GPUValidation|WGSL/.test(
        m.text(),
      )
    ) {
      errors.push(m.text());
      console.log(m.text());
    }
  });
  await page.route("https://polyshade.test/**", async (route) => {
    const path = new URL(route.request().url()).pathname.slice(1);
    try {
      let body = path === 'manifest.json' && reference
        ? JSON.stringify({name:'PolyShade',author:'PolyShade',id:'polyshade',latest:{'0.6.3':'0.4.0'}})
        : await readFile(!reference && path.endsWith('/main.mod.js') && process.env.POLYSHADE_BUNDLE
          ? process.env.POLYSHADE_BUNDLE : path, "utf8");
      if (path.endsWith(".js"))
        body = body
          .replace(
            "controller = new RenderController",
            "controller = globalThis.__controller = new RenderController",
          )
          .replace(
            "instances.set(renderer, { original, wrapper });",
            "renderer.__nativeDraw=original;globalThis.__renderer=renderer;instances.set(renderer, { original, wrapper });",
          );
      await route.fulfill({
        body,
        headers: { "access-control-allow-origin": "*" },
        contentType: path.endsWith(".json")
          ? "application/json"
          : "application/javascript",
      });
    } catch {
      await route.fulfill({ status: 404, body: "" });
    }
  });
  // Optional local PolyBot injection for renderer-only swarm benchmarks. The
  // normal PolyShade harness and standalone use remain unchanged.
  if (process.env.POLYBOT_ROOT) {
    const { resolve, sep } = await import("node:path");
    const root = resolve(process.env.POLYBOT_ROOT, "pml-mod");
    await page.route("https://polybot.test/**", async (route) => {
      const relative = new URL(route.request().url()).pathname
        .replace(/^\/+/, "")
        .replaceAll("/", sep);
      const file = resolve(root, relative);
      if (file !== root && !file.startsWith(root + sep))
        return route.fulfill({ status: 404, body: "" });
      try {
        const body = await readFile(file);
        await route.fulfill({
          body,
          contentType: file.endsWith(".json")
            ? "application/json"
            : file.endsWith(".html")
              ? "text/html"
              : "application/javascript",
          headers: { "access-control-allow-origin": "*" },
        });
      } catch {
        await route.fulfill({ status: 404, body: "" });
      }
    });
  }
  await page.route("https://vps.kodub.com/**", async (route) => {
    const request = route.request();
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch(request.url(), {
          method: request.method(),
          headers: {
            ...request.headers(),
            origin: "https://www.kodub.com",
            referer: "https://www.kodub.com/",
          },
          body: request.postData() ?? undefined,
          signal: AbortSignal.timeout(15000),
        });
        break;
      } catch {
        /* Public leaderboard availability is external to the renderer. */
      }
    }
    if (!response)
      return route.fulfill({ status: 502, body: "Replay service unavailable" });
    await route.fulfill({
      status: response.status,
      body: Buffer.from(await response.arrayBuffer()),
      headers: {
        "content-type":
          response.headers.get("content-type") ?? "application/json",
        "access-control-allow-origin": "*",
      },
    });
  });
  await page.addInitScript(({ backend, polybotBase }) => {
    // Test-only freeze: stop simulation callbacks, then render the captured
    // scene through the real hooked renderer on the original browser RAF.
    window.__testRAF = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      // Keep the replacement renderer's own frame/uniform scheduler alive.
      // Only freeze game simulation; suppressing Three's RAF stalls GPU init.
      const rendererCallback = new Error().stack.includes("polyshade.test");
      return window.__testRAF((time) => {
        if (!window.__freezeGame || rendererCallback) callback(time);
      });
    };
    window.pmlversion = "web";
    localStorage.setItem(
      "polyshade.settings",
      JSON.stringify({
        schemaVersion: 2,
        preset: "cinematic",
        enabled: true,
        overrides: { motionBlurEnabled: false, renderBackend: backend },
      }),
    );
    localStorage.setItem(
      "polyMods",
      JSON.stringify([
        ...(polybotBase
          ? [{ base: polybotBase, version: "0.1.51", loaded: true }]
          : []),
        { base: "https://polyshade.test", version: "latest", loaded: true },
      ]),
    );
  }, { backend, polybotBase: process.env.POLYBOT_ROOT ? "https://polybot.test" : null });
  try {
    await page.goto(
      "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/index.html",
      { waitUntil: "domcontentloaded", timeout: 60000 },
    );
    await page.waitForFunction(
      () => (window.__controller?.backends?.gpu?.frames ?? window.__controller?.cinematic?.post?.frames ?? 0) > 10,
      undefined,
      { timeout: 60000 },
    );
    // Await the version-pinned game assets, not unrelated leaderboard polling.
    // All static asset failures still reject the check; an external replay
    // service that keeps a connection open must not prevent offline GPU tests.
    let settled=-1;
    while(settled!==pending.size){settled=pending.size;await Promise.all(pending.values());}
  } catch (error) {
    await browser.close();
    throw error;
  }
  return { browser, page, errors };
}

// Public leaderboard availability must not prevent offline renderer checks.
export async function resetHarnessGame(page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(
    () => (window.__controller?.backends?.gpu?.frames ?? window.__controller?.cinematic?.post?.frames ?? 0) > 10,
    undefined,
    { timeout: 60000 },
  );
}
