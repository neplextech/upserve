# @neplex/upserve-android

## 0.1.2

### Patch Changes

- ed0006b: Add optional `Asset.aliases` and the `findAssetByUrl()` matching helper. The GitHub provider records each asset's REST API URL as a verified alias, so Tauri manifests that reference `api.github.com/.../releases/assets/ID` URLs resolve, while redirects keep using the public download URL. Aliases must be HTTPS, credential-free and unique to one asset; unknown URLs, mismatched asset IDs and other repositories are rejected.
- Updated dependencies [ed0006b]
- Updated dependencies [8cde839]
  - @neplex/upserve@0.2.0

## 0.1.1

### Patch Changes

- Refresh package documentation with expanded guides, configuration and API references.
- Updated dependencies
  - @neplex/upserve@0.1.1

## 0.1.0

Initial implementation of Upserve update distribution.
