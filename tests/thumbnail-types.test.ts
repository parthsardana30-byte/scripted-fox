import { describe, expect, it } from "vitest";
import { thumbnailDay, thumbnailRequestSchema } from "@/lib/thumbnails/types";

const valid = { requestId: "7798c7a9-f373-424d-8ea2-d3eb7f768576", maxCost: 0, topic: "Gaming phones" };
describe("thumbnail requests and daily allowance", () => {
  it("resets at midnight IST, not the server timezone", () => {
    expect(thumbnailDay(new Date("2026-10-09T18:29:59Z"))).toEqual({ day: "2026-10-09", resetsAt: "2026-10-09T18:30:00.000Z" });
    expect(thumbnailDay(new Date("2026-10-09T18:30:00Z"))).toEqual({ day: "2026-10-10", resetsAt: "2026-10-10T18:30:00.000Z" });
  });
  it("accepts a topic without photos", () => expect(thumbnailRequestSchema.parse(valid).photos).toEqual([]));
  it("requires an explicit free or ten-credit maximum", () => {
    expect(thumbnailRequestSchema.safeParse({ ...valid, maxCost: undefined }).success).toBe(false);
    expect(thumbnailRequestSchema.safeParse({ ...valid, maxCost: -10 }).success).toBe(false);
  });
  it("rejects excess photos, SVG and long briefs", () => {
    const photo = { mimeType: "image/png", data: "aGVsbG8=" };
    expect(thumbnailRequestSchema.safeParse({ ...valid, photos: Array(4).fill(photo) }).success).toBe(false);
    expect(thumbnailRequestSchema.safeParse({ ...valid, photos: [{ ...photo, mimeType: "image/svg+xml" }] }).success).toBe(false);
    expect(thumbnailRequestSchema.safeParse({ ...valid, topic: "x".repeat(1001) }).success).toBe(false);
  });
});
