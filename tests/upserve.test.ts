import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { createUpserve, memoryCache, newer, UpserveError } from "@neplex/upserve";
import type { Provider, Release } from "@neplex/upserve";
import { generic } from "@neplex/upserve-generic";
import { tauri } from "@neplex/upserve-tauri";
import { android } from "@neplex/upserve-android";
import { electron } from "@neplex/upserve-electron";
import { github } from "@neplex/upserve-github";
import { sqliteCache } from "@neplex/upserve-sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const release: Release = {
  id: "1",
  tag: "app-v1.2.0",
  version: "1.2.0",
  prerelease: false,
  assets: [],
};

function fixture(values = [release]): Provider {
  return {
    name: "fixture",
    scope: "test",
    releases: vi.fn(async () => structuredClone(values)),
    open: vi.fn(async () => new Response("binary")),
  };
}

function setup(provider = fixture(), extra = {}) {
  return createUpserve({ apps: { demo: { provider, adapters: [generic()] } }, ...extra });
}

const path = "/demo/stable/generic/latest";

describe("registry and public contracts", () => {
  it("mounts a real Hono app, selects channels and versions", async () => {
    const updates = setup(
      fixture([release, { ...release, id: "2", version: "2.0.0-beta.1", prerelease: true }]),
    );

    const parent = new Hono().route("/updates", updates);
    expect((await (await parent.request("/updates" + path)).json()).version).toBe("1.2.0");
    expect((await (await updates.request("/demo/prerelease/generic/latest")).json()).version).toBe(
      "2.0.0-beta.1",
    );
    expect((await updates.request("/demo/stable/generic/versions/1.2.0")).status).toBe(200);
    expect((await updates.request("/demo/stable/generic/update/1.2.0")).status).toBe(204);
    expect((await updates.request("/demo/stable/generic/update/bad")).status).toBe(422);
    expect((await updates.request("/demo/unknown/generic/latest")).status).toBe(404);
  });
  it("rejects configuration and private authorization mistakes", async () => {
    expect(() =>
      createUpserve({ apps: { "../x": { provider: fixture(), adapters: [] } } }),
    ).toThrow();
    expect(() => setup({ ...fixture(), private: true })).toThrow(/authorization/);
    expect(() => setup(fixture(), { concurrency: 0 })).toThrow();

    const provider = { ...fixture(), private: true };

    const app = createUpserve({
      apps: { demo: { provider, authorize: () => false, adapters: [generic()] } },
    });
    expect((await app.request(path)).status).toBe(401);
    expect(provider.releases).not.toHaveBeenCalled();
  });
  it("compares full semantic versions without coercion", () => {
    expect(newer("1.0.0", "1.0.0-rc.2")).toBe(true);
    expect(newer("1.0.0-beta.10", "1.0.0-beta.2")).toBe(true);
    expect(newer("1.0.0+build", "1.0.0")).toBe(false);
    expect(() => newer("tag-1", "1.0.0")).toThrow();
  });
});

