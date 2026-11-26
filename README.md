# Upserve

A self-hostable application update server by Neplex Technologies. Upserve connects release providers to Tauri, electron-updater, Android and custom clients through an embeddable Hono application. MIT licensed.

```ts
import { createUpserve } from "@neplex/upserve";
import { github } from "@neplex/upserve-github";
import { tauri } from "@neplex/upserve-tauri";

const updates = createUpserve({
  apps: {
    editor: {
      provider: github({ repository: "example/editor" }),
      adapters: [tauri()],
    },
  },
});

// Bun.serve({ port: 3000, fetch: updates.fetch });
// Or: app.route('/updates', updates);
```

Publish the original latest.json and signed artifacts in the same GitHub release. Configure the Tauri endpoint as `/editor/stable/tauri/{{target}}/{{arch}}/{{current_version}}`.

The default memory cache coalesces refreshes and limits upstream concurrency. Optional SQLite persistence stores metadata. Binaries are redirected or streamed without buffering entire installers. Private releases require downstream authorization.

## Development

Use Node 24 and pnpm 10.32.1. Run `pnpm install`, `pnpm check`, and `pnpm --filter @upserve/docs dev`. Run `pnpm exec tsx apps/playground/index.ts` for the deterministic local example.

Read the [documentation source](apps/docs/content/docs/index.mdx), [contribution guide](CONTRIBUTING.md), [release procedure](RELEASING.md) and [security policy](SECURITY.md). npm packages and container images have not been published as part of initial development.
