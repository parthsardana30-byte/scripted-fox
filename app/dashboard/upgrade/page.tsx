import Link from "next/link";

import { PricingCatalogue } from "@/components/billing/pricing-catalogue";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getBillingAccess } from "@/lib/billing/access";
import { isPayuConfigured } from "@/lib/billing/payu";
import { featureLabels, getPlanDisplayName, isBillingFeature, isPlanCode } from "@/lib/billing/plans";
import { isPlanTestingUser } from "@/lib/billing/testing";

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
  const testMode = isPlanTestingUser(user.id) && !payuConfigured;
  const paymentStatus = ["success", "failed", "pending", "invalid"].includes(params.payment ?? "")
    ? params.payment
    : null;

  return <div className="dashboard-page dashboard-upgrade">
    <section className="upgrade-pricing-shell">
      <div className="upgrade-pricing-topbar">
        <Link className="upgrade-back-link" href="/dashboard/account">Back to account</Link>
      </div>
      <header className="upgrade-pricing-hero">
        <h1>Simple, transparent <span>pricing</span></h1>
      </header>
      {paymentStatus ? <div className="upgrade-context" role="status">
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
      </div> : testMode ? <div className="upgrade-context upgrade-context--test" role="status">
      <strong>Plan testing is active.</strong>
      <p>Select any plan to switch access instantly. No payment or charge will be created.</p>
      </div> : feature || requestedPlan ? <div className="upgrade-context" role="status">
      <strong>{feature ? featureLabels[feature] + " is a paid feature." : getPlanDisplayName(requestedPlan!) + " access selected."}</strong>
      <p>{payuConfigured ? "Complete the secure payment through PayU to activate access." : "PayU merchant credentials are still required."}</p>
      </div> : null}
      <PricingCatalogue currentPlan={access.plan} signedIn testMode={testMode} payuConfigured={payuConfigured} />
      <p className="pricing-note">
        {testMode
          ? "Testing mode is temporary. Plan changes update access immediately and do not create a payment."
          : payuConfigured
            ? "Secure payments by PayU. Access begins only after payment verification."
            : "The PayU flow is ready; add the merchant key and salt to enable checkout."}
      </p>
    </section>
  </div>;
}
