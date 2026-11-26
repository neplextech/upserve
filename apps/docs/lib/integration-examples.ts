/** Complete server/configuration examples rendered verbatim on the landing page. */
export const integrationExamples = [
  {
    id: "tauri",
    label: "Tauri",
    filename: "server.ts",
    install:
      "pnpm add @neplex/upserve @neplex/upserve-github @neplex/upserve-tauri @hono/node-server",
    run: "UPDATE_REPOSITORY=owner/repository npx tsx server.ts",
    note: "Publish latest.json and signed updater artifacts in your release.",
    guide: "/docs/integrations/#tauri-v2",
    code: `import { serve } from '@hono/node-server'
import { createUpserve } from '@neplex/upserve'
import { github } from '@neplex/upserve-github'
import { tauri } from '@neplex/upserve-tauri'

const updates = createUpserve({
  apps: {
    desktop: {
      provider: github({ repository: process.env.UPDATE_REPOSITORY! }),
      adapters: [tauri()],
    },
  },
})

serve({ fetch: updates.fetch, port: 3000 })`,
  },
  {
    id: "electron",
    label: "Electron",
    filename: "server.ts",
    install:
      "pnpm add @neplex/upserve @neplex/upserve-github @neplex/upserve-electron @hono/node-server",
    run: "UPDATE_REPOSITORY=owner/repository npx tsx server.ts",
    note: "Point electron-updater’s generic feed at /desktop/stable/electron/.",
    guide: "/docs/integrations/#electron-builder--electron-updater",
    code: `import { serve } from '@hono/node-server'
import { createUpserve } from '@neplex/upserve'
import { github } from '@neplex/upserve-github'
import { electron } from '@neplex/upserve-electron'

const updates = createUpserve({
  apps: {
    desktop: {
      provider: github({ repository: process.env.UPDATE_REPOSITORY! }),
      adapters: [electron()],
    },
  },
})

serve({ fetch: updates.fetch, port: 3000 })`,
  },
  {
    id: "hono",
    label: "Hono",
    filename: "server.ts",
    install:
      "pnpm add hono @hono/node-server @neplex/upserve @neplex/upserve-github @neplex/upserve-generic",
    run: "UPDATE_REPOSITORY=owner/repository npx tsx server.ts",
    note: "Mount the update routes alongside your existing Hono application.",
    guide: "/docs/embedding/",
    code: `import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { createUpserve } from '@neplex/upserve'
import { github } from '@neplex/upserve-github'
import { generic } from '@neplex/upserve-generic'

const updates = createUpserve({
  apps: {
    desktop: {
      provider: github({ repository: process.env.UPDATE_REPOSITORY! }),
      adapters: [generic()],
    },
  },
})

const app = new Hono()

app.route('/updates', updates)

serve({ fetch: app.fetch, port: 3000 })`,
  },
  {
    id: "standalone",
    label: "Standalone",
    filename: "upserve.config.ts",
    install:
      "pnpm add @neplex/upserve-cli @neplex/upserve @neplex/upserve-github @neplex/upserve-generic",
    run: "UPDATE_REPOSITORY=owner/repository pnpm exec upserve start",
    note: "The CLI loads this configuration and starts a Node.js server on port 3000.",
    guide: "/docs/deployment/",
    code: `import { defineConfig } from '@neplex/upserve'
import { github } from '@neplex/upserve-github'
import { generic } from '@neplex/upserve-generic'

export default defineConfig({
  apps: {
    desktop: {
      provider: github({ repository: process.env.UPDATE_REPOSITORY! }),
      adapters: [generic()],
    },
  },
})`,
  },
] as const;
