---
name: upserve-deploy
description: Deploy or troubleshoot an Upserve service, its metadata cache and update download endpoints.
---

# Deploy and troubleshoot Upserve

Follow the [deployment guide](https://upserve.neplex.dev/docs/deployment) for the CLI, Docker and Coolify. Install `@neplex/upserve-cli` plus every package imported by the config. Run `upserve init`, edit the trusted TypeScript default export, then `upserve start`. Before publication, use the repository checkout path rather than claiming npm/image availability.

`HOST` defaults to `0.0.0.0`, `PORT` to `3000`, and `UPSERVE_CONFIG` to `upserve.config.ts`. `UPSERVE_CACHE_DIR` enables CLI-managed SQLite unless the config supplies a cache. Secrets must be read explicitly by the config; `.env` isn't loaded automatically. Use Node.js 24 and a writable persistent volume; the Docker runtime UID/GID is `10001`.

Use HTTPS and a canonical trusted request host. Verify returned asset URLs from behind the actual proxy. Forward authorization, ranges and conditional headers, preserve `206`, and disable buffering for streaming. Never cache private responses at a CDN. The GitHub timeout defaults to 30 seconds, including standard Fetch stream consumption; increase it and proxy timeouts for large installers. CLI shutdown allows ten seconds to drain.

Use the [symptom guide](https://upserve.neplex.dev/docs/troubleshooting):

- `204`: compare channel, current version, target/architecture and compatibility hook.
- `401`: inspect downstream authorization, not the GitHub token.
- `422`: inspect selected manifest version, required signatures, asset names and sizes.
- `503`: inspect `error` and `Retry-After`; don't invalidate in client retry loops.
- Differential failures: retain old blockmaps and set `useMultipleRangeRequest: false` for GitHub.

Health routes don't test GitHub. Verify actual update and download requests. Coordination is process-local even with a shared database; one process is the simplest way to share refresh work. No polling timer is started; expiry checks and signed release webhooks refresh metadata. Do not expose an open admin refresh endpoint or request application signing keys.
