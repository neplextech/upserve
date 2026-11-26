import { describe, expect, it, vi } from "vitest";

import {
  createUpserve,
  defineCache,
  defineProvider,
  memoryCache,
  UpserveError,
} from "@neplex/upserve";
import type { CacheStore, Provider, Release } from "@neplex/upserve";
import { generic } from "@neplex/upserve-generic";
import { github } from "@neplex/upserve-github";

const secret = "webhook-secret";

const latest = "/oppa/stable/generic/latest";

const hook = "/webhooks/oppa";

/** A GitHub release response for OPPA at one version. */
function githubRelease(version: string, id: number) {
  return {
    id,
    tag_name: "oppa-v" + version,
    draft: false,
    prerelease: false,
    published_at: "2026-11-26T07:36:37Z",
    body: "OPPA " + version,
    assets: [],
  };
}

/** Sign a release event exactly as GitHub does with X-Hub-Signature-256. */
async function delivery(action: string, options: { repository?: string; key?: string } = {}) {
  const body = JSON.stringify({
    action,
    release: { tag_name: "oppa-v0.4.0" },
    repository: { full_name: options.repository ?? "neplextech/oppa" },
  });

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(options.key ?? secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
  );

  const signature = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");

  return {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "x-github-event": "release",
      "x-hub-signature-256": "sha256=" + signature,
    },
  };
}

/**
 * GitHub's release list, controllable per request. `gate()` holds the next list request
 * until released, simulating a refresh that is still running when more events arrive.
 */
function upstream() {
  let releases = [githubRelease("0.3.1", 1)];

  let held: Promise<void> | undefined;

  const fetcher = vi.fn(async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input);

    if (!url.startsWith("https://api.github.com/repos/neplextech/oppa/releases?"))
      return new Response(null, { status: 404 });

    const snapshot = releases;

    await held;

    return Response.json(snapshot);
  });

  return {
    fetcher,
    publish(version: string, id: number) {
      releases = [githubRelease(version, id), ...releases];
    },
    gate() {
      let open!: () => void;

      held = new Promise<void>((resolve) => (open = resolve));

      return () => {
        held = undefined;
        open();
      };
    },
  };
}

function oppa(
  source: ReturnType<typeof upstream>,
  options: {
    background?: (task: Promise<unknown>) => void;
    cache?: CacheStore;
    clock?: { now: number };
  } = {},
) {
  return createUpserve({
    now: () => options.clock?.now ?? 0,
    cache: options.cache,
    background: options.background,
    apps: {
      oppa: {
        provider: github({
          repository: "neplextech/oppa",
          tagPrefix: "oppa-v",
          webhookSecret: secret,
          fetch: source.fetcher as typeof fetch,
        }),
        adapters: [generic()],
      },
    },
  });
}

async function version(app: ReturnType<typeof oppa>) {
  return ((await (await app.request(latest)).json()) as { version: string }).version;
}

/** Wait until GitHub has received `count` release-list requests. HMAC work is async. */
async function requests(source: ReturnType<typeof upstream>, count: number) {
  await vi.waitFor(() => expect(source.fetcher).toHaveBeenCalledTimes(count));
}

