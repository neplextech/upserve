# @neplex/upserve-github

Read release metadata and assets from GitHub Releases, with conditional requests, pagination and rate-limit cooldowns.

```sh
npm install @neplex/upserve @neplex/upserve-github
```

Use `github({ repository: "owner/editor" })` as your application provider. Replace the repository. Tags default to `v` plus a semantic version. Add an adapter to expose update endpoints. Tokens imply private mode unless explicitly overridden for a public repository; private providers require downstream authorization.

Read the [guide](https://upserve.neplex.dev/docs/github) for a complete example and supported behavior, or browse the [documentation source](https://github.com/neplextech/upserve/tree/main/apps/docs/content/docs). During initial private development, packages may not be published yet; use the repository checkout instructions in the quick start.

MIT licensed.
