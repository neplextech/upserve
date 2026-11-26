import { serve } from "@hono/node-server";
import { createUpserve } from "@neplex/upserve";
import { generic } from "@neplex/upserve-generic";
import { catalogProvider } from "../../examples/extensions.js";

const app = createUpserve({
  apps: {
    demo: {
      provider: catalogProvider([
        {
          id: "1",
          tag: "v1.0.0",
          version: "1.0.0",
          prerelease: false,
          notes: "Local demonstration release",
          assets: [],
        },
      ]),
      adapters: [generic()],
    },
  },
});
serve({ fetch: app.fetch, port: 3000 });
console.log("Local fixture: http://localhost:3000/demo/stable/generic/latest");
