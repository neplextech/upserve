---
"@neplex/upserve": minor
"@neplex/upserve-github": minor
"@neplex/upserve-tauri": patch
"@neplex/upserve-android": patch
---

Add optional `Asset.aliases` and the `findAssetByUrl()` matching helper. The GitHub provider records each asset's REST API URL as a verified alias, so Tauri manifests that reference `api.github.com/.../releases/assets/ID` URLs resolve, while redirects keep using the public download URL. Aliases must be HTTPS, credential-free and unique to one asset; unknown URLs, mismatched asset IDs and other repositories are rejected.
