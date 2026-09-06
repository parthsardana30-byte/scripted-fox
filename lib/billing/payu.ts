import "server-only";

import { randomBytes } from "node:crypto";

import { serverEnvironment } from "@/lib/env/server";
import { publicEnvironment } from "@/lib/env/public";
import { getPlanDisplayName, plans, type PlanCode } from "@/lib/billing/plans";
import { createPayuCommandHash, createPayuPaymentHash } from "@/lib/billing/payu-signature";

export type BillingPeriod = "monthly" | "annual";
export type PaidPlanCode = Exclude<PlanCode, "free">;

export type PayuConfiguration = {
  key: string;
  salt: string;
  environment: "test" | "production";
  paymentUrl: string;
  verificationUrl: string;
};

export function getPayuConfiguration(): PayuConfiguration | null {
  if (
    serverEnvironment.BILLING_PROVIDER !== "payu"
    || !serverEnvironment.PAYU_MERCHANT_KEY
    || !serverEnvironment.PAYU_MERCHANT_SALT
  ) {
    return null;
  }

  const environment = serverEnvironment.PAYU_ENVIRONMENT ?? "test";
  return {
    key: serverEnvironment.PAYU_MERCHANT_KEY,
    salt: serverEnvironment.PAYU_MERCHANT_SALT,
    environment,
    paymentUrl: environment === "production"
      ? "https://secure.payu.in/_payment"
      : "https://test.payu.in/_payment",
    verificationUrl: environment === "production"
      ? "https://info.payu.in/merchant/postservice.php?form=2"
      : "https://test.payu.in/merchant/postservice.php?form=2",
  };
}

export function isPayuConfigured() {
  return getPayuConfiguration() !== null;
}

export function getPayuPlanAmount(planCode: PaidPlanCode, billingPeriod: BillingPeriod) {
  const plan = plans.find((candidate) => candidate.code === planCode);
  if (!plan || plan.monthlyPriceInr === null || plan.annualMonthlyPriceInr === null) return null;
  return billingPeriod === "annual" ? plan.annualMonthlyPriceInr * 12 : plan.monthlyPriceInr;
}

export function createPayuTransactionId() {
  return ("SF" + Date.now().toString(36) + randomBytes(5).toString("hex")).slice(0, 25);
}

function cleanFirstName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9 _./-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60) || "Scripted Fox Creator";
}

export function createPayuCheckoutFields(input: {
  configuration: PayuConfiguration;
  transactionId: string;
  amount: string;
  plan: PaidPlanCode;
  billingPeriod: BillingPeriod;
  firstName: string;
  email: string;
  phone: string;
}) {
  const productInfo = "Scripted Fox " + getPlanDisplayName(input.plan) + " "
    + (input.billingPeriod === "annual" ? "Annual" : "Monthly");
  const callbackUrl = new URL("/api/billing/payu/callback", publicEnvironment.NEXT_PUBLIC_SITE_URL).toString();
  const webhookUrl = new URL("/api/billing/payu/webhook", publicEnvironment.NEXT_PUBLIC_SITE_URL).toString();
  const fields = {
    key: input.configuration.key,
    txnid: input.transactionId,
    amount: input.amount,
    productinfo: productInfo,
    firstname: cleanFirstName(input.firstName),
    email: input.email,
    phone: input.phone,
    surl: callbackUrl,
    furl: callbackUrl,
    curl: callbackUrl,
    nurl: webhookUrl,
    udf1: "",
    udf2: "",
    udf3: "",
    udf4: "",
    udf5: "",
  };

  return {
    productInfo,
    fields: {
      ...fields,
      hash: createPayuPaymentHash({
        key: fields.key,
        transactionId: fields.txnid,
        amount: fields.amount,
        productInfo: fields.productinfo,
        firstName: fields.firstname,
        email: fields.email,
      }, input.configuration.salt),
    },
  };
}

export async function verifyPayuPayment(configuration: PayuConfiguration, transactionId: string) {
  const command = "verify_payment";
  const response = await fetch(configuration.verificationUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      key: configuration.key,
      command,
      var1: transactionId,
      hash: createPayuCommandHash(configuration.key, command, transactionId, configuration.salt),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) throw new Error("PayU verification is temporarily unavailable.");
  const payload = await response.json() as {
    status?: number | string;
    transaction_details?: Record<string, {
      txnid?: string;
      mihpayid?: string;
      amount?: string;
      amt?: string;
      status?: string;
      unmappedstatus?: string;
    }>;
  };
  const details = payload.transaction_details?.[transactionId];
  return {
    verified: Number(payload.status) === 1
      && details?.txnid === transactionId
      && details.status === "success"
      && details.unmappedstatus === "captured",
    details,
  };
}
