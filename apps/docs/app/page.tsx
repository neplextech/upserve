import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { IntegrationExample } from "../components/integration-example";
import { integrationExamples } from "../lib/integration-examples";
import { BrandIcon, CodeIcon, UpserveMark } from "../components/identity";
import { CacheDemo } from "../components/interactions";
import { Code } from "../components/code";

const extension = `import { defineAdapter } from '@neplex/upserve'

export const myUpdater = defineAdapter({
  name: 'my-updater',

  register(app, services) {
    app.get('/version', async (c) => {
      const release = await services.latest(
        c.req.param('channel')!,
      )

      return release
        ? c.json({ version: release.version })
        : c.body(null, 204)
    })
  },
})`;

const integrations = [
  {
    name: "Tauri",
    icon: "tauri",
    label: "Tauri v2 updater",
    detail: "Static manifests and dynamic checks. Existing artifact signatures stay intact.",
    endpoint: "/tauri/:target/:arch/:version",
  },
  {
    name: "Electron",
    icon: "electron",
    label: "electron-builder / electron-updater",
    detail: "Generic YAML feeds, installers, blockmaps and single-range downloads.",
    endpoint: "/electron/latest.yml",
  },
  {
    name: "Android",
    icon: "android",
    label: "Direct APK distribution",
    detail: "APK manifests with SHA-256, file sizes and configurable compatibility.",
    endpoint: "/android/latest.json",
  },
  {
    name: "Custom clients",
    icon: null,
    label: "Framework-independent JSON",
    detail: "Query releases, versions, channels and applicable updates through one API.",
    endpoint: "/generic/update/:version",
  },
] as const;

