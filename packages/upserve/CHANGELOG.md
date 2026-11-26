# @neplex/upserve

## 0.3.0

### Minor Changes

- b6f2c63: Coalesce authenticated webhook bursts per application instead of rejecting deliveries inside a fixed 10-second window with `429`. The first event starts a forced refresh; events during it return `202` with `coalesced: true` and trigger exactly one trailing refresh, so the final release state is never dropped and a burst costs at most two upstream refreshes. With `background`, the first event returns `202` with `scheduled: true`. During an upstream cooldown or after a failed refresh, events return `202` with `deferred: true`; each event persists a new `CacheEntry.due` flag so the next read after the cooldown, in any process sharing the store, revalidates the release list and provider pages. No timers are started.

  Forced refreshes, including `refresh()`, now wait for a load already in progress instead of joining it, and reject during a cooldown or on failure instead of resolving with cached data.

## 0.2.0

### Minor Changes

- ed0006b: Add optional `Asset.aliases` and the `findAssetByUrl()` matching helper. The GitHub provider records each asset's REST API URL as a verified alias, so Tauri manifests that reference `api.github.com/.../releases/assets/ID` URLs resolve, while redirects keep using the public download URL. Aliases must be HTTPS, credential-free and unique to one asset; unknown URLs, mismatched asset IDs and other repositories are rejected.

### Patch Changes

- 8cde839: Preserve the original error classification during failure cooldowns. A manifest validation failure now keeps returning `422 invalid`, and authentication, network and unexpected failures keep their codes, instead of becoming `503 rate_limit`, without further upstream requests. Cache entries store only the failure code in a new optional `CacheEntry.error` field; entries written by earlier versions still report `rate_limit`.

## 0.1.1

### Patch Changes

- Refresh package documentation with expanded guides, configuration and API references.

## 0.1.0

Initial implementation of Upserve update distribution.
