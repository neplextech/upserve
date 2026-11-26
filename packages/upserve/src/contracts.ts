import type { Hono, Context } from "hono";

/** A published binary or manifest. IDs and names are unique within a release. */
export interface Asset {
  /** Opaque provider identity, stable across refreshes. */
  id: string;

  /** Unique integration or asset name within its registration scope. */
  name: string;

  /** Exact uncompressed asset length in bytes. */
  size: number;

  /** Validated upstream HTTPS URL; never include credentials. */
  url: string;

  /** Optional upstream media type. */
  contentType?: string;
}

/** Portable release identity; tags and provider IDs are never treated as versions. */
export interface Release {
  /** Opaque provider identity, stable across refreshes. */
  id: string;

  /** Original upstream Git tag; never inferred from a semantic version. */
  tag: string;

  /** Strict semantic version used for update precedence. */
  version: string;

  /** Whether the release belongs to a prerelease channel. */
  prerelease: boolean;

  /** Unpublished releases are excluded from update selection. */
  draft?: boolean;

  /** Withdrawn releases are excluded from update selection. */
  yanked?: boolean;

  /** Optional release notes supplied by the publisher. */
  notes?: string;

  /** Optional RFC 3339 publication timestamp. */
  publishedAt?: string;

  /** Known downloadable assets and protocol manifests. */
  assets: Asset[];

  /** Provider-specific serializable data; omitted from generic client responses. */
  metadata?: unknown;
}

/** Serializable upstream response, stored only after successful validation. */
export interface CacheEntry {
  /** Validated serializable metadata; undefined denotes a cold failure cooldown. */
  value: unknown;

  /** Absolute epoch milliseconds until this entry is fresh. */
  freshUntil: number;

  /** Absolute epoch milliseconds after which stale data must not be served. */
  staleUntil: number;

  /** Earliest permitted refresh time in epoch milliseconds. */
  retryAt?: number;
}

/** Persistent stores must isolate keys and return independent serializable values. */
export interface CacheStore {
  get(key: string): Promise<CacheEntry | undefined>;
  set(key: string, entry: CacheEntry): Promise<void>;
  delete(key: string): Promise<void>;
}

/** Services shared by providers and adapters within one application security scope. */
export interface ResourceContext {
  /** Abort signal for the upstream operation, independent of shared client checks. */
  signal: AbortSignal;

  /** Coalesces resource loads. Throwing preserves the previous validated value. */
  cached<T>(identity: string, load: (previous: T | undefined) => Promise<T>): Promise<T>;
}

/** Providers are trusted code. The scope must change when credentials/configuration change. */
export interface Provider {
  /** Unique integration or asset name within its registration scope. */
  name: string;

  /** Nonsecret configuration and credential generation boundary for cache isolation. */
  scope: string;

  /** Require downstream authorization and streamed delivery when true. */
  private?: boolean;
  releases(context: ResourceContext): Promise<Release[]>;

  /** Open only a known release asset; forward Range and validators when present. */
  open(asset: Asset, request: Request, context: ResourceContext): Promise<Response>;

  /** Validate every destination before returning a client-visible public redirect. */
  redirect?(asset: Asset): string;

  /** Verify a bounded webhook body before refreshing. */
  verifyWebhook?(request: Request, body: Uint8Array): Promise<boolean>;
}

/** Services supplied to every adapter; no cross-application state is exposed. */
export interface AdapterServices {
  /** Configuration scoped to the registered application. */
  config: AppConfig;

  /** Named release selection predicates; defaults to stable and prerelease. */
  channels: string[];
  releases(channel: string): Promise<Release[]>;
  latest(channel: string): Promise<Release | undefined>;

  /** Parse and validate before caching. Invalid loads preserve the previous valid manifest. */
  manifest<T>(release: Release, name: string, parse: (text: string) => T): Promise<T>;
  assetUrl(context: Context, release: Release, asset: Asset): string;
  deliver(request: Request, release: Release, asset: Asset): Promise<Response>;
}

/** Register protocol routes relative to /:application/:channel. */
export interface Adapter {
  /** Unique integration or asset name within its registration scope. */
  name: string;
  register(app: Hono, services: AdapterServices): void;
}

/** Per-application cache lifetimes, in milliseconds. */
export interface CachePolicy {
  /** Fresh metadata lifetime in milliseconds; defaults to 60,000. */
  ttl?: number;

  /** Additional stale lifetime after expiry, in milliseconds; defaults to 300,000. */
  staleIfError?: number;

  /** Fresh empty-list lifetime in milliseconds; defaults to 15,000. */
  negativeTtl?: number;
}

/** Application security and release selection boundary. */
export interface AppConfig {
  /** Release provider for this application. */
  provider: Provider;

  /** Protocols mounted below the application and channel path. */
  adapters: Adapter[];

  /** Mandatory for private providers. Return false to deny without upstream work. */
  authorize?: (request: Request) => boolean | Promise<boolean>;

  /** Named release selection predicates; defaults to stable and prerelease. */
  channels?: Record<string, (release: Release) => boolean>;

  /** Optional cache store or per-application lifetime policy. */
  cache?: CachePolicy;

  /** Public delivery mode; defaults to redirect when supported. Private assets stream. */
  delivery?: "redirect" | "stream";
}

/** Library configuration. No filesystem or server process is required. */
export interface UpserveConfig {
  /** Applications indexed by safe route identifier. */
  apps: Record<string, AppConfig>;

  /** Optional cache store or per-application lifetime policy. */
  cache?: CacheStore;

  /** Persistent cache namespace; change when deployment security boundaries change. */
  namespace?: string;

  /** Maximum concurrent refresh loads per coordination pool; defaults to four. */
  concurrency?: number;

  /** Injectable epoch millisecond clock for deterministic cache behavior. */
  now?: () => number;

  /** Workers may pass executionCtx.waitUntil. Omit for awaited opportunistic refresh. */
  background?: (task: Promise<unknown>) => void;
}

/** Preserve inferred plugin/configuration types without runtime wrapping. */
export function defineProvider<T extends Provider>(provider: T): T {
  return provider;
}

/** Define routes using the same contract as official adapters. */
export function defineAdapter<T extends Adapter>(adapter: T): T {
  return adapter;
}

/** Define a cache without inheriting an implementation class. */
export function defineCache<T extends CacheStore>(cache: T): T {
  return cache;
}

/** Type-check a configuration while preserving its inferred properties. */
export function defineConfig<T extends UpserveConfig>(config: T): T {
  return config;
}