describe("OPPA release workflow webhooks", () => {
  it("coalesces edited, published and released into one trailing refresh", async () => {
    const source = upstream();

    const app = oppa(source);

    expect(await version(app)).toBe("0.3.1");
    expect(source.fetcher).toHaveBeenCalledTimes(1);

    // release.edited starts a refresh that is still reading GitHub when publication lands.
    const release = source.gate();

    const edited = app.request(hook, await delivery("edited"));

    await requests(source, 2);

    source.publish("0.4.0", 2);

    const published = await app.request(hook, await delivery("published"));

    const released = await app.request(hook, await delivery("released"));

    for (const response of [published, released]) {
      expect(response.status).toBe(202);
      expect(await response.json()).toEqual({ accepted: true, refreshed: false, coalesced: true });
    }

    release();

    const owner = await edited;

    expect(owner.status).toBe(200);
    expect(await owner.json()).toEqual({ accepted: true, refreshed: true });

    // One refresh for edited and exactly one trailing refresh for both later events.
    expect(source.fetcher).toHaveBeenCalledTimes(3);
    expect(await version(app)).toBe("0.4.0");
    expect(source.fetcher).toHaveBeenCalledTimes(3);
  });

  it("does not scale upstream requests with the burst size", async () => {
    const source = upstream();

    const app = oppa(source);

    await version(app);

    const release = source.gate();

    const owner = app.request(hook, await delivery("edited"));

    await requests(source, 2);

    source.publish("0.4.0", 2);

    const burst = await Promise.all(
      Array.from({ length: 25 }, async () => app.request(hook, await delivery("released"))),
    );

    expect(burst.every((response) => response.status === 202)).toBe(true);

    release();

    expect((await owner).status).toBe(200);
    expect(source.fetcher).toHaveBeenCalledTimes(3);
    expect(await version(app)).toBe("0.4.0");
  });

  it("accepts back-to-back events after a refresh completes instead of returning 429", async () => {
    const source = upstream();

    const app = oppa(source);

    await version(app);

    for (const [action, next] of [
      ["edited", undefined],
      ["published", "0.4.0"],
      ["released", undefined],
    ] as const) {
      if (next) source.publish(next, 2);

      const response = await app.request(hook, await delivery(action));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ accepted: true, refreshed: true });
    }

    expect(await version(app)).toBe("0.4.0");
  });

  it("never lets unauthenticated deliveries schedule a refresh", async () => {
    const source = upstream();

    const app = oppa(source);

    await version(app);

    const release = source.gate();

    const owner = app.request(hook, await delivery("edited"));

    await requests(source, 2);

    for (const forged of [
      await delivery("published", { key: "wrong-secret" }),
      await delivery("published", { repository: "neplextech/other" }),
      { ...(await delivery("published")), headers: { "x-github-event": "release" } },
    ]) {
      expect((await app.request(hook, forged)).status).toBe(401);
    }

    const oversized = await app.request(hook, {
      ...(await delivery("published")),
      body: "x".repeat(256 * 1024 + 1),
    });

    expect(oversized.status).toBe(422);

    release();

    expect((await owner).status).toBe(200);

    // Only the authenticated edited event refreshed; no trailing refresh was scheduled.
    expect(source.fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not reuse a client refresh that started before the event", async () => {
    const source = upstream();

    const clock = { now: 0 };

    const expired: number[] = [];

    const memory = memoryCache();

    // Observe the webhook marking the entry due, which happens after its signature check.
    const store = defineCache({
      get: (key) => memory.get(key),
      async set(key, entry) {
        if (entry.freshUntil === 0) expired.push(entry.freshUntil);

        await memory.set(key, entry);
      },
      delete: (key) => memory.delete(key),
    });

    const app = oppa(source, { cache: store, clock });

    await version(app);

    // After the TTL, a client read starts loading the pre-publication list...
    clock.now = 61_000;

    const release = source.gate();

    const client = app.request(latest);

    await requests(source, 2);

    // ...and the publication event is accepted while that read is still running.
    source.publish("0.4.0", 2);

    const event = app.request(hook, await delivery("published"));

    await vi.waitFor(() => expect(expired.length).toBe(1));

    release();

    expect(await ((await client).json() as Promise<{ version: string }>)).toMatchObject({
      version: "0.3.1",
    });
    expect((await event).status).toBe(200);
    expect(await version(app)).toBe("0.4.0");
  });

  it("acknowledges immediately and drains in the registered background task", async () => {
    const source = upstream();

    const tasks: Promise<unknown>[] = [];

    const app = oppa(source, { background: (task) => tasks.push(task) });

    await version(app);

    source.publish("0.4.0", 2);

    const response = await app.request(hook, await delivery("published"));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ accepted: true, refreshed: false, scheduled: true });

    await Promise.all(tasks);

    expect(await version(app)).toBe("0.4.0");
  });

  it("keeps the event for another instance sharing the store", async () => {
    const source = upstream();

    const store = memoryCache();

    const first = oppa(source, { cache: store });

    await version(first);

    // The receiving process stops before its refresh finishes.
    source.gate();

    source.publish("0.4.0", 2);

    void first.request(hook, await delivery("published"));

    await requests(source, 2);

    // A restarted or sibling instance sees the entry is due and reloads it.
    const second = createUpserve({
      now: () => 0,
      cache: store,
      apps: {
        oppa: {
          provider: github({
            repository: "neplextech/oppa",
            tagPrefix: "oppa-v",
            fetch: async () => Response.json([githubRelease("0.4.0", 2)]),
          }),
          adapters: [generic()],
        },
      },
    });

    expect(await version(second as ReturnType<typeof oppa>)).toBe("0.4.0");
  });
});

