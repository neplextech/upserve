#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { createUpserve, UpserveError } from "@neplex/upserve";
import { loadConfiguration } from "./config.js";

const command = process.argv[2] ?? "start";

const file = resolve(process.env.UPSERVE_CONFIG ?? "upserve.config.ts");

const log = (event: string, data = {}) =>
  console.log(JSON.stringify({ time: new Date().toISOString(), event, ...data }));

try {
  if (command === "init") {
    await writeFile(
      file,
      `import { defineConfig } from '@neplex/upserve';\nimport { github } from '@neplex/upserve-github';\nimport { generic } from '@neplex/upserve-generic';\n\nexport default defineConfig({\n  apps: { example: { provider: github({ repository: 'owner/repository' }), adapters: [generic()] } },\n});\n`,
      { flag: "wx" },
    );
    log("configuration_created", { file });
  } else if (command === "start") {
    const config = await loadConfiguration(file);

    let closeCache: (() => void) | undefined;
    if (process.env.UPSERVE_CACHE_DIR && !config.cache) {
      const directory = resolve(process.env.UPSERVE_CACHE_DIR);
      await mkdir(directory, { recursive: true });

      const { sqliteCache } = await import("@neplex/upserve-sqlite");

      const store = sqliteCache(resolve(directory, "metadata.sqlite"));
      config.cache = store;
      closeCache = () => store.close();
    }

    const updates = createUpserve(config);

    const app = new Hono();

    let ready = true;
    app.get("/health/live", (c) => c.json({ status: "ok" }));
    app.get("/health/ready", (c) =>
      c.json({ status: ready ? "ready" : "draining" }, ready ? 200 : 503),
    );
    app.route("/", updates);

    const port = Number(process.env.PORT ?? 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new Error("PORT must be between 1 and 65535");

    const server = serve(
      { fetch: app.fetch, port, hostname: process.env.HOST ?? "0.0.0.0" },
      (info) => log("listening", { port: info.port }),
    );

    const shutdown = () => {
      if (!ready) return;
      ready = false;
      log("draining");
      server.close(() => {
        closeCache?.();
        process.exit(0);
      });
      setTimeout(() => {
        if ("closeAllConnections" in server) server.closeAllConnections();
        process.exit(1);
      }, 10_000).unref();
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } else throw new Error("Usage: upserve init | start");
} catch (error) {
  // Configuration modules are trusted code; never serialize arbitrary error objects.
  log("startup_failed", {
    message:
      error instanceof UpserveError || (error instanceof Error && error.message.startsWith("PORT "))
        ? error.message
        : "Unable to load configuration or start server. Check configuration path, exports and application boundaries.",
  });
  process.exitCode = 1;
}
