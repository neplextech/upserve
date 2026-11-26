import { expect, it } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfiguration } from "../packages/cli/src/config.js";

it.each(["ts", "mts"])(
  "loads a standalone .%s configuration outside a package",
  async (extension) => {
    const directory = await mkdtemp(join(tmpdir(), "upserve-config-"));
    const file = join(directory, "upserve.config." + extension);

    try {
      await writeFile(file, "export default { apps: {} };");

      expect(await loadConfiguration(file)).toEqual({ apps: {} });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);

it("reports an actionable error for an invalid default configuration", async () => {
  const directory = await mkdtemp(join(tmpdir(), "upserve-config-"));
  const file = join(directory, "upserve.config.ts");

  try {
    await writeFile(file, "export default {};");

    await expect(loadConfiguration(file)).rejects.toThrow(/apps registry/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
