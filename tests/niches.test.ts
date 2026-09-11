import { describe, expect, it } from "vitest";

import { closestNiche, rankedNiches } from "@/lib/youtube/niches";

describe("creator niche catalogue", () => {
  it("keeps the inferred niche and its neighbours at the front initially", () => {
    expect(rankedNiches("", "piano-covers").slice(0, 4).map((niche) => niche.label)).toEqual([
      "Piano Covers", "Music", "Music Production", "Music Reviews",
    ]);
  });

  it("ranks music matches ahead of unrelated choices for a partial query", () => {
    expect(rankedNiches("mu", "piano-covers").slice(0, 4).map((niche) => niche.label)).toEqual([
      "Music", "Music Reviews", "Music Production", "Musical Instruments",
    ]);
  });

  it("maps an AI suggestion onto a controlled catalogue value", () => {
    expect(closestNiche("piano instrumental covers").id).toBe("piano-covers");
  });
});
