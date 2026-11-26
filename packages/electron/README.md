# @neplex/upserve-electron

Serve electron-builder manifests and assets for electron-updater generic feeds. This package does not implement Electron’s native Squirrel autoUpdater protocol.

```sh
npm install @neplex/upserve @neplex/upserve-github @neplex/upserve-electron @hono/node-server
```

Add `electron()` to your adapters and use `/editor/stable/electron/` as the generic feed. Publish original YAML, matching installers and existing blockmaps. Set `useMultipleRangeRequest: false` for GitHub delivery. Web installers and absolute external manifest asset URLs are unsupported.

Read the [guide](https://upserve.neplex.dev/docs/electron) for a complete example and supported behavior, or browse the [documentation source](https://github.com/neplextech/upserve/tree/main/apps/docs/content/docs). During initial private development, packages may not be published yet; use the repository checkout instructions in the quick start.

MIT licensed.
