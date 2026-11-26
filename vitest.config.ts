import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Resolves a workspace package entry point relative to this configuration so
 * tests run against TypeScript sources on any checkout path.
 */
function source(directory: string): string {
  return fileURLToPath(new URL(`./packages/${directory}/src/index.ts`, import.meta.url));
}

export default defineConfig({
  test: { include: ["tests/**/*.test.ts"] },
  resolve: {
    alias: {
      "@neplex/upserve": source("upserve"),
      "@neplex/upserve-github": source("github"),
      "@neplex/upserve-tauri": source("tauri"),
      "@neplex/upserve-electron": source("electron"),
      "@neplex/upserve-android": source("android"),
      "@neplex/upserve-generic": source("generic"),
      "@neplex/upserve-sqlite": source("sqlite"),
      "@neplex/upserve-cli": source("cli"),
    },
  },
});
