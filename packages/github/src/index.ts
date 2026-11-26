import { defineProvider, readText, UpserveError, validVersion } from "@neplex/upserve";
import type { Asset, Release, ResourceContext } from "@neplex/upserve";

/** GitHub configuration. Explicit private mode requires downstream access control. */
export interface GitHubOptions {
  /** GitHub owner/repository pair, without a URL. */
  repository: string;

  /** Explicit nonsecret credential generation for persistent cache reuse. Rotate on token changes. */
  cacheScope?: string;

  /** Optional upstream read credential; never sent to clients. Implies private mode by default. */
  token?: string;

  /** Require downstream authorization and streamed delivery when true. */
  private?: boolean;

  /** Exact tag prefix to remove; defaults to v. Use empty string for bare versions. */
  tagPrefix?: string;

  /** HMAC-SHA256 secret configured on the GitHub release webhook. */
  webhookSecret?: string;

  /** Injectable Fetch implementation; defaults to global fetch. */
  fetch?: typeof fetch;

  /** Per-request timeout in milliseconds; defaults to 30,000. */
  timeout?: number;

  /** Maximum 100-release pages; defaults to 20, bounded to 100. */
  maxPages?: number;

  /** Network/5xx retries after the first attempt; defaults to two, maximum five. */
  retries?: number;

  /** Inject deterministic retry timing in tests. */
  sleep?: (ms: number) => Promise<void>;

  /** Injectable jitter source returning a number between zero and one. */
  random?: () => number;
}

interface Page {
  body: unknown[];
  etag?: string;
  modified?: string;
}

