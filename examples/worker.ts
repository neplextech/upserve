import { createUpserve } from "@neplex/upserve";
import { github } from "@neplex/upserve-github";
import { generic } from "@neplex/upserve-generic";

// Integration example only; not a deployed Cloudflare validation.
export default createUpserve({
  apps: { editor: { provider: github({ repository: "example/editor" }), adapters: [generic()] } },
});
