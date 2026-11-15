// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), transactionQuery: vi.fn(), release: vi.fn(), verify: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/pool", () => ({ databasePool: { query: mocks.query, connect: async () => ({ query: mocks.transactionQuery, release: mocks.release }) } }));
vi.mock("@/lib/billing/payu", () => ({ getPayuConfiguration: () => ({ key: "test-key", salt: "test-salt" }), verifyPayuPayment: mocks.verify }));
vi.mock("@/lib/billing/payu-signature", () => ({ verifyPayuResponseHash: () => true }));
import { processPayuResponse } from "@/lib/billing/payu-payment";
const payload = { key: "test-key", txnid: "txn", status: "success", amount: "50.00", productinfo: "Pro", email: "test@example.test", firstname: "Test", phone: "9999999999", mihpayid: "provider-id" };
const payment = { user_id: "owner", plan_code: "pro", billing_period: "monthly", amount_inr: "50.00", product_info: "Pro", customer_email: payload.email, customer_firstname: payload.firstname, customer_phone: payload.phone, status: "pending" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockResolvedValue({ rows: [payment] });
  mocks.transactionQuery.mockResolvedValue({ rows: [] });
  mocks.verify.mockResolvedValue({ verified: true, details: { amount: "50.00", mihpayid: "provider-id" } });
});
describe("payment callback ordering", () => {
  it("adds a verified pack once without replacing the plan or extending expiry", async () => {
    const topup = { ...payment, amount_inr: "29.00", credit_pack_id: "starter", credit_amount: 50, credit_period_end: new Date("2027-01-01") };
    mocks.query.mockResolvedValue({rows:[topup]});
    mocks.verify.mockResolvedValue({ verified:true, details:{amount:"29.00",mihpayid:"provider-id"} });
    mocks.transactionQuery.mockImplementation(async (sql: string) => sql.includes("FOR UPDATE") ? {rows:[{status:"created"}]} : {rows:[],rowCount:1});
    expect(await processPayuResponse({...payload,amount:"29.00"})).toEqual({status:"success",plan:"pro",creditPack:"starter"});
    const update=mocks.transactionQuery.mock.calls.find(([sql])=>sql.includes("credits_remaining = credits_remaining +"));
    expect(update?.[1]).toEqual(["owner",50,topup.credit_period_end]);
    expect(mocks.transactionQuery.mock.calls.some(([sql])=>sql.includes("INSERT INTO billing_accounts"))).toBe(false);
  });
  it("does not double-add credits when another callback won the row lock", async () => {
    mocks.query.mockResolvedValue({rows:[{...payment,amount_inr:"29.00",credit_pack_id:"starter",credit_amount:50,credit_period_end:new Date("2027-01-01")}]});
    mocks.verify.mockResolvedValue({verified:true,details:{amount:"29.00",mihpayid:"provider-id"}});
    mocks.transactionQuery.mockResolvedValue({rows:[{status:"paid"}]});
    expect((await processPayuResponse({...payload,amount:"29.00"})).status).toBe("success");
    expect(mocks.transactionQuery.mock.calls.some(([sql])=>sql.includes("credits_remaining = credits_remaining +"))).toBe(false);
  });
  it("holds a verified pack for review if the purchased plan period has expired", async () => {
    mocks.query.mockResolvedValue({rows:[{...payment,amount_inr:"29.00",credit_pack_id:"starter",credit_amount:50,credit_period_end:new Date("2026-01-01")}]});
    mocks.verify.mockResolvedValue({verified:true,details:{amount:"29.00",mihpayid:"provider-id"}});
    mocks.transactionQuery.mockImplementation(async (sql: string) => sql.includes("FOR UPDATE") ? {rows:[{status:"created"}]} : {rows:[],rowCount:0});
    expect((await processPayuResponse({...payload,amount:"29.00"})).status).toBe("pending");
    expect(mocks.transactionQuery.mock.calls.some(([sql])=>sql.includes("pending_credit_review"))).toBe(true);
    expect(mocks.transactionQuery.mock.calls.some(([sql])=>sql.includes("status = 'paid'"))).toBe(false);
  });
  it("never allows a late failure update to downgrade a committed paid payment", async () => {
    await processPayuResponse({ ...payload, status: "failure" });
    expect(mocks.query.mock.calls[1][0]).toContain("AND status <> 'paid'");
  });
  it("does not grant billing access when a payment disappeared before locking", async () => {
    expect(await processPayuResponse(payload)).toEqual({ status: "invalid" });
    expect(mocks.transactionQuery.mock.calls.map(call => call[0]).join(" ")).not.toContain("INSERT INTO billing_accounts");
    expect(mocks.transactionQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.release).toHaveBeenCalledOnce();
  });
  it("does not replenish credits for an already paid callback", async () => {
    mocks.query.mockResolvedValue({ rows: [{ ...payment, status: "paid" }] });
    expect(await processPayuResponse(payload)).toEqual({ status: "success", plan: "pro" });
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.transactionQuery).not.toHaveBeenCalled();
  });
});
