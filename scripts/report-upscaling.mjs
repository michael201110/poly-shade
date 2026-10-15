import { readFile, writeFile } from "node:fs/promises";
const report = JSON.parse(await readFile("docs/verification/0.3.5/benchmark.json", "utf8"));
const native = report.cases.find(c => c.mode === "native");
if (!native || report.cases.filter(c => c.mode === "sgsr2-fragment").length !== 5)
  throw new Error("A completed native + five-scale benchmark is required");
const f = n => n == null ? "—" : n.toFixed(3);
const percent = n => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const gpu = c => c.gpu.average;
const scene = c => c.profile?.["scene-including-shadows"]?.gpu?.average;
let table = "| Mode / scale | Internal pixels | Scene GPU ms | SGSR2 GPU ms | Total GPU ms | GPU time saved vs native | Derived GPU throughput change |\n";
table += "| --- | --- | ---: | ---: | ---: | ---: | ---: |\n";
for (const c of [native, ...report.cases.filter(c => c.mode === "sgsr2-fragment")]) {
  const savings = 100 * (1 - gpu(c) / gpu(native));
  const throughput = 100 * (gpu(native) / gpu(c) - 1);
  table += `| ${c.mode === "native" ? "Native" : "SGSR2"} / ${Math.round(c.scale*100)}% | ${c.active.sceneSize.join(" × ")} | ${f(scene(c))} | ${f(c.profile?.sgsr2?.gpu?.average)} | ${f(gpu(c))} | ${percent(savings)} | ${percent(throughput)} |\n`;
}
table += "\nPositive savings mean less GPU time; negative savings mean a cost. Derived throughput is `nativeTime / modeTime - 1`, not measured gameplay FPS. At 50%, this captured view uses **15.7% less GPU time** (3.222 → 2.715 ms), equivalent to **18.6% more GPU rendering throughput**. At 67%, GPU time is **4.3% lower** (3.084 ms), equivalent to **4.4% more GPU rendering throughput**. At 100%, temporal reconstruction costs additional GPU time and is an antialiasing/quality option rather than a performance win in this scene.\n\n";
table += "For comparison, the explicit bilinear benchmark mode measured:\n\n| Internal scale | Scene GPU ms | Total GPU ms |\n| --- | ---: | ---: |\n";
for (const c of report.cases.filter(c => c.mode === "reduced"))
  table += `| ${Math.round(c.scale*100)}% | ${f(scene(c))} | ${f(gpu(c))} |\n`;
table += "\nBilinear is a cost reference with lower reconstruction quality and the original presentation/FXAA path; it is never labelled SGSR2. GPU query averages are independently sampled and include noise. The successful full sweep is preserved in the raw report; a later public replay-service fetch timed out, so it is not substituted with partial results.\n";
const marker = "<!-- BENCHMARK_TABLE -->";
const end = "<!-- BENCHMARK_TABLE_END -->";
let document = await readFile("docs/0.3.5.md", "utf8");
const startIndex = document.indexOf(marker);
const endIndex = document.indexOf(end);
if(startIndex<0) throw new Error("Missing benchmark report marker");
document = document.slice(0,startIndex) + marker + "\n\n" + table + "\n" + end +
  document.slice(endIndex<0?startIndex+marker.length:endIndex+end.length);
await writeFile("docs/0.3.5.md",document);
