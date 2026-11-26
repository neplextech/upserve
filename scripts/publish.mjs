import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

if (process.env.GITHUB_ACTIONS !== "true" || !process.env.ACTIONS_ID_TOKEN_REQUEST_URL)
  throw new Error("Publishing requires GitHub Actions OIDC");
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
  const cwd = resolve("packages", directory);

  const pkg = JSON.parse(await readFile(join(cwd, "package.json"), "utf8"));

  if (!/^@neplex\/upserve(?:-[a-z]+)?$/.test(pkg.name) || pkg.private)
    throw new Error("Invalid release package");

  const destination = await mkdtemp(join(tmpdir(), "upserve-pack-"));
  execFileSync("pnpm", ["pack", "--pack-destination", destination], { cwd, stdio: "inherit" });

  const [tarball] = (await readdir(destination)).filter((x) => x.endsWith(".tgz"));

  if (!tarball) throw new Error("No package archive");
  execFileSync("npm", ["publish", join(destination, tarball), "--access", "public"], {
    stdio: "inherit",
  });
}
