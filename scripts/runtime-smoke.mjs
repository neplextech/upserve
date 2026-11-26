import assert from "node:assert/strict";
import { createUpserve } from "../packages/upserve/dist/index.mjs";
import { generic } from "../packages/generic/dist/index.mjs";

const app = createUpserve({
  apps: {
    demo: {
      provider: {
        name: "fixture",
        scope: "v1",
        async releases() {
          return [{ id: "1", tag: "v1.0.0", version: "1.0.0", prerelease: false, assets: [] }];
        },
        async open() {
          return new Response(null, { status: 404 });
        },
      },
      adapters: [generic()],
    },
  },
});

const response = await app.request("/demo/stable/generic/latest");
assert.equal(response.status, 200);
assert.equal((await response.json()).version, "1.0.0");
console.log("Published entry point smoke passed");
