import { describe, expect, it } from "vitest";

import { decodeLandingIntent, encodeLandingIntent } from "@/lib/landing-intent";

describe("landing intent", () => {
  it("round-trips a valid creator prompt without putting it in the URL", () => {
    const prompt = "Compare free editing tools for Hindi and English YouTube creators";
    const encoded = encodeLandingIntent(prompt);

    expect(encoded).not.toContain("Compare");
    expect(decodeLandingIntent(encoded)).toBe(prompt);
  });

  it("ignores invalid or corrupted values", () => {
    expect(decodeLandingIntent("not-a-valid-prompt")).toBe("");
  });
});
