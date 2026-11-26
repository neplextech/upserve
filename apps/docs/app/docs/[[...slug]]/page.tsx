import { pageMetadata } from "../../../lib/metadata";
import { source } from "../../../lib/source";
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from "fumadocs-ui/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;

  const page = source.getPage(slug);
  if (!page) notFound();

  const Content = page.data.body;
  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <Content components={defaultMdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

/** Every documentation route gets its own title, canonical URL and social image. */
export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) notFound();

  return pageMetadata(
    page.data.title,
    page.data.description ?? "",
    page.url + (page.url.endsWith("/") ? "" : "/"),
    slug?.join("-") || "index",
  );
}
