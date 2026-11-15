// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({ serverEnvironment: { THUMBNAIL_API_KEY: "test-only", THUMBNAIL_MODEL: "gemini-2.5-flash-image" } }));
import { decodeImage, generateThumbnail } from "@/lib/thumbnails/provider";
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aBqkAAAAASUVORK5CYII=";
const input = { requestId: "7798c7a9-f373-424d-8ea2-d3eb7f768576", maxCost: 0 as const, topic: "Gaming", headline: "WINNER", style: "bold" as const, photos: [] };
afterEach(() => vi.unstubAllGlobals());
it("rejects disguised HTML and oversized images", () => {
  expect(() => decodeImage(Buffer.from("<html>not an image</html>").toString("base64"), "image/png")).toThrow();
  expect(() => decodeImage(png, "image/png", 2)).toThrow();
  expect(decodeImage(png, "image/png").length).toBeGreaterThan(8);
});
it("uses the image model and includes uploaded reference photos", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ candidates: [{ content: { parts: [{ inlineData: { data: png, mimeType: "image/png" } }] } }] }));
  vi.stubGlobal("fetch", fetcher);
  const result = await generateThumbnail({ ...input, photos: [{ mimeType: "image/png", data: png }] });
  expect(result.mime).toBe("image/png");
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.generationConfig.imageConfig.aspectRatio).toBe("16:9");
  expect(body.contents[0].parts[1].inlineData.data).toBe(png);
});
it("fails on safety/no-image responses instead of billing for text", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ candidates: [{ content: { parts: [{ text: "Cannot generate" }] } }] })));
  await expect(generateThumbnail(input)).rejects.toThrow("No image was generated");
});
it("does not expose upstream errors or credentials", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("secret upstream details", { status: 403 })));
  await expect(generateThumbnail(input)).rejects.toThrow("The image service is unavailable");
});
it("explains Gemini quota failures without exposing provider details", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private quota details", { status: 429 })));
  await expect(generateThumbnail(input)).rejects.toThrow("usage limit");
});
