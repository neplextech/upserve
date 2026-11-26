# Upserve documentation site

Run `pnpm --filter @upserve/docs dev` for development and `pnpm docs:build` for a static export in `out/`.

Set `NEXT_PUBLIC_SITE_URL` to the site's full public HTTPS URL (including a project path, if present) when building for deployment. It supplies canonical and absolute Open Graph URLs. Local builds default to http://localhost:3000; no production domain is assumed.

The build generates a 1200 × 630 PNG for every documentation route and the landing page, plus a shared SVG favicon. Regenerate them separately with `pnpm --filter @upserve/docs social:generate`. Route titles come from MDX frontmatter; the routing mark and palette come from `lib/brand.mjs`.

Inter and JetBrains Mono are self-hosted through Fontsource. Framework silhouettes are vendored locally; attribution is in `public/brands/NOTICE.md`. The static hero pairs an illustrative application update prompt with fields from the generic update protocol. The cache demonstration uses simulated traffic and performs no upstream requests.

## GitHub Pages

`.github/workflows/docs.yml` builds documentation on pull requests and deploys successful `main` builds to GitHub Pages. Automatic runs are limited to `apps/docs/**`, `packages/config/**`, root dependency/toolchain files (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc`) and the docs workflow itself. Manual dispatch is also available. General CI and npm release checks use `check:code`, so unrelated application/package changes do not rebuild the site.

In repository Settings → Pages, select **GitHub Actions** as the source. A private repository requires a GitHub plan that supports Pages; repository visibility should remain private. Review the Pages site's access/visibility setting separately from repository visibility before enabling hosting.

The workflow reads the actual Pages URL and base path with `actions/configure-pages`, builds the static export, verifies local links/assets and social images, uploads `apps/docs/out`, then deploys using the `github-pages` environment. Only the deployment job receives Pages write and OIDC permissions. Pull requests validate the repository project path without querying Pages, so these builds also work before hosting is enabled. Pull requests never deploy. Restrict the environment to `main` if adding deployment protection rules.

For a local project-path check:

```sh
NEXT_PUBLIC_BASE_PATH=/upserve NEXT_PUBLIC_SITE_URL=https://neplextech.github.io/upserve pnpm docs:build
NEXT_PUBLIC_BASE_PATH=/upserve NEXT_PUBLIC_SITE_URL=https://neplextech.github.io/upserve pnpm --filter @upserve/docs verify:export
```

An empty `NEXT_PUBLIC_BASE_PATH` serves at the domain root. Next.js prefixes its own links and bundles; raw framework icons, the favicon, search endpoint, LLM index and social metadata are configured explicitly. `pnpm check` still includes the docs build for a deliberate full local validation.
