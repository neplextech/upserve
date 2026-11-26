import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { basePath, withBasePath } from "../lib/paths.mjs";

const output = resolve(fileURLToPath(new URL("../out/", import.meta.url)));
const site = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)],
    ),
  );

  return result.flat();
}

async function verifyUrl(value, from) {
  if (!value || value.startsWith("#") || /^(?:mailto:|data:|tel:)/.test(value)) return;

  const url = new URL(value.replaceAll("&amp;", "&"), site);

  if (url.origin !== site.origin) return;

  assert(
    !basePath || url.pathname === basePath || url.pathname.startsWith(basePath + "/"),
    `Unprefixed URL in ${from}: ${value}`,
  );

  const pathname = decodeURIComponent(url.pathname.slice(basePath.length));
  const candidate = resolve(output, "." + pathname);

  assert(
    candidate === output || candidate.startsWith(output + "/"),
    `Invalid output path: ${value}`,
  );

  const entry = await stat(candidate).catch(() => undefined);

  if (entry?.isFile()) return;

  const index = await stat(join(candidate, "index.html")).catch(() => undefined);

  assert(index?.isFile(), `Missing export in ${from}: ${value}`);
}

const exported = await files(output);
const pages = exported.filter(
  (file) => file.endsWith(".html") && !file.includes("/404") && !file.includes("/_not-found/"),
);

for (const file of pages) {
  const html = await readFile(file, "utf8");

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) await verifyUrl(match[1], file);
  for (const match of html.matchAll(/url\(([^)]+)\)/g))
    await verifyUrl(match[1].replaceAll("&quot;", "").replaceAll('"', ""), file);

  const image = html.match(/<meta property="og:image" content="([^"]+)"/);

  if (image) {
    await verifyUrl(image[1], file);

    const imagePath = new URL(image[1]).pathname.slice(basePath.length);
    const bytes = await readFile(join(output, imagePath));

    assert.equal(bytes.readUInt32BE(16), 1200);
    assert.equal(bytes.readUInt32BE(20), 630);
  }
}

for (const file of exported.filter((file) => file.endsWith(".css"))) {
  const css = await readFile(file, "utf8");

  for (const match of css.matchAll(/url\(["']?(\/[^)"']+)["']?\)/g))
    await verifyUrl(match[1], file);
}

const home = await readFile(join(output, "index.html"), "utf8");
const index = JSON.parse(await readFile(join(output, "api/search"), "utf8"));
const llms = await readFile(join(output, "llms.txt"), "utf8");

assert(home.includes(withBasePath("/api/search")), "Static search URL must include the base path");
assert(JSON.stringify(index).includes("/docs/"), "Static search index must contain documentation");
assert(llms.includes(`](${withBasePath("/docs/")}`), "LLM index must include the base path");
assert(
  pages.some((file) => file.includes("/docs/")),
  "Documentation pages must be exported",
);

console.log(
  `Verified ${pages.length} pages, local links/assets, social images, static search and LLM index at ${basePath || "/"}`,
);
