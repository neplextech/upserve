FROM node:24-bookworm-slim AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build && pnpm --filter @neplex/upserve-cli deploy --legacy --prod /runtime

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000 UPSERVE_CACHE_DIR=/data UPSERVE_CONFIG=/config/upserve.config.ts
RUN groupadd --gid 10001 upserve && useradd --uid 10001 --gid upserve --create-home upserve && mkdir /data /config && chown upserve:upserve /data /config
WORKDIR /app
COPY --from=build /runtime ./
COPY --from=build /app/examples/upserve.config.ts /config/upserve.config.ts
RUN ln -s /app/node_modules /config/node_modules
USER 10001:10001
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3000/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","dist/index.mjs","start"]
