import { defineAdapter, findAssetByUrl, newer, UpserveError, validVersion } from "@neplex/upserve";

/** APK manifest. Compatibility metadata is application-defined and never executes code. */
export interface AndroidManifest {
  /** Strict semantic version used for update precedence. */
  version: string;

  /** Optional release notes supplied by the publisher. */
  notes?: string | null;

  /** Optional RFC 3339 publication timestamp from the original manifest. */
  pub_date?: string;

  /** Optional positive Android version code supplied by the publisher. */
  versionCode?: number;

  /** Optional semantic compatibility floor, enforced through the compatible hook. */
  minimumVersion?: string;

  /** Application-defined compatibility metadata, interpreted by the client or hook. */
  compatibility?: Record<string, unknown>;

  /** APK URL, SHA-256 hex digest and exact length. */
  android: { url: string; sha256: string; size: number };
}

/** Map existing consumer manifests into the documented Upserve Android format. */
export interface AndroidOptions {
  /** Published manifest asset name; defaults to the integration standard filename. */
  manifest?: string;

  /** Map an existing manifest into the Android format before validation. */
  transform?: (input: unknown) => AndroidManifest;

  /** Optional request-aware eligibility predicate; false suppresses an update. */
  compatible?: (manifest: AndroidManifest, request: Request) => boolean;
}

/** Expose /android/latest.json and /android/update/:current. No signing keys are used. */
export function android(options: AndroidOptions = {}) {
  return defineAdapter({
    name: "android",
    register(app, services) {
      const handler = async (c: Parameters<typeof services.assetUrl>[0]) => {
        const release = await services.latest(c.req.param("channel")!);
        if (!release) return c.body(null, 204);

        const { m, asset } = await services.manifest(
          release,
          options.manifest ?? "latest-android.json",
          (text) => {
            const input: unknown = JSON.parse(text);

            const m = options.transform ? options.transform(input) : (input as AndroidManifest);
            if (
              !m ||
              typeof m.version !== "string" ||
              !validVersion(m.version) ||
              m.version !== release.version ||
              !m.android ||
              !/^[a-fA-F0-9]{64}$/.test(m.android.sha256) ||
              !Number.isSafeInteger(m.android.size) ||
              m.android.size <= 0 ||
              (m.versionCode !== undefined &&
                (!Number.isSafeInteger(m.versionCode) || m.versionCode <= 0)) ||
              (m.minimumVersion !== undefined && !validVersion(m.minimumVersion))
            )
              throw new UpserveError("invalid", "Invalid Android manifest");

            const asset =
              typeof m.android.url === "string"
                ? findAssetByUrl(release.assets, m.android.url)
                : undefined;

            if (!asset || asset.size !== m.android.size || !asset.name.endsWith(".apk"))
              throw new UpserveError("invalid", "APK missing or size mismatch");
            return { m, asset };
          },
        );

        const current = c.req.param("current");
        if (
          (current && !newer(m.version, current)) ||
          (options.compatible && !options.compatible(m, c.req.raw))
        )
          return c.body(null, 204);
        return c.json({
          ...m,
          android: { ...m.android, url: services.assetUrl(c, release, asset) },
        });
      };
      app.get("/android/latest.json", handler);
      app.get("/android/update/:current", handler);
    },
  });
}
