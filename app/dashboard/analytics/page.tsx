import { redirect } from "next/navigation";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getChannelAnalytics } from "@/lib/youtube/analytics";
import { getBillingAccess, hasBillingFeature } from "@/lib/billing/access";
import { syncAnalytics } from "./actions";

export default async function AnalyticsPage() {
  const user = await requireAuthenticatedUser();
  const access = await getBillingAccess(user.id);
  if (!hasBillingFeature(access, "advanced_analytics")) redirect("/dashboard/upgrade?feature=advanced_analytics");
  const state = await getChannelAnalytics(user.id);
  return <AnalyticsView state={state} syncAction={syncAnalytics} />;
}
