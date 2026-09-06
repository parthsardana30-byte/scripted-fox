import { z } from "zod";

import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import {
  createPayuCheckoutFields,
  createPayuTransactionId,
  getPayuConfiguration,
  getPayuPlanAmount,
} from "@/lib/billing/payu";
import { databasePool } from "@/lib/db/pool";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";

const checkoutSchema = z.object({
  plan: z.enum(["pro", "elite"]),
  billingPeriod: z.enum(["monthly", "annual"]),
  phone: z.string().trim().regex(/^[6-9][0-9]{9}$/),
});

export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) {
    return Response.json({ error: "This checkout request could not be verified." }, { status: 403 });
  }

  try {
    const user = await requireAuthenticatedUser();
    const input = checkoutSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) {
      return Response.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 });
    }

    const configuration = getPayuConfiguration();
    if (!configuration) {
      return Response.json({ error: "PayU setup is not complete yet." }, { status: 503 });
    }

    const amount = getPayuPlanAmount(input.data.plan, input.data.billingPeriod);
    if (amount === null) {
      return Response.json({ error: "Choose a valid paid plan." }, { status: 400 });
    }

    const recent = await databasePool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM billing_payments "
      + "WHERE user_id = $1 AND created_at > now() - interval '15 minutes'",
      [user.id],
    );
    if (Number(recent.rows[0]?.count ?? 0) >= 10) {
      return Response.json({ error: "Too many checkout attempts. Please wait a few minutes." }, { status: 429 });
    }

    const transactionId = createPayuTransactionId();
    const amountString = amount.toFixed(2);
    const firstName = user.user_metadata.full_name || user.user_metadata.name || "Scripted Fox Creator";
    const checkout = createPayuCheckoutFields({
      configuration,
      transactionId,
      amount: amountString,
      plan: input.data.plan,
      billingPeriod: input.data.billingPeriod,
      firstName,
      email: user.email,
      phone: input.data.phone,
    });

    await databasePool.query(
      "INSERT INTO billing_payments "
      + "(user_id, transaction_id, plan_code, billing_period, amount_inr, product_info, "
      + "customer_email, customer_firstname, customer_phone, status) "
      + "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'created')",
      [
        user.id,
        transactionId,
        input.data.plan,
        input.data.billingPeriod,
        amountString,
        checkout.productInfo,
        checkout.fields.email,
        checkout.fields.firstname,
        checkout.fields.phone,
      ],
    );

    return Response.json({
      action: configuration.paymentUrl,
      fields: checkout.fields,
      transactionId,
      environment: configuration.environment,
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: "Sign in before starting checkout." }, { status: 401 });
    }
    return Response.json({ error: "Checkout could not be started. Please try again." }, { status: 500 });
  }
}
