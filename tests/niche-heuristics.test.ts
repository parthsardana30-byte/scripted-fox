import { describe, expect, it } from "vitest";

import { inferNicheFromVideoTitles } from "@/lib/youtube/niche-heuristics";

describe("title-based YouTube niche inference", () => {
  it("recognizes PUBG gaming without relying on an AI provider", () => {
    expect(inferNicheFromVideoTitles([
      "WHEN YOU HAVE A HARAMI TEAMMATE || PUBG SHORTS",
      "PUBG A RAHA HAI",
      "CAMPER SE BADLA!! PUBG",
    ])).toBe("PUBG gaming");
  });

  it("does not confuse generic shorts metadata with AI content", () => {
    expect(inferNicheFromVideoTitles([
      "PUBG OP #short #shortforyou #myfirstshort",
    ])).toBe("PUBG gaming");
  });
});