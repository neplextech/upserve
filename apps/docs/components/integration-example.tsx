"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { CopyIcon } from "./identity";
import { InstallCommand } from "./interactions";

interface Example {
  id: string;
  label: string;
  filename: string;
  install: string;
  run: string;
  note: string;
  guide: string;
  code: string;
  content: ReactNode;
}

/** Present real integrations with keyboard selection and matching copyable commands. */
export function IntegrationExample({ examples }: { examples: Example[] }) {
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const id = useId();
  const example = examples[selected]!;

  function select(index: number) {
    setSelected(index);
    setCopied(false);
    setCopyFailed(false);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(example.code);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <div className="hero-integration">
      <div className="integration-example">
        <div className="example-bar">
          <div role="tablist" aria-label="Upserve integration examples" className="example-tabs">
            {examples.map((tab, index) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`${id}-tab-${tab.id}`}
                aria-selected={selected === index}
                aria-controls={`${id}-panel-${tab.id}`}
                tabIndex={selected === index ? 0 : -1}
                onClick={() => select(index)}
                onKeyDown={(event) => {
                  let next: number;

                  if (event.key === "ArrowRight") next = (index + 1) % examples.length;
                  else if (event.key === "ArrowLeft")
                    next = (index - 1 + examples.length) % examples.length;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = examples.length - 1;
                  else return;

                  event.preventDefault();
                  select(next);
                  document.getElementById(`${id}-tab-${examples[next]!.id}`)?.focus();
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="copy-example"
            onClick={copyCode}
            aria-label={copied ? "Example copied" : "Copy example code"}
          >
            <CopyIcon checked={copied} />
            <span>{copied ? "Copied" : "Copy code"}</span>
          </button>
        </div>
        {examples.map((tab, index) => (
          <div
            key={tab.id}
            id={`${id}-panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${tab.id}`}
            hidden={selected !== index}
            tabIndex={0}
          >
            <div className="example-file">
              <span>{tab.filename}</span>
              <span>TypeScript</span>
            </div>
            {tab.content}
            <div className="example-install">
              <span>Install</span>
              <InstallCommand key={selected} command={tab.install} />
            </div>
            <div className="example-run">
              <span>Run</span>
              <code>{tab.run}</code>
            </div>
          </div>
        ))}
        <div className="example-note">
          <p>{example.note}</p>
          <Link href={example.guide}>Integration guide</Link>
        </div>
      </div>
      <p className="example-help" role="status">
        {copyFailed
          ? "Select the code to copy it manually."
          : copied
            ? "Example copied to clipboard."
            : "Replace owner/repository with your GitHub release repository. Node.js 22.13 or newer."}
      </p>
    </div>
  );
}
