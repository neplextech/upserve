---
"@neplex/upserve": minor
---

Coalesce authenticated webhook bursts per application instead of rejecting deliveries inside a fixed 10-second window with `429`. The first event starts a forced refresh; events during it return `202` with `coalesced: true` and trigger exactly one trailing refresh, so the final release state is never dropped and a burst costs at most two upstream refreshes. With `background`, the first event returns `202` with `scheduled: true`. During an upstream cooldown or after a failed refresh, events return `202` with `deferred: true`; each event persists a new `CacheEntry.due` flag so the next read after the cooldown, in any process sharing the store, revalidates the release list and provider pages. No timers are started.

Forced refreshes, including `refresh()`, now wait for a load already in progress instead of joining it, and reject during a cooldown or on failure instead of resolving with cached data.
