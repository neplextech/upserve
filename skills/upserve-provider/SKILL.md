---
name: upserve-provider
description: Implement and test a custom Upserve release source and safe known-asset delivery.
---

# Build a release provider

Use `defineProvider()` from `@neplex/upserve` with `name`, nonsecret `scope`, `releases(context)` and `open(asset, request, context)`. The [provider tutorial](https://upserve.neplex.dev/docs/custom-providers) includes a complete metadata-only catalog and deterministic registration test. The [contract reference](https://upserve.neplex.dev/docs/api#provider) covers optional redirects and webhooks.

Keep source IDs, tags and semantic versions in separate fields. Return unique asset IDs/names and exact byte sizes. Optional `aliases` may list other HTTPS URLs for the same asset that manifests reference; verify each belongs to that asset. Aliases are matched only and never fetched or redirected to. Return `[]` only for confirmed absence. An outage must throw, or it will withdraw cached releases.

Use `context.cached(identity, load)` for reusable upstream resources. Validate inside the loader before returning. Its previous value can hold ETag/Last-Modified validators; return it for a valid conditional `304`. Bound body size with `readText()`, pagination and request duration. Honor `context.signal`.

Throw `UpserveError` with `network`, `invalid`, `auth`, `missing` or `rate_limit`; an optional `retryAt` is absolute epoch milliseconds. Messages must not contain tokens or raw upstream bodies. Requests during the resulting cooldown report the same code. Upserve can reuse stale validated data for temporary errors, but recognized authentication errors clear the affected entry.

Open only known release assets. Forward supported range/conditional headers and cancellation, stream bodies and validate every redirect. Never send credentials to an unchecked destination. Implement `redirect(asset)` only for validated public destinations. Private sources need `private: true` and downstream `authorize()` in application configuration.

Change `scope` when configuration or credential permissions change; never use the secret itself. Plugins execute as trusted code. Test malformed metadata, throttling, access revocation, redirects, cancellation and download semantics without live credentials.
