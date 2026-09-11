import { describe, expect, it } from "vitest";

import { buildEvidenceBackedFallbackRecommendations } from "@/lib/ideas/fallback";

describe("initial Daily Topics fallback", () => {
  it("creates five varied, evidence-linked topics without an AI completion", () => {
    const ideas = buildEvidenceBackedFallbackRecommendations({
      niche: "Piano covers",
      trendSignals: [
        { id: "video-1", title: "A cinematic piano arrangement" },
        { id: "video-2", title: "How this melody was reharmonized" },
        { id: "video-3", title: "One take studio performance" },
      ],
    });

    expect(ideas).toHaveLength(5);
    expect(new Set(ideas.map((idea) => idea.format)).size).toBe(5);
    expect(ideas.every((idea) => ["video-1", "video-2", "video-3"].includes(idea.trendVideoId))).toBe(true);
    expect(ideas.every((idea) => idea.title.includes("Piano covers") || idea.title.includes("What to test next"))).toBe(true);
  });
});
