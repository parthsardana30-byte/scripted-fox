import { describe, expect, it } from "vitest";

import { aiRequestSchema, canGenerateFromEmptyScript, scriptDraftSchema } from "@/lib/ai/types";

const emptyDraft = {
  title: "Untitled script",
  sections: [{ label: "Script", body: "" }],
};

describe("AI script request validation", () => {
  it("allows the content to determine the script structure", () => {
    expect(scriptDraftSchema.safeParse({
      title: "A short announcement",
      sections: [{ label: "Announcement", body: "One concise continuous script." }],
    }).success).toBe(true);
  });

  it("rejects generic generation without a topic", () => {
    const result = aiRequestSchema.safeParse({
      mode: "generate",
      title: "Untitled script",
      brief: "Write a full script using this title and my saved preferences.",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a topic supplied by either the title or the instruction", () => {
    expect(canGenerateFromEmptyScript("Five free editing tools compared", "Write a full script")).toBe(true);
    expect(canGenerateFromEmptyScript("Untitled script", "Write a video about testing five free editing tools")).toBe(true);
    expect(canGenerateFromEmptyScript("Untitled script", "Write about AI tools")).toBe(true);
    expect(canGenerateFromEmptyScript("Five free editing tools compared", "Add smoother transitions")).toBe(false);
  });

  it("rejects editing requests when the script has no content", () => {
    const result = aiRequestSchema.safeParse({
      mode: "assist",
      title: "Untitled script",
      instruction: "Add smoother transitions",
      draft: emptyDraft,
    });

    expect(result.success).toBe(false);
  });
});
