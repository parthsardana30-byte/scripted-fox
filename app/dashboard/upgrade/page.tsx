import Link from "next/link";

import { PricingCatalogue } from "@/components/billing/pricing-catalogue";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getBillingAccess } from "@/lib/billing/access";
import { featureLabels, isBillingFeature, isPlanCode } from "@/lib/billing/plans";

export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ feature?: string; plan?: string }> }) {
  const [user, params] = await Promise.all([requireAuthenticatedUser(), searchParams]);
  const access = await getBillingAccess(user.id);
  const feature = isBillingFeature(params.feature) ? params.feature : null;
  const requestedPlan = isPlanCode(params.plan) && params.plan !== "free" ? params.plan : null;

  return <div className="dashboard-page dashboard-upgrade">
    <PageHeader title="Plans and access" description="Choose the level of support your workflow needs." actions={<Link className="button button--secondary button--small" href="/dashboard/account">Back to account</Link>} />
    {feature || requestedPlan ? <div className="upgrade-context" role="status">
      <strong>{feature ? `${featureLabels[feature]} is a paid feature.` : `${requestedPlan} access selected.`}</strong>
      <p>Checkout is not active yet. You can continue using the workspace while the trial, prices, and premium features are finalized.</p>
    </div> : null}
    <PricingCatalogue currentPlan={access.plan} signedIn />
    <p className="pricing-note">PayU is the planned billing provider. Plan access will change only after a verified server-to-server payment event—never from a browser-side value.</p>
  </div>;
}
