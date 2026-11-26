import type { CacheEntry, CacheStore, CachePolicy } from "./contracts.js";
import { UpserveError } from "./errors.js";

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
    load: (previous: T | undefined) => Promise<T>,
    policy: CachePolicy = {},
    force = false,
  ): Promise<T> {
    const old = await this.store.get(key);

    const now = this.now();
    if (!force && old && now < old.freshUntil) return old.value as T;
    if (old?.retryAt && now < old.retryAt) {
      if (now < old.staleUntil && old.value !== undefined) return old.value as T;
      throw new UpserveError("rate_limit", "Refresh delayed", old.retryAt);
    }

    let task = this.pending.get(key) as Promise<T> | undefined;
    if (!task) {
      task = this.slot(async () => {
        try {
          const value = await load(old?.value as T | undefined);

          const ttl =
            Array.isArray(value) && !value.length
              ? (policy.negativeTtl ?? 15_000)
              : (policy.ttl ?? 60_000);
          await this.store.set(key, {
            value,
            freshUntil: this.now() + ttl,
            staleUntil: this.now() + ttl + (policy.staleIfError ?? 300_000),
          });

          return value;
        } catch (error) {
          const retryAt =
            error instanceof UpserveError && error.retryAt ? error.retryAt : this.now() + 15_000;
          await this.store.set(
            key,
            old && !(error instanceof UpserveError && error.code === "auth")
              ? { ...old, retryAt }
              : { value: undefined, freshUntil: 0, staleUntil: 0, retryAt },
          );
          // Authentication revocation fails closed; never disclose cached private metadata.
          if (
            old &&
            old.value !== undefined &&
            this.now() < old.staleUntil &&
            !(error instanceof UpserveError && error.code === "auth")
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

  async invalidate(key: string): Promise<void> {
    await this.pending.get(key)?.catch(() => undefined);
    await this.store.delete(key);
  }
}
