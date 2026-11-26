import type { Metadata } from "next";

/** Resolve sharing URLs at build time without inventing a production domain. */
const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const siteUrl = new URL(configuredUrl.replace(/\/+$/, "") + "/");

/** Social metadata for a statically exported page and its generated PNG. */
export function pageMetadata(
  title: string,
  description: string,
  route: string,
  image: string,
): Metadata {
  const canonical = new URL(route.replace(/^\//, ""), siteUrl).href;
  const socialImage = new URL(`og/${image}.png`, siteUrl).href;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: "Upserve",
      title: `${title} · Upserve`,
      description,
      url: canonical,
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: `${title} · Upserve`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · Upserve`,
      description,
      images: [socialImage],
    },
  };
}
