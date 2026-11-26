import { codeToHtml } from "shiki";

/** Render highlighted code at build time; no highlighting engine is shipped to the browser. */
export async function Code({ code, language = "typescript" }: { code: string; language?: string }) {
  const html = await codeToHtml(code, {
    lang: language,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });

  return <div className="highlighted-code" dangerouslySetInnerHTML={{ __html: html }} />;
}
