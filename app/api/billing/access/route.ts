import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import { getBillingAccess, hasBillingFeature } from "@/lib/billing/access";
import { billingFeatures } from "@/lib/billing/plans";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const access = await getBillingAccess(user.id);
    return Response.json({
      plan: access.plan,
      status: access.status,
      trialEndsAt: access.trialEndsAt,
      currentPeriodEnd: access.currentPeriodEnd,
      features: Object.fromEntries(billingFeatures.map((feature) => [feature, hasBillingFeature(access, feature)])),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: "Sign in to view plan access." }, { status: 401 });
    return Response.json({ error: "Plan access is unavailable." }, { status: 500 });
  }
}
