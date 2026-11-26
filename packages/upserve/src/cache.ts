import type { CacheEntry, CacheFailure, CacheStore, CachePolicy } from "./contracts.js";
import { errorCodes, UpserveError } from "./errors.js";

/** Reduce a load failure to its persisted classification; no message or body is kept. */
function classify(error: unknown): CacheFailure {
  return error instanceof UpserveError ? error.code : "internal";
}

/**
 * Recreate the failure that started a cooldown. Unknown or absent classifications,
 * including entries written by earlier releases, keep the legacy rate_limit response.
 */
function cooldownError(entry: CacheEntry): Error {
  if (entry.error === "internal") return new Error("Refresh failed during cooldown");

  const code =
    entry.error && (errorCodes as readonly string[]).includes(entry.error)
      ? entry.error
      : "rate_limit";

  return new UpserveError(
    code,
    code === "rate_limit" ? "Refresh delayed" : "Refresh failed during cooldown",
    entry.retryAt,
  );
}

/** Bounded process-local LRU cache. Metadata only; binaries are never buffered here. */
export function memoryCache(maxEntries = 1000): CacheStore {
  if (!Number.isInteger(maxEntries) || maxEntries < 1)
    throw new UpserveError("configuration", "maxEntries must be positive");

  const entries = new Map<string, CacheEntry>();
  return {
    async get(key) {
      const entry = entries.get(key);
      if (entry) {
        entries.delete(key);
        entries.set(key, entry);
      }

      return entry ? structuredClone(entry) : undefined;
    },
    async set(key, entry) {
      entries.delete(key);
      entries.set(key, structuredClone(entry));

      while (entries.size > maxEntries) entries.delete(entries.keys().next().value!);
    },
    async delete(key) {
      entries.delete(key);
    },
  };
}

/** Process-local coordination; shared stores do not provide distributed locks. */
export class Coordinator {
  private pending = new Map<string, Promise<unknown>>();
  private active = 0;
  private queue: (() => void)[] = [];
  constructor(
    private store: CacheStore,
    private now: () => number,
    private limit: number,
    private background?: (task: Promise<unknown>) => void,
  ) {}

  private async slot<T>(load: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) await new Promise<void>((resolve) => this.queue.push(resolve));
    else this.active++;
    try {
      return await load();
    } finally {
      const next = this.queue.shift();

      if (next) next();
      else this.active--;
    }
  }

  async get<T>(
    key: string,
    load: (previous: T | undefined, due: boolean) => Promise<T>,
    policy: CachePolicy = {},
    force = false,
  ): Promise<T> {
    // A forced load must observe upstream state after the caller's request, so it never
    // joins a load that was already running when it was requested.
    if (force) await this.settle(key);

    const old = await this.store.get(key);

    const now = this.now();
    if (!force && old && now < old.freshUntil) return old.value as T;
    if (old?.retryAt && now < old.retryAt) {
      // A forced refresh must not report cached data as refreshed.
      if (!force && now < old.staleUntil && old.value !== undefined) return old.value as T;

      // Report the original classification without contacting the upstream again.
      throw cooldownError(old);
    }

    let task = this.pending.get(key) as Promise<T> | undefined;
    if (!task) {
      task = this.slot(async () => {
        try {
          const value = await load(old?.value as T | undefined, old?.due === true);

          const ttl =
            Array.isArray(value) && !value.length
              ? (policy.negativeTtl ?? 15_000)
              : (policy.ttl ?? 60_000);

          // A complete entry replaces, and therefore clears, any persisted failure.
          await this.store.set(key, {
            value,
            freshUntil: this.now() + ttl,
            staleUntil: this.now() + ttl + (policy.staleIfError ?? 300_000),
          });

          return value;
        } catch (error) {
          const retryAt =
            error instanceof UpserveError && error.retryAt ? error.retryAt : this.now() + 15_000;

          const failure = classify(error);

          await this.store.set(
            key,
            old && failure !== "auth"
              ? { ...old, retryAt, error: failure }
              : { value: undefined, freshUntil: 0, staleUntil: 0, retryAt, error: failure },
          );

          // Authentication revocation fails closed; never disclose cached private metadata.
          // Forced refreshes report their failure instead of returning the previous value.
          if (
            !force &&
            old &&
            old.value !== undefined &&
            this.now() < old.staleUntil &&
            failure !== "auth"
          )
            return old.value as T;

          throw error;
        } finally {
          this.pending.delete(key);
        }
      });
      this.pending.set(key, task);
    }

    if (!force && old && old.value !== undefined && now < old.staleUntil && this.background) {
      this.background(task.catch(() => undefined));

      return old.value as T;
    }

    return task;
  }

  /** Wait for an in-flight load of this key, ignoring its outcome. */
  async settle(key: string): Promise<void> {
    await this.pending.get(key)?.catch(() => undefined);
  }

  /**
   * Make a cached value due for refresh while keeping it for stale fallback and keeping
   * any cooldown. The next read reloads once its cooldown allows, and its loader is told
   * the entry is due. Cold entries are unchanged.
   */
  async expire(key: string): Promise<void> {
    const entry = await this.store.get(key);

    // Already due entries need no write, so a burst of events costs one store update.
    if (entry && entry.value !== undefined && !entry.due)
      await this.store.set(key, { ...entry, freshUntil: 0, due: true });
  }

  async invalidate(key: string): Promise<void> {
    await this.settle(key);
    await this.store.delete(key);
  }
}
