import "server-only";

import { databasePool } from "@/lib/db/pool";
import { isPlanCode, type PlanCode } from "@/lib/billing/plans";
import { getPayuConfiguration, verifyPayuPayment, type BillingPeriod } from "@/lib/billing/payu";
import { verifyPayuResponseHash } from "@/lib/billing/payu-signature";

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
};

export type PayuProcessingResult = {
  status: "success" | "failed" | "pending" | "invalid";
  plan?: PlanCode;
};

function normalizedMoney(value: string | undefined) {
  if (!value || !Number.isFinite(Number(value))) return null;
  return Number(value).toFixed(2);
}

async function updatePaymentStatus(transactionId: string, status: string, errorCode?: string) {
  await databasePool.query(
    "UPDATE billing_payments SET status = $2, error_code = $3, updated_at = now() "
    + "WHERE transaction_id = $1",
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
    + "product_info, customer_email, customer_firstname, customer_phone, status "
    + "FROM billing_payments WHERE transaction_id = $1 LIMIT 1",
    [transactionId],
  );
  const payment = paymentResult.rows[0];
  if (!payment || !isPlanCode(payment.plan_code) || payment.plan_code === "free") return { status: "invalid" };

  const expectedAmount = normalizedMoney(payment.amount_inr);
  const responseMatches = Boolean(payload.email)
    && normalizedMoney(payload.amount) === expectedAmount
    && payload.productinfo === payment.product_info
    && payload.email.toLowerCase() === payment.customer_email.toLowerCase()
    && payload.firstname === payment.customer_firstname
    && payload.phone === payment.customer_phone;
  if (!responseMatches) {
    await updatePaymentStatus(transactionId, "verification_failed", "response_mismatch");
    return { status: "invalid", plan: payment.plan_code };
  }

  if (payment.status === "paid") return { status: "success", plan: payment.plan_code };
  if (payload.status !== "success") {
    const status = payload.status === "pending" ? "pending" : "failed";
    await updatePaymentStatus(transactionId, status, payload.error);
    return { status, plan: payment.plan_code };
  }

  let verification;
  try {
    verification = await verifyPayuPayment(configuration, transactionId);
  } catch {
    await updatePaymentStatus(transactionId, "pending_verification", "verification_unavailable");
    return { status: "pending", plan: payment.plan_code };
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
    return { status: "pending", plan: payment.plan_code };
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
    if (locked.rows[0]?.status !== "paid") {
      await client.query(
        "UPDATE billing_payments SET status = 'paid', provider_payment_id = $2, "
        + "bank_reference = $3, error_code = NULL, paid_at = now(), updated_at = now() "
        + "WHERE transaction_id = $1",
        [transactionId, providerPaymentId, payload.bank_ref_num || payload.bank_ref_no || null],
      );
      await client.query(
        "INSERT INTO billing_accounts "
        + "(user_id, plan_code, status, provider, provider_customer_id, provider_subscription_id, "
        + "trial_ends_at, current_period_end, cancel_at_period_end, updated_at) "
        + "VALUES ($1, $2, 'active', 'payu', NULL, NULL, NULL, now() + $3::interval, false, now()) "
        + "ON CONFLICT (user_id) DO UPDATE SET plan_code = EXCLUDED.plan_code, status = 'active', "
        + "provider = 'payu', provider_customer_id = NULL, provider_subscription_id = NULL, "
        + "trial_ends_at = NULL, current_period_end = EXCLUDED.current_period_end, "
        + "cancel_at_period_end = false, updated_at = now()",
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

  return { status: "success", plan: payment.plan_code };
}
