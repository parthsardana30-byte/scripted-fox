import "server-only";

import { createClient } from "@/lib/db/client";
import { isPlanCode, planIncludesFeature, type BillingFeature, type PlanCode } from "@/lib/billing/plans";
import { publicEnvironment } from "@/lib/env/public";

export type BillingStatus = "free" | "trialing" | "active" | "past_due" | "canceled" | "incomplete";

export type BillingAccess = {
  plan: PlanCode;
  status: BillingStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

const freeAccess: BillingAccess = {
  plan: "free",
  status: "free",
  trialEndsAt: null,
  currentPeriodEnd: null,
};

const developmentTrialAccess: BillingAccess = {
  plan: "pro",
  status: "trialing",
  trialEndsAt: null,
  currentPeriodEnd: null,
};

export async function getBillingAccess(userId: string): Promise<BillingAccess> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("billing_accounts")
    .select("plan_code,status,trial_ends_at,current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  // The migration may not be applied in every development environment yet.
  if (error || !data) {
    return publicEnvironment.NEXT_PUBLIC_DEPLOYMENT_ENV === "development" ? developmentTrialAccess : freeAccess;
  }

  // Local development keeps pre-trial accounts testable without mutating hosted billing data.
  if (publicEnvironment.NEXT_PUBLIC_DEPLOYMENT_ENV === "development" && data.status === "free") {
    return developmentTrialAccess;
  }

  const trialExpired = data.status === "trialing"
    && (!data.trial_ends_at || new Date(data.trial_ends_at).getTime() <= Date.now());
  const paidPeriodExpired = data.status === "active"
    && (!data.current_period_end || new Date(data.current_period_end).getTime() <= Date.now());
  const paidAccessIsValid = (data.status === "active" && !paidPeriodExpired)
    || (data.status === "trialing" && !trialExpired);
  const storedPlan = isPlanCode(data.plan_code) ? data.plan_code : "free";

  return {
    plan: paidAccessIsValid ? storedPlan : "free",
    status: trialExpired || paidPeriodExpired ? "free" : data.status,
    trialEndsAt: data.trial_ends_at,
    currentPeriodEnd: data.current_period_end,
  };
}

export function hasBillingFeature(access: BillingAccess, feature: BillingFeature) {
  return planIncludesFeature(access.plan, feature);
}
