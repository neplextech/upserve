---
name: upserve-adapter
description: Implement and test a custom Upserve update protocol using public adapter services.
---

# Build an update adapter

Use `defineAdapter({ name, register(router, services) })` from `@neplex/upserve`. Routes are relative to `/:application/:channel`. Read the channel with `context.req.param('channel')` and choose a prefix that doesn't collide with other adapters.

Use the [complete adapter tutorial](https://upserve.neplex.dev/docs/custom-adapters) for a minimal implementation and Fetch-handler test. Look up exact signatures in [AdapterServices](https://upserve.neplex.dev/docs/api#adapterservices).

Use `services.latest(channel)` or `services.releases(channel)` rather than calling a provider directly. These services share release selection, caching and refresh coordination. Use `services.manifest(release, name, parse)` for a known manifest; validate inside `parse` and throw for malformed data. Parsers run before storage and again on cache hits.

Build download links with `services.assetUrl(context, release, asset)` or return `services.deliver(request, release, asset)` from a download route. These preserve the mount path and configured private delivery. Don't proxy arbitrary URLs or accept a client force-refresh flag.

Validate version, assets, platform and required signatures before advertising an update. Preserve signature and checksum contents. Use `204` for no applicable offer and an `UpserveError` for invalid metadata. Test current versions, missing assets, unsupported targets, denied access and parent Hono mounts without live credentials.

Adapters run as trusted application code. They aren't sandboxed. Keep all implementation on public contracts so it works with third-party providers and stores.
