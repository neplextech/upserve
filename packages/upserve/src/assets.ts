import type { Asset, Release } from "./contracts.js";
import { UpserveError } from "./errors.js";

/**
 * Parse an absolute URL into its comparable href. Returns undefined for relative,
 * malformed or credential-bearing input so callers fail closed.
 */
function comparable(url: string): string | undefined {
  if (!URL.canParse(url)) return undefined;

  const parsed = new URL(url);

  if (parsed.username || parsed.password) return undefined;

  return parsed.href;
}

/**
 * Find the asset whose canonical URL or one of its aliases identifies `url`.
 *
 * Comparison uses parsed URL hrefs, so host case and default ports are normalized while
 * paths and queries must match exactly. Returns undefined when nothing matches, when the
 * input is not an absolute credential-free URL, or when more than one asset matches.
 * The returned asset's canonical `url` remains the only delivery destination.
 */
export function findAssetByUrl(assets: readonly Asset[], url: string): Asset | undefined {
  const target = comparable(url);

  if (!target) return undefined;

  const matches = assets.filter(
    (asset) =>
      comparable(asset.url) === target ||
      (asset.aliases ?? []).some((alias) => comparable(alias) === target),
  );

  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Reject aliases that are not HTTPS, carry credentials or fragments, or identify a
 * different asset of the same release. Canonical URLs keep their existing validation.
 */
export function validateAliases(release: Release): void {
  const owners = new Map<string, string>();

  for (const asset of release.assets) {
    const canonical = comparable(asset.url);

    if (canonical) owners.set(canonical, asset.id);
  }

  for (const asset of release.assets) {
    for (const alias of asset.aliases ?? []) {
      const href = comparable(alias);

      const parsed = href ? new URL(href) : undefined;

      if (!href || parsed?.protocol !== "https:" || parsed.hash)
        throw new UpserveError("invalid", "Invalid asset alias");

      const owner = owners.get(href);

      if (owner !== undefined && owner !== asset.id)
        throw new UpserveError("invalid", "Asset alias identifies another asset");

      owners.set(href, asset.id);
    }
  }
}
