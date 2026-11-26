import { basePath } from "./lib/paths.mjs";
import { createMDX } from "fumadocs-mdx/next";

export default createMDX()({
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
});
