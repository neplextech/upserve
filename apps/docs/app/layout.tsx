import "./global.css";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";

export const metadata = {
  title: { default: "Upserve · Neplex Technologies", template: "%s · Upserve" },
  description:
    "Application updates, served on your terms. A self-hostable update server for Tauri, Electron, Android and custom clients.",
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
