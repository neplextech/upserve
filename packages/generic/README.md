# @neplex/upserve-generic

Expose a framework-independent JSON API for release discovery and update checks.

```sh
npm install @neplex/upserve @neplex/upserve-github @neplex/upserve-generic @hono/node-server
```

Add `generic()` to your adapters. Check `/editor/stable/generic/update/1.0.0`; a newer release returns JSON, otherwise the endpoint returns `204`. Choose your own platform asset and verify downloads in the client. The guide includes a Python example.

Read the [guide](https://upserve.neplex.dev/docs/generic) for a complete example and supported behavior, or browse the [documentation source](https://github.com/neplextech/upserve/tree/main/apps/docs/content/docs). During initial private development, packages may not be published yet; use the repository checkout instructions in the quick start.

MIT licensed.
