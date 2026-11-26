import { defineAdapter, UpserveError } from "@neplex/upserve";
import { parseDocument } from "yaml";

/** Map channels to electron-builder prefixes; stable defaults to latest. */
export interface ElectronOptions {
  /** Named release selection predicates; defaults to stable and prerelease. */
  channels?: Record<string, string>;
}

/** Serve original electron-builder YAML plus immutable release-relative artifacts. */
export function electron(options: ElectronOptions = {}) {
  return defineAdapter({
    name: "electron",
    register(app, services) {
      app.on(["GET", "HEAD"], "/electron/:release/:file", async (c) => {
        const release = (await services.releases(c.req.param("channel")!)).find(
          (r) => r.id === c.req.param("release"),
        );

        const asset = release?.assets.find((a) => a.name === c.req.param("file"));

        if (!release || !asset) return c.notFound();
        return services.deliver(c.req.raw, release, asset);
      });
      // Older blockmaps are resolved by filename within the bounded release history.
      app.on(["GET", "HEAD"], "/electron/:file", async (c) => {
        const name = c.req.param("file")!;

        const releases = await services.releases(c.req.param("channel")!);

        const release = releases[0];
        if (!release) return c.notFound();
        if (!name.endsWith(".yml")) {
          for (const r of releases) {
            const a = r.assets.find((a) => a.name === name);
            if (a) return services.deliver(c.req.raw, r, a);
          }

          return c.notFound();
        }

        const prefix =
          options.channels?.[c.req.param("channel")!] ??
          (c.req.param("channel") === "stable" ? "latest" : c.req.param("channel"));

        if (
          !new RegExp(
            "^" +
              prefix?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
              "(?:-mac|-linux(?:-[a-z0-9_]+)?)?\\.yml$",
          ).test(name)
        )
          return c.notFound();

        const raw = await services.manifest(release, name, (raw) => {
          const doc = parseDocument(raw, { uniqueKeys: true });

          if (doc.errors.length) throw new UpserveError("invalid", "Invalid Electron YAML");

          const value = doc.toJS({ maxAliasCount: 0 }) as Record<string, unknown>;
          if (
            !value ||
            value.version !== release.version ||
            !Array.isArray(value.files) ||
            !value.files.length
          )
            throw new UpserveError("invalid", "Invalid Electron manifest");
          for (const input of value.files) {
            const file = input as Record<string, unknown>;
            if (
              !file ||
              typeof file.url !== "string" ||
              !/^[A-Za-z0-9+/]{86}==$/.test(String(file.sha512)) ||
              !Number.isSafeInteger(file.size) ||
              Number(file.size) <= 0
            )
              throw new UpserveError("invalid", "Invalid Electron checksum or size");

            const asset = release.assets.find((a) => a.name === file.url && a.size === file.size);
            if (!asset || /[/\\]|\.\./.test(file.url))
              throw new UpserveError("invalid", "Missing Electron artifact");
          }
          // Preserve YAML, checksums and metadata byte for byte. Relative artifact paths
          // resolve at this feed; signed/absolute URLs and web installers fail closed.
          if (value.packages || (value.path && !release.assets.some((a) => a.name === value.path)))
            throw new UpserveError("invalid", "Unsupported Electron web installer or path");
          return raw;
        });

        return new Response(c.req.method === "HEAD" ? null : raw, {
          headers: { "Content-Type": "application/yaml" },
        });
      });
    },
  });
}