describe("cache coordination", () => {
  it("coalesces concurrent checks and supports client ETags", async () => {
    const provider = fixture();

    const app = setup(provider);

    const responses = await Promise.all(Array.from({ length: 30 }, () => app.request(path)));
    expect(provider.releases).toHaveBeenCalledTimes(1);

    const etag = responses[0]!.headers.get("etag")!;
    expect((await app.request(path, { headers: { "If-None-Match": etag } })).status).toBe(304);
  });
  it("preserves finite last-known-good state and cools down failures", async () => {
    let now = 100;

    const provider = fixture();

    const app = createUpserve({
      now: () => now,
      apps: { demo: { provider, adapters: [generic()], cache: { ttl: 10, staleIfError: 20 } } },
    });
    expect((await app.request(path)).status).toBe(200);
    provider.releases = vi.fn(async () => {
      throw new UpserveError("network", "offline");
    });
    now = 111;
    expect((await app.request(path)).status).toBe(200);
    now = 140;
    expect((await app.request(path)).status).toBe(503);
    expect(provider.releases).toHaveBeenCalledTimes(1);
  });
  it("fails closed on revocation, removes withdrawals and rejects malformed releases", async () => {
    const provider = fixture();

    const app = setup(provider);
    await app.request(path);
    provider.releases = async () => [];
    await app.refresh("demo");
    expect((await app.request(path)).status).toBe(204);
    provider.releases = async () => [{ ...release, version: "bad" }];
    await app.invalidate("demo");
    expect((await app.request(path)).status).toBe(422);

    const privateProvider = fixture();

    const privateApp = setup(privateProvider);
    await privateApp.request(path);
    privateProvider.releases = async () => {
      throw new UpserveError("auth", "revoked");
    };
    await expect(privateApp.refresh("demo")).rejects.toThrow();
    expect((await privateApp.request(path)).status).toBe(503);
  });
  it("persists entries and cooldown across SQLite restarts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "upserve-"));

    try {
      let store = sqliteCache(join(dir, "cache.sqlite"));
      await store.set("key", {
        value: { version: "1.0.0" },
        freshUntil: 100,
        staleUntil: 200,
        retryAt: 150,
      });
      store.close();
      store = sqliteCache(join(dir, "cache.sqlite"));
      expect(await store.get("key")).toEqual({
        value: { version: "1.0.0" },
        freshUntil: 100,
        staleUntil: 200,
        retryAt: 150,
      });
      await store.delete("key");
      expect(await store.get("key")).toBeUndefined();
      store.close();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it("isolates applications sharing a cache", async () => {
    const cache = memoryCache();

    const a = setup(fixture(), { cache, namespace: "one" });

    const b = setup(fixture([{ ...release, version: "2.0.0" }]), { cache, namespace: "two" });
    expect((await (await a.request(path)).json()).version).toBe("1.2.0");
    expect((await (await b.request(path)).json()).version).toBe("2.0.0");
  });
});

function asset(id: string, name: string, size = 10) {
  return { id, name, size, url: "https://github.com/test/app/releases/download/v1.2.0/" + name };
}

function protocolApp(
  adapter: ReturnType<typeof tauri>,
  manifests: Record<string, string>,
  assets: Release["assets"],
) {
  const r = { ...release, tag: "v1.2.0", assets };

  const provider = fixture([r]);
  provider.open = async (a) => new Response(manifests[a.name] ?? "binary");
  return createUpserve({ apps: { demo: { provider, adapters: [adapter] } } });
}

describe("real protocol shapes", () => {
  it("preserves Tauri signatures and mounted URLs, returns 204", async () => {
    const binary = asset("2", "app.tar.gz");

    const app = protocolApp(
      tauri(),
      {
        "latest.json": JSON.stringify({
          version: "1.2.0",
          platforms: { "darwin-aarch64": { url: binary.url, signature: "signed-content" } },
        }),
      },
      [asset("1", "latest.json"), binary],
    );

    const parent = new Hono().route("/updates", app);

    const result = await (
      await parent.request("/updates/demo/stable/tauri/darwin/aarch64/1.0.0")
    ).json();
    expect(result.signature).toBe("signed-content");
    expect(result.url).toContain("/updates/demo/stable/assets/1/2");
    expect((await app.request("/demo/stable/tauri/linux/x86_64/1.0.0")).status).toBe(204);
    expect((await app.request("/demo/stable/tauri/darwin/aarch64/1.2.0")).status).toBe(204);
  });
  it("rejects missing Tauri binaries/signatures", async () => {
    const app = protocolApp(
      tauri(),
      {
        "latest.json": JSON.stringify({
          version: "1.2.0",
          platforms: { linux: { url: "https://evil.test/a", signature: "" } },
        }),
      },
      [asset("1", "latest.json")],
    );
    expect((await app.request("/demo/stable/tauri/latest.json")).status).toBe(422);
  });
  it("serves OPPA-compatible APK manifests without consumer logic", async () => {
    const apk = asset("2", "app.apk");

    const app = protocolApp(
      android(),
      {
        "latest-android.json": JSON.stringify({
          version: "1.2.0",
          android: { url: apk.url, sha256: "a".repeat(64), size: 10 },
        }),
      },
      [asset("1", "latest-android.json"), apk],
    );

    const response = await app.request("/demo/stable/android/latest.json");
    expect(response.status).toBe(200);
    expect((await response.json()).android.sha256).toBe("a".repeat(64));
  });
  it("serves byte-identical electron-builder YAML and blockmaps", async () => {
    const yaml =
      "version: 1.2.0\nfiles:\n  - url: app.exe\n    sha512: " +
      "A".repeat(86) +
      "==\n    size: 10\npath: app.exe\n";

    const app = protocolApp(electron(), { "latest.yml": yaml }, [
      asset("1", "latest.yml"),
      asset("2", "app.exe"),
      asset("3", "app.exe.blockmap"),
    ]);
    expect(await (await app.request("/demo/stable/electron/latest.yml")).text()).toBe(yaml);
    expect((await app.request("/demo/stable/electron/app.exe.blockmap")).status).toBe(200);
    expect((await app.request("/demo/stable/electron/../../secret")).status).toBe(404);
  });
});

describe("GitHub transport", () => {
  const upstream = (id = 1) => ({
    id,
    tag_name: "v1.2.0",
    draft: false,
    prerelease: false,
    assets: [],
    body: "notes",
  });
  it("authenticates without per-client requests and validates conditional responses", async () => {
    let count = 0;

    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      count++;

      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer secret");
      if (count === 2) {
        expect(headers.get("If-None-Match")).toBe('"v1"');
        return new Response(null, { status: 304 });
      }

      return Response.json([upstream()], { headers: { ETag: '"v1"' } });
    });

    const p = github({ repository: "test/app", token: "secret", private: false, fetch: fetcher });

    const app = setup(p);
    await app.request(path);
    await app.request(path);
    expect(fetcher).toHaveBeenCalledTimes(1);

    const cached = new Map<string, unknown>();

    const context = {
      signal: new AbortController().signal,
      async cached<T>(key: string, load: (v: T | undefined) => Promise<T>) {
        const value = await load(cached.get(key) as T | undefined);
        cached.set(key, value);
        return value;
      },
    };
    count = 0;
    await p.releases(context);
    await p.releases(context);
  });
  it("paginates and fails rather than silently truncating", async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL) =>
      Response.json(
        String(url).endsWith("page=1") ? Array.from({ length: 100 }, (_, i) => upstream(i)) : [],
      ),
    );

    const app = setup(github({ repository: "test/app", fetch: fetcher }));
    await app.request(path);
    expect(fetcher).toHaveBeenCalledTimes(2);

    const limited = setup(github({ repository: "test/app", fetch: fetcher, maxPages: 1 }));
    expect((await limited.request(path)).status).toBe(422);
  });
  it("honors rate-limit cooldown and rejects SSRF redirects", async () => {
    const limited = vi.fn(
      async () => new Response(null, { status: 429, headers: { "Retry-After": "60" } }),
    );

    const app = setup(github({ repository: "test/app", fetch: limited }));
    expect((await app.request(path)).status).toBe(503);
    await app.request(path);
    expect(limited).toHaveBeenCalledTimes(1);

    const provider = github({
      repository: "test/app",
      fetch: async () =>
        new Response(null, { status: 302, headers: { Location: "http://127.0.0.1/secret" } }),
    });
    await expect(
      provider.open(asset("1", "app.exe"), new Request("https://local/"), {
        signal: new AbortController().signal,
        cached: async (_k, load) => load(undefined),
      }),
    ).rejects.toThrow(/redirect/);
  });
  it("streams range requests and strips credentials after redirects", async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("Range")).toBe("bytes=0-3");
      if (String(url).startsWith("https://api.github.com")) {
        expect(headers.get("Authorization")).toBe("Bearer secret");
        return new Response(null, {
          status: 302,
          headers: { Location: "https://release-assets.githubusercontent.com/file?sig=test" },
        });
      }
      expect(headers.has("Authorization")).toBe(false);
      return new Response("data", {
        status: 206,
        headers: { "Content-Range": "bytes 0-3/10", "Content-Length": "4" },
      });
    });

    const p = github({ repository: "test/app", token: "secret", fetch: fetcher });

    const response = await p.open(
      asset("1", "app.exe"),
      new Request("https://local/", { headers: { Range: "bytes=0-3" } }),
      { signal: new AbortController().signal, cached: async (_k, load) => load(undefined) },
    );
    expect(response.status).toBe(206);
    expect(await response.text()).toBe("data");
  });
  it("verifies webhook HMAC and repository identity", async () => {
    const p = github({ repository: "test/app", webhookSecret: "secret" });

    const body = new TextEncoder().encode(
      JSON.stringify({ repository: { full_name: "test/app" } }),
    );

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode("secret"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, body)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    expect(
      await p.verifyWebhook(
        new Request("https://local/", {
          headers: { "x-hub-signature-256": "sha256=" + signature, "x-github-event": "release" },
        }),
        body,
      ),
    ).toBe(true);
    expect(await p.verifyWebhook(new Request("https://local/"), body)).toBe(false);
  });
});
