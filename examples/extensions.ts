import { defineAdapter, defineCache, defineProvider, memoryCache } from "@neplex/upserve";
import type { Release } from "@neplex/upserve";

/** A complete provider for an application-owned, immutable release catalog. */
export function catalogProvider(releases: Release[]) {
  return defineProvider({
    name: "catalog",
    scope: "catalog-v1",
    async releases() {
      return structuredClone(releases);
    },
    async open() {
      return new Response("Catalog has no downloadable assets", { status: 404 });
    },
  });
}

/** Custom protocol using scoped resolution and the shared coordinator. */
export const customAdapter = defineAdapter({
  name: "custom",
  register(app, services) {
    app.get("/custom/version", async (c) => {
      const release = await services.latest(c.req.param("channel")!);
      return release ? c.json({ version: release.version }) : c.body(null, 204);
    });
  },
});

/** Example instrumentation around a real cache, without a privileged contract. */
export function countedCache() {
  const cache = memoryCache();

  let hits = 0;
  return defineCache({
    async get(key: string) {
      const value = await cache.get(key);
      if (value) hits++;
      return value;
    },
    set: cache.set,
    delete: cache.delete,
    stats() {
      return { hits };
    },
  });
}
