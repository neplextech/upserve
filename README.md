# Upserve

A self-hostable update server for desktop and mobile applications. Publish releases on GitHub as usual, then let your installed apps share cached release metadata instead of each making their own upstream requests.

Upserve supports Tauri v2, electron-builder apps using electron-updater, direct Android APK distribution and custom JSON clients. Run it as a service or mount its Hono application in your existing server. MIT licensed.

## Run your first server

Use Node.js 22.13 or newer (Node.js 24 recommended). Install the server and integrations:

```sh
npm install @neplex/upserve @neplex/upserve-github @neplex/upserve-generic @hono/node-server
```

Save this as `server.ts`. Replace `owner/editor` with your public GitHub repository, containing a published release tagged like `v1.2.0`.

```ts
import { serve } from "@hono/node-server";
import { createUpserve } from "@neplex/upserve";
import { github } from "@neplex/upserve-github";
import { generic } from "@neplex/upserve-generic";

const updates = createUpserve({
  apps: {
    editor: {
      provider: github({ repository: "owner/editor" }),
      adapters: [generic()],
    },
  },
});

serve({ fetch: updates.fetch, port: 3000 });
```

```sh
npx tsx server.ts
```

In another terminal, run `curl -i http://localhost:3000/editor/stable/generic/latest`. You'll receive release JSON, or `204 No Content` if there's no matching release. Requests share the default memory cache. SQLite can preserve metadata across restarts; installer binaries redirect or stream without being stored.

During initial private development, packages may not be published yet. To try the local fixture server from a repository checkout:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm exec tsx apps/playground/index.ts
```

Then request `http://localhost:3000/demo/stable/generic/latest`. This example needs no upstream credentials.

## Connect your application

Read the [quick start](https://upserve.neplex.dev/docs/quick-start), then follow the guide for [Tauri](https://upserve.neplex.dev/docs/tauri), [Electron](https://upserve.neplex.dev/docs/electron), [Android](https://upserve.neplex.dev/docs/android) or [custom clients](https://upserve.neplex.dev/docs/generic).

Keep building and signing artifacts in your own release pipeline. Upserve preserves existing signatures and checksums; it doesn't need signing private keys. Giving it a GitHub token doesn't authorize your users: private releases also require a downstream access rule.

For deployment, see [CLI and Docker](https://upserve.neplex.dev/docs/deployment) or [Hono, Node.js and Bun](https://upserve.neplex.dev/docs/embedding). To add another release source or protocol, start with [extensions](https://upserve.neplex.dev/docs/extensions).

## Development

Use Node.js 24 and pnpm 10.32.1. Run `pnpm install --frozen-lockfile`, then `pnpm check`. Start the docs with `pnpm --filter @upserve/docs dev`.

See the [documentation source](apps/docs/content/docs/index.mdx), [contribution guide](CONTRIBUTING.md), [release procedure](RELEASING.md) and [security policy](SECURITY.md). Nothing is published by local validation commands.
