# @neplex/upserve

Compose an update server as a Hono application. The core owns application registration, release selection and metadata caching without starting a listener or requiring a database.

```sh
npm install @neplex/upserve @neplex/upserve-github @neplex/upserve-generic @hono/node-server
```

Follow the quick start for a complete `createUpserve()` server, including the Node.js listener and a test request. The GitHub provider and update adapters are separate packages.

Read the [guide](https://upserve.neplex.dev/docs/quick-start) for a complete example and supported behavior, or browse the [documentation source](https://github.com/neplextech/upserve/tree/main/apps/docs/content/docs). During initial private development, packages may not be published yet; use the repository checkout instructions in the quick start.

MIT licensed.
