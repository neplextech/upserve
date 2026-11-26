import { defineAdapter, newer } from "@neplex/upserve";

/** JSON release API under /generic. Provider metadata and upstream URLs stay server-side. */
export function generic() {
  return defineAdapter({
    name: "generic",
    register(app, services) {
      const view = (
        c: Parameters<typeof services.assetUrl>[0],
        release: Awaited<ReturnType<typeof services.latest>> & {},
      ) => ({
        id: release.id,
        tag: release.tag,
        version: release.version,
        prerelease: release.prerelease,
        notes: release.notes,
        publishedAt: release.publishedAt,
        assets: release.assets.map((a) => ({
          name: a.name,
          size: a.size,
          url: services.assetUrl(c, release, a),
        })),
      });
      app.get("/generic/channels", (c) => c.json({ channels: services.channels }));
      app.get("/generic/releases", async (c) =>
        c.json({
          releases: (await services.releases(c.req.param("channel")!)).map((r) => view(c, r)),
        }),
      );
      app.get("/generic/latest", async (c) => {
        const r = await services.latest(c.req.param("channel")!);
        return r ? c.json(view(c, r)) : c.body(null, 204);
      });
      app.get("/generic/versions/:version", async (c) => {
        const r = (await services.releases(c.req.param("channel")!)).find(
          (r) => r.version === c.req.param("version"),
        );
        return r ? c.json(view(c, r)) : c.notFound();
      });
      app.get("/generic/update/:current", async (c) => {
        const r = await services.latest(c.req.param("channel")!);
        return r && newer(r.version, c.req.param("current")!)
          ? c.json(view(c, r))
          : c.body(null, 204);
      });
    },
  });
}
