import { redirect } from "next/navigation";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getChannelAnalytics } from "@/lib/youtube/analytics";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ sync?: string }> }) {
  const user = await requireAuthenticatedUser();
  const { sync } = await searchParams;
  if (sync === "1") {
    await getChannelAnalytics(user.id, { forceRefresh: true });
    redirect("/dashboard/analytics");
  }
  const state = await getChannelAnalytics(user.id);
  return <AnalyticsView state={state} />;
}
