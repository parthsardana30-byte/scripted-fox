import type { Metadata } from "next";
import Link from "next/link";

import { PricingCatalogue } from "@/components/billing/pricing-catalogue";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { isPayuConfigured } from "@/lib/billing/payu";
import { featureLabels, isBillingFeature } from "@/lib/billing/plans";
import { isPlanTestingUser } from "@/lib/billing/testing";
import { getLandingUser } from "@/lib/landing-user";
import "../landing-youtube.css";
import "./pricing.css";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Choose how much planning, writing, and channel analysis you need.",
  alternates: { canonical: "/pricing" },
};

function safeInternalPath(value: string | string[] | undefined) {
  const path = typeof value === "string" ? value : null;
  return path?.startsWith("/") && !path.startsWith("//") ? path : undefined;
}

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ feature?: string | string[]; next?: string | string[] }> }) {
  const [user, params] = await Promise.all([getLandingUser(), searchParams]);
  const access = user
    ? await import("@/lib/billing/access").then(({ getBillingAccess }) => getBillingAccess(user.id))
    : null;
  const feature = isBillingFeature(params.feature) ? params.feature : null;
  const returnTo = safeInternalPath(params.next);
  const payuConfigured = isPayuConfigured();
  const testMode = user ? isPlanTestingUser(user.id) && !payuConfigured : false;

  return <div className="youtube-landing pricing-shell">
    <SiteHeader variant="creator" isAuthenticated={Boolean(user)} />
    <main className="pricing-page">
      <section className="pricing-hero section-shell">
        <div className="pricing-hero__lead">
          <p className="pricing-kicker">Simple plans</p>
          <h1>Try the workspace. Upgrade when you need more.</h1>
        </div>
        <p>Start with Basic. Continue with Plus for focused script writing, or choose Pro when you need a longer version history.</p>
      </section>
      <section className="section-shell pricing-section">
        {feature ? <div className="pricing-context" role="status">
          <div>
            <strong>{featureLabels[feature]}</strong>
            <p>{feature === "ai_script_writer" ? "Choose Plus or Pro to generate and revise scripts with AI." : "Choose a plan that includes this premium feature."}</p>
          </div>
          {returnTo ? <Link href={returnTo}>Return to your script</Link> : null}
        </div> : null}
        <PricingCatalogue currentPlan={access?.plan} signedIn={Boolean(user)} returnTo={returnTo} testMode={testMode} payuConfigured={payuConfigured} />
        <div className="pricing-status" role="note">
          <strong>{testMode ? "Plan testing is active." : payuConfigured ? "Secure PayU checkout" : "PayU setup pending"}</strong>
          <p>
            {testMode
              ? "Signed-in users can switch plans instantly for testing. No payment or charge is created."
              : payuConfigured
                ? "Paid access starts only after PayU verifies the transaction."
                : "The checkout flow is ready and will activate after merchant credentials are added."}
          </p>
        </div>
      </section>
    </main>
    <SiteFooter variant="creator" />
  </div>;
}
