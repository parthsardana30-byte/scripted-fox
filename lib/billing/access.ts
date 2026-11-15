import "server-only";

import { createClient } from "@/lib/db/client";
import { isPlanCode, planIncludesFeature, type BillingFeature, type PlanCode } from "@/lib/billing/plans";
import { publicEnvironment } from "@/lib/env/public";

export type BillingStatus = "free" | "trialing" | "active" | "past_due" | "canceled" | "incomplete";

export type BillingAccess = {
  plan: PlanCode;
  displayPlan: PlanCode;
  status: BillingStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  creditsAllowance: number;
  creditsRemaining: number;
};

const freeAccess: BillingAccess = {
  plan: "free",
  displayPlan: "free",
  status: "free",
  trialEndsAt: null,
  currentPeriodEnd: null,
  creditsAllowance: 0,
  creditsRemaining: 0,
};

const developmentTrialAccess: BillingAccess = {
  plan: "pro",
  displayPlan: "free",
  status: "trialing",
  trialEndsAt: null,
  currentPeriodEnd: null,
  creditsAllowance: 500,
  creditsRemaining: 500,
};

export async function getBillingAccess(userId: string): Promise<BillingAccess> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("billing_accounts")
    .select("plan_code,status,trial_ends_at,current_period_end,credits_allowance,credits_remaining")
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
    displayPlan: data.status === "trialing" && !trialExpired ? "free" : paidAccessIsValid ? storedPlan : "free",
    status: trialExpired || paidPeriodExpired ? "free" : data.status,
    trialEndsAt: data.trial_ends_at,
    currentPeriodEnd: data.current_period_end,
    creditsAllowance: paidAccessIsValid ? Number(data.credits_allowance ?? 0) : 0,
    creditsRemaining: paidAccessIsValid ? Number(data.credits_remaining ?? 0) : 0,
  };
}

export function hasBillingFeature(access: BillingAccess, feature: BillingFeature) {
  return planIncludesFeature(access.plan, feature);
}
