import semver from "semver";
import { z } from "zod";
import { UpserveError } from "./errors.js";

/** Strict semantic version comparison including prerelease precedence. */
export function newer(candidate: string, current: string): boolean {
  if (!semver.valid(candidate) || !semver.valid(current))
    throw new UpserveError("invalid", "Expected a semantic version");
  return semver.gt(candidate, current);
}

/** Validate a semantic version without coercing arbitrary tags. */
export function validVersion(version: string): boolean {
  return semver.valid(version) !== null;
}

/** Sort versions descending, ignoring build metadata precedence. */
export function compareVersions(a: string, b: string): number {
  return semver.rcompare(a, b);
}

/** Safe identifier for configuration and route boundaries. */
export const identifier = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

/** Validate cached provider data before allowing it to replace last-known-good state. */
export const releaseSchema = z.object({
  id: z.string().min(1),
  tag: z.string().min(1),
  version: z.string().refine(validVersion),
  prerelease: z.boolean(),
  draft: z.boolean().optional(),
  yanked: z.boolean().optional(),
  notes: z.string().optional(),
  publishedAt: z.iso.datetime({ offset: true }).optional(),
  metadata: z.unknown().optional(),
  assets: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        size: z.number().int().nonnegative(),
        url: z.url(),
        aliases: z.array(z.url()).max(8).optional(),
        contentType: z.string().optional(),
      }),
    )
    .max(1000),
});

/** Read bounded metadata; cancel immediately on oversized or interrupted bodies. */
export async function readText(response: Response, maxBytes = 1024 * 1024): Promise<string> {
  if (!response.body) return "";

  const reader = response.body.getReader();

  const chunks: Uint8Array[] = [];

  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new UpserveError("invalid", "Metadata exceeds size limit");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);

  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(bytes);
}
