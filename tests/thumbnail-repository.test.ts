// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
const mocks = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/pool", () => ({ databasePool: { query: mocks.query, connect: async () => ({ query: mocks.query, release: mocks.release }) } }));
vi.mock("@/lib/env/server", () => ({ serverEnvironment: {} }));
import { completeThumbnail, failThumbnail, reserveThumbnail, thumbnailImage } from "@/lib/thumbnails/repository";
const input = { requestId: "7798c7a9-f373-424d-8ea2-d3eb7f768576", maxCost: 10 as const, topic: "Gaming phones", headline: "", style: "bold" as const, photos: [] };
type Row = Record<string, unknown>;
const rows = (values: Row[] = []) => ({ rows: values, rowCount: values.length });
let freeUsed = false;
let enoughCredits = true;
beforeEach(() => {
  vi.clearAllMocks(); freeUsed = false; enoughCredits = true;
  mocks.query.mockImplementation(async (sql: string) => {
    if (sql.includes("count(*)")) return rows([{ count: 0 }]);
    if (sql.includes("cost = 0 AND status = 'succeeded'")) return rows(freeUsed ? [{}] : []);
    if (sql.includes("credits_remaining = credits_remaining -")) return rows(enoughCredits ? [{ period_end: new Date("2027-01-01") }] : []);
    return rows();
  });
});
it("reserves the first daily image without touching credits", async () => {
  expect(await reserveThumbnail("owner", input)).toMatchObject({ fresh: true, cost: 0 });
  expect(mocks.query.mock.calls.some(([sql]) => sql.includes("credits_remaining = credits_remaining -"))).toBe(false);
  const insert = mocks.query.mock.calls.find(([sql]) => sql.includes("INSERT INTO thumbnail_jobs"));
  expect(insert?.[1][1]).toBe("owner"); expect(insert?.[1][5]).toBe(0);
  expect(mocks.query).toHaveBeenLastCalledWith("COMMIT");
});
it("reserves exactly ten credits after the free image", async () => {
  freeUsed = true;
  expect(await reserveThumbnail("owner", input)).toMatchObject({ cost: 10 });
  const debit = mocks.query.mock.calls.find(([sql]) => sql.includes("credits_remaining = credits_remaining -"));
  expect(debit?.[1]).toEqual(["owner", 10]);
  expect(debit?.[0]).toContain("credits_remaining >= $2");
});
it("never silently changes a zero-credit quote into a paid request", async () => {
  freeUsed = true;
  await expect(reserveThumbnail("owner", { ...input, maxCost: 0 })).rejects.toThrow("Refresh to confirm");
  expect(mocks.query.mock.calls.some(([sql]) => sql.includes("credits_remaining = credits_remaining -"))).toBe(false);
});
it("rolls back insufficient credits without starting a job", async () => {
  freeUsed = true; enoughCredits = false;
  await expect(reserveThumbnail("owner", input)).rejects.toThrow("need 10 Fox Credits");
  expect(mocks.query).toHaveBeenLastCalledWith("ROLLBACK");
  expect(mocks.query.mock.calls.some(([sql]) => sql.includes("INSERT INTO thumbnail_jobs"))).toBe(false);
});
it("rolls back a debit if writing the reservation fails", async () => {
  freeUsed = true;
  const implementation = mocks.query.getMockImplementation()!;
  mocks.query.mockImplementation(async (sql: string, ...args: unknown[]) => {
    if (sql.includes("INSERT INTO thumbnail_jobs")) throw new Error("storage failed");
    return implementation(sql, ...args);
  });
  await expect(reserveThumbnail("owner", input)).rejects.toThrow("storage failed");
  expect(mocks.query).toHaveBeenLastCalledWith("ROLLBACK");
  expect(mocks.release).toHaveBeenCalledTimes(2);
});
it("refunds only the row transitioned from pending and fences billing periods", async () => {
  let pending = true;
  mocks.query.mockImplementation(async (sql: string) => {
    if (sql.includes("RETURNING id, cost")) { const result = rows(pending ? [{ cost: 10, billed_period_end: null }] : []); pending = false; return result; }
    return rows();
  });
  await failThumbnail("owner", input.requestId); await failThumbnail("owner", input.requestId);
  const refunds = mocks.query.mock.calls.filter(([sql]) => sql.includes("credits_remaining = credits_remaining +"));
  expect(refunds).toHaveLength(1);
  expect(refunds[0][0]).toContain("IS NOT DISTINCT FROM");
});
it("cannot complete an already expired/refunded job", async () => {
  await expect(completeThumbnail("owner", input.requestId, { bytes: Buffer.from("image"), mime: "image/png" })).rejects.toThrow("expired");
  expect(mocks.query).toHaveBeenLastCalledWith("ROLLBACK");
});
it("always scopes stored images to the authenticated owner", async () => {
  expect(await thumbnailImage("another-user", input.requestId)).toBeUndefined();
  expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("user_id = $1 AND id = $2"), ["another-user", input.requestId]);
});
it("rejects an expired stored result without charging for it again", async () => {
  mocks.query.mockImplementation(async (sql: string) => sql.includes("AS available") ? rows([{
    request_hash: createHash("sha256").update(JSON.stringify(input)).digest("hex"),
    status: "succeeded", cost: 10, available: false,
  }]) : rows());
  await expect(reserveThumbnail("owner", input)).rejects.toMatchObject({ status: 410 });
  expect(mocks.query.mock.calls.some(([sql]) => sql.includes("credits_remaining = credits_remaining -"))).toBe(false);
});
