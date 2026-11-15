import type { MetadataRoute } from "next";

const pages = [
  { path: "", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/how-it-works", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/pricing", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/video-plan", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/help", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/refund-policy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/cookies", changeFrequency: "yearly" as const, priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map(({ path, changeFrequency, priority }) => ({
    url: `https://scriptedfox.com${path}`,
    changeFrequency,
    priority,
  }));
}
