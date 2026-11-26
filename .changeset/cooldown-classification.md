---
"@neplex/upserve": patch
---

Preserve the original error classification during failure cooldowns. A manifest validation failure now keeps returning `422 invalid`, and authentication, network and unexpected failures keep their codes, instead of becoming `503 rate_limit`, without further upstream requests. Cache entries store only the failure code in a new optional `CacheEntry.error` field; entries written by earlier versions still report `rate_limit`.
