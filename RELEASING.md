# Releasing Upserve

No publication is performed during initial development. Keep the repository private. RELEASE_ENABLED defaults to unset; publishing requires the variable to equal true, a manual workflow input, and a protected environment.

## Initial npm bootstrap and trusted publishing

1. Confirm the npm account has publish rights to the @neplex organization and that all eight package names are available: @neplex/upserve and suffixes cli, github, tauri, electron, android, generic, sqlite.
2. Run `pnpm install --frozen-lockfile` and `pnpm check`. Review `pnpm --filter PACKAGE pack --pack-destination /tmp/upserve-pack` archives: dist entry points, declarations, MIT license, no secrets, and concrete internal dependency versions.
3. npm trusted publishers are configured on an existing package. Do not assume OIDC bootstraps nonexistent names. A maintainer must deliberately perform each initial public publish from reviewed archives using interactive `npm login` and account 2FA. This is an explicit later release action, not part of repository setup. No long-lived CI publishing token is required. Recheck npm's official bootstrap procedure before publishing because it can change.
4. On npm, open each package → Settings → Trusted publishing → GitHub Actions. Set organization/user `neplextech`, repository `upserve`, workflow filename `release.yml`, environment `npm`. Configure every public package independently. Workflow paths and environment names are exact, case-sensitive bindings. Set publishing access to require 2FA and disallow tokens after OIDC is established.
5. In GitHub, create protected environments `npm` and `containers`, restrict deployments to main and require maintainer reviewers. Create repository variable RELEASE_ENABLED=true only when ready to release. Keep GHCR package visibility private while the repository is private; verify it explicitly after first publishing.
6. Add Changesets for changes, dispatch Version packages, review and merge its version PR. Review npm's current trusted-publisher expiry window and validate new bindings promptly (currently two days for the first successful publish). Dispatch Release packages from main with publish=true. It packs workspace dependencies with pnpm and publishes the archives with current npm OIDC on a GitHub-hosted runner. No npm token is injected.
7. A partial release may publish some packages before failing. Inspect registry versions before retrying; skip already-published versions in a reviewed follow-up rather than blindly rerunning. Do not enable automated publication until bootstrap is complete.
8. Dispatch Container separately with a reviewed immutable version. It builds linux/amd64 and linux/arm64 to GHCR. Do not claim a successful multiarchitecture runtime test from a build alone.

Private repository provenance is restricted: npm documents that provenance is not generated for private source repositories even when the package is public. OIDC authentication and provenance are separate. Do not set --provenance or change visibility to work around this. Revisit provenance when maintainers deliberately open-source the repository.

Official references: https://docs.npmjs.com/trusted-publishers/ and https://docs.npmjs.com/generating-provenance-statements/ . Verify current npm CLI/Node prerequisites and first-publication rules before execution. The release workflow intentionally does not create GitHub releases or change repository visibility.
