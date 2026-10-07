import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Model the host API: PML writes loaded/setLoaded and reads isLoaded.
// The old plain-object export never participated in this protocol.
test("built mod inherits the PML base and follows enable/disable state", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../manifest.json", import.meta.url), "utf8"),
  );
  const version = manifest.latest["0.6.3"];
  const code = await readFile(
    new URL(`../${version}/main.mod.js`, import.meta.url),
    "utf8",
  );
  const hostURL =
    "https://cdn.polymodloader.com/cb/PolyTrackMods/PolyModLoader/0.6.3/PolyTypes.js";
  assert.ok(
    code.includes(hostURL),
    "the base class stays a host import, preserving its accessors",
  );
  const hostCode = `export class PolyMod {
    constructor() { this.loaded = false; }
    get isLoaded() { return this.loaded; }
    set setLoaded(value) { this.loaded = value; }
  }`;
  const hostModuleURL = `data:text/javascript;base64,${Buffer.from(hostCode).toString("base64")}`;
  const { PolyMod } = await import(hostModuleURL);
  const moduleURL = `data:text/javascript;base64,${Buffer.from(code.replace(hostURL, hostModuleURL)).toString("base64")}`;
  const { polyMod } = await import(moduleURL);
  assert.ok(polyMod instanceof PolyMod);
  assert.equal(polyMod.modVersion, version);
  assert.equal(polyMod.isLoaded, false);
  polyMod.loaded = true; // PML mod-manager enable path.
  assert.equal(polyMod.isLoaded, true);
  assert.equal([polyMod].filter((mod) => mod.isLoaded).length, 1);
  polyMod.loaded = false;
  assert.equal(polyMod.isLoaded, false);
  polyMod.setLoaded = true; // PML saved-mod startup path.
  assert.equal(polyMod.isLoaded, true);
  for (const hook of ["preInit", "init", "postInit", "onGameLoad"]) {
    assert.equal(typeof polyMod[hook], "function");
  }
});
