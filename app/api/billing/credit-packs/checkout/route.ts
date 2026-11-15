import { z } from "zod";
import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import { databasePool } from "@/lib/db/pool";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";
import { readJsonBody, RequestBodyError } from "@/lib/security/request-body";
import { getCreditPack } from "@/lib/billing/credit-packs";
import { createPayuCheckoutFields, createPayuTransactionId, getPayuConfiguration } from "@/lib/billing/payu";

export const runtime = "nodejs";
const schema = z.object({ pack: z.enum(["starter", "creator", "studio"]), phone: z.string().trim().regex(/^[6-9][0-9]{9}$/) });
const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers });
  try {
    const user = await requireAuthenticatedUser();
    const parsed = schema.safeParse(await readJsonBody(request, 2048));
    if (!parsed.success) return Response.json({ error: "Choose a pack and enter a valid 10-digit Indian mobile number." }, { status: 400, headers });
    const configuration = getPayuConfiguration();
    if (!configuration) return Response.json({ error: "Payments are not configured yet." }, { status: 503, headers });
    const account = await databasePool.query(`SELECT plan_code, (CASE WHEN status = 'trialing' THEN trial_ends_at ELSE current_period_end END)::text AS expires_at
      FROM billing_accounts WHERE user_id = $1 AND plan_code IN ('pro','elite') AND
      ((status = 'active' AND current_period_end > now()) OR (status = 'trialing' AND trial_ends_at > now()))`, [user.id]);
    if (!account.rows[0]) return Response.json({ error: "An active plan or trial is required. Choose a plan before buying extra credits." }, { status: 409, headers });
    const recent = await databasePool.query("SELECT count(*)::int AS count FROM billing_payments WHERE user_id = $1 AND created_at > now() - interval '15 minutes'", [user.id]);
    if (Number(recent.rows[0]?.count ?? 0) >= 10) return Response.json({ error: "Too many checkout attempts. Please try again later." }, { status: 429, headers });
    const pack = getCreditPack(parsed.data.pack)!;
    const transactionId = createPayuTransactionId();
    const amount = pack.priceInr.toFixed(2);
    const checkout = createPayuCheckoutFields({ configuration, transactionId, amount,
      plan: account.rows[0].plan_code, billingPeriod: "monthly", creditProductInfo: `Scripted Fox ${pack.credits} Fox Credits`,
      firstName: user.user_metadata.full_name || user.user_metadata.name || "Scripted Fox Creator", email: user.email, phone: parsed.data.phone });
    await databasePool.query(`INSERT INTO billing_payments (user_id,transaction_id,plan_code,billing_period,amount_inr,product_info,
      customer_email,customer_firstname,customer_phone,status,credit_pack_id,credit_amount,credit_period_end)
      VALUES ($1,$2,$3,'monthly',$4,$5,$6,$7,$8,'created',$9,$10,$11)`,
    [user.id, transactionId, account.rows[0].plan_code, amount, checkout.productInfo, checkout.fields.email,
      checkout.fields.firstname, checkout.fields.phone, pack.id, pack.credits, account.rows[0].expires_at]);
    return Response.json({ action: configuration.paymentUrl, fields: checkout.fields, transactionId }, { headers });
  } catch (error) {
    const status = error instanceof AuthenticationRequiredError ? 401 : error instanceof RequestBodyError ? error.status : 503;
    return Response.json({ error: status === 401 ? "Sign in before buying credits." : "Credit checkout could not be started. Please try again." }, { status, headers });
  }
}
