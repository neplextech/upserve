# @neplex/upserve-android

Serve a JSON update manifest and APK download URL for Android apps distributed outside Google Play.

```sh
npm install @neplex/upserve @neplex/upserve-github @neplex/upserve-android @hono/node-server
```

Add `android()` to your adapters. Publish `latest-android.json` and its APK in the same release. Your client checks `/editor/stable/android/update/CURRENT`, verifies the file and manages installation. There is no universal Android sideloaded updater protocol, and Upserve never needs APK signing keys.

Read the [guide](https://upserve.neplex.dev/docs/android) for a complete example and supported behavior, or browse the [documentation source](https://github.com/neplextech/upserve/tree/main/apps/docs/content/docs). During initial private development, packages may not be published yet; use the repository checkout instructions in the quick start.

MIT licensed.
