---
name: upserve-adapter
description: Custom update adapters.
---

# Custom update adapters

Use defineAdapter({ name, register(app, services) }). Routes mount under /APP/CHANNEL. Read channel from the route parameter. Use services.latest, releases, manifest(release, name, parse), assetUrl and deliver. The parser must throw for invalid protocol metadata; it runs before caching and on cache hits. Validate complete protocol metadata before returning an update. Preserve signatures and checksums; return 204 when no applicable update exists. Do not fetch arbitrary upstream URLs directly.

Use only published public contracts. Plugins and TypeScript configuration execute as trusted code. Consult the Upserve documentation for protocol-specific requirements.
