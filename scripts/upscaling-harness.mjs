// Development-only: a fresh Edge profile and locally routed mod in the real PML game.
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";

export async function openUpscalingHarness() {
  const browser = await chromium.launch({ channel: "msedge", headless: true,
    args: ["--force_high_performance_gpu"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => {
    if (m.type() === "error" && /PolyShade|Shader Error|GL_INVALID/.test(m.text())) {
      errors.push(m.text()); console.log(m.text());
    }
  });
  await page.route("https://polyshade.test/**", async route => {
    const path = new URL(route.request().url()).pathname.slice(1);
    try {
      let body = await readFile(path, "utf8");
      if (path.endsWith(".js")) body = body
        .replace("controller = new RenderController", "controller = globalThis.__controller = new RenderController")
        .replace("instances.set(renderer, { original, wrapper });",
          "renderer.__nativeDraw=original;globalThis.__renderer=renderer;instances.set(renderer, { original, wrapper });");
      await route.fulfill({ body, headers: { "access-control-allow-origin": "*" },
        contentType: path.endsWith(".json") ? "application/json" : "application/javascript" });
    } catch { await route.fulfill({ status: 404, body: "" }); }
  });
  await page.route("https://vps.kodub.com/**", async route => {
    const request = route.request();
    let response;
    for (let attempt=0;attempt<3;attempt++) {
      try {
        response = await fetch(request.url(), { method: request.method(),
          headers: { ...request.headers(), origin: "https://www.kodub.com", referer: "https://www.kodub.com/" },
          body: request.postData() ?? undefined, signal:AbortSignal.timeout(15000) });
        break;
      } catch { /* Public leaderboard availability is external to the renderer. */ }
    }
    if (!response) return route.fulfill({status:502,body:"Replay service unavailable"});
    await route.fulfill({ status: response.status, body: Buffer.from(await response.arrayBuffer()),
      headers: { "content-type": response.headers.get("content-type") ?? "application/json", "access-control-allow-origin": "*" } });
  });
  await page.addInitScript(() => {
    // Test-only freeze: stop simulation callbacks, then render the captured
    // scene through the real hooked renderer on the original browser RAF.
    window.__testRAF = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => window.__testRAF(time => {
      if (!window.__freezeGame) callback(time);
    });
    window.pmlversion = "web";
    localStorage.setItem("polyshade.settings", JSON.stringify({ schemaVersion: 2,
      preset: "cinematic", enabled: true, overrides: { motionBlurEnabled: false } }));
    localStorage.setItem("polyMods", JSON.stringify([{ base: "https://polyshade.test", version: "latest", loaded: true }]));
  });
  await page.goto("https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/index.html");
  await page.waitForFunction(() => window.__controller?.cinematic?.post?.frames > 10, undefined, { timeout: 60000 });
  return { browser, page, errors };
}
