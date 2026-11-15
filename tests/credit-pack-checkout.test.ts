// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user:vi.fn(), query:vi.fn(), origin:vi.fn(), fields:vi.fn() }));
vi.mock("server-only",()=>({}));
vi.mock("@/lib/auth/session",()=>({requireAuthenticatedUser:mocks.user,AuthenticationRequiredError:class extends Error{}}));
vi.mock("@/lib/db/pool",()=>({databasePool:{query:mocks.query}}));
vi.mock("@/lib/security/origin",()=>({isTrustedSameOriginRequest:mocks.origin}));
vi.mock("@/lib/billing/payu",()=>({getPayuConfiguration:()=>({paymentUrl:"https://secure.payu.in/_payment"}),createPayuTransactionId:()=>"txn",createPayuCheckoutFields:mocks.fields}));
import { POST } from "@/app/api/billing/credit-packs/checkout/route";
const request=(body:unknown)=>new Request("https://scriptedfox.com/api/billing/credit-packs/checkout",{method:"POST",body:JSON.stringify(body)});
beforeEach(()=>{
  vi.resetAllMocks(); mocks.origin.mockReturnValue(true); mocks.user.mockResolvedValue({id:"owner",email:"test@example.test",user_metadata:{name:"Test"}});
  mocks.fields.mockReturnValue({productInfo:"50 credits",fields:{email:"test@example.test",firstname:"Test",phone:"9999999999"}});
  mocks.query.mockImplementation(async(sql:string)=>sql.includes("FROM billing_accounts")?{rows:[{plan_code:"pro",expires_at:new Date("2027-01-01") }]}:{rows:[{count:0}]});
});
it("takes amount and credits from the server catalogue, not caller-supplied prices",async()=>{
  expect((await POST(request({pack:"starter",phone:"9999999999",amount:1,credits:999999}))).status).toBe(200);
  expect(mocks.fields).toHaveBeenCalledWith(expect.objectContaining({amount:"29.00",creditProductInfo:"Scripted Fox 50 Fox Credits"}));
  const insert=mocks.query.mock.calls.find(([sql])=>sql.includes("INSERT INTO billing_payments"));
  expect(insert?.[1][9]).toBe(50); expect(insert?.[1][0]).toBe("owner");
});
it("blocks checkout for expired plans before creating a payment",async()=>{
  mocks.query.mockResolvedValue({rows:[]});
  expect((await POST(request({pack:"creator",phone:"9999999999"}))).status).toBe(409);
  expect(mocks.fields).not.toHaveBeenCalled();
});
it("rejects invalid packs and cross-origin submissions",async()=>{
  expect((await POST(request({pack:"unlimited",phone:"9999999999"}))).status).toBe(400);
  mocks.origin.mockReturnValue(false); expect((await POST(request({pack:"studio",phone:"9999999999"}))).status).toBe(403);
  expect(mocks.fields).not.toHaveBeenCalled();
});
