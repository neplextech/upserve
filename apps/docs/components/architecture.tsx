import { BrandIcon, CodeIcon, UpserveMark } from "./identity";

/** Diagram of metadata refreshes and cached update checks, not a live traffic monitor. */
export function Architecture() {
  return (
    <div
      className="architecture"
      role="group"
      aria-label="GitHub releases feed Upserve's release resolver and cache. Tauri, Electron, Android and custom clients request protocol-specific updates."
    >
      <div className="diagram-toolbar">
        <span>
          <span className="tiny-cross" /> Release pipeline
        </span>
        <span className="diagram-mode">Illustrative flow</span>
      </div>
      <div className="pipeline">
        <svg
          className="pipeline-wires"
          viewBox="0 0 600 340"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <path className="wire-upstream" d="M300 68V133" />
          <path
            className="wire"
            d="M300 215V235Q300 249 286 249H78Q64 249 64 263V292M300 249H230Q216 249 216 263V292M300 249H370Q384 249 384 263V292M300 249H522Q536 249 536 263V292"
          />
          <path className="wire" d="M300 215V249" />
          <path className="flow-packet upstream-packet" d="M300 133V68" />
          <path
            className="flow-packet packet-one"
            d="M64 292V263Q64 249 78 249H286Q300 249 300 235V215"
          />
          <path
            className="flow-packet packet-two"
            d="M216 292V263Q216 249 230 249H286Q300 249 300 235V215"
          />
          <path
            className="flow-packet packet-three"
            d="M384 292V263Q384 249 370 249H314Q300 249 300 235V215"
          />
          <path
            className="flow-packet packet-four"
            d="M536 292V263Q536 249 522 249H314Q300 249 300 235V215"
          />
        </svg>
        <div className="provider-node">
          <BrandIcon name="github" />
          <span>GitHub Releases</span>
          <span className="node-version">v1.4.0</span>
        </div>
        <span className="wire-label">ETag / conditional refresh</span>
        <div className="resolver-node">
          <div className="resolver-title">
            <UpserveMark />
            <strong>upserve</strong>
            <span className="cache-hit">CACHE HIT</span>
          </div>
          <div className="resolver-stages">
            <span>Resolve</span>
            <span>Channels</span>
            <span>Cache metadata</span>
          </div>
        </div>
        <div className="client-nodes">
          {(["tauri", "electron", "android", "custom"] as const).map((name) => (
            <div className="client-node" key={name}>
              {name === "custom" ? <CodeIcon /> : <BrandIcon name={name} />}
              <span>
                {name === "custom" ? "Custom" : name.charAt(0).toUpperCase() + name.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="request-preview">
        <div className="request-line">
          <span className="http-method">GET</span>
          <code>/editor/stable/tauri/darwin/aarch64/1.3.0</code>
        </div>
        <div className="response-line">
          <span className="response-status">200 OK</span>
          <code>
            <span className="json-key">version</span>: <span className="json-string">"1.4.0"</span>
            <span className="response-divider">/</span>
            <span className="json-key">signature</span>: <span className="json-string">"…"</span>
          </code>
        </div>
      </div>
      <div className="diagram-footer">
        <span>
          <i className="legend-line cached" /> Cached update check
        </span>
        <span>
          <i className="legend-line upstream" /> Upstream refresh
        </span>
      </div>
    </div>
  );
}
