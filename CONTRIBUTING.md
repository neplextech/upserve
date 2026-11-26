# Contributing

Use Node 24 and pnpm 10.32.1. `pnpm install --frozen-lockfile` installs the workspace. Run `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm format:check`, and `pnpm docs:build`. `pnpm format` applies formatting.

Packages use strict ESM TypeScript and tsdown declarations. Shared versions belong in the pnpm catalog; internal dependencies use workspace:*. Core must stay free of Node dependencies and protocol-specific logic. Add providers/adapters/caches through public contracts and deterministic Fetch fixtures. Do not require live credentials for tests.

Add a Changeset with `pnpm changeset` for public package changes. Include documentation and consumer skill updates for API changes. Build and inspect declarations before release; see RELEASING.md. Never publish or enable release environments as part of routine testing.

Keep modules cohesive and add breathing room between logical operations. Use descriptive names and meaningful JSDoc. Report security concerns using SECURITY.md. Pull requests should explain behavior, validation and limits.
