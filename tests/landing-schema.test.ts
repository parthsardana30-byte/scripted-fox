import { describe, expect, it } from "vitest";
import { ideaSchema } from "@/lib/landing-schema";

describe("ideaSchema", () => {
  it("rejects empty and unreasonably short ideas", () => {
    expect(ideaSchema.safeParse({ idea: "" }).success).toBe(false);
    expect(ideaSchema.safeParse({ idea: "A video" }).success).toBe(false);
  });

  it("accepts a specific video idea", () => {
    const result = ideaSchema.safeParse({ idea: "Compare five free editing tools on the same short video" });
    expect(result.success).toBe(true);
  });
});
