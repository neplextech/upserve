import { defineConfig } from "@neplex/upserve";
import { github } from "@neplex/upserve-github";
import { generic } from "@neplex/upserve-generic";

export default defineConfig({
  apps: {
    editor: {
      provider: github({ repository: "owner/editor" }),
      adapters: [generic()],
    },
  },
});
