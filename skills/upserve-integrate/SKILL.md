---
name: upserve-integrate
description: Configure and embed Upserve for Tauri, Electron, Android or custom application updates.
---

# Integrate Upserve

Choose the existing client protocol before selecting packages. Install `@neplex/upserve`, a provider such as `@neplex/upserve-github`, the adapter package and a runtime listener if needed. The CLI is optional for embedded use.

Use `createUpserve({ apps: { editor: { provider, adapters } } })`. It returns a real Hono app. On Node, install `@hono/node-server` and call `serve({ fetch: updates.fetch, port: 3000 })`. On Bun, call `Bun.serve({ fetch: updates.fetch, port: 3000 })`. To embed, use `app.route('/updates', updates)`.

Use one application ID consistently in server and client URLs. Replace `owner/editor` repository placeholders. GitHub strips `v` by default; configure `tagPrefix` for other conventions. Default `prerelease` excludes stable releases.

Read the relevant guide before writing client configuration:

- [Quick start](https://upserve.neplex.dev/docs/quick-start): full Node listener and verification request.
- [Tauri](https://upserve.neplex.dev/docs/tauri): publish `latest.json` and signed artifacts together; dynamic endpoint uses `target/arch/current`.
- [Electron](https://upserve.neplex.dev/docs/electron): electron-updater generic provider, not native autoUpdater; preserve YAML and use single ranges for GitHub.
- [Android](https://upserve.neplex.dev/docs/android): publish manifest and APK; client owns verification and installation.
- [Generic clients](https://upserve.neplex.dev/docs/generic): JSON discovery and update endpoints.

A GitHub token implies private mode by default. Configure `authorize(request)` separately for client access and send that downstream credential on metadata and asset requests. Never put GitHub tokens or signing private keys in client code. Do not set `private: false` for a private repository.

Verify the actual endpoint with the Hono Fetch handler or a running server. `204` means no applicable offer; it isn't a JSON response. Confirm supported artifacts and signatures before claiming installation works. During private initial development, npm packages may not be published; don't substitute unrelated packages.
