"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { plans, upgradeHref, type PlanCode } from "@/lib/billing/plans";

export function PricingCatalogue({ currentPlan, signedIn = false, returnTo }: { currentPlan?: PlanCode; signedIn?: boolean; returnTo?: string }) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  return <>
    <div className="pricing-billing-choice">
      <div className="pricing-period" role="group" aria-label="Billing period">
        <button type="button" aria-pressed={billingPeriod === "monthly"} onClick={() => setBillingPeriod("monthly")}>Monthly</button>
        <button type="button" aria-pressed={billingPeriod === "annual"} onClick={() => setBillingPeriod("annual")}>Annually</button>
      </div>
      <p className="pricing-saving"><strong>Save 20%</strong><span>when you pay yearly</span></p>
    </div>
    <div className="pricing-catalogue" aria-label="Plans">
      {plans.map((plan) => {
      const isCurrent = currentPlan === plan.code;
      const destination = isCurrent && signedIn
        ? returnTo ?? "/dashboard"
        : plan.code === "free"
          ? signedIn ? "/dashboard" : "/sign-up?next=/dashboard"
          : signedIn ? upgradeHref(undefined, plan.code) : `/sign-up?next=${encodeURIComponent(upgradeHref(undefined, plan.code))}`;
      const monthlyRate = billingPeriod === "annual" ? plan.annualMonthlyPriceInr : plan.monthlyPriceInr;
      const annualTotal = plan.annualMonthlyPriceInr === null ? null : plan.annualMonthlyPriceInr * 12;
      return <article className={`pricing-plan${plan.highlighted ? " pricing-plan--highlighted" : ""}`} key={plan.code}>
        <div className="pricing-plan__intro">
          <div className="pricing-plan__eyebrow">
            <h2>{plan.name}</h2>
            {isCurrent ? <span>Current plan</span> : plan.highlighted ? <span>Main plan</span> : null}
          </div>
          <p>{plan.description}</p>
        </div>
        <div className="pricing-plan__price">
          {monthlyRate === null ? <><strong>7 days free</strong><small>No payment during the trial</small></> : <>
            <strong><span>₹{monthlyRate}</span> / month</strong>
            <small>{billingPeriod === "annual" ? `₹${annualTotal?.toLocaleString("en-IN")} billed annually` : "Billed monthly"}</small>
          </>}
        </div>
        <Link className={`button ${plan.highlighted ? "button--primary" : "button--secondary"}`} href={destination} aria-current={isCurrent ? "page" : undefined}>
          {isCurrent ? returnTo ? "Return to script" : "Go to workspace" : plan.code === "free" ? "Start free trial" : `Select ${plan.name}`}
        </Link>
        <div className="pricing-plan__features">
          <p>{plan.code === "free" ? "Trial outline" : `${plan.name} outline`}</p>
          <ul>{plan.features.map((feature) => <li key={feature}><Check size={16} aria-hidden="true" /><span>{feature}</span></li>)}</ul>
        </div>
      </article>;
      })}
    </div>
  </>;
}
