// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/pool", () => ({ databasePool: { query } }));
import { createDatabaseClient } from "@/lib/db/client";

beforeEach(() => query.mockReset().mockResolvedValue({ rows: [{ id: "one" }], rowCount: 1 }));
describe("database query compatibility", () => {
  it("executes an awaited mutation only once, with stable parameter bindings", async () => {
    const mutation = createDatabaseClient().from("ideas").update({ status: "saved" }).eq("id", "one");
    const [first, second] = await Promise.all([mutation, mutation]);
    expect(first).toEqual(second);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('"status" = $2 WHERE "id" = $1'), ["one", "saved"]);
    await mutation;
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("handles nullable filters without binding SQL NULL to equality", async () => {
    await createDatabaseClient().from("projects").select("id").eq("archived_at", null).eq("user_id", "owner");
    expect(query).toHaveBeenCalledWith(expect.stringContaining('"archived_at" IS NULL AND "user_id" = $1'), ["owner"]);
  });
  it("does not order or limit an aggregate count", async () => {
    query.mockResolvedValue({ rows: [{ count: 8 }], rowCount: 1 });
    const result = await createDatabaseClient().from("ideas").select("id", { count: "exact", head: true }).order("created_at").limit(0);
    expect(result).toEqual({ data: null, error: null, count: 8 });
    expect(query.mock.calls[0][0]).not.toMatch(/ORDER BY|LIMIT/);
  });
  it("returns rows and the unpaginated count when both are requested", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: "one" }], rowCount: 1 }).mockResolvedValueOnce({ rows: [{ count: 7 }], rowCount: 1 });
    const result = await createDatabaseClient().from("ideas").select("id", { count: "exact" }).eq("user_id", "owner").limit(1);
    expect(result).toEqual({ data: [{ id: "one" }], error: null, count: 7 });
    expect(query.mock.calls[1]).toEqual(['SELECT COUNT(*)::int AS count FROM "ideas" WHERE "user_id" = $1', ["owner"]]);
  });
  it("treats an empty batch as a no-op", async () => {
    expect(await createDatabaseClient().from("ideas").insert([])).toEqual({ data: [], error: null, count: 0 });
    expect(query).not.toHaveBeenCalled();
  });
  it("rejects nonfinite limits and unsafe identifiers", () => {
    expect(() => createDatabaseClient().from("ideas").limit(Infinity)).toThrow();
    expect(() => createDatabaseClient().from("ideas; DROP TABLE ideas")).toThrow();
  });
});
