---
name: upserve-cache
description: Custom cache stores.
---

# Custom cache stores

Use defineCache with asynchronous get(key), set(key,entry), delete(key). CacheEntry contains value, freshUntil, staleUntil and optional retryAt. Preserve absolute timestamps and isolate complete keys. Use atomic writes and return independent values. Cache metadata only. A shared store does not add distributed locks; coordination remains process-local.

Use only published public contracts. Plugins and TypeScript configuration execute as trusted code. Consult the Upserve documentation for protocol-specific requirements.
