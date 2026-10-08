import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("PML metadata and built release target PolyTrack 0.6.3", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../manifest.json", import.meta.url), "utf8"),
  );
  const release = manifest.latest["0.6.3"];
  const version = JSON.parse(
    await readFile(
      new URL(`../${release}/version.json`, import.meta.url),
      "utf8",
    ),
  );
  assert.equal(manifest.id, "polyshade");
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(release, pkg.version);
  assert.equal(version.main, "main.mod.js");
  assert.deepEqual(version.targets, ["0.6.3"]);
});
