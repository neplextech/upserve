---
name: upserve-provider
description: Custom release providers.
---

# Custom release providers

Use defineProvider with name, nonsecret scope, releases(context), and open(asset,request,context). Set private and require downstream authorize for private data. Use context.cached(identity,load) to coalesce resources. Return normalized semantic version separately from tag and id. Empty lists mean confirmed absence; throw UpserveError for temporary failure. Validate redirects and size-bound metadata. Forward range/validators and cancellation without leaking credentials.

Use only published public contracts. Plugins and TypeScript configuration execute as trusted code. Consult the Upserve documentation for protocol-specific requirements.
