---
name: upserve-cache
description: Implement and validate an Upserve metadata cache store, including persistent timestamp semantics.
---

# Build a cache store

Use `defineCache()` from `@neplex/upserve` with async `get(key)`, `set(key, entry)` and `delete(key)`. Register the result as top-level `cache`, not an application's lifetime policy. Start with the [cache-store tutorial](https://upserve.neplex.dev/docs/custom-cache-stores) and [contract reference](https://upserve.neplex.dev/docs/api#cachestore-and-cacheentry).

Store complete keys unchanged and use atomic writes. Return independent values so mutations cannot alter saved entries. Preserve `value`, `freshUntil`, `staleUntil` and optional `retryAt`; timestamps are absolute epoch milliseconds. An undefined value can represent a cold-failure cooldown. Don't discard an entry at `freshUntil`: it may still be usable during the stale window or for conditional revalidation.

Upserve owns freshness, stale fallback and request coalescing. The store owns durability, isolation, lifecycle and retention. A shared database doesn't add distributed locks or a global upstream concurrency limit. Cache metadata only, not installers.

Test independent values, full-key isolation, deletion and failure propagation. For persistence, close/reopen the store and verify values and timestamps survive. Restrict access to private metadata and plan cleanup of obsolete namespaces. Plugins run as trusted application code.
