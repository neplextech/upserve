import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";

const files = (await readdir("content/docs")).filter((x) => x.endsWith(".mdx")).sort();
await mkdir("public", { recursive: true });
await writeFile(
  "public/llms.txt",
  "# Upserve\n\nSelf-hostable application update distribution.\n\n" +
    files
      .map(
        (x) =>
          "- [" +
          x.replace(".mdx", "") +
          "](/docs/" +
          x.replace(".mdx", "").replace("index", "") +
          ")",
      )
      .join("\n"),
);
await writeFile(
  "public/llms-full.txt",
  (await Promise.all(files.map((x) => readFile("content/docs/" + x, "utf8")))).join("\n\n"),
);
