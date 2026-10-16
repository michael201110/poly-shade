import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { build } from "esbuild";
const code = await build({
  entryPoints: ["scripts/compute-kernel-entry.js"],
  bundle: true,
  format: "esm",
  write: false,
});
const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--force_high_performance_gpu"],
});
try {
  const page = await browser.newPage();
  await page.route("https://polyshade.test/**", (r) =>
    r.fulfill({
      body: r.request().url().endsWith(".js")
        ? code.outputFiles[0].text
        : "<!doctype html>",
      contentType: r.request().url().endsWith(".js")
        ? "application/javascript"
        : "text/html",
    }),
  );
  await page.goto("https://polyshade.test/");
  const result = await page.evaluate(async () => {
    const m = await import("/test.js");
    return m.verifyKernel();
  });
  assert.deepEqual(result.errors, []);
  for (const range of result.ranges.slice(0, 3))
    assert.ok(
      range.max - range.min < 0.001,
      "constant colour remains constant across signed Lanczos lobes",
    );
  console.log(JSON.stringify(result.ranges, null, 2));
} finally {
  await browser.close();
}
