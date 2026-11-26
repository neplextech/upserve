import { DatabaseSync } from "node:sqlite";
import { defineCache } from "@neplex/upserve";
import type { CacheEntry } from "@neplex/upserve";

/** Node.js SQLite metadata store with WAL recovery. Create its parent directory first. */
export function sqliteCache(filename: string) {
  const database = new DatabaseSync(filename);
  database.exec(
    "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
  );

  const get = database.prepare("SELECT value FROM cache WHERE key = ?");

  const set = database.prepare(
    "INSERT INTO cache (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
  );

  const remove = database.prepare("DELETE FROM cache WHERE key = ?");
  return defineCache({
    async get(key: string): Promise<CacheEntry | undefined> {
      const row = get.get(key);
      if (!row) return undefined;
      try {
        return JSON.parse(String(row.value)) as CacheEntry;
      } catch {
        remove.run(key);
        return undefined;
      }
    },
    async set(key: string, entry: CacheEntry) {
      set.run(key, JSON.stringify(entry));
    },
    async delete(key: string) {
      remove.run(key);
    },

    /** Close after HTTP requests have drained. */
    close() {
      database.close();
    },
  });
}
