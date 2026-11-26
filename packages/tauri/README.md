# @neplex/upserve-tauri

Serve Tauri v2 update endpoints using your existing static manifest and signatures.

```sh
npm install @neplex/upserve @neplex/upserve-github @neplex/upserve-tauri @hono/node-server
```

Add `tauri()` to your application adapters. Publish `latest.json` and all referenced signed updater artifacts in the same release. Point the updater at `/editor/stable/tauri/{{target}}/{{arch}}/{{current_version}}`. Keep your existing signing keys in the release pipeline.

Read the [guide](https://upserve.neplex.dev/docs/tauri) for a complete example and supported behavior, or browse the [documentation source](https://github.com/neplextech/upserve/tree/main/apps/docs/content/docs). During initial private development, packages may not be published yet; use the repository checkout instructions in the quick start.

MIT licensed.