export default function Home() {
  return (
    <div className="landing">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-container header-inner">
          <Link href="/" className="wordmark" aria-label="Upserve home">
            <UpserveMark />
            upserve
          </Link>
          <nav aria-label="Main navigation">
            <a className="nav-integrations" href="#integrations">
              Integrations
            </a>
            <Link href="/docs/">Documentation</Link>
            <a className="nav-github" href="https://github.com/neplextech/upserve">
              <BrandIcon name="github" />
              <span>GitHub</span>
            </a>
            <span className="nav-separator" />
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main id="main-content">
        <section className="hero site-container" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <h1 id="hero-heading">
              Serve updates for <span>desktop &amp; mobile.</span>
            </h1>
            <p className="hero-description">
              An extensible, self-hostable update server for Tauri, Electron, Android and custom
              applications.
            </p>
            <div className="hero-actions">
              <Link href="/docs/" className="button button-primary">
                Documentation
              </Link>
              <a className="button button-secondary" href="https://github.com/neplextech/upserve">
                <BrandIcon name="github" />
                View on GitHub
              </a>
            </div>
          </div>
          <IntegrationExample
            examples={integrationExamples.map((example) => ({
              ...example,
              content: <Code code={example.code} />,
            }))}
          />
          <div className="hero-frameworks" aria-label="Supported update clients">
            <span>Keep your update client</span>
            <Link href="/docs/integrations/#tauri-v2">
              <BrandIcon name="tauri" />
              Tauri
            </Link>
            <Link href="/docs/integrations/#electron-builder--electron-updater">
              <BrandIcon name="electron" />
              Electron
            </Link>
            <Link href="/docs/integrations/#direct-android-apks">
              <BrandIcon name="android" />
              Android
            </Link>
            <Link href="/docs/generic/">
              <CodeIcon />
              Custom clients
            </Link>
          </div>
        </section>
        <section
          className="site-container integrations-section section-block"
          id="integrations"
          aria-labelledby="integration-heading"
        >
          <div className="section-heading">
            <div>
              <h2 id="integration-heading">Keep the updater you already use.</h2>
              <p>
                Upserve serves each client’s expected format from the same release and caching
                services.
              </p>
            </div>
            <Link className="text-link" href="/docs/integrations/">
              Read the integration guides
            </Link>
          </div>
          <div className="integration-grid">
            {integrations.map((item) => (
              <Link
                href={
                  item.icon
                    ? `/docs/integrations/#${item.icon === "electron" ? "electron-builder--electron-updater" : item.icon === "android" ? "direct-android-apks" : "tauri-v2"}`
                    : "/docs/generic/"
                }
                key={item.name}
                className={`integration-item integration-${item.icon ?? "custom"}`}
              >
                <div className="integration-icon">
                  {item.icon ? <BrandIcon name={item.icon} /> : <CodeIcon />}
                </div>
                <h3>{item.name}</h3>
                <span className="integration-label">{item.label}</span>
                <p>{item.detail}</p>
                <code>{item.endpoint}</code>
              </Link>
            ))}
          </div>
        </section>
        <section
          className="site-container cache-section section-block"
          aria-labelledby="cache-heading"
        >
          <div className="cache-copy">
            <span className="section-index">Cache coordination</span>
            <h2 id="cache-heading">An update check shouldn’t become an upstream request.</h2>
            <p>
              Fresh metadata serves repeated checks from cache. Concurrent cold requests share a
              refresh, and upstream failures respect a bounded stale window and retry cooldowns.
            </p>
            <div className="cache-features">
              <div>
                <strong>Memory by default</strong>
                <p>Start without external infrastructure.</p>
              </div>
              <div>
                <strong>SQLite when you need it</strong>
                <p>Recover metadata across server restarts.</p>
              </div>
              <div>
                <strong>Conditional refreshes</strong>
                <p>Reuse ETags and Last-Modified validators.</p>
              </div>
            </div>
            <Link href="/docs/cache/" className="text-link">
              Understand freshness and failure behavior
            </Link>
          </div>
          <CacheDemo />
        </section>
        <section className="extension-section section-block" aria-labelledby="extension-heading">
          <div className="site-container">
            <div className="section-heading">
              <div>
                <h2 id="extension-heading">Extend the protocol, provider or store.</h2>
                <p>Official integrations use the same public contracts available to your code.</p>
              </div>
              <Link href="/docs/extensions/" className="text-link">
                Build an integration
              </Link>
            </div>
            <div className="extension-layout">
              <div className="extension-contracts">
                <div>
                  <span className="contract-glyph">
                    <svg
                      viewBox="0 0 32 32"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path d="M5 10h9V4h13v11H14v-5M5 10v16h22V15M14 20h13" />
                      <circle cx="5" cy="10" r="3" />
                    </svg>
                  </span>
                  <div>
                    <code>defineProvider()</code>
                    <h3>Bring a release source.</h3>
                    <p>
                      Resolve releases and open known assets from your own artifact infrastructure.
                    </p>
                  </div>
                </div>
                <div className="selected-contract">
                  <span className="contract-glyph">
                    <CodeIcon />
                  </span>
                  <div>
                    <code>defineAdapter()</code>
                    <h3>Speak your client’s protocol.</h3>
                    <p>
                      Register Hono routes with scoped release resolution and asset delivery
                      services.
                    </p>
                  </div>
                </div>
                <div>
                  <span className="contract-glyph">
                    <svg
                      viewBox="0 0 32 32"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <ellipse cx="16" cy="7" rx="11" ry="4" />
                      <path d="M5 7v18c0 5 22 5 22 0V7M5 16c0 5 22 5 22 0" />
                    </svg>
                  </span>
                  <div>
                    <code>defineCache()</code>
                    <h3>Choose where metadata lives.</h3>
                    <p>Implement a small asynchronous get, set and delete contract.</p>
                  </div>
                </div>
              </div>
              <div className="extension-code">
                <div className="file-heading">
                  <CodeIcon />
                  <span>my-updater.ts</span>
                  <span>Custom adapter</span>
                </div>
                <Code code={extension} />
              </div>
            </div>
          </div>
        </section>
        <section
          className="site-container runtime-section section-block"
          aria-labelledby="runtime-heading"
        >
          <div className="runtime-title">
            <h2 id="runtime-heading">Run it where you run your apps.</h2>
            <p>
              Fetch-based at the core. Node.js and Bun entry points are validated. The standalone
              image runs as a non-root user with optional SQLite persistence.
            </p>
            <Link href="/docs/deployment/" className="text-link">
              Self-hosting guide
            </Link>
          </div>
          <div className="runtime-options">
            <div>
              <BrandIcon name="nodedotjs" />
              <strong>Node.js</strong>
              <span>Hono server adapter</span>
            </div>
            <div>
              <BrandIcon name="bun" />
              <strong>Bun</strong>
              <span>Native Fetch handler</span>
            </div>
            <div>
              <BrandIcon name="docker" />
              <strong>Docker</strong>
              <span>CLI + persistent volume</span>
            </div>
            <p>
              Other Fetch runtimes: portable APIs and a Worker integration example. Deployment
              validation is documented separately.
            </p>
          </div>
        </section>
        <section className="get-started-band">
          <div className="site-container">
            <UpserveMark />
            <div>
              <h2>Connect your first application.</h2>
              <p>Configure a provider, choose an adapter, serve updates.</p>
            </div>
            <Link className="button button-primary" href="/docs/">
              Read the quickstart
            </Link>
          </div>
        </section>
      </main>
      <footer className="site-container site-footer">
        <div>
          <Link href="/" className="wordmark">
            <UpserveMark />
            upserve
          </Link>
          <span>
            © {new Date().getFullYear()} <a href="https://neplextech.com">Neplex</a>
          </span>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/docs/">Documentation</Link>
          <Link href="/docs/security/">Security</Link>
          <a href="https://github.com/neplextech/upserve">GitHub</a>
          <a href="https://github.com/neplextech/upserve/blob/main/LICENSE">MIT License</a>
        </nav>
        <p>Application updates, on infrastructure you control.</p>
      </footer>
    </div>
  );
}
