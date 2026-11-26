import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { createUpserve, findAssetByUrl } from "@neplex/upserve";
import type { Asset, Provider, Release } from "@neplex/upserve";
import { android as androidAdapter } from "@neplex/upserve-android";
import { github } from "@neplex/upserve-github";
import { tauri } from "@neplex/upserve-tauri";

/** OPPA v0.4.0 exactly as published: Tauri's bundler wrote REST API asset URLs. */
const latest = await readFile(
  new URL("./fixtures/oppa-v0.4.0/latest.json", import.meta.url),
  "utf8",
);

/** The Android manifest from the same release, which uses public download URLs. */
const android = await readFile(
  new URL("./fixtures/oppa-v0.4.0/latest-android.json", import.meta.url),
  "utf8",
);

/** The matching GitHub release response, including each asset's REST API url field. */
const release = await readFile(
  new URL("./fixtures/oppa-v0.4.0/release.json", import.meta.url),
  "utf8",
);

const api = "https://api.github.com/repos/neplextech/oppa/releases/assets/";

const download = "https://github.com/neplextech/oppa/releases/download/oppa-v0.4.0/";

const base = "https://updates.test/oppa/stable";

interface Options {
  /** Replace the published latest.json body. */
  manifest?: string;

  /** Rewrite the GitHub release response before it is served. */
  edit?: (value: Record<string, unknown>) => void;
}

/** Serve the fixture through the real GitHub provider using an injected Fetch. */
function setup(options: Options = {}) {
  const requests: string[] = [];

  const body = JSON.parse(release) as Record<string, unknown>;

  options.edit?.(body);

  const fetcher = (async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input);

    requests.push(url);

    if (url === "https://api.github.com/repos/neplextech/oppa/releases?per_page=100&page=1")
      return Response.json([body]);

    if (url === api + "794752833") return new Response(options.manifest ?? latest);

    if (url === api + "794792076") return new Response(android);

    return new Response(null, { status: 404 });
  }) as typeof fetch;

  const app = createUpserve({
    apps: {
      oppa: {
        provider: github({ repository: "neplextech/oppa", tagPrefix: "oppa-v", fetch: fetcher }),
        adapters: [tauri(), androidAdapter()],
      },
    },
  });

  return { app, requests };
}

/** Replace one platform URL while keeping the rest of the published manifest intact. */
function withUrl(url: string): string {
  const value = JSON.parse(latest) as {
    platforms: Record<string, { url: string; signature: string }>;
  };

  value.platforms["darwin-aarch64"]!.url = url;

  return JSON.stringify(value);
}

/** Rewrite the REST url field of one release asset. */
function assetApiUrl(id: number, url: string) {
  return (value: Record<string, unknown>) => {
    const assets = value.assets as Record<string, unknown>[];

    assets.find((asset) => asset.id === id)!.url = url;
  };
}

