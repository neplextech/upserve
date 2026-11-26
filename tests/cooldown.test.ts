import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  createUpserve,
  defineAdapter,
  defineCache,
  memoryCache,
  UpserveError,
} from "@neplex/upserve";
import type { CacheEntry, CacheStore, Provider, Release } from "@neplex/upserve";
import { generic } from "@neplex/upserve-generic";
import { sqliteCache } from "@neplex/upserve-sqlite";

const release: Release = {
  id: "1",
  tag: "v1.0.0",
  version: "1.0.0",
  prerelease: false,
  assets: [
    { id: "2", name: "manifest.json", size: 2, url: "https://downloads.test/manifest.json" },
  ],
};

const latest = "/demo/stable/generic/latest";

const manifest = "/demo/stable/manifest";

/** Adapter that parses manifest.json and rejects anything other than {"valid":true}. */
const strict = defineAdapter({
  name: "strict",
  register(router, services) {
    router.get("/manifest", async (c) => {
      const value = await services.manifest(
        (await services.latest(c.req.param("channel")!))!,
        "manifest.json",
        (text) => {
          const parsed = JSON.parse(text) as { valid?: boolean };

          if (parsed.valid !== true) throw new Error("invalid");

          return parsed;
        },
      );

      return c.json(value);
    });
  },
});

function provider(text = "{broken"): Provider {
  return {
    name: "fixture",
    scope: "cooldown",
    releases: vi.fn(async () => [structuredClone(release)]),
    open: vi.fn(async () => new Response(text)),
  };
}

/** Record every persisted entry exactly as a JSON store would serialize it. */
function recording(store: CacheStore = memoryCache()) {
  const written: string[] = [];

  return {
    written,
    store: defineCache({
      get: (key) => store.get(key),
      async set(key, entry) {
        written.push(JSON.stringify(entry));

        await store.set(key, entry);
      },
      delete: (key) => store.delete(key),
    }),
  };
}

async function expectError(response: Response, status: number, error: string) {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ error });
}

describe("failure cooldowns preserve the original classification", () => {
  it("keeps a cold manifest validation failure at 422 without upstream requests", async () => {
    let now = 1_000;

    const p = provider();

    const app = createUpserve({
      now: () => now,
      apps: { demo: { provider: p, adapters: [strict] } },
    });

    await expectError(await app.request(manifest), 422, "invalid");

    for (const offset of [1, 5_000, 14_999]) {
      now = 1_000 + offset;

      await expectError(await app.request(manifest), 422, "invalid");
    }

    expect(p.open).toHaveBeenCalledTimes(1);

    // The cooldown ends 15 seconds after the failure and the upstream is read again.
    now = 16_000;
    p.open = vi.fn(async () => new Response('{"valid":true}'));

    expect(await (await app.request(manifest)).json()).toEqual({ valid: true });
    expect(p.open).toHaveBeenCalledTimes(1);
  });

  it("keeps invalid provider metadata at 422 during the cooldown", async () => {
    let now = 0;

    const p = provider();

    p.releases = vi.fn(async () => [{ ...release, version: "not-semver" }]);

    const app = createUpserve({
      now: () => now,
      apps: { demo: { provider: p, adapters: [generic()] } },
    });

    await expectError(await app.request(latest), 422, "invalid");

    now = 10_000;

    await expectError(await app.request(latest), 422, "invalid");

    expect(p.releases).toHaveBeenCalledTimes(1);
  });

  it("keeps authentication failures closed and classified as auth", async () => {
    let now = 0;

    const p = provider();

    p.private = true;

    const app = createUpserve({
      now: () => now,
      apps: { demo: { provider: p, adapters: [generic()], authorize: () => true } },
    });

    expect((await app.request(latest)).status).toBe(200);

    p.releases = vi.fn(async () => {
      throw new UpserveError("auth", "revoked", 121_000);
    });

    now = 61_000;

    await expectError(await app.request(latest), 503, "auth");

    // Revocation discards the cached private metadata instead of serving it stale.
    now = 62_000;

    await expectError(await app.request(latest), 503, "auth");

    expect(p.releases).toHaveBeenCalledTimes(1);
  });

  it("keeps genuine upstream rate limits and their Retry-After", async () => {
    let now = 0;

    const p = provider();

    p.releases = vi.fn(async () => {
      throw new UpserveError("rate_limit", "limited", 60_000);
    });

    const app = createUpserve({
      now: () => now,
      apps: { demo: { provider: p, adapters: [generic()] } },
    });

    await expectError(await app.request(latest), 503, "rate_limit");

    now = 30_000;

    const response = await app.request(latest);

    expect(response.headers.get("retry-after")).toMatch(/^\d+$/);

    await expectError(response, 503, "rate_limit");

    expect(p.releases).toHaveBeenCalledTimes(1);
  });

  it("serves stale data within staleIfError, then reports the original network failure", async () => {
    let now = 0;

    const p = provider();

    const app = createUpserve({
      now: () => now,
      apps: { demo: { provider: p, adapters: [generic()], cache: { ttl: 10, staleIfError: 20 } } },
    });

    expect((await app.request(latest)).status).toBe(200);

    p.releases = vi.fn(async () => {
      throw new UpserveError("network", "offline");
    });

    now = 15;

    expect((await app.request(latest)).status).toBe(200);

    now = 25;

    expect((await app.request(latest)).status).toBe(200);

    // Stale data has expired, but the 15 second cooldown started at 15 has not.
    now = 40;

    await expectError(await app.request(latest), 503, "network");

    expect(p.releases).toHaveBeenCalledTimes(1);
  });

  it("classifies unexpected provider exceptions as internal during the cooldown", async () => {
    let now = 0;

    const p = provider();

    p.releases = vi.fn(async () => {
      throw new TypeError("plugin bug with token=ghp_secret");
    });

    const app = createUpserve({
      now: () => now,
      apps: { demo: { provider: p, adapters: [generic()] } },
    });

    await expectError(await app.request(latest), 500, "internal");

    now = 1_000;

    await expectError(await app.request(latest), 500, "internal");

    expect(p.releases).toHaveBeenCalledTimes(1);
  });

  it("clears the classification after a successful refresh", async () => {
    let now = 0;

    const p = provider();

    const { store, written } = recording();

    p.releases = vi.fn(async () => {
      throw new UpserveError("network", "offline");
    });

    const app = createUpserve({
      now: () => now,
      cache: store,
      apps: { demo: { provider: p, adapters: [generic()] } },
    });

    await expectError(await app.request(latest), 503, "network");

    now = 20_000;
    p.releases = vi.fn(async () => [structuredClone(release)]);

    expect((await app.request(latest)).status).toBe(200);
    expect(JSON.parse(written.at(-1)!)).not.toHaveProperty("error");
  });
});

