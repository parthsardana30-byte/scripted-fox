// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), transactionQuery: vi.fn(), release: vi.fn(), authenticate: vi.fn(), trusted: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ requireAuthenticatedUser: mocks.authenticate, AuthenticationRequiredError: class extends Error {} }));
vi.mock("@/lib/security/origin", () => ({ isTrustedSameOriginRequest: mocks.trusted }));
vi.mock("@/lib/billing/access", () => ({ getBillingAccess: async () => ({ plan: "pro" }) }));
vi.mock("@/lib/db/pool", () => ({ databasePool: { query: mocks.query, connect: async () => ({ query: mocks.transactionQuery, release: mocks.release }) } }));
import { POST } from "@/app/api/projects/route";
const document = { title: "Test", author: "", draft: { title: "Test", sections: [{ label: "Script", body: "Test content" }] } };
const body = { document, versions: [{ number: 1, label: "First", origin: "initial", createdAt: "2026-10-05T00:00:00.000Z", snapshot: document }] };
function request(value: string) { return new Request("https://example.test/api/projects", { method: "POST", body: value }); }
beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticate.mockResolvedValue({ id: "owner" });
  mocks.trusted.mockReturnValue(true);
  mocks.query.mockResolvedValue({ rows: [{ count: 1 }] });
  mocks.transactionQuery.mockResolvedValue({ rows: [{ id: "script-id" }], rowCount: 1 });
});
describe("project save route boundaries", () => {
  it("rejects an untrusted origin before any database work", async () => {
    mocks.trusted.mockReturnValue(false);
    expect((await POST(request(JSON.stringify(body)))).status).toBe(403);
    expect(mocks.authenticate).not.toHaveBeenCalled();
  });
  it("returns 400 for broken JSON, not a server failure", async () => {
    expect((await POST(request("{"))).status).toBe(400);
    expect(mocks.transactionQuery).not.toHaveBeenCalled();
  });
  it("rejects oversized bodies without a length header", async () => {
    expect((await POST(request('"' + "x".repeat(250_000) + '"'))).status).toBe(413);
    expect(mocks.transactionQuery).not.toHaveBeenCalled();
  });
  it("rejects duplicate version numbers before starting a transaction", async () => {
    expect((await POST(request(JSON.stringify({ ...body, versions: [body.versions[0], body.versions[0]] })))).status).toBe(400);
    expect(mocks.transactionQuery).not.toHaveBeenCalled();
  });
  it("does not write a script when the owned project does not exist", async () => {
    mocks.transactionQuery.mockImplementation(async (sql: string) => ({ rows: [], rowCount: sql.startsWith("UPDATE projects") ? 0 : 1 }));
    const response = await POST(request(JSON.stringify({ ...body, projectId: "a3907952-786d-44f5-b55c-83c7e0b68b11" })));
    expect(response.status).toBe(404);
    expect(mocks.transactionQuery.mock.calls.map(call => call[0]).join(" ")).not.toContain("INSERT INTO scripts");
    expect(mocks.transactionQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.release).toHaveBeenCalledOnce();
  });
  it("commits a complete save in constant database round trips", async () => {
    const response = await POST(request(JSON.stringify(body)));
    expect(response.status).toBe(200);
    expect(mocks.transactionQuery).toHaveBeenCalledTimes(6);
    expect(mocks.transactionQuery).toHaveBeenLastCalledWith("COMMIT");
    expect(mocks.release).toHaveBeenCalledOnce();
  });
});
