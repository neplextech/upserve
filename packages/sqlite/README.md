# @neplex/upserve-sqlite

Persist Upserve metadata across restarts using Node’s built-in SQLite module. This store does not cache installer binaries.

```sh
npm install @neplex/upserve @neplex/upserve-sqlite
```

Create the parent directory, call `sqliteCache("./data/metadata.sqlite")`, and pass the result as the top-level `cache`. Call `cache.close()` after requests drain. Use Node.js 24 for deployment. SQLite persists timestamps but adds neither distributed refresh locking nor automatic row pruning.

Read the [guide](https://upserve.neplex.dev/docs/cache#persist-metadata-with-sqlite) for a complete example and supported behavior, or browse the [documentation source](https://github.com/neplextech/upserve/tree/main/apps/docs/content/docs). During initial private development, packages may not be published yet; use the repository checkout instructions in the quick start.

MIT licensed.
