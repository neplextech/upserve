import { defineConfig } from "@neplex/upserve";
import { github } from "@neplex/upserve-github";
import { generic } from "@neplex/upserve-generic";

export default defineConfig({
  apps: {
    example: {
      provider: github({ repository: "example/editor" }),
      adapters: [generic()],
    },
  },
});
