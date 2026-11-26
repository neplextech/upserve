import { Hono } from "hono";
import { etag } from "hono/etag";
import type { AppConfig, Asset, Release, ResourceContext, UpserveConfig } from "./contracts.js";
import { validateAliases } from "./assets.js";
import { Coordinator, memoryCache } from "./cache.js";
import { UpserveError } from "./errors.js";
import { compareVersions, identifier, readText, releaseSchema } from "./validation.js";

export type {
  Adapter,
  AdapterServices,
  AppConfig,
  Asset,
  CacheEntry,
  CacheFailure,
  CachePolicy,
  CacheStore,
  Provider,
  Release,
  ResourceContext,
  UpserveConfig,
} from "./contracts.js";
export { defineAdapter, defineCache, defineConfig, defineProvider } from "./contracts.js";
export { findAssetByUrl } from "./assets.js";
export { memoryCache } from "./cache.js";
export { UpserveError } from "./errors.js";
export type { UpserveErrorCode } from "./errors.js";
export { newer, validVersion, compareVersions, readText } from "./validation.js";

/** A genuine Hono application with trusted programmatic refresh controls. */
export type Upserve = Hono & {
  refresh(application: string): Promise<void>;
  invalidate(application: string): Promise<void>;
};

/** Create an embeddable Fetch application. No listener, timer, or database is started. */
export function createUpserve(config: UpserveConfig): Upserve {
  const concurrency = config.concurrency ?? 4;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 64)
    throw new UpserveError("configuration", "concurrency must be between 1 and 64");

  const store = config.cache ?? memoryCache();

  const resources = new Coordinator(store, config.now ?? Date.now, concurrency);

  const coordinator = new Coordinator(
    store,
    config.now ?? Date.now,
    concurrency,
    config.background,
  );

  const app = new Hono();

  const controls = new Map<string, { refresh(): Promise<void>; invalidate(): Promise<void> }>();

  app.onError((error, context) => {
    if (error instanceof UpserveError) {
      if (error.retryAt)
        context.header(
          "Retry-After",
          String(Math.max(1, Math.ceil((error.retryAt - Date.now()) / 1000))),
        );
      return context.json(
        { error: error.code },
        error.code === "missing" ? 404 : error.code === "invalid" ? 422 : 503,
      );
    }

    return context.json({ error: "internal" }, 500);
  });

  for (const [name, application] of Object.entries(config.apps)) {
    validateApp(name, application);

    const channels = application.channels ?? {
      stable: (r: Release) => !r.prerelease,
      prerelease: (r: Release) => r.prerelease,
    };

    for (const channel of Object.keys(channels))
      if (!identifier.test(channel) || typeof channels[channel] !== "function")
        throw new UpserveError("configuration", "Invalid channel name");

    const key = JSON.stringify([
      config.namespace ?? "upserve-v1",
      name,
      application.provider.name,
      application.provider.scope,
    ]);

    const resource: ResourceContext = {
      signal: new AbortController().signal,
      cached: (identity, load) =>
        resources.get(key + ":resource:" + identity, load, {
          ...application.cache,
          staleIfError: 0,
        }),
    };

    const load = async (force = false) => {
      // Each refresh has its own deadline; client disconnects cannot poison shared refreshes.
      const values = await application.provider.releases({
        ...resource,
        cached: (identity, loader) =>
          resources.get(
            key + ":resource:" + identity,
            loader,
            { ...application.cache, staleIfError: 0 },
            force,
          ),
        signal: AbortSignal.timeout(120_000),
      });

      const parsed = releaseSchema.array().max(10_000).safeParse(values);
      if (!parsed.success)
        throw new UpserveError("invalid", "Provider returned invalid release metadata");
      for (const release of parsed.data) {
        if (
          new Set(release.assets.map((a) => a.name)).size !== release.assets.length ||
          new Set(release.assets.map((a) => a.id)).size !== release.assets.length
        )
          throw new UpserveError("invalid", "Duplicate asset identity");

        validateAliases(release);
      }

      return parsed.data
        .filter((r) => !r.draft && !r.yanked)
        .sort((a, b) => compareVersions(a.version, b.version));
    };

    const releases = async (channel: string) => {
      const select = channels[channel];
      if (!Object.hasOwn(channels, channel) || !select)
        throw new UpserveError("missing", "Unknown release channel");

      const all = await coordinator.get<Release[]>(
        key,
        (previous) => load(previous === undefined),
        application.cache,
      );
      return all.filter(select);
    };

    const router = new Hono();
    router.use("*", async (c, next) => {
      c.header(
        "Cache-Control",
        application.authorize ? "private, no-store" : "public, max-age=0, must-revalidate",
      );
      if (application.authorize && !(await application.authorize(c.req.raw)))
        return c.json({ error: "unauthorized" }, 401);
      if (!Object.hasOwn(channels, c.req.param("channel") ?? "")) return c.notFound();
      await next();
    });
    router.use("*", async (c, next) => {
      await next();

      // Delivery marks its response so ETag hashing never consumes a binary body,
      // including downloads registered by third-party adapters at arbitrary paths.
      if (c.res.headers.has("X-Upserve-Delivery")) {
        c.res.headers.delete("X-Upserve-Delivery");

        return;
      }

      return etag()(c, async () => {});
    });

    const deliver = async (
      request: Request,
      _release: Release,
      asset: Asset,
    ): Promise<Response> => {
      if (
        application.delivery !== "stream" &&
        !application.provider.private &&
        application.provider.redirect
      )
        return new Response(null, {
          status: 302,
          headers: { Location: application.provider.redirect(asset), "X-Upserve-Delivery": "1" },
        });

      const response = await application.provider.open(asset, request, {
        ...resource,
        signal: request.signal,
      });

      const headers = new Headers({ "X-Upserve-Delivery": "1" });
      for (const header of [
        "content-length",
        "content-type",
        "content-range",
        "accept-ranges",
        "etag",
        "last-modified",
        "content-disposition",
      ]) {
        const value = response.headers.get(header);
        if (value) headers.set(header, value);
      }
      headers.set(
        "Cache-Control",
        application.authorize ? "private, no-store" : "public, max-age=3600",
      );
      if (request.method === "HEAD") await response.body?.cancel();

      return new Response(request.method === "HEAD" ? null : response.body, {
        status: response.status,
        headers,
      });
    };
    router.on(["GET", "HEAD"], "/assets/:release/:asset", async (c) => {
      const list = await releases(c.req.param("channel")!);

      const release = list.find((r) => r.id === c.req.param("release"));

      const asset = release?.assets.find((a) => a.id === c.req.param("asset"));

      if (!release || !asset) return c.notFound();
      return deliver(c.req.raw, release, asset);
    });

    const names = new Set<string>();
    for (const adapter of application.adapters) {
      if (names.has(adapter.name)) throw new UpserveError("configuration", "Duplicate adapter");
      names.add(adapter.name);
      adapter.register(router, {
        config: application,
        channels: Object.keys(channels),
        releases,
        latest: async (channel) => (await releases(channel))[0],
        manifest: async (release, assetName, parse) => {
          const asset = release.assets.find((a) => a.name === assetName);
          if (!asset) throw new UpserveError("missing", "Release manifest missing");

          const text = await coordinator.get(
            key + ":manifest:" + release.id + ":" + asset.id,
            async () => {
              const response = await application.provider.open(
                asset,
                new Request("https://upserve.invalid/"),
                { ...resource, signal: AbortSignal.timeout(30_000) },
              );
              if (!response.ok) throw new UpserveError("network", "Cannot read release manifest");

              const text = await readText(response);
              try {
                parse(text);
              } catch {
                throw new UpserveError("invalid", "Invalid release manifest");
              }

              return text;
            },
            application.cache,
          );
          try {
            return parse(text);
          } catch {
            throw new UpserveError("invalid", "Invalid release manifest");
          }
        },
        assetUrl: (c, release, asset) => {
          // Derive the mount path from the real request, including a parent Hono route prefix.
          const url = new URL(c.req.url);

          const marker = "/" + name + "/" + c.req.param("channel") + "/";

          const index = url.pathname.lastIndexOf(marker);
          url.pathname =
            url.pathname.slice(0, index) +
            marker +
            "assets/" +
            encodeURIComponent(release.id) +
            "/" +
            encodeURIComponent(asset.id);
          url.search = "";
          url.hash = "";
          return url.toString();
        },
        deliver,
      });
    }
    app.route("/" + name + "/:channel", router);
    controls.set(name, {
      refresh: async () => {
        await coordinator.get(key, () => load(true), application.cache, true);
      },
      invalidate: () => coordinator.invalidate(key),
    });

    if (application.provider.verifyWebhook) {
      let nextWebhook = 0;
      app.post("/webhooks/" + name, async (c) => {
        const body = new TextEncoder().encode(
          await readText(new Response(c.req.raw.body), 256 * 1024),
        );
        if (!(await application.provider.verifyWebhook!(c.req.raw, body)))
          return c.json({ error: "unauthorized" }, 401);
        if (Date.now() < nextWebhook) return c.json({ error: "rate_limit" }, 429);
        nextWebhook = Date.now() + 10_000;
        await controls.get(name)!.refresh();
        return c.json({ refreshed: true });
      });
    }
  }

  return Object.assign(app, {
    async refresh(name: string) {
      const control = controls.get(name);
      if (!control) throw new UpserveError("missing", "Unknown application");
      await control.refresh();
    },
    async invalidate(name: string) {
      const control = controls.get(name);
      if (!control) throw new UpserveError("missing", "Unknown application");
      await control.invalidate();
    },
  });
}

function validateApp(name: string, app: AppConfig) {
  if (
    !identifier.test(name) ||
    !app.provider?.scope ||
    !app.provider.name ||
    !Array.isArray(app.adapters)
  )
    throw new UpserveError("configuration", "Invalid application configuration: " + name);
  if (app.provider.private && !app.authorize)
    throw new UpserveError(
      "configuration",
      "Private providers require downstream authorization: " + name,
    );
  for (const value of Object.values(app.cache ?? {}))
    if (!Number.isFinite(value) || value < 0)
      throw new UpserveError("configuration", "Cache lifetimes must be nonnegative");
}
