import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export default function Home() {
  return (
    <main className="home">
      <nav aria-label="Main navigation">
        <Link href="/" className="wordmark">
          <span aria-hidden="true">↥</span> upserve
        </Link>
        <div>
          <Link href="/docs">Documentation</Link>
          <a href="https://github.com/neplextech/upserve">GitHub</a>
          <ThemeToggle />
        </div>
      </nav>
      <section className="hero">
        <p className="eyebrow">NEPLEX TECHNOLOGIES / OPEN SOURCE</p>
        <h1>
          Your releases.
          <br />
          One reliable endpoint.
        </h1>
        <p className="intro">
          An update server for the applications you build. Connect your releases, keep your updater,
          and serve updates from infrastructure you control.
        </p>
        <div className="actions">
          <Link className="primary" href="/docs">
            Start building
          </Link>
          <Link href="/docs/integrations">Explore the protocols</Link>
        </div>
        <p className="footnote">Self-hostable · MIT licensed · Built on Hono</p>
      </section>
      <section className="implementation" aria-labelledby="code-title">
        <div>
          <p className="eyebrow">A LIBRARY FIRST</p>
          <h2 id="code-title">
            Fits into your server.
            <br />
            Gets out of your way.
          </h2>
          <p>
            Mount Upserve in an existing Hono app, or run it on its own. Providers fetch releases.
            Adapters speak your updater’s protocol. The cache coordinates upstream work.
          </p>
          <Link href="/docs/embedding">Read the integration guide</Link>
        </div>
        <pre>
          <code>{`import { createUpserve } from '@neplex/upserve'
import { github } from '@neplex/upserve-github'
import { tauri } from '@neplex/upserve-tauri'

const updates = createUpserve({
  apps: {
    editor: {
      provider: github({
        repository: 'example/editor',
      }),
      adapters: [tauri()],
    },
  },
})

app.route('/updates', updates)`}</code>
        </pre>
      </section>
      <section className="protocols">
        <p className="eyebrow">KEEP YOUR UPDATE CLIENT</p>
        <h2>
          Different protocols.
          <br />
          Shared infrastructure.
        </h2>
        <div className="protocol-list">
          {[
            ["Tauri", "Signed v2 manifests and dynamic update checks."],
            ["Electron", "electron-builder generic feeds, installers and blockmaps."],
            ["Android", "Direct APK updates with checksums and compatibility hooks."],
            ["Your application", "A JSON API and public contracts for custom integrations."],
          ].map(([name, detail]) => (
            <Link key={name} href="/docs/integrations">
              <h3>{name}</h3>
              <p>{detail}</p>
              <span>Read guide</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="principles">
        <h2>
          Fewer upstream requests.
          <br />
          Clearer failure behavior.
        </h2>
        <p>
          Metadata caching, coalesced refreshes and rate-limit cooldowns sit between your users and
          your release provider. Choose bounded stale responses, persistent SQLite storage, and
          authenticated access for private releases.
        </p>
        <Link href="/docs/cache">Understand the cache</Link>
      </section>
      <footer>
        <span>Upserve / Neplex Technologies</span>
        <div>
          <Link href="/docs/security">Security</Link>
          <Link href="/docs/extensions">Build an integration</Link>
          <a href="https://github.com/neplextech/upserve/blob/main/LICENSE">MIT License</a>
        </div>
      </footer>
    </main>
  );
}
