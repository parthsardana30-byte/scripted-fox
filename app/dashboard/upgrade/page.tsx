import { PricingCatalogue } from "@/components/billing/pricing-catalogue";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getBillingAccess } from "@/lib/billing/access";
import { isPayuConfigured } from "@/lib/billing/payu";
import { featureLabels, getPlanDisplayName, isBillingFeature, isPlanCode } from "@/lib/billing/plans";
import "../../landing-youtube.css";
import "../../pricing/pricing.css";
import "./upgrade.css";

type UpgradeSearchParams = {
  feature?: string;
  plan?: string;
  payment?: string;
};

export default async function UpgradePage({ searchParams }: { searchParams: Promise<UpgradeSearchParams> }) {
  const [user, params] = await Promise.all([requireAuthenticatedUser(), searchParams]);
  const access = await getBillingAccess(user.id);
  const feature = isBillingFeature(params.feature) ? params.feature : null;
  const requestedPlan = isPlanCode(params.plan) && params.plan !== "free" ? params.plan : null;
  const payuConfigured = isPayuConfigured();
  const paymentStatus = ["success", "failed", "pending", "invalid"].includes(params.payment ?? "")
    ? params.payment
    : null;

  return <div className="dashboard-page dashboard-pricing youtube-landing pricing-shell">
    <main className="pricing-page">
      <header className="section-shell dashboard-pricing__header">
        <h1>A plan for your next <span>chapter.</span></h1>
        <p className="dashboard-pricing__subtitle">Create at your pace. Upgrade when you need more.</p>
      </header>
      <section className="section-shell pricing-section">
        {paymentStatus ? <div className="pricing-context" role="status">
          <div>
            <strong>
              {paymentStatus === "success"
                ? (requestedPlan ? getPlanDisplayName(requestedPlan) : "Your paid plan") + " is active."
                : paymentStatus === "pending"
                  ? "Your payment is being verified."
                  : "Payment was not completed."}
            </strong>
            <p>
              {paymentStatus === "success"
                ? "PayU verified the payment and your access has been updated."
                : paymentStatus === "pending"
                  ? "No access change will be made until PayU confirms the payment."
                  : "No paid access was activated. You can safely try again."}
            </p>
          </div>
        </div> : feature || requestedPlan ? <div className="pricing-context" role="status">
          <div>
            <strong>{feature ? featureLabels[feature] + " is a paid feature." : getPlanDisplayName(requestedPlan!) + " access selected."}</strong>
            <p>{payuConfigured ? "Complete the secure payment through PayU to activate access." : "PayU merchant credentials are still required."}</p>
          </div>
        </div> : null}
        <PricingCatalogue
          compact
          currentPlan={access.plan}
          signedIn
          payuConfigured={payuConfigured}
          celebrationPlan={paymentStatus === "success" ? (requestedPlan ?? access.plan) : undefined}
        />
      </section>
    </main>
  </div>;
}
