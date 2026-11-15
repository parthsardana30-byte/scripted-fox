import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { dailyIdeaLimits, getScriptVersionChangeLimit, isBillingFeature, isPlanCode, planCreditAllowances, planIncludesFeature, plans, pricingHref, trialDurationDays, upgradeHref } from "@/lib/billing/plans";

describe("billing access model", () => {
  it("keeps free users out of premium exports", () => {
    expect(planIncludesFeature("free", "advanced_exports")).toBe(false);
    expect(planIncludesFeature("pro", "advanced_exports")).toBe(true);
    expect(planIncludesFeature("pro", "advanced_analytics")).toBe(false);
    expect(planIncludesFeature("elite", "advanced_analytics")).toBe(true);
  });

  it("uses the confirmed trial, prices, and version limits", () => {
    expect(trialDurationDays).toBe(7);
    expect(getScriptVersionChangeLimit("free")).toBe(0);
    expect(getScriptVersionChangeLimit("pro")).toBe(10);
    expect(getScriptVersionChangeLimit("elite")).toBe(20);
    expect(planCreditAllowances).toEqual({ free: 0, pro: 3_000, elite: 8_000 });
    expect(dailyIdeaLimits).toEqual({ free: 0, pro: 15, elite: 30 });
    expect(plans.find((plan) => plan.code === "pro")).toMatchObject({ monthlyPriceInr: 50, annualMonthlyPriceInr: 40 });
    expect(plans.find((plan) => plan.code === "elite")).toMatchObject({ monthlyPriceInr: 150, annualMonthlyPriceInr: 120 });
  });

  it("accepts only known routing values", () => {
    expect(isPlanCode("pro")).toBe(true);
    expect(isPlanCode("elite")).toBe(true);
    expect(isPlanCode("admin")).toBe(false);
    expect(isBillingFeature("advanced_exports")).toBe(true);
    expect(isBillingFeature("ai_script_writer")).toBe(true);
    expect(isBillingFeature("unlimited_everything")).toBe(false);
    expect(upgradeHref("advanced_exports")).toBe("/dashboard/upgrade?feature=advanced_exports");
    expect(pricingHref("ai_script_writer", "/dashboard/editor/new-script")).toBe(
      "/pricing?feature=ai_script_writer&next=%2Fdashboard%2Feditor%2Fnew-script",
    );
  });

  it("starts new and existing pre-launch accounts on a seven-day Pro trial", () => {
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260828100000_start_seven_day_trials.sql"), "utf8");
    expect(migration).toContain("interval '7 days'");
    expect(migration).toContain("plan_code = 'pro'");
    expect(migration).toContain("status = 'trialing'");
  });

  it("allows users to read only their own billing row and exposes no client write policy", () => {
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260826120000_provider_neutral_billing.sql"), "utf8");
    expect(migration).toContain("alter table public.billing_accounts enable row level security;");
    expect(migration).toContain("create policy billing_accounts_select_own");
    expect(migration).not.toMatch(/create policy billing_accounts_(insert|update|delete)/);
    expect(migration).toContain("create table private.billing_events");
    expect(migration).toContain("revoke all on table private.billing_events from public, anon, authenticated;");
  });
});
