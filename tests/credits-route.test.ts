// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireAuthenticatedUser: mocks.user, AuthenticationRequiredError: class extends Error {} }));
vi.mock("@/lib/db/pool", () => ({ databasePool: { query: mocks.query } }));
import { GET } from "@/app/api/billing/credits/route";
import { AuthenticationRequiredError } from "@/lib/auth/session";
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ id: "owner" }); });
it("returns only the authenticated user's spendable balance with no caching", async () => {
  mocks.query.mockResolvedValue({ rows: [{ credits_remaining: 80 }] });
  const response = await GET(); expect(await response.json()).toEqual({ credits: 80 });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("current_period_end > now()"), ["owner"]);
});
it("returns zero for missing or expired eligible accounts, never a demo balance", async () => {
  mocks.query.mockResolvedValue({ rows: [] }); expect(await (await GET()).json()).toEqual({ credits: 0 });
});
it("requires authentication before reading billing data", async () => {
  mocks.user.mockRejectedValue(new AuthenticationRequiredError());
  expect((await GET()).status).toBe(401); expect(mocks.query).not.toHaveBeenCalled();
});
it("reports unavailable rather than fabricating credits on database errors", async () => {
  mocks.query.mockRejectedValue(new Error("private db details"));
  const response = await GET(); expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "Credit balance unavailable." });
});
