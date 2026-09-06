import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/dashboard/",
        "/connect",
        "/create",
        "/video-plan",
        "/ui-preview",
        "/sign-in",
        "/sign-up",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: "https://scriptedfox.com/sitemap.xml",
    host: "https://scriptedfox.com",
  };
}