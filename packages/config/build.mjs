import { defineConfig } from "tsdown";

/** Shared ESM library build with generated declarations and no dependency bundling. */
export default defineConfig({ entry: ["src/index.ts"], dts: true, clean: true, unbundle: true });
