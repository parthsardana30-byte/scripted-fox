import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getChannelAnalytics } from "@/lib/youtube/analytics";

export default async function AnalyticsPage() {
  const user = await requireAuthenticatedUser();
  const state = await getChannelAnalytics(user.id);
  return <AnalyticsView state={state} />;
}
