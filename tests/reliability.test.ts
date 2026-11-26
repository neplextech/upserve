import { expect, it, vi } from "vitest";
import { createUpserve, defineAdapter, readText, UpserveError } from "@neplex/upserve";
import type { Provider, Release } from "@neplex/upserve";
import { github } from "@neplex/upserve-github";
import { generic } from "@neplex/upserve-generic";

const release: Release = {
  id: "1",
  tag: "v1.0.0",
  version: "1.0.0",
  prerelease: false,
  assets: [
    {
      id: "2",
      name: "app.exe",
      size: 4,
      url: "https://github.com/test/app/releases/download/v1.0.0/app.exe",
    },
  ],
};

const path = "/demo/stable/generic/latest";

function provider(): Provider {
  return {
    name: "fixture",
    scope: "one",
    releases: vi.fn(async () => [release]),
    open: vi.fn(async () => new Response("data")),
  };
}

it("does not deadlock nested provider caches with concurrency one", async () => {
  const p = provider();

  p.releases = async (context) => context.cached("page", async () => [release]);

  const app = createUpserve({
    concurrency: 1,
    apps: { demo: { provider: p, adapters: [generic()] } },
  });

  expect((await app.request(path)).status).toBe(200);
});

it("limits refresh concurrency across applications", async () => {
  let active = 0;

  let maximum = 0;

  const p = provider();

  p.releases = async () => {
    active++;
    maximum = Math.max(maximum, active);

    await new Promise((resolve) => setTimeout(resolve, 1));

    active--;

    return [release];
  };

  const app = createUpserve({
    concurrency: 2,
    apps: Object.fromEntries(
      Array.from({ length: 10 }, (_, index) => [
        "app" + index,
        { provider: p, adapters: [generic()] },
      ]),
    ),
  });

  await Promise.all(
    Array.from({ length: 10 }, (_, index) =>
      app.request("/app" + index + "/stable/generic/latest"),
    ),
  );

  expect(maximum).toBe(2);
});

it("negative-caches confirmed absence for a shorter interval", async () => {
  let now = 0;

  const p = provider();

  p.releases = vi.fn(async () => []);

  const app = createUpserve({
    now: () => now,
    apps: { demo: { provider: p, adapters: [generic()], cache: { ttl: 100, negativeTtl: 5 } } },
  });

  await app.request(path);
  now = 4;
  await app.request(path);

  expect(p.releases).toHaveBeenCalledTimes(1);

  now = 6;
  await app.request(path);

  expect(p.releases).toHaveBeenCalledTimes(2);
});

it("returns stale while a registered background refresh runs", async () => {
  let now = 0;

  let resolve: ((values: Release[]) => void) | undefined;

  const pending: Promise<unknown>[] = [];

  const p = provider();

  const app = createUpserve({
    now: () => now,
    background: (task) => pending.push(task),
    apps: { demo: { provider: p, adapters: [generic()], cache: { ttl: 1 } } },
  });

  await app.request(path);
  now = 2;
  p.releases = () =>
    new Promise((done) => {
      resolve = done;
    });

  expect((await app.request(path)).status).toBe(200);
  expect(pending).toHaveLength(1);

  resolve!([{ ...release, version: "2.0.0" }]);
  await Promise.all(pending);

  expect((await (await app.request(path)).json()).version).toBe("2.0.0");
});

it("preserves a valid manifest when a subsequent response is malformed", async () => {
  let now = 0;

  let text = '{"valid":true}';

  const p = provider();

  p.open = async () => new Response(text);

  const adapter = defineAdapter({
    name: "manifest",
    register(router, services) {
      router.get("/manifest", async (c) => {
        const r = await services.latest(c.req.param("channel")!);

        const result = await services.manifest(r!, "app.exe", (input) => {
          const value = JSON.parse(input) as { valid: boolean };

          if (!value.valid) throw new Error("invalid");

          return value;
        });

        return c.json(result);
      });
    },
  });

  const app = createUpserve({
    now: () => now,
    apps: { demo: { provider: p, adapters: [adapter], cache: { ttl: 1, staleIfError: 10 } } },
  });

  expect((await app.request("/demo/stable/manifest")).status).toBe(200);

  text = "{broken";
  now = 2;

  expect(await (await app.request("/demo/stable/manifest")).json()).toEqual({ valid: true });

  now = 20;

  expect((await app.request("/demo/stable/manifest")).status).toBe(503);
});

it.each(["assets/1/2", "download"])(
  "streams %s without ETag buffering and forwards aborts",
  async (path) => {
    let cancelled = false;

    let signal: AbortSignal | undefined;

    const p = provider();

    p.open = async (_asset, _request, context) => {
      signal = context.signal;

      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("data"));
          },
          cancel() {
            cancelled = true;
          },
        }),
        { headers: { ETag: '"upstream"' } },
      );
    };

    const app = createUpserve({
      apps: {
        demo: {
          provider: p,
          adapters: [
            generic(),
            defineAdapter({
              name: "download",
              register(router, services) {
                router.get("/download", async (c) => {
                  const selected = await services.latest(c.req.param("channel")!);

                  return services.deliver(c.req.raw, selected!, selected!.assets[0]!);
                });
              },
            }),
          ],
          delivery: "stream",
        },
      },
    });

    const controller = new AbortController();

    const response = await app.fetch(
      new Request("https://local/demo/stable/" + path, { signal: controller.signal }),
    );

    expect(response.headers.get("etag")).toBe('"upstream"');
    expect(response.headers.has("X-Upserve-Delivery")).toBe(false);

    await response.body!.cancel();
    controller.abort();

    expect(cancelled).toBe(true);
    expect(signal!.aborted).toBe(true);
  },
);

it("bounds metadata consumption and cancels oversized upstream responses", async () => {
  let cancelled = false;

  const response = new Response(
    new ReadableStream({
      pull(c) {
        c.enqueue(new Uint8Array(100));
      },
      cancel() {
        cancelled = true;
      },
    }),
  );

  await expect(readText(response, 50)).rejects.toThrow(/size/);

  expect(cancelled).toBe(true);
});

it("bounds network retries with exponential backoff", async () => {
  const sleep = vi.fn(async () => undefined);

  const fetcher = vi.fn(async () => {
    throw new Error("offline");
  });

  const p = github({ repository: "test/app", fetch: fetcher, sleep, random: () => 0, retries: 2 });

  await expect(
    p.releases({
      signal: new AbortController().signal,
      cached: async (_key, load) => load(undefined),
    }),
  ).rejects.toBeInstanceOf(UpserveError);

  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(sleep.mock.calls).toEqual([[250], [500]]);
});

it("distinguishes headerless secondary throttling from authentication failures", async () => {
  const p = github({
    repository: "test/app",
    fetch: async () =>
      Response.json({ message: "You have exceeded a secondary rate limit." }, { status: 403 }),
  });

  await expect(
    p.releases({
      signal: new AbortController().signal,
      cached: async (_key, load) => load(undefined),
    }),
  ).rejects.toMatchObject({ code: "rate_limit" });
});

it("explicit refresh revalidates GitHub pages despite their freshness", async () => {
  let deleted = false;

  const fetcher = vi.fn(async () =>
    Response.json(
      deleted ? [] : [{ id: 1, tag_name: "v1.0.0", draft: false, prerelease: false, assets: [] }],
    ),
  );

  const app = createUpserve({
    apps: {
      demo: { provider: github({ repository: "test/app", fetch: fetcher }), adapters: [generic()] },
    },
  });

  await app.request(path);
  deleted = true;
  await app.refresh("demo");

  expect((await app.request(path)).status).toBe(204);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
