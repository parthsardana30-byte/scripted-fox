// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const completion = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai/groq", () => ({ createAiCompletion: completion, AiProviderError: class extends Error {} }));
import { generateIdeaRecommendations } from "@/lib/ai/ideas";

const input = {
  niche: "AI music", goal: "growth", languages: ["en"], markets: ["IN"],
  channelVideos: [{ id: "upload-1", title: "PUBG squad funny moments" }],
  channelSummary: "Previous uploads feature PUBG gameplay.", excludedTitles: [] as string[],
};
const titles = ["PUBG but every teammate swaps roles", "Can footsteps alone win a PUBG match?", "The PUBG rescue mission with no weapons", "Testing three PUBG landing routes", "PUBG hide and seek in the final circle"];
const ideas = () => titles.map((title, index) => ({ title, angle: "Film a PUBG gameplay experiment with your squad and explain the rules before starting.", format: ["Challenge", "Experiment", "Story", "Comparison", "Gameplay"][index], reason: "Your PUBG upload suggests this gaming subject fits your existing content.", sourceVideoId: "upload-1" }));
function respond(value = ideas()) { completion.mockResolvedValue({ content: JSON.stringify({ ideas: value }), provider: "groq", model: "test", inputTokens: 1, outputTokens: 1 }); }
beforeEach(() => { vi.resetAllMocks(); respond(); });
it("builds fresh concepts from own uploads, with upload topics taking precedence over a stale niche", async () => {
  expect((await generateIdeaRecommendations(input)).ideas).toHaveLength(5);
  const prompt = completion.mock.calls[0][0];
  expect(prompt.system).toContain("actual uploaded subjects take precedence");
  expect(prompt.user).toContain("PUBG squad funny moments");
  expect(prompt.user).not.toContain("Verified public YouTube signals");
});
it("refuses to invent personalized ideas without upload history", async () => {
  await expect(generateIdeaRecommendations({ ...input, channelVideos: [] })).rejects.toThrow("Upload history");
  expect(completion).not.toHaveBeenCalled();
});
it("rejects a copied title hidden inside a template wrapper", async () => {
  const result = ideas(); result[0].title = "What PUBG squad funny moments gets right"; respond(result);
  await expect(generateIdeaRecommendations(input)).rejects.toThrow("novelty");
  expect(completion).toHaveBeenCalledTimes(2);
});
it("rejects fabricated source uploads", async () => {
  const result = ideas(); result[0].sourceVideoId = "external-trending-video"; respond(result);
  await expect(generateIdeaRecommendations(input)).rejects.toThrow("novelty");
});
it("rejects repeated recommendations and duplicate concepts in one batch", async () => {
  await expect(generateIdeaRecommendations({ ...input, excludedTitles: [titles[0]] })).rejects.toThrow("novelty");
  const result = ideas(); result[1].title = result[0].title; respond(result);
  await expect(generateIdeaRecommendations(input)).rejects.toThrow("novelty");
});
it("repairs an invalid first completion without using template fallbacks", async () => {
  completion.mockResolvedValueOnce({ content: "invalid JSON" });
  expect((await generateIdeaRecommendations(input)).ideas).toHaveLength(5);
  expect(completion).toHaveBeenCalledTimes(2);
});
