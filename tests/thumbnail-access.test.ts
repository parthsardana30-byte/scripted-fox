// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const access = vi.hoisted(() => vi.fn());
vi.mock("@/lib/billing/access", () => ({ getBillingAccess: access }));
import { canUseThumbnailStudio } from "@/lib/thumbnails/access";
it.each([
  ["free", "free", 1, false], ["pro", "active", 1, false], ["pro", "trialing", 1, false],
  ["elite", "active", 1, true], ["elite", "active", -1, false], ["elite", "past_due", 1, false],
  ["elite", "canceled", 1, false], ["elite", "trialing", 1, false],
])("gates %s/%s with expiry offset %s", async (plan, status, days, allowed) => {
  access.mockResolvedValue({ plan, status, currentPeriodEnd: new Date(Date.now() + Number(days) * 86400000).toISOString() });
  expect(await canUseThumbnailStudio("owner")).toBe(allowed);
});
