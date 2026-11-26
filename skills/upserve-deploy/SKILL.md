---
name: upserve-deploy
description: Deploying and troubleshooting Upserve.
---

# Deploying and troubleshooting Upserve

Use @neplex/upserve-cli init and start with a typed default configuration. HOST and PORT control the listener; UPSERVE_CONFIG selects configuration; UPSERVE_CACHE_DIR enables Node SQLite persistence. Use HTTPS, a canonical trusted host and a writable data volume. Health endpoints do not prove upstream access. Honor Retry-After, check tagPrefix and manifest filenames, and never force refresh from client traffic. Do not store signing keys.

Use only published public contracts. Plugins and TypeScript configuration execute as trusted code. Consult the Upserve documentation for protocol-specific requirements.
