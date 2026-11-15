import { describe, expect, it } from "vitest";

import { relevanceScore, scoreTrendVideos, selectDiverseTrends } from "@/lib/youtube/trend-scoring";

describe("YouTube trend scoring", () => {
  it("keeps the rising/breakout mix, deduplicates titles and does not mutate input", () => {
    const videos = [
      { id: "r1", title: "Orchid garden tour", channelTitle: "A", score: 10, outlook: "rising-now" as const },
      { id: "duplicate-title", title: "Orchid garden tour!", channelTitle: "B", score: 9, outlook: "rising-now" as const },
      { id: "r2", title: "Volcano lava expedition", channelTitle: "C", score: 8, outlook: "rising-now" as const },
      { id: "b1", title: "Mechanical keyboard repair", channelTitle: "D", score: 90, outlook: "breakout-candidate" as const },
      { id: "s1", title: "Sourdough baking technique", channelTitle: "E", score: 100, outlook: "steady" as const },
    ];
    const original = structuredClone(videos);
    expect(selectDiverseTrends(videos, 4).map(video => video.id)).toEqual(["r1", "r2", "b1", "s1"]);
    expect(videos).toEqual(original);
    expect(selectDiverseTrends(videos, 0)).toEqual([]);
  });
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

  it("rejects broad viral videos from a piano-cover trend feed", () => {
    expect(relevanceScore("Piano covers", "I 3D Printed a Traffic Light Clicker ASMR")).toBe(0);
    expect(relevanceScore("Piano covers", "Interstellar piano cover tutorial")).toBeGreaterThanOrEqual(0.5);
  });

  it("rewards videos outperforming their channel size", () => {
    const now = new Date("2026-08-25T12:00:00.000Z");
    const ranked = scoreTrendVideos([
      {
        id: "breakout", title: "Piano cover", channelTitle: "Small channel", channelSubscribers: 1_000,
        publishedAt: "2026-08-24T12:00:00.000Z", views: 20_000, likes: 1_000, comments: 100,
        market: "IN", language: "en", discovery: "search",
      },
      {
        id: "large", title: "Piano cover tutorial", channelTitle: "Large channel", channelSubscribers: 1_000_000,
        publishedAt: "2026-08-24T12:00:00.000Z", views: 25_000, likes: 1_000, comments: 100,
        market: "IN", language: "en", discovery: "search",
      },
    ], now);

    expect(ranked[0].id).toBe("breakout");
    expect(ranked[0].audienceBreakout).toBe(20);
  });

  it("rotates recently shown videos and limits channel repetition", () => {
    const videos = [
      { id: "seen", title: "Piano cover one", channelTitle: "A", score: 100, outlook: "steady" as const },
      { id: "a2", title: "Piano tutorial two", channelTitle: "A", score: 95, outlook: "steady" as const },
      { id: "a3", title: "Piano lesson three", channelTitle: "A", score: 90, outlook: "steady" as const },
      { id: "b1", title: "Keyboard arrangement", channelTitle: "B", score: 80, outlook: "steady" as const },
      { id: "c1", title: "Song cover analysis", channelTitle: "C", score: 75, outlook: "steady" as const },
    ];

    const selected = selectDiverseTrends(videos, 4, new Set(["seen"]));
    expect(selected[0].id).not.toBe("seen");
    expect(selected.filter((video) => video.channelTitle === "A")).toHaveLength(2);
  });
});
