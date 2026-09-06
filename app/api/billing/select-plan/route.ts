import { z } from "zod";

import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/client";
import { getPlanDisplayName, planCodes } from "@/lib/billing/plans";
import { isPlanTestingUser } from "@/lib/billing/testing";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";

const selectionSchema = z.object({
  plan: z.enum(planCodes),
  billingPeriod: z.enum(["monthly", "annual"]),
});

function accessEnd(period: "monthly" | "annual") {
  const end = new Date();
  if (period === "monthly") end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCFullYear(end.getUTCFullYear() + 1);
  return end.toISOString();
}

export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) {
    return Response.json({ error: "This plan request could not be verified." }, { status: 403 });
  }

  try {
    const user = await requireAuthenticatedUser();
    if (!isPlanTestingUser(user.id)) {
      return Response.json({ error: "Plan testing is not enabled for this account." }, { status: 403 });
    }
    const input = selectionSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) {
      return Response.json({ error: "Choose a valid plan and billing period." }, { status: 400 });
    }

    const isBasic = input.data.plan === "free";
    const client = await createClient();
    const { error } = await client.from("billing_accounts").upsert({
      user_id: user.id,
      plan_code: input.data.plan,
      status: isBasic ? "free" : "active",
      provider: isBasic ? null : "test",
      provider_customer_id: null,
      provider_subscription_id: null,
      trial_ends_at: null,
      current_period_end: isBasic ? null : accessEnd(input.data.billingPeriod),
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) {
      return Response.json({ error: "The plan could not be updated. Try again." }, { status: 500 });
    }

    return Response.json({
      plan: input.data.plan,
      label: getPlanDisplayName(input.data.plan),
      billingPeriod: input.data.billingPeriod,
      charged: false,
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: "Sign in to test a plan." }, { status: 401 });
    }
    return Response.json({ error: "The plan could not be updated. Try again." }, { status: 500 });
  }
}
