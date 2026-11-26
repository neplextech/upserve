---
name: upserve-integrate
description: Integrating Upserve.
---

# Integrating Upserve

Install @neplex/upserve and required integration packages. Call createUpserve({ apps: { name: { provider, adapters } } }). Mount directly in Hono with app.route, or use its fetch handler. Never require the CLI for embedded use. Private providers require authorize(request). Keep credentials in environment bindings. Read the package declarations for exact options.

Use only published public contracts. Plugins and TypeScript configuration execute as trusted code. Consult the Upserve documentation for protocol-specific requirements.
