import { describe, expect, it } from "vitest";

import { relevanceScore, scoreTrendVideos } from "@/lib/youtube/trend-scoring";

describe("YouTube trend scoring", () => {
  it("ranks recent high-velocity videos above older slow videos", () => {
    const now = new Date("2026-08-25T12:00:00.000Z");
    const ranked = scoreTrendVideos([
      {
        id: "fast",
        title: "Fast video editing workflow",
        channelTitle: "Creator A",
        publishedAt: "2026-08-24T12:00:00.000Z",
        views: 50_000,
        likes: 4_000,
        comments: 400,
        market: "IN",
        language: "en",
        discovery: "search",
      },
      {
        id: "slow",
        title: "Old editing workflow",
        channelTitle: "Creator B",
        publishedAt: "2026-08-05T12:00:00.000Z",
        views: 10_000,
        likes: 200,
        comments: 20,
        market: "IN",
        language: "en",
        discovery: "search",
      },
    ], now);

    expect(ranked[0].id).toBe("fast");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("matches scripts to trend titles by meaningful topic words", () => {
    expect(relevanceScore("How to edit YouTube videos faster", "My fastest video editing workflow")).toBeGreaterThan(0);
    expect(relevanceScore("Budget camera guide", "How to write a better hook")).toBe(0);
  });
});
