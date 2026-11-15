"use client";

import { Check, CreditCard, LockKeyhole, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";

import { Confetti } from "@/components/ui/confetti";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { plans, upgradeHref, type PlanCode } from "@/lib/billing/plans";

type CheckoutResponse = {
  action?: string;
  fields?: Record<string, string>;
  error?: string;
};

type PricingCatalogueProps = {
  currentPlan?: PlanCode;
  signedIn?: boolean;
  returnTo?: string;
  payuConfigured?: boolean;
  celebrationPlan?: PlanCode;
  compact?: boolean;
  preview?: boolean;
};

const compactFeatures = {
  free: [
    { label: "15 niche-matched ideas per day", included: true },
    { label: "500 credits · 7-day access", included: true },
    { label: "AI scripts & Fox AI editing", included: true },
    { label: "Text, Markdown & subtitle exports", included: true },
  ],
  pro: [
    { label: "15 niche-matched ideas per day", included: true },
    { label: "3,000 credits per paid month", included: true },
    { label: "AI scripts & Fox AI editing", included: true },
    { label: "Channel-based recommendations", included: true },
    { label: "10 saved AI changes · PDF exports", included: true },
  ],
  elite: [
    { label: "30 niche-matched ideas per day", included: true },
    { label: "8,000 credits per paid month", included: true },
    { label: "Scripts & channel personalization", included: true },
    { label: "Advanced channel analytics", included: true },
    { label: "20 saved AI changes · PDF exports", included: true },
  ],
};

export function PricingCatalogue({
  currentPlan,
  signedIn = false,
  returnTo,
  payuConfigured = false,
  celebrationPlan,
  compact = false,
  preview = false,
}: PricingCatalogueProps) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [selectingPlan, setSelectingPlan] = useState<PlanCode | null>(null);
  const [pendingPlan, setPendingPlan] = useState<PlanCode | null>(null);
  const [phone, setPhone] = useState("");
  const [feedback, setFeedback] = useState("");
  const [celebratedPlan, setCelebratedPlan] = useState<PlanCode | null>(null);
  const [dismissedCelebrationPlan, setDismissedCelebrationPlan] = useState<PlanCode | null>(null);
  const checkoutPlan = useMemo(() => plans.find((plan) => plan.code === pendingPlan), [pendingPlan]);
  const visibleCelebrationPlan = celebratedPlan
    ?? (celebrationPlan && celebrationPlan !== dismissedCelebrationPlan ? celebrationPlan : null);
  const celebration = useMemo(() => plans.find((plan) => plan.code === visibleCelebrationPlan), [visibleCelebrationPlan]);
  const checkoutAmount = checkoutPlan
    ? billingPeriod === "annual"
      ? (checkoutPlan.annualMonthlyPriceInr ?? 0) * 12
      : checkoutPlan.monthlyPriceInr ?? 0
    : 0;

  const startPayuCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingPlan || pendingPlan === "free") return;
    setSelectingPlan(pendingPlan);
    setFeedback("");

    try {
      const response = await fetch("/api/billing/payu/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: pendingPlan, billingPeriod, phone }),
      });
      const result = await response.json() as CheckoutResponse;
      if (!response.ok || !result.action || !result.fields) {
        throw new Error(result.error ?? "PayU checkout could not be started.");
      }

      const checkoutUrl = new URL(result.action);
      if (checkoutUrl.hostname !== "secure.payu.in") {
        throw new Error("The PayU checkout address could not be verified.");
      }

      const form = document.createElement("form");
      form.method = "POST";
      form.action = checkoutUrl.toString();
      form.style.display = "none";
      Object.entries(result.fields).forEach(([name, value]) => {
        const field = document.createElement("input");
        field.type = "hidden";
        field.name = name;
        field.value = value;
        form.appendChild(field);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "PayU checkout could not be started.");
      setSelectingPlan(null);
      setPendingPlan(null);
    }
  };

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
            : signedIn ? upgradeHref(undefined, plan.code) : "/sign-up?next=" + encodeURIComponent(upgradeHref(undefined, plan.code));
        const monthlyRate = billingPeriod === "annual" ? plan.annualMonthlyPriceInr : plan.monthlyPriceInr;
        const annualTotal = plan.annualMonthlyPriceInr === null ? null : plan.annualMonthlyPriceInr * 12;
        const buttonClass = "button " + (plan.highlighted ? "button--primary" : "button--secondary");

        const priceLabel = monthlyRate === null ? "FREE" : "₹" + monthlyRate;

        return <article
          className={"pricing-plan pricing-plan--" + plan.code + (plan.highlighted ? " pricing-plan--highlighted" : "")}
          data-price={priceLabel}
          key={plan.code}
        >
          <div className="pricing-plan__intro">
            <div className="pricing-plan__eyebrow">
              <h2>{plan.name}</h2>
              {isCurrent ? <span>Current plan</span> : plan.highlighted ? <span>Most popular</span> : null}
            </div>
            <p>{plan.description}</p>
          </div>
          <div className="pricing-plan__price">
            {monthlyRate === null ? <><strong><span className="pricing-plan__amount">7 days</span><span className="pricing-plan__period"> free</span></strong><small>No payment card required</small></> : <>
              <strong><span className="pricing-plan__currency">₹</span><span className="pricing-plan__amount">{monthlyRate}</span><span className="pricing-plan__period"> / month</span></strong>
              <small>{billingPeriod === "annual" ? "₹" + annualTotal?.toLocaleString("en-IN") + " paid for 12 months" : "One payment for one month"}</small>
            </>}
          </div>
          {preview ? <button className={buttonClass} type="button" onClick={() => setFeedback("Local plan preview — checkout is disabled.")}>{isCurrent ? "Current plan" : `Select ${plan.name}`}</button> : signedIn && payuConfigured && !isCurrent && plan.code !== "free"
              ? <button className={buttonClass} type="button" disabled={selectingPlan !== null} onClick={() => { setPendingPlan(plan.code); setFeedback(""); }}>
                  {"Pay with PayU · " + plan.name}
                </button>
              : signedIn && !payuConfigured && !isCurrent && plan.code !== "free"
                ? <button className={buttonClass} type="button" onClick={() => setFeedback("PayU merchant credentials are still required before checkout can open.")}>
                    {"Select " + plan.name}
                  </button>
                : <Link className={buttonClass} href={destination} aria-current={isCurrent ? "page" : undefined}>
                    {isCurrent ? returnTo ? "Return to script" : "Go to workspace" : plan.code === "free" ? "Get Basic" : "Select " + plan.name}
                  </Link>}
          <div className="pricing-plan__features">
            <p>{plan.name + " outline"}</p>
            <ul>{(compact ? compactFeatures[plan.code] : plan.features).map((feature) => <li key={feature.label}>
              {feature.included ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
              <span>{feature.label}</span>
            </li>)}</ul>
          </div>
        </article>;
      })}
    </div>
    {feedback ? <p className="pricing-plan-feedback" role="status" aria-live="polite">{feedback}</p> : null}
    <Dialog open={Boolean(pendingPlan)} onOpenChange={(open) => { if (!open) setPendingPlan(null); }}>
      {checkoutPlan ? <DialogContent className="pricing-checkout-dialog">
        <span className="pricing-checkout-dialog__icon"><CreditCard size={24} aria-hidden="true" /></span>
        <DialogTitle>Continue securely with PayU</DialogTitle>
        <DialogDescription>
          {checkoutPlan.name + " · " + (billingPeriod === "annual" ? "12 months" : "1 month") + " access"}
        </DialogDescription>
        <form onSubmit={(event) => void startPayuCheckout(event)}>
          <label htmlFor="payu-phone">Mobile number</label>
          <div className="pricing-checkout-dialog__phone">
            <span>+91</span>
            <input
              id="payu-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              pattern="[6-9][0-9]{9}"
              placeholder="10-digit number"
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
              required
            />
          </div>
          <div className="pricing-checkout-dialog__total">
            <span>Total</span>
            <strong>{"₹" + checkoutAmount.toLocaleString("en-IN")}</strong>
          </div>
          <button className="button button--primary" type="submit" disabled={selectingPlan !== null || !/^[6-9][0-9]{9}$/.test(phone)}>
            {selectingPlan ? "Opening PayU…" : "Continue to payment"}
          </button>
        </form>
        <p className="pricing-checkout-dialog__secure"><LockKeyhole size={15} aria-hidden="true" /> Payment details are entered only on PayU&apos;s secure checkout.</p>
        <p className="pricing-checkout-dialog__legal">By continuing, you agree to the <Link href="/terms">Terms</Link> and <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>.</p>
      </DialogContent> : null}
    </Dialog>
    <Dialog open={Boolean(visibleCelebrationPlan)} onOpenChange={(open) => {
      if (!open) {
        setCelebratedPlan(null);
        if (celebrationPlan) setDismissedCelebrationPlan(celebrationPlan);
      }
    }}>
      {celebration ? <DialogContent className="pricing-success-dialog">
        <Confetti
          aria-hidden="true"
          className="pricing-success-dialog__confetti"
          options={{
            particleCount: 110,
            spread: 78,
            startVelocity: 36,
            gravity: 0.9,
            scalar: 0.82,
            origin: { x: 0.5, y: 0.58 },
            colors: ["#ef233c", "#ff6074", "#fff7f8", "#171214"],
          }}
        />
        <span className="pricing-success-dialog__icon"><Sparkles size={26} aria-hidden="true" /></span>
        <p className="pricing-success-dialog__eyebrow">Plan updated</p>
        <DialogTitle>{"Congrats, you’re on " + celebration.name + "!"}</DialogTitle>
        <DialogDescription>
          {"Your ScriptedFox workspace now has everything included with " + celebration.name + "."}
        </DialogDescription>
        <button className="button button--primary" type="button" onClick={() => {
          setCelebratedPlan(null);
          if (celebrationPlan) setDismissedCelebrationPlan(celebrationPlan);
        }}>
          {"Start creating with " + celebration.name}
        </button>
      </DialogContent> : null}
    </Dialog>
  </>;
}
