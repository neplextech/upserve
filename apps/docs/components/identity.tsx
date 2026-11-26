import { withBasePath } from "../lib/paths.mjs";
import { markPath } from "../lib/brand.mjs";

/** Upserve's routing mark, shared with the social preview artwork. */
export function UpserveMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 36" fill="currentColor" aria-hidden="true">
      <path d={markPath} />
    </svg>
  );
}

export type BrandName =
  | "github"
  | "tauri"
  | "electron"
  | "android"
  | "hono"
  | "bun"
  | "nodedotjs"
  | "docker";

/** Official framework silhouettes, vendored locally from Simple Icons. */
export function BrandIcon({ name, className = "" }: { name: BrandName; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`brand-icon brand-${name} ${className}`}
      style={{
        maskImage: `url(${withBasePath(`/brands/${name}.svg`)})`,
        WebkitMaskImage: `url(${withBasePath(`/brands/${name}.svg`)})`,
      }}
    />
  );
}

/** Neutral identifier for custom protocols and code examples. */
export function CodeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18" />
    </svg>
  );
}

/** Show clipboard feedback without shifting the surrounding control. */
export function CopyIcon({ checked = false }: { checked?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      {checked ? (
        <path d="m4 10 4 4 8-9" />
      ) : (
        <>
          <rect x="7" y="7" width="9" height="10" rx="1.5" />
          <path d="M12 7V3H3v10h4" />
        </>
      )}
    </svg>
  );
}
