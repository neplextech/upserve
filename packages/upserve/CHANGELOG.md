# @neplex/upserve

## 0.2.0

### Minor Changes

- ed0006b: Add optional `Asset.aliases` and the `findAssetByUrl()` matching helper. The GitHub provider records each asset's REST API URL as a verified alias, so Tauri manifests that reference `api.github.com/.../releases/assets/ID` URLs resolve, while redirects keep using the public download URL. Aliases must be HTTPS, credential-free and unique to one asset; unknown URLs, mismatched asset IDs and other repositories are rejected.

### Patch Changes

- 8cde839: Preserve the original error classification during failure cooldowns. A manifest validation failure now keeps returning `422 invalid`, and authentication, network and unexpected failures keep their codes, instead of becoming `503 rate_limit`, without further upstream requests. Cache entries store only the failure code in a new optional `CacheEntry.error` field; entries written by earlier versions still report `rate_limit`.

## 0.1.1

### Patch Changes

- Refresh package documentation with expanded guides, configuration and API references.

## 0.1.0

Initial implementation of Upserve update distribution.
