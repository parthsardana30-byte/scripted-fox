// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/pool", () => ({ databasePool: { query } }));
import { consumeCredits, refundCredits } from "@/lib/billing/credits";
beforeEach(() => query.mockReset());
describe("credit mutation guardrails", () => {
  it.each([-1, 0, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid amount %s before SQL", async amount => {
    await expect(consumeCredits("owner", amount)).rejects.toThrow(RangeError);
    await expect(refundCredits("owner", amount)).rejects.toThrow(RangeError);
    expect(query).not.toHaveBeenCalled();
  });
  it("reports insufficient balance without a successful debit", async () => {
    query.mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rowCount: 1 });
    expect(await consumeCredits("owner", 5)).toBe(false);
    expect(await consumeCredits("owner", 1)).toBe(true);
  });
});
