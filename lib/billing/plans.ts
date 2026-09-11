export const planCodes = ["free", "pro", "elite"] as const;
export type PlanCode = (typeof planCodes)[number];

export const planDisplayNames: Record<PlanCode, string> = {
  free: "7-Day Pro Trial",
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
      { label: "Deep Research and source-backed scripts", included: false },
      { label: "Standard Publishing Kit generation", included: true },
      { label: "Limited export formats", included: true },
      { label: "Additional credit recharges", included: false },
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
      { label: "3,000 monthly Fox Credits with optional recharges", included: true },
      { label: "AI script generation and Fox AI editing", included: true },
      { label: "Recommendations based on channel analytics and niche", included: true },
      { label: "Deep Research and source-backed scripts", included: false },
      { label: "30-day script version history", included: true },
      { label: "Limited export formats", included: true },
    ],
    highlighted: true,
  },
  {
    code: "elite",
    name: planDisplayNames.elite,
    monthlyPriceInr: 150,
    annualMonthlyPriceInr: 120,
    description: "For serious creators who need deeper research, more content and publish-ready assets.",
    features: [
      { label: "30 personalized video ideas every day", included: true },
      { label: "8,000 monthly Fox Credits with optional recharges", included: true },
      { label: "Advanced AI script generation and Fox AI editing", included: true },
      { label: "Advanced channel voice and audience personalization", included: true },
      { label: "Deep Research with sources and research notes", included: true },
      { label: "Advanced Publishing Kit for every project", included: true },
      { label: "20 title variations across different angles", included: true },
      { label: "5 thumbnail concepts", included: true },
      { label: "AI-generated thumbnail renders", included: true },
      { label: "2 optimized YouTube descriptions", included: true },
      { label: "Chapters and timestamps", included: true },
      { label: "Hashtags and keywords", included: true },
      { label: "Pinned comment", included: true },
      { label: "Community post", included: true },
      { label: "Unlimited script version history", included: true },
      { label: "All export formats and priority generation", included: true },
    ],
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
