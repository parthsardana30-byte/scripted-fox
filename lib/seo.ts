import type { Metadata } from "next";

const brandName = "Scripted Fox";
const socialImage = "/scripted-fox-email-logo.png";

export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: `/${string}` | "/";
}): Metadata {
  const socialTitle = `${title} · ${brandName}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description,
      url: path,
      siteName: brandName,
      type: "website",
      images: [{ url: socialImage, width: 512, height: 512, alt: brandName }],
    },
    twitter: {
      card: "summary",
      title: socialTitle,
      description,
      images: [socialImage],
    },
  };
}
