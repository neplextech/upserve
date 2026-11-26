import type { Metadata } from "next";

/** Resolve sharing URLs at build time without inventing a production domain. */
export const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

/** Social metadata for a statically exported page and its generated PNG. */
export function pageMetadata(
  title: string,
  description: string,
  route: string,
  image: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: route },
    openGraph: {
      type: "website",
      siteName: "Upserve",
      title: `${title} · Upserve`,
      description,
      url: route,
      images: [
        {
          url: `/og/${image}.png`,
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
      images: [`/og/${image}.png`],
    },
  };
}
