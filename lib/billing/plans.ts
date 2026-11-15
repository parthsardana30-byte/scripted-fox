export const planCodes = ["free", "pro", "elite"] as const;
export type PlanCode = (typeof planCodes)[number];

export const planDisplayNames: Record<PlanCode, string> = {
  free: "Basic",
  pro: "Pro",
  elite: "Gold",
};

export function getPlanDisplayName(plan: PlanCode) {
  return planDisplayNames[plan];
}

export const billingFeatures = [
  "ai_script_writer",
  "channel_aware_ideas",
  "advanced_exports",
  "advanced_analytics",
] as const;
export type BillingFeature = (typeof billingFeatures)[number];

export type PlanDefinition = {
  code: PlanCode;
  name: string;
  monthlyPriceInr: number | null;
  annualMonthlyPriceInr: number | null;
  description: string;
  features: PlanFeature[];
  highlighted?: boolean;
};

export type PlanFeature = {
  label: string;
  included: boolean;
};

export const trialDurationDays = 7;

export const scriptVersionChangeLimits: Record<PlanCode, number> = {
  free: 0,
  pro: 10,
  elite: 20,
};

export const planCreditAllowances: Record<PlanCode, number> = {
  free: 0,
  pro: 3_000,
  elite: 8_000,
};

export const dailyIdeaLimits: Record<PlanCode, number> = {
  free: 0,
  pro: 15,
  elite: 30,
};

export const plans: PlanDefinition[] = [
  {
    code: "free",
    name: planDisplayNames.free,
    monthlyPriceInr: null,
    annualMonthlyPriceInr: null,
    description: "Experience ScriptedFox before choosing a paid plan.",
    features: [
      { label: "15 personalized video ideas every day", included: true },
      { label: "500 Fox Credits for the trial", included: true },
      { label: "AI script generation and Fox AI editing", included: true },
      { label: "Recommendations based on your channel and niche", included: true },
      { label: "Text, Markdown, and subtitle exports", included: true },
    ],
  },
  {
    code: "pro",
    name: planDisplayNames.pro,
    monthlyPriceInr: 50,
    annualMonthlyPriceInr: 40,
    description: "For creators who publish consistently and want a complete writing workflow.",
    features: [
      { label: "15 personalized video ideas every day", included: true },
      { label: "3,000 Fox Credits per paid month", included: true },
      { label: "AI script generation and Fox AI editing", included: true },
      { label: "Recommendations based on channel analytics and niche", included: true },
      { label: "10 saved AI changes per script", included: true },
      { label: "PDF, text, Markdown, and subtitle exports", included: true },
    ],
    highlighted: true,
  },
  {
    code: "elite",
    name: planDisplayNames.elite,
    monthlyPriceInr: 150,
    annualMonthlyPriceInr: 120,
    description: "For serious creators who need deeper analytics, more ideas, and more AI capacity.",
    features: [
      { label: "30 personalized video ideas every day", included: true },
      { label: "8,000 Fox Credits per paid month", included: true },
      { label: "AI script generation and Fox AI editing", included: true },
      { label: "Channel voice and audience personalization", included: true },
      { label: "Advanced channel analytics", included: true },
      { label: "20 saved AI changes per script", included: true },
      { label: "PDF, text, Markdown, and subtitle exports", included: true },
    ],
  },
];

const featureMinimumPlan: Record<BillingFeature, PlanCode> = {
  ai_script_writer: "pro",
  channel_aware_ideas: "pro",
  advanced_exports: "pro",
  advanced_analytics: "elite",
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
  advanced_exports: "PDF export",
  advanced_analytics: "Advanced channel analytics",
};

export function getScriptVersionChangeLimit(plan: PlanCode) {
  return scriptVersionChangeLimits[plan];
}
