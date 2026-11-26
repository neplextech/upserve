import { defineAdapter, findAssetByUrl, newer, UpserveError, validVersion } from "@neplex/upserve";

/**
 * Tauri v2 manifest selection. Signature contents are passed through unchanged. Platform
 * URLs must equal a release asset's canonical URL or one of its aliases.
 */
export interface TauriOptions {
  /** Published manifest asset name; defaults to the integration standard filename. */
  manifest?: string;
}

/** Expose /tauri/latest.json and /tauri/:target/:arch/:current. */
export function tauri(options: TauriOptions = {}) {
  return defineAdapter({
    name: "tauri",
    register(app, services) {
      async function manifest(c: Parameters<typeof services.assetUrl>[0]) {
        const release = await services.latest(c.req.param("channel")!);
        if (!release) return undefined;
        return services.manifest(release, options.manifest ?? "latest.json", (text) => {
          const input: unknown = JSON.parse(text);
          if (!input || typeof input !== "object")
            throw new UpserveError("invalid", "Invalid Tauri manifest");

          const value = input as Record<string, unknown>;
          if (
            typeof value.version !== "string" ||
            !validVersion(value.version) ||
            value.version.replace(/^v/, "") !== release.version.replace(/^v/, "") ||
            !value.platforms ||
            typeof value.platforms !== "object"
          )
            throw new UpserveError("invalid", "Invalid Tauri version or platforms");

          const platforms: Record<string, { url: string; signature: string }> = Object.create(null);

          for (const [target, raw] of Object.entries(value.platforms)) {
            if (!raw || typeof raw !== "object")
              throw new UpserveError("invalid", "Invalid Tauri platform");

            const item = raw as Record<string, unknown>;
            if (
              typeof item.url !== "string" ||
              typeof item.signature !== "string" ||
              !item.signature.trim()
            )
              throw new UpserveError("invalid", "Tauri signature missing");

            // Match the canonical URL or a provider-verified alias; clients always receive
            // this server's asset route, never the matched upstream URL.
            const asset = findAssetByUrl(release.assets, item.url);

            if (!asset) throw new UpserveError("invalid", "Tauri binary missing from release");
            platforms[target] = {
              signature: item.signature,
              url: services.assetUrl(c, release, asset),
            };
          }

          if (!Object.keys(platforms).length)
            throw new UpserveError("invalid", "Empty Tauri manifest");
          return {
            version: value.version,
            notes: release.notes,
            pub_date: release.publishedAt,
            platforms,
          };
        });
      }
      app.get("/tauri/latest.json", async (c) => {
        const result = await manifest(c);
        return result ? c.json(result) : c.body(null, 204);
      });
      app.get("/tauri/:target/:arch/:current", async (c) => {
        const result = await manifest(c);
        if (!result || !newer(result.version, c.req.param("current")!)) return c.body(null, 204);

        const platform = result.platforms[c.req.param("target") + "-" + c.req.param("arch")];
        if (!platform) return c.body(null, 204);
        return c.json({
          version: result.version,
          notes: result.notes,
          pub_date: result.pub_date,
          ...platform,
        });
      });
    },
  });
}
