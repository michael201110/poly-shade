// Reproduce the vendored shader wrapper from the pinned official checkout.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
const root = process.argv[2];
const revision = "d926f074bcb9d714e179f1ce0fcb9ee2eeb5074e";
if (!root || execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() !== revision)
  throw new Error(`Supply the official snapdragon-gsr checkout at ${revision}`);
const license = await readFile(join(root, "LICENSE"), "utf8");
await mkdir("src/vendor/sgsr2", { recursive: true });
await writeFile("src/vendor/sgsr2/LICENSE", license);
let source = `/*!\n${license}\n*/\n// Unmodified upstream shader text, wrapped for browser/Node imports.\n`;
source += `// https://github.com/SnapdragonGameStudios/snapdragon-gsr/tree/${revision}/sgsr/v2\n`;
for (const [name, file] of [["CONVERT_REFERENCE", "sgsr2_convert.fs"], ["UPSCALE_REFERENCE", "sgsr2_upscale.fs"]]) {
  const text = await readFile(join(root, "sgsr/v2/include/glsl_2_pass_fs", file), "utf8");
  source += `export const ${name} = ${JSON.stringify(text)};\n`;
}
await writeFile("src/vendor/sgsr2/reference.js", source);
