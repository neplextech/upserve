import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"] },
  resolve: {
    alias: {
      "@neplex/upserve":
        "/Users/andromeda/Developer/work/neplex/upserve/packages/upserve/src/index.ts",
      "@neplex/upserve-github":
        "/Users/andromeda/Developer/work/neplex/upserve/packages/github/src/index.ts",
      "@neplex/upserve-tauri":
        "/Users/andromeda/Developer/work/neplex/upserve/packages/tauri/src/index.ts",
      "@neplex/upserve-electron":
        "/Users/andromeda/Developer/work/neplex/upserve/packages/electron/src/index.ts",
      "@neplex/upserve-android":
        "/Users/andromeda/Developer/work/neplex/upserve/packages/android/src/index.ts",
      "@neplex/upserve-generic":
        "/Users/andromeda/Developer/work/neplex/upserve/packages/generic/src/index.ts",
      "@neplex/upserve-sqlite":
        "/Users/andromeda/Developer/work/neplex/upserve/packages/sqlite/src/index.ts",
      "@neplex/upserve-cli":
        "/Users/andromeda/Developer/work/neplex/upserve/packages/cli/src/index.ts",
    },
  },
});
