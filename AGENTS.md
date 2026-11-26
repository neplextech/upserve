# Working on Upserve

Upserve is a Neplex Technologies update distribution library and CLI. The repository remains private until maintainers deliberately change visibility. Never publish during implementation or tests.

## Architecture

packages/upserve owns release contracts, registry, cache coordination and Hono composition. It must use Web APIs without Node dependencies. github implements GitHub access through public Provider contracts. tauri, electron, android and generic implement Adapter contracts. sqlite is an optional Node-only metadata store; cli owns config loading and process lifecycle. config is private shared tooling. apps/docs is Fumadocs; apps/playground and examples are runnable integration references. Plugins are trusted code, never sandboxed.

## Commands

Node 24, pnpm 10.32.1. Install with pnpm install --frozen-lockfile. pnpm check runs lint, formatting, strict TypeScript, Vitest, libraries and docs. pnpm format applies oxfmt. pnpm exec tsx apps/playground/index.ts starts the local demonstration. pnpm --filter @upserve/docs dev starts docs.

## Conventions

Use strict ESM TypeScript, explicit public entry points, catalog dependencies and workspace:* internally. Preserve inference with defineProvider/defineAdapter/defineCache. Prefer composition and direct Hono routes. Add meaningful JSDoc with defaults, semantics and constraints. Keep blank lines between declarations and logical operations. In ALL code files, separate distinct code chunks, functions, methods, declarations, tests and logical steps with a blank line. Keep JSDoc attached to its declaration and keep related import groups together. Review spacing after formatting; do not compress unrelated operations onto one line. Avoid any, dense one-liners, unrelated refactors and unnecessary dependencies.

## Verification

Use pure TypeScript Vitest fixtures, injectable Fetch and clocks; no live upstream credentials. Validate cache cold/fresh/stale/expired paths, malformed responses, withdrawal and access boundaries. Build declarations and exercise emitted entry points. Report Node, Bun, browser, Docker and deployed-runtime evidence separately. Never claim Workers deployment from portable API usage alone.

## Security

Do not expose tokens in keys, redirects, responses or logs. Private providers require downstream authorization. Validate every redirect, bound metadata and never accept arbitrary proxy URLs. Preserve signatures and checksums. Do not request signing keys. Review auth revocation, stale limits, cancellation, concurrency and unbounded storage before release.

## Documentation and release

Update docs and consumer skills with public API changes. Keep README examples runnable. CLAUDE.md is a tracked symlink to this file. Use Changesets, build all packages and inspect packed workspace dependencies. RELEASING.md documents OIDC bootstrap and private-repository provenance constraints. Publishing workflows require deliberate protected-environment approval. Never change repository visibility implicitly.

Commit coherent changes with no AI co-author trailers, as explicitly requested for this implementation.