/** GitHub Releases provider; all authenticated requests remain on api.github.com. */
export function github(options: GitHubOptions) {
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(options.repository) ||
    options.repository.split("/").some((p) => p === "." || p === "..")
  )
    throw new UpserveError("configuration", "Expected owner/repository");

  if (
    !Number.isInteger(options.maxPages ?? 20) ||
    (options.maxPages ?? 20) < 1 ||
    (options.maxPages ?? 20) > 100
  )
    throw new UpserveError("configuration", "maxPages must be between 1 and 100");

  if (
    !Number.isInteger(options.retries ?? 2) ||
    (options.retries ?? 2) < 0 ||
    (options.retries ?? 2) > 5
  )
    throw new UpserveError("configuration", "retries must be between 0 and 5");

  const request = options.fetch ?? fetch;

  const api = "https://api.github.com/repos/" + options.repository;

  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  let blockedUntil = 0;

  async function open(
    url: string,
    init: RequestInit,
    signal: AbortSignal,
    authenticated = false,
  ): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      if (Date.now() < blockedUntil)
        throw new UpserveError("rate_limit", "GitHub refresh delayed", blockedUntil);

      const headers = new Headers(init.headers);
      headers.set("User-Agent", "Upserve");
      if (authenticated && options.token) headers.set("Authorization", "Bearer " + options.token);

      let response: Response;
      try {
        response = await request(url, {
          ...init,
          headers,
          redirect: "manual",
          signal: AbortSignal.any([signal, AbortSignal.timeout(options.timeout ?? 30_000)]),
        });
      } catch {
        if (signal.aborted || attempt >= (options.retries ?? 2))
          throw new UpserveError("network", "GitHub request failed");
        await sleep(250 * 2 ** attempt + (options.random ?? Math.random)() * 100);
        continue;
      }

      if (
        response.status === 401 ||
        (response.status === 403 &&
          !response.headers.has("retry-after") &&
          response.headers.get("x-ratelimit-remaining") !== "0")
      ) {
        const message = await readText(response, 64 * 1024).catch(() => "");

        if (response.status === 403 && /secondary rate limit|abuse detection/i.test(message)) {
          blockedUntil = Date.now() + 60_000;

          throw new UpserveError("rate_limit", "GitHub secondary rate limit reached", blockedUntil);
        }

        throw new UpserveError("auth", "GitHub access denied", Date.now() + 60_000);
      }

      if (response.status === 429 || response.status === 403) {
        const retry = response.headers.get("retry-after");

        const seconds =
          retry && /^\d+$/.test(retry)
            ? Number(retry) * 1000
            : retry
              ? Date.parse(retry) - Date.now()
              : 60_000;

        const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000;
        blockedUntil = Math.max(
          Date.now() + (Number.isFinite(seconds) ? seconds : 60_000),
          reset || 0,
        );
        await response.body?.cancel();
        throw new UpserveError("rate_limit", "GitHub rate limit reached", blockedUntil);
      }

      if (response.status >= 500 && attempt < (options.retries ?? 2)) {
        await response.body?.cancel();
        await sleep(250 * 2 ** attempt + (options.random ?? Math.random)() * 100);
        continue;
      }

      return response;
    }
  }

  /** Canonical REST URL of one release asset in the configured repository. */
  function assetApiUrl(id: string): string {
    return api + "/releases/assets/" + id;
  }

  function publicUrl(asset: Asset): string {
    const url = new URL(asset.url);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      Boolean(url.port) ||
      !url.pathname.startsWith("/" + options.repository + "/releases/download/") ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new UpserveError("invalid", "Untrusted asset URL");
    return url.href;
  }

  async function assetOpen(asset: Asset, incoming: Request, context: ResourceContext) {
    if (!/^\d+$/.test(asset.id)) throw new UpserveError("invalid", "Invalid GitHub asset ID");

    const headers = new Headers({ Accept: "application/octet-stream" });

    for (const h of ["range", "if-range", "if-none-match", "if-modified-since"]) {
      const value = incoming.headers.get(h);
      if (value) headers.set(h, value);
    }

    let response = await open(
      assetApiUrl(asset.id),
      { method: incoming.method === "HEAD" ? "HEAD" : "GET", headers },
      context.signal,
      true,
    );
    for (
      let hop = 0;
      response.status >= 300 && response.status < 400 && response.status !== 304;
      hop++
    ) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || hop >= 4) throw new UpserveError("invalid", "Invalid asset redirect");

      const url = new URL(location);
      if (
        url.protocol !== "https:" ||
        !["release-assets.githubusercontent.com", "objects.githubusercontent.com"].includes(
          url.hostname,
        ) ||
        url.port ||
        url.username ||
        url.password
      )
        throw new UpserveError("invalid", "Untrusted asset redirect");
      response = await open(
        url.href,
        { method: incoming.method === "HEAD" ? "HEAD" : "GET", headers },
        context.signal,
      );
    }

    if (![200, 206, 304, 416].includes(response.status)) {
      await response.body?.cancel();
      throw new UpserveError(response.status === 404 ? "missing" : "network", "Asset unavailable");
    }

    return response;
  }

  return defineProvider({
    name: "github",
    // Hash credentials before constructing persistent keys; tokens are never key material.
    scope:
      options.repository +
      ":" +
      (options.tagPrefix ?? "v") +
      ":" +
      (options.private ? "private" : "public") +
      ":" +
      (options.cacheScope ?? (options.token ? crypto.randomUUID() : "anonymous")),
    private: options.private ?? Boolean(options.token),
    redirect: publicUrl,
    open: assetOpen,
    async releases(context) {
      const result: Release[] = [];

      const pages = options.maxPages ?? 20;
      for (let page = 1; page <= pages; page++) {
        const data = await context.cached<Page>("page:" + page, async (previous) => {
          const headers = new Headers({ Accept: "application/vnd.github+json" });

          if (previous?.etag) headers.set("If-None-Match", previous.etag);
          if (previous?.modified) headers.set("If-Modified-Since", previous.modified);

          const response = await open(
            api + "/releases?per_page=100&page=" + page,
            { headers },
            context.signal,
            true,
          );
          if (response.status === 304 && previous) return previous;
          if (response.status === 404)
            throw new UpserveError("auth", "Repository not found or inaccessible");
          if (!response.ok) {
            await response.body?.cancel();
            throw new UpserveError("network", "Cannot fetch releases");
          }

          let body: unknown;
          try {
            body = JSON.parse(await readText(response, 4 * 1024 * 1024));
          } catch {
            throw new UpserveError("invalid", "Invalid GitHub response");
          }

          if (!Array.isArray(body))
            throw new UpserveError("invalid", "Expected GitHub release list");
          // Validate the entire page before replacing its conditional cache.
          for (const item of body) normalize(item);
          return {
            body,
            etag: response.headers.get("etag") ?? undefined,
            modified: response.headers.get("last-modified") ?? undefined,
          };
        });

        for (const item of data.body) {
          const release = normalize(item);
          if (release) result.push(release);
        }

        if (data.body.length < 100) return result;
      }

      throw new UpserveError("invalid", "Release pagination limit exceeded; increase maxPages");
    },
    async verifyWebhook(request, body) {
      if (!options.webhookSecret) return false;

      const signature = request.headers.get("x-hub-signature-256");
      if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;

      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(options.webhookSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"],
      );

      const bytes = Uint8Array.from(signature.slice(7).match(/../g)!, (s) => parseInt(s, 16));

      if (!(await crypto.subtle.verify("HMAC", key, bytes, new Uint8Array(body)))) return false;
      try {
        const payload = JSON.parse(new TextDecoder().decode(body));

        return (
          request.headers.get("x-github-event") === "release" &&
          payload.repository?.full_name === options.repository
        );
      } catch {
        return false;
      }
    },
  });

  function normalize(input: unknown): Release | undefined {
    if (!input || typeof input !== "object") throw new UpserveError("invalid", "Malformed release");

    const r = input as Record<string, unknown>;
    if (
      typeof r.tag_name !== "string" ||
      typeof r.draft !== "boolean" ||
      typeof r.prerelease !== "boolean" ||
      !Array.isArray(r.assets)
    )
      throw new UpserveError("invalid", "Malformed release");

    const prefix = options.tagPrefix ?? "v";
    if (!r.tag_name.startsWith(prefix) || !validVersion(r.tag_name.slice(prefix.length)))
      return undefined;

    const assets = r.assets.map((input): Asset => {
      if (!input || typeof input !== "object") throw new UpserveError("invalid", "Malformed asset");

      const a = input as Record<string, unknown>;
      if (
        typeof a.id !== "number" ||
        typeof a.name !== "string" ||
        typeof a.size !== "number" ||
        typeof a.browser_download_url !== "string"
      )
        throw new UpserveError("invalid", "Malformed asset");

      const asset: Asset = {
        id: String(a.id),
        name: a.name,
        size: a.size,
        url: a.browser_download_url,
      };

      publicUrl(asset);

      // The REST API URL is what Tauri's bundler writes into latest.json. Accept it only
      // as an exact alias of this asset ID in the configured repository; it is never a
      // download destination, because redirects and streaming use the public URL and ID.
      if (a.url !== undefined) {
        if (a.url !== assetApiUrl(asset.id))
          throw new UpserveError("invalid", "GitHub asset API URL does not match asset");

        asset.aliases = [a.url];
      }

      return asset;
    });

    if (typeof r.id !== "number") throw new UpserveError("invalid", "Malformed release ID");
    return {
      id: String(r.id),
      tag: r.tag_name,
      version: r.tag_name.slice(prefix.length),
      prerelease: r.prerelease,
      draft: r.draft,
      assets,
      notes: typeof r.body === "string" ? r.body : undefined,
      publishedAt: typeof r.published_at === "string" ? r.published_at : undefined,
      metadata: r,
    };
  }
}