describe("OPPA v0.4.0 Tauri manifest with GitHub API asset URLs", () => {
  const published = JSON.parse(latest) as {
    platforms: Record<string, { url: string; signature: string }>;
  };

  it("resolves every platform on the static endpoint and preserves signatures", async () => {
    const { app } = setup();

    const response = await app.request(base + "/tauri/latest.json");

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      version: string;
      notes?: string;
      pub_date?: string;
      platforms: Record<string, { url: string; signature: string }>;
    };

    expect(body.version).toBe("0.4.0");
    expect(Object.keys(body.platforms)).toEqual(Object.keys(published.platforms));

    for (const [target, platform] of Object.entries(published.platforms)) {
      const id = platform.url.slice(api.length);

      expect(body.platforms[target]).toEqual({
        signature: platform.signature,
        url: base + "/assets/459070491/" + id,
      });
    }

    // Release notes and publication date still come from the GitHub release.
    const github = JSON.parse(release) as { body: string; published_at: string };

    expect(body.notes).toBe(github.body);
    expect(body.pub_date).toBe(github.published_at);
  });

  it("resolves the dynamic endpoint and redirects to the public download URL", async () => {
    const { app, requests } = setup();

    const response = await app.request(base + "/tauri/darwin/aarch64/0.3.1");

    expect(response.status).toBe(200);

    const body = (await response.json()) as { url: string; signature: string; version: string };

    expect(body.version).toBe("0.4.0");
    expect(body.signature).toBe(published.platforms["darwin-aarch64"]!.signature);
    expect(body.url).toBe(base + "/assets/459070491/794743258");

    const redirect = await app.request(body.url);

    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("location")).toBe(download + "OPPA_0.4.0_aarch64.app.tar.gz");

    // Matching an alias never fetches it; only the manifest asset was opened by ID.
    expect(requests.filter((url) => url.startsWith(api))).toEqual([api + "794752833"]);
  });

  it("returns no update for the current version on the dynamic endpoint", async () => {
    const { app } = setup();

    expect((await app.request(base + "/tauri/darwin/aarch64/0.4.0")).status).toBe(204);
  });

  it("still matches canonical public download URLs", async () => {
    const { app } = setup({ manifest: withUrl(download + "OPPA_0.4.0_aarch64.app.tar.gz") });

    const body = (await (await app.request(base + "/tauri/darwin/aarch64/0.3.1")).json()) as {
      url: string;
    };

    expect(body.url).toBe(base + "/assets/459070491/794743258");
  });

  it("keeps Android matching on the canonical APK URL from the same release", async () => {
    const { app } = setup();

    const response = await app.request(base + "/android/update/0.3.1");

    expect(response.status).toBe(200);

    const body = (await response.json()) as { android: { url: string; sha256: string } };

    expect(body.android.url).toBe(base + "/assets/459070491/794792074");
    expect(body.android.sha256).toBe(JSON.parse(android).android.sha256);
  });

  for (const [name, url] of [
    ["an unknown asset URL", "https://example.com/OPPA_0.4.0_aarch64.app.tar.gz"],
    ["a mismatched asset ID", api + "794743259"],
    [
      "another repository",
      "https://api.github.com/repos/neplextech/other/releases/assets/794743258",
    ],
    [
      "a credential-bearing alias",
      "https://user:secret@api.github.com/repos/neplextech/oppa/releases/assets/794743258",
    ],
  ] as const) {
    it("rejects " + name + " on static and dynamic endpoints", async () => {
      const { app } = setup({ manifest: withUrl(url) });

      for (const path of ["/tauri/latest.json", "/tauri/darwin/aarch64/0.3.1"]) {
        const response = await app.request(base + path);

        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({ error: "invalid" });
      }
    });
  }

  it("rejects GitHub API URLs whose asset ID differs from the asset", async () => {
    const { app } = setup({ edit: assetApiUrl(794743258, api + "794729744") });

    const response = await app.request(base + "/tauri/latest.json");

    expect(response.status).toBe(422);
  });

  it("rejects GitHub API URLs from another repository", async () => {
    const { app } = setup({
      edit: assetApiUrl(
        794743258,
        "https://api.github.com/repos/neplextech/other/releases/assets/794743258",
      ),
    });

    const response = await app.request(base + "/tauri/darwin/aarch64/0.3.1");

    expect(response.status).toBe(422);
  });

  it("keeps assets without a REST url field alias-free", async () => {
    const { app } = setup({
      edit: (value) => {
        for (const asset of value.assets as Record<string, unknown>[]) delete asset.url;
      },
    });

    // Without verified aliases, the API URLs in latest.json no longer match any asset.
    expect((await app.request(base + "/tauri/latest.json")).status).toBe(422);
  });
});

describe("asset aliases", () => {
  const asset: Asset = {
    id: "2",
    name: "app.tar.gz",
    size: 4,
    url: "https://downloads.test/app.tar.gz",
    aliases: ["https://api.test/assets/2"],
  };

  it("matches canonical URLs and aliases after URL normalization", () => {
    expect(findAssetByUrl([asset], "https://downloads.test/app.tar.gz")).toBe(asset);
    expect(findAssetByUrl([asset], "https://API.test:443/assets/2")).toBe(asset);
    expect(findAssetByUrl([asset], "https://api.test/assets/3")).toBeUndefined();
    expect(findAssetByUrl([asset], "/assets/2")).toBeUndefined();
    expect(findAssetByUrl([asset], "https://user@api.test/assets/2")).toBeUndefined();
  });

  it("fails closed when a URL identifies more than one asset", () => {
    const other = { ...asset, id: "3", name: "copy.tar.gz", aliases: [] };

    expect(findAssetByUrl([asset, other], asset.url)).toBeUndefined();
  });

  function app(aliases: string[], extra: Asset[] = []) {
    const value: Release = {
      id: "1",
      tag: "v1.0.0",
      version: "1.0.0",
      prerelease: false,
      assets: [{ ...asset, aliases }, ...extra],
    };

    const provider: Provider = {
      name: "fixture",
      scope: "aliases",
      releases: async () => [value],
      open: async () => new Response(null, { status: 404 }),
      redirect: (target) => target.url,
    };

    return createUpserve({ apps: { demo: { provider, adapters: [tauri()] } } });
  }

  it("rejects insecure, fragment and colliding aliases at the core boundary", async () => {
    const other: Asset = {
      id: "3",
      name: "other.tar.gz",
      size: 4,
      url: "https://downloads.test/other",
    };

    for (const instance of [
      app(["http://api.test/assets/2"]),
      app(["https://api.test/assets/2#fragment"]),
      app(["https://downloads.test/other"], [other]),
      app(Array.from({ length: 9 }, (_, index) => "https://api.test/assets/2?" + index)),
    ]) {
      const response = await instance.request("/demo/stable/tauri/latest.json");

      expect(response.status).toBe(422);
    }
  });

  it("delivers the canonical URL even when an alias is present", async () => {
    const instance = app(["https://api.test/assets/2"]);

    const response = await instance.request("/demo/stable/assets/1/2");

    expect(response.headers.get("location")).toBe("https://downloads.test/app.tar.gz");
  });
});
