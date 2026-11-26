"use client";

import { useState } from "react";
import { CopyIcon } from "./identity";

/** Copy the dependencies for the selected integration and announce the outcome. */
export function InstallCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="installation">
      <div className="install-command">
        <span className="terminal-prompt" aria-hidden="true">
          $
        </span>
        <code>{command}</code>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Installation command copied" : "Copy installation command"}
        >
          <CopyIcon checked={copied} />
        </button>
      </div>
      <span className="install-feedback" role="status">
        {failed ? "Select the command to copy it manually." : copied ? "Copied to clipboard." : ""}
      </span>
    </div>
  );
}

/** A deliberately deterministic demo of coalescing and warm-cache checks. */
export function CacheDemo() {
  const [state, setState] = useState({
    checks: 8,
    upstream: 1,
    hits: 0,
    phase: "8 checks · 1 shared refresh",
    fresh: true,
  });

  function check() {
    setState((previous) => ({
      checks: previous.checks + 8,
      upstream: previous.upstream + (previous.fresh ? 0 : 1),
      hits: previous.hits + (previous.fresh ? 8 : 0),
      phase: previous.fresh ? "Fresh metadata · 8 cache hits" : "8 checks · 1 shared refresh",
      fresh: true,
    }));
  }

  function expire() {
    setState((previous) => ({
      ...previous,
      phase: "TTL expired · next checks refresh",
      fresh: false,
    }));
  }

  return (
    <div className="cache-demo">
      <div className="demo-header">
        <span>Request coordination</span>
        <span className="diagram-mode">Interactive example</span>
      </div>
      <div className="traffic-lanes">
        <div className="traffic-lane">
          <div>
            <span>Client update checks</span>
            <strong>{state.checks.toString().padStart(2, "0")}</strong>
          </div>
          <div className="traffic-cells">
            {Array.from({ length: 24 }, (_, index) => (
              <span key={index} className={index < Math.min(state.checks, 24) ? "filled" : ""} />
            ))}
          </div>
        </div>
        <div className="traffic-lane upstream-lane">
          <div>
            <span>Upstream refreshes</span>
            <strong>{state.upstream.toString().padStart(2, "0")}</strong>
          </div>
          <div className="traffic-cells">
            {Array.from({ length: 24 }, (_, index) => (
              <span key={index} className={index < Math.min(state.upstream, 24) ? "filled" : ""} />
            ))}
          </div>
        </div>
      </div>
      <div className="demo-status" aria-live="polite">
        <span className="status-dot" />
        {state.phase}
        <span className="hit-count">{state.hits} cache hits</span>
      </div>
      <div className="demo-actions">
        <button onClick={check} type="button">
          Send 8 update checks
        </button>
        <button onClick={expire} type="button" disabled={!state.fresh}>
          Expire TTL
        </button>
        <button
          onClick={() =>
            setState({ checks: 0, upstream: 0, hits: 0, phase: "Ready for requests", fresh: false })
          }
          type="button"
          className="reset-demo"
          aria-label="Reset cache demonstration"
        >
          Reset
        </button>
      </div>
      <p className="demo-caption">Simulated requests in one process. No upstream calls are made.</p>
    </div>
  );
}
