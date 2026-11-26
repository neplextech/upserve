import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";

const destination = await mkdtemp(join(tmpdir(), "upserve-archives-"));

try {
  for (const directory of [
    "upserve",
    "github",
    "tauri",
    "electron",
    "android",
    "generic",
    "sqlite",
    "cli",
  ]) {
    execFileSync("pnpm", ["pack", "--pack-destination", destination], {
      cwd: resolve("packages", directory),
      stdio: "pipe",
    });
  }

  for (const filename of await readdir(destination)) {
    const archive = join(destination, filename);
    const manifest = JSON.parse(
      execFileSync("tar", ["-xOf", archive, "package/package.json"], { encoding: "utf8" }),
    );
    const entries = execFileSync("tar", ["-tf", archive], { encoding: "utf8" });

    assert.match(manifest.name, /^@neplex\/upserve(?:-[a-z]+)?$/);
    assert(!JSON.stringify(manifest).includes("workspace:"));
    assert(!entries.includes(".env"));
    assert(!entries.includes("/node_modules/"));
    assert(entries.includes("package/dist/index.mjs"));
    assert(entries.includes("package/dist/index.d.mts"));
  }

  console.log("All eight package archives have valid entry points and resolved dependencies");
} finally {
  await rm(destination, { recursive: true, force: true });
}
