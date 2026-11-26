# @neplex/upserve-cli

Run Upserve as a standalone Node.js service with TypeScript configuration, JSON startup logs and health endpoints.

```sh
npm install @neplex/upserve-cli @neplex/upserve @neplex/upserve-github @neplex/upserve-generic
```

Run `npx upserve init`, replace the generated repository and application ID, then run `npx upserve start`. The executable is `upserve`. `HOST`, `PORT`, `UPSERVE_CONFIG` and `UPSERVE_CACHE_DIR` configure the service. Your config must read secrets explicitly; the CLI does not load `.env` automatically.

Read the [guide](https://upserve.neplex.dev/docs/deployment) for a complete example and supported behavior, or browse the [documentation source](https://github.com/neplextech/upserve/tree/main/apps/docs/content/docs). During initial private development, packages may not be published yet; use the repository checkout instructions in the quick start.

MIT licensed.
