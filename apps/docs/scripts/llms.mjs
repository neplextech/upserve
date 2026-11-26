import { withBasePath } from "../lib/paths.mjs";
import { readFile, mkdir, writeFile } from "node:fs/promises";

const navigation = JSON.parse(await readFile("content/docs/meta.json", "utf8"));
const pages = await Promise.all(
  navigation.pages
    .filter((slug) => !slug.startsWith("---"))
    .map(async (slug) => {
      const text = await readFile(`content/docs/${slug}.mdx`, "utf8");
      const title = text.match(/^title:\s*(.+)$/m)?.[1];
      const description = text.match(/^description:\s*(.+)$/m)?.[1];

      if (!title || !description) throw new Error(`Missing LLM metadata: ${slug}`);

      return { slug, text, title, description };
    }),
);

await mkdir("public", { recursive: true });

await writeFile(
  "public/llms.txt",
  "# Upserve\n\nSelf-hostable application update distribution.\n\n" +
    pages
      .map(({ slug, title, description }) => {
        const url = withBasePath("/docs/" + (slug === "index" ? "" : slug));

        return `- [${title}](${url}): ${description}`;
      })
      .join("\n") +
    "\n",
);

await writeFile("public/llms-full.txt", pages.map((page) => page.text).join("\n\n"));
