import "./global.css";
import { RootProvider } from "fumadocs-ui/provider/next";
import { siteUrl, pageMetadata } from "../lib/metadata";
import type { ReactNode } from "react";

export const metadata = {
  ...pageMetadata(
    "Application update server",
    "An extensible, self-hostable update server for desktop and mobile applications.",
    "/",
    "home",
  ),
  metadataBase: siteUrl,
  title: { default: "Upserve · Application update server", template: "%s · Upserve" },
  icons: { icon: "/icon.svg" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider search={{ options: { type: "static" } }}>{children}</RootProvider>
      </body>
    </html>
  );
}
