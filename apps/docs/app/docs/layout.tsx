import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "../../lib/source";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{ title: "Upserve", url: "/" }}
      links={[{ text: "GitHub", url: "https://github.com/neplextech/upserve", external: true }]}
    >
      {children}
    </DocsLayout>
  );
}
