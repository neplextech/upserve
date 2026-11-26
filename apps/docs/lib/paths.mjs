/** Build-time mount path, empty for a custom domain or local development. */
export const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

if (
  !/^(?:\/[a-zA-Z0-9._-]+)*$/.test(basePath) ||
  basePath.split("/").some((segment) => segment === "." || segment === "..")
) {
  throw new Error("NEXT_PUBLIC_BASE_PATH must be empty or a path such as /upserve");
}

/**
 * Prefix raw asset/fetch URLs. Next.js Link handles its own base path.
 * @param {string} path Absolute application-relative path.
 * @returns {string} Path relative to the hosting origin.
 */
export function withBasePath(path) {
  return basePath + path;
}
