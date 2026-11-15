// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ generate: vi.fn(), consume: vi.fn(), refund: vi.fn(), query: vi.fn(), user: vi.fn(), cached: [] as unknown[], history: true }));
vi.mock("@/lib/ai/groq", () => ({ AiConfigurationError: class extends Error {}, AiProviderError: class extends Error {} }));
vi.mock("@/lib/ai/ideas", () => ({ generateIdeaRecommendations: m.generate }));
vi.mock("@/lib/ai/niche", () => ({ inferCreatorNiche: vi.fn().mockResolvedValue("Gaming") }));
vi.mock("@/lib/auth/session", () => ({ requireAuthenticatedUser: m.user, AuthenticationRequiredError: class extends Error {} }));
vi.mock("@/lib/security/origin", () => ({ isTrustedSameOriginRequest: () => true }));
vi.mock("@/lib/billing/access", () => ({ getBillingAccess: async () => ({ plan: "pro" }), hasBillingFeature: () => true }));
vi.mock("@/lib/billing/credits", () => ({ consumeCredits: m.consume, refundCredits: m.refund }));
vi.mock("@/lib/db/pool", () => ({ databasePool: { connect: async () => ({ query: m.query, release: () => {} }) } }));
vi.mock("@/lib/db/client", () => ({ createClient: () => ({ from: (table: string) => {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "gte", "order", "limit", "maybeSingle"]) chain[method] = () => chain;
  chain.then = (resolve: (value: unknown) => unknown) => resolve({ count: 0, data:
    table === "channel_snapshots" ? { metrics: { summary: { views: 12, watchTimeMinutes: 4, averageViewDurationSeconds: 20 }, topVideos: [], recentVideos: m.history ? [{ title: "PUBG squad funny moments" }] : [] } }
    : table === "user_preferences" ? { default_script_preferences: { channelNiche: "Gaming" }, content_languages: ["en"], target_markets: ["IN"] }
    : table === "usage_events" ? m.cached : [] });
  return chain;
} }) }));
import { POST } from "@/app/api/ideas/recommendations/route";
import { AiProviderError } from "@/lib/ai/groq";
const request = (initialSetup = false) => new Request("https://scriptedfox.com/api/ideas/recommendations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initialSetup }) });
beforeEach(() => {
  vi.clearAllMocks(); m.cached = []; m.history = true;
  m.user.mockResolvedValue({ id: "owner" }); m.consume.mockResolvedValue(true); m.refund.mockResolvedValue(undefined);
  m.generate.mockResolvedValue({ ideas: Array.from({ length: 5 }, (_, i) => ({ title: `A fresh PUBG challenge ${i}`, angle: "Try a squad gameplay experiment", format: "Challenge", reason: "Based on your gaming uploads", sourceVideoId: "upload-1" })), completion: { provider: "groq", model: "test", inputTokens: 1, outputTokens: 1 } });
});
it.each([false, true])("uses own uploads for both refresh and initial setup (%s)", async (initial) => {
  const response = await POST(request(initial)); expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.ideas[0].evidence).toEqual([{ label: "Based on your upload history", value: "PUBG squad funny moments", source: "Your channel" }]);
  const context = m.generate.mock.calls[0][0];
  expect(context.channelVideos).toEqual([{ id: "upload-1", title: "PUBG squad funny moments" }]);
  expect(context).not.toHaveProperty("trendSignals");
  expect(m.query).toHaveBeenCalledWith("COMMIT");
});
it("does not charge or call AI when uploads are missing", async () => {
  m.history = false; expect((await POST(request())).status).toBe(409);
  expect(m.consume).not.toHaveBeenCalled(); expect(m.generate).not.toHaveBeenCalled();
});
it("refunds generation failure instead of returning copied trend templates", async () => {
  m.generate.mockRejectedValueOnce(new AiProviderError("provider failed"));
  expect((await POST(request(true))).status).toBe(503);
  expect(m.refund).toHaveBeenCalledWith("owner", 5); expect(m.query).not.toHaveBeenCalled();
});
it("invalidates legacy trend-based batches", async () => {
  m.cached = [{ metadata: { algorithmVersion: "niche-v3", recommendations: [] } }];
  expect((await POST(request())).status).toBe(200); expect(m.generate).toHaveBeenCalledTimes(1);
});
it.each([429, 403])("shows a safe actionable provider failure (%s)", async (status) => {
  m.generate.mockRejectedValueOnce(Object.assign(new AiProviderError("private provider details"), { status }));
  const response = await POST(request());
  expect(response.status).toBe(503);
  const body = await response.json();
  expect(body.error).toContain(status === 429 ? "usage limit" : "provider access");
  expect(body.error).not.toContain("private provider details");
  expect(m.refund).toHaveBeenCalledWith("owner", 5);
});