describe("persisted cooldowns", () => {
  it("restores the classification from SQLite without contacting the upstream", async () => {
    const directory = await mkdtemp(join(tmpdir(), "upserve-cooldown-"));

    const filename = join(directory, "cache.sqlite");

    try {
      let now = 0;

      const first = sqliteCache(filename);

      const before = provider();

      await expectError(
        await createUpserve({
          now: () => now,
          cache: first,
          apps: { demo: { provider: before, adapters: [strict] } },
        }).request(manifest),
        422,
        "invalid",
      );

      first.close();

      // A new process reuses the persisted manifest cooldown.
      now = 5_000;

      const second = sqliteCache(filename);

      const after = provider();

      await expectError(
        await createUpserve({
          now: () => now,
          cache: second,
          apps: { demo: { provider: after, adapters: [strict] } },
        }).request(manifest),
        422,
        "invalid",
      );

      expect(after.open).not.toHaveBeenCalled();

      second.close();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("persists only the code, never messages or upstream details", async () => {
    const { store, written } = recording();

    const p = provider();

    p.releases = vi.fn(async () => {
      throw new UpserveError("network", "Authorization: Bearer ghp_secret failed");
    });

    const app = createUpserve({
      now: () => 0,
      cache: store,
      apps: { demo: { provider: p, adapters: [generic()] } },
    });

    await app.request(latest);

    expect(written).toEqual([
      JSON.stringify({
        value: undefined,
        freshUntil: 0,
        staleUntil: 0,
        retryAt: 15_000,
        error: "network",
      }),
    ]);
    expect(written.join()).not.toContain("secret");
  });

  for (const [name, error] of [
    ["entries written before classifications existed", undefined],
    ["entries with an unknown classification", "teapot"],
  ] as const) {
    it("reports rate_limit for " + name, async () => {
      const legacy: CacheEntry = {
        value: undefined,
        freshUntil: 0,
        staleUntil: 0,
        retryAt: 60_000,
      };

      if (error) Object.assign(legacy, { error });

      const store = defineCache({
        get: async () => structuredClone(legacy),
        set: async () => undefined,
        delete: async () => undefined,
      });

      const p = provider();

      const app = createUpserve({
        now: () => 1_000,
        cache: store,
        apps: { demo: { provider: p, adapters: [generic()] } },
      });

      await expectError(await app.request(latest), 503, "rate_limit");

      expect(p.releases).not.toHaveBeenCalled();
    });
  }
});
