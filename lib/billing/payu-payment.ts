import "server-only";

import { databasePool } from "@/lib/db/pool";
import { isPlanCode, type PlanCode } from "@/lib/billing/plans";
import { getPayuConfiguration, verifyPayuPayment, type BillingPeriod } from "@/lib/billing/payu";
import { verifyPayuResponseHash } from "@/lib/billing/payu-signature";
import { getCreditPack, type CreditPackId } from "@/lib/billing/credit-packs";

type PaymentRow = {
  user_id: string;
  transaction_id: string;
  provider_payment_id: string | null;
  plan_code: string;
  billing_period: string;
  amount_inr: string;
  product_info: string;
  customer_email: string;
  customer_firstname: string;
  customer_phone: string;
  status: string;
  credit_pack_id: string | null;
  credit_amount: number | null;
  credit_period_end: string | null;
};

export type PayuProcessingResult = {
  status: "success" | "failed" | "pending" | "invalid";
  plan?: PlanCode;
  creditPack?: CreditPackId;
};

function normalizedMoney(value: string | undefined) {
  if (!value || !Number.isFinite(Number(value))) return null;
  return Number(value).toFixed(2);
}

async function updatePaymentStatus(transactionId: string, status: string, errorCode?: string) {
  await databasePool.query(
    "UPDATE billing_payments SET status = $2, error_code = $3, updated_at = now() "
    + "WHERE transaction_id = $1 AND status <> 'paid'",
    [transactionId, status, errorCode ?? null],
  );
}

export async function processPayuResponse(payload: Record<string, string>): Promise<PayuProcessingResult> {
  const configuration = getPayuConfiguration();
  const transactionId = payload.txnid;
  if (!configuration || !transactionId || payload.key !== configuration.key) return { status: "invalid" };
  if (!verifyPayuResponseHash(payload, configuration.salt)) return { status: "invalid" };

  const paymentResult = await databasePool.query<PaymentRow>(
    "SELECT user_id, transaction_id, provider_payment_id, plan_code, billing_period, amount_inr, "
    + "product_info, customer_email, customer_firstname, customer_phone, status, credit_pack_id, credit_amount, credit_period_end::text AS credit_period_end "
    + "FROM billing_payments WHERE transaction_id = $1 LIMIT 1",
    [transactionId],
  );
  const payment = paymentResult.rows[0];
  if (!payment || !isPlanCode(payment.plan_code) || payment.plan_code === "free") return { status: "invalid" };
  const pack = payment.credit_pack_id ? getCreditPack(payment.credit_pack_id) : undefined;
  if (payment.credit_pack_id && (!pack || pack.credits !== payment.credit_amount || pack.priceInr.toFixed(2) !== normalizedMoney(payment.amount_inr) || !payment.credit_period_end)) return { status: "invalid" };
  const context = { plan: payment.plan_code, ...(pack ? { creditPack: pack.id } : {}) };

  const expectedAmount = normalizedMoney(payment.amount_inr);
  const responseMatches = Boolean(payload.email)
    && normalizedMoney(payload.amount) === expectedAmount
    && payload.productinfo === payment.product_info
    && payload.email.toLowerCase() === payment.customer_email.toLowerCase()
    && payload.firstname === payment.customer_firstname
    && payload.phone === payment.customer_phone;
  if (!responseMatches) {
    await updatePaymentStatus(transactionId, "verification_failed", "response_mismatch");
    return { status: "invalid", ...context };
  }

  if (payment.status === "paid") return { status: "success", ...context };
  if (payload.status !== "success") {
    const status = payload.status === "pending" ? "pending" : "failed";
    await updatePaymentStatus(transactionId, status, payload.error);
    return { status, ...context };
  }

  let verification;
  try {
    verification = await verifyPayuPayment(configuration, transactionId);
  } catch {
    await updatePaymentStatus(transactionId, "pending_verification", "verification_unavailable");
    return { status: "pending", ...context };
  }

  const verifiedAmount = normalizedMoney(verification.details?.amount ?? verification.details?.amt);
  const providerPaymentId = verification.details?.mihpayid;
  if (
    !verification.verified
    || verifiedAmount !== expectedAmount
    || !providerPaymentId
    || (payload.mihpayid && payload.mihpayid !== providerPaymentId)
  ) {
    await updatePaymentStatus(transactionId, "pending_verification", "verification_mismatch");
    return { status: "pending", ...context };
  }

  const billingPeriod: BillingPeriod = payment.billing_period === "annual" ? "annual" : "monthly";
  const accessInterval = billingPeriod === "annual" ? "1 year" : "1 month";
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query<PaymentRow>(
      "SELECT status, plan_code FROM billing_payments WHERE transaction_id = $1 FOR UPDATE",
      [transactionId],
    );
    if (!locked.rows[0]) {
      await client.query("ROLLBACK");
      return { status: "invalid" };
    }
    if (locked.rows[0]?.status !== "paid") {
      if (pack) {
        const credited = await client.query(`UPDATE billing_accounts SET credits_remaining = credits_remaining + $2,
          credits_allowance = credits_allowance + $2, updated_at = now() WHERE user_id = $1
          AND (CASE WHEN status = 'trialing' THEN trial_ends_at ELSE current_period_end END) = $3::timestamptz
          AND ((status = 'active' AND current_period_end > now()) OR (status = 'trialing' AND trial_ends_at > now())) RETURNING user_id`,
        [payment.user_id, pack.credits, payment.credit_period_end]);
        if (!credited.rowCount) {
          await client.query("UPDATE billing_payments SET status = 'pending_credit_review', provider_payment_id = $2, error_code = 'plan_period_changed', updated_at = now() WHERE transaction_id = $1", [transactionId, providerPaymentId]);
          await client.query("COMMIT");
          return { status: "pending", ...context };
        }
      }
      await client.query(
        "UPDATE billing_payments SET status = 'paid', provider_payment_id = $2, "
        + "bank_reference = $3, error_code = NULL, paid_at = now(), updated_at = now() "
        + "WHERE transaction_id = $1",
        [transactionId, providerPaymentId, payload.bank_ref_num || payload.bank_ref_no || null],
      );
      if (!pack) await client.query(
        "INSERT INTO billing_accounts "
        + "(user_id, plan_code, status, provider, provider_customer_id, provider_subscription_id, "
        + "trial_ends_at, current_period_end, cancel_at_period_end, credits_allowance, credits_remaining, updated_at) "
        + "VALUES ($1, $2, 'active', 'payu', NULL, NULL, NULL, now() + $3::interval, false, "
        + "CASE WHEN $2 = 'elite' THEN 8000 ELSE 3000 END, CASE WHEN $2 = 'elite' THEN 8000 ELSE 3000 END, now()) "
        + "ON CONFLICT (user_id) DO UPDATE SET plan_code = EXCLUDED.plan_code, status = 'active', "
        + "provider = 'payu', provider_customer_id = NULL, provider_subscription_id = NULL, "
        + "trial_ends_at = NULL, current_period_end = EXCLUDED.current_period_end, "
        + "cancel_at_period_end = false, credits_allowance = EXCLUDED.credits_allowance, "
        + "credits_remaining = EXCLUDED.credits_remaining, updated_at = now()",
        [payment.user_id, payment.plan_code, accessInterval],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return { status: "success", ...context };
}
