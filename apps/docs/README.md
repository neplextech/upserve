# Upserve documentation site

Run `pnpm --filter @upserve/docs dev` for development and `pnpm docs:build` for a static export in `out/`.

Set `NEXT_PUBLIC_SITE_URL` to the site's public HTTPS origin when building for deployment. It supplies canonical and absolute Open Graph URLs. Local builds default to http://localhost:3000; no production domain is assumed.

The build generates a 1200 × 630 PNG for every documentation route and the landing page, plus a shared SVG favicon. Regenerate them separately with `pnpm --filter @upserve/docs social:generate`. Route titles come from MDX frontmatter; the routing mark and palette come from `lib/brand.mjs`.

Inter and JetBrains Mono are self-hosted through Fontsource. Framework silhouettes are vendored locally; attribution is in `public/brands/NOTICE.md`. The architecture animation respects reduced-motion preferences. The cache demonstration uses simulated traffic and performs no upstream requests.
