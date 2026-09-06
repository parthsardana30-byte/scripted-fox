export const planCodes = ["free", "pro", "elite"] as const;
export type PlanCode = (typeof planCodes)[number];

export const planDisplayNames: Record<PlanCode, string> = {
  free: "Basic",
  pro: "Plus",
  elite: "Pro",
};

export function getPlanDisplayName(plan: PlanCode) {
  return planDisplayNames[plan];
}

export const billingFeatures = [
  "ai_script_writer",
  "channel_aware_ideas",
  "advanced_exports",
  "advanced_analytics",
  "priority_generation",
  "shared_workspace",
] as const;
export type BillingFeature = (typeof billingFeatures)[number];

export type PlanDefinition = {
  code: PlanCode;
  name: string;
  monthlyPriceInr: number | null;
  annualMonthlyPriceInr: number | null;
  description: string;
  features: string[];
  highlighted?: boolean;
};

export const trialDurationDays = 7;

export const scriptVersionChangeLimits: Record<PlanCode, number> = {
  free: 0,
  pro: 10,
  elite: 20,
};

export const plans: PlanDefinition[] = [
  {
    code: "free",
    name: planDisplayNames.free,
    monthlyPriceInr: null,
    annualMonthlyPriceInr: null,
    description: "Explore the Plus workspace free for one week before choosing a paid plan.",
    features: ["7 days of Plus access", "AI script writer", "10 AI version changes per script"],
  },
  {
    code: "pro",
    name: planDisplayNames.pro,
    monthlyPriceInr: 50,
    annualMonthlyPriceInr: 40,
    description: "Write and refine scripts with a focused version history.",
    features: ["AI script writer", "10 AI version changes per script", "Restore any saved version"],
    highlighted: true,
  },
  {
    code: "elite",
    name: planDisplayNames.elite,
    monthlyPriceInr: 150,
    annualMonthlyPriceInr: 120,
    description: "Keep a longer history for scripts that need more iteration.",
    features: ["Everything in Plus", "20 AI version changes per script", "Restore any saved version"],
  },
];

const featureMinimumPlan: Record<BillingFeature, PlanCode> = {
  ai_script_writer: "pro",
  channel_aware_ideas: "pro",
  advanced_exports: "pro",
  advanced_analytics: "elite",
  priority_generation: "elite",
  shared_workspace: "elite",
};

const planRank: Record<PlanCode, number> = { free: 0, pro: 1, elite: 2 };

export function isPlanCode(value: unknown): value is PlanCode {
  return typeof value === "string" && planCodes.includes(value as PlanCode);
}

export function isBillingFeature(value: unknown): value is BillingFeature {
  return typeof value === "string" && billingFeatures.includes(value as BillingFeature);
}

export function planIncludesFeature(plan: PlanCode, feature: BillingFeature) {
  return planRank[plan] >= planRank[featureMinimumPlan[feature]];
}

export function upgradeHref(feature?: BillingFeature, plan?: PlanCode) {
  const params = new URLSearchParams();
  if (feature) params.set("feature", feature);
  if (plan && plan !== "free") params.set("plan", plan);
  const query = params.toString();
  return `/dashboard/upgrade${query ? `?${query}` : ""}`;
}

export function pricingHref(feature?: BillingFeature, returnTo?: string, plan?: PlanCode) {
  const params = new URLSearchParams();
  if (feature) params.set("feature", feature);
  if (returnTo) params.set("next", returnTo);
  if (plan && plan !== "free") params.set("plan", plan);
  const query = params.toString();
  return `/pricing${query ? `?${query}` : ""}`;
}

export const featureLabels: Record<BillingFeature, string> = {
  ai_script_writer: "AI script writer",
  channel_aware_ideas: "Channel-aware recommendations",
  advanced_exports: "PDF and Word export",
  advanced_analytics: "Advanced channel analytics",
  priority_generation: "Priority AI generation",
  shared_workspace: "Shared workspace controls",
};

export function getScriptVersionChangeLimit(plan: PlanCode) {
  return scriptVersionChangeLimits[plan];
}
