import { pathToFileURL } from "node:url";
import { tsImport } from "tsx/esm/api";
import { UpserveError } from "@neplex/upserve";
import type { UpserveConfig } from "@neplex/upserve";

/** Load a trusted TypeScript configuration, including files outside ESM projects. */
export async function loadConfiguration(file: string): Promise<UpserveConfig> {
  const loaded = (await tsImport(pathToFileURL(file).href, import.meta.url)) as {
    default: UpserveConfig | { default: UpserveConfig };
  };

  const exported = loaded.default;

  if (!exported || typeof exported !== "object") {
    throw new UpserveError(
      "configuration",
      "Configuration must export defineConfig({ apps: ... }) as its default export",
    );
  }

  const config = "apps" in exported ? exported : exported.default;

  if (!config?.apps) {
    throw new UpserveError(
      "configuration",
      "Configuration default export must contain an apps registry",
    );
  }

  return config;
}