describe("webhook refreshes during cooldowns and failures", () => {
  /** Provider with a long-lived page resource, so only forced loads see new releases. */
  function source(clock: { now: number }) {
    let current: Release[] = [
      { id: "1", tag: "v0.3.1", version: "0.3.1", prerelease: false, assets: [] },
    ];

    let failure: UpserveError | undefined;

    const list = vi.fn(async () => {
      if (failure) throw failure;

      return structuredClone(current);
    });

    const provider: Provider = defineProvider({
      name: "fixture",
      scope: "webhooks",
      releases: (context) => context.cached("page", list),
      open: async () => new Response(null, { status: 404 }),
      verifyWebhook: async (request) => request.headers.get("x-test-signature") === "valid",
    });

    const app = createUpserve({
      now: () => clock.now,
      apps: { oppa: { provider, adapters: [generic()], cache: { ttl: 600_000 } } },
    });

    return {
      app,
      list,
      publish(next: string) {
        current = [{ id: next, tag: "v" + next, version: next, prerelease: false, assets: [] }];
      },
      fail(error: UpserveError | undefined) {
        failure = error;
      },
    };
  }

  const event = { method: "POST", body: "{}", headers: { "x-test-signature": "valid" } };

  it("respects an upstream rate-limit cooldown and reloads after it ends", async () => {
    const clock = { now: 0 };

    const fixture = source(clock);

    expect(await version(fixture.app as ReturnType<typeof oppa>)).toBe("0.3.1");

    fixture.fail(new UpserveError("rate_limit", "limited", 60_000));
    clock.now = 1_000;

    const limited = await fixture.app.request(hook, event);

    expect(limited.status).toBe(202);
    expect(await limited.json()).toEqual({
      accepted: true,
      refreshed: false,
      deferred: true,
      error: "rate_limit",
    });

    // Further events inside the cooldown are accepted without contacting the upstream.
    fixture.fail(undefined);
    fixture.publish("0.4.0");
    clock.now = 2_000;

    const calls = fixture.list.mock.calls.length;

    for (let index = 0; index < 3; index++) {
      const response = await fixture.app.request(hook, event);

      expect(response.status).toBe(202);
      expect(await response.json()).toMatchObject({ accepted: true, deferred: true });
    }

    expect(fixture.list).toHaveBeenCalledTimes(calls);
    expect(await version(fixture.app as ReturnType<typeof oppa>)).toBe("0.3.1");

    // After the cooldown, an ordinary read forces the page reload the events asked for.
    clock.now = 61_000;

    expect(await version(fixture.app as ReturnType<typeof oppa>)).toBe("0.4.0");
  });

  it("reports a failed refresh and recovers on the next read after its cooldown", async () => {
    const clock = { now: 0 };

    const fixture = source(clock);

    await version(fixture.app as ReturnType<typeof oppa>);

    fixture.fail(new UpserveError("network", "offline"));
    fixture.publish("0.4.0");

    const failed = await fixture.app.request(hook, event);

    expect(failed.status).toBe(202);
    expect(await failed.json()).toMatchObject({ refreshed: false, deferred: true });

    fixture.fail(undefined);
    clock.now = 16_000;

    expect(await version(fixture.app as ReturnType<typeof oppa>)).toBe("0.4.0");
  });

  it("rejects unauthenticated events before touching cache state", async () => {
    const clock = { now: 0 };

    const fixture = source(clock);

    await version(fixture.app as ReturnType<typeof oppa>);

    fixture.publish("0.4.0");

    const forged = await fixture.app.request(hook, { method: "POST", body: "{}" });

    expect(forged.status).toBe(401);

    // The cached list remains fresh: no refresh was scheduled or forced.
    expect(await version(fixture.app as ReturnType<typeof oppa>)).toBe("0.3.1");
    expect(fixture.list).toHaveBeenCalledTimes(1);
  });
});
