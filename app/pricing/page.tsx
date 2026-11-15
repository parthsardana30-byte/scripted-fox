import Link from "next/link";

import { PricingCatalogue } from "@/components/billing/pricing-catalogue";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { isPayuConfigured } from "@/lib/billing/payu";
import { featureLabels, isBillingFeature } from "@/lib/billing/plans";
import { getLandingUser } from "@/lib/landing-user";
import { pageMetadata } from "@/lib/seo";
import "../landing-youtube.css";
import "./pricing.css";

export const metadata = pageMetadata({
  title: "Pricing",
  description: "Choose how much planning, writing, and channel analysis you need.",
  path: "/pricing",
});

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

  return <div className="youtube-landing pricing-shell">
    <SiteHeader variant="creator" isAuthenticated={Boolean(user)} />
    <main className="pricing-page">
      <section className="pricing-hero section-shell">
        <div className="pricing-hero__lead">
          <p className="pricing-kicker">Simple plans</p>
          <h1>Try the workspace. Upgrade when you need more.</h1>
        </div>
        <p>Try ScriptedFox free for 7 days, choose Pro for a complete writing workflow, or unlock deeper research and publishing tools with Gold.</p>
      </section>
      <section className="section-shell pricing-section">
        {feature ? <div className="pricing-context" role="status">
          <div>
            <strong>{featureLabels[feature]}</strong>
            <p>{feature === "ai_script_writer" ? "Choose Pro or Gold to generate and revise scripts with AI." : "Choose a plan that includes this premium feature."}</p>
          </div>
          {returnTo ? <Link href={returnTo}>Return to your script</Link> : null}
        </div> : null}
        <PricingCatalogue currentPlan={access?.plan} signedIn={Boolean(user)} returnTo={returnTo} payuConfigured={payuConfigured} />
        <div className="pricing-status" role="note">
          <strong>{payuConfigured ? "Secure PayU checkout" : "PayU setup pending"}</strong>
          <p>
            {payuConfigured
                ? "Paid access starts only after PayU verifies the transaction."
                : "The checkout flow is ready and will activate after merchant credentials are added."}
          </p>
        </div>
      </section>
    </main>
    <SiteFooter variant="creator" />
  </div>;
}
