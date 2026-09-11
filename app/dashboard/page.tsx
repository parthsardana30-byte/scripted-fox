import { HomeDashboard, type DashboardSetupStatus } from "@/components/dashboard/home-dashboard";
import { NicheConfirmationDialog } from "@/components/dashboard/niche-confirmation-dialog";
import { ChannelConflictDialog } from "@/components/youtube/channel-conflict-dialog";
import { YouTubeConnectionDialog } from "@/components/youtube/youtube-connection-dialog";
import { inferCreatorNiche } from "@/lib/ai/niche";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { createClient } from "@/lib/db/client";
import type { Json } from "@/types/database";
import { getBillingAccess, hasBillingFeature } from "@/lib/billing/access";
import { getChannelAnalytics } from "@/lib/youtube/analytics";

function jsonObject(value: Json | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function videoTitles(value: Json | undefined, key: "recentVideos" | "topVideos") {
  const collection = jsonObject(value)[key];
  if (!Array.isArray(collection)) return [];
  return collection.flatMap((item) => {
    const title = jsonObject(item).title;
    return typeof title === "string" && title.trim() ? [title.trim()] : [];
  });
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ youtube?: string; notice?: string; issue?: string }> }) {
  const user = await requireAuthenticatedUser();
  const query = await searchParams;
  const metadata = user.user_metadata as Record<string, unknown>;
  const metadataName = metadata.full_name ?? metadata.name ?? metadata.display_name;
  const userName = typeof metadataName === "string" && metadataName.trim()
    ? metadataName.trim()
    : user.email?.split("@")[0] ?? "Creator";
  const supabase = await createClient();
  const [{ data: preferences }, { data: connection }, { data: nicheSnapshot }, access] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("default_script_preferences,export_defaults")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("youtube_connections")
      .select("status,channel_id,channel_title")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("channel_snapshots")
      .select("metrics")
      .eq("user_id", user.id)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getBillingAccess(user.id),
  ]);
  const scriptPreferences = jsonObject(preferences?.default_script_preferences);
  const exportDefaults = jsonObject(preferences?.export_defaults);
  const actualConnection = ["connected", "syncing", "stale"].includes(connection?.status ?? "");
  const setupMatchesChannel = actualConnection && scriptPreferences.channelSetupChannelId === connection?.channel_id;
  const hasSetupRun = setupMatchesChannel && typeof scriptPreferences.channelSetupStartedAt === "string";
  const explicitSetupStatus = hasSetupRun && typeof scriptPreferences.channelSetupStatus === "string"
    ? scriptPreferences.channelSetupStatus
    : null;
  const setupReady = actualConnection && (explicitSetupStatus === "ready" || explicitSetupStatus === null);
  const setup: DashboardSetupStatus = {
    accountCreated: true,
    channelConnected: setupReady,
    preferencesSet: ["tone", "videoLength", "detailLevel", "openingStyle"].every((key) => typeof scriptPreferences[key] === "string")
      && typeof exportDefaults.format === "string",
  };

  const analytics = setupReady ? await getChannelAnalytics(user.id) : { kind: "disconnected" as const };

  const performance = analytics.kind === "ready" ? {
    channelTitle: analytics.snapshot.channel.title,
    views: analytics.snapshot.summary.views,
    watchTimeHours: Math.round(analytics.snapshot.summary.watchTimeMinutes / 60),
    netSubscribers: analytics.snapshot.summary.subscribersGained - analytics.snapshot.summary.subscribersLost,
    subscribersTotal: analytics.snapshot.channel.lifetime.subscribers ?? 0,
    averageViewDurationSeconds: analytics.snapshot.summary.averageViewDurationSeconds,
    videos: analytics.snapshot.topVideos,
  } : null;

  const confirmedForConnectedChannel = typeof scriptPreferences.channelNiche === "string"
    && scriptPreferences.channelNiche.trim().length > 0
    && typeof scriptPreferences.channelNicheConfirmedAt === "string"
    && scriptPreferences.channelNicheChannelId === connection?.channel_id;
  const recentTitles = analytics.kind === "ready"
    ? [...new Set([
        ...(analytics.snapshot.recentVideos ?? []).map((video) => video.title),
        ...analytics.snapshot.topVideos.map((video) => video.title),
        ...videoTitles(nicheSnapshot?.metrics, "recentVideos"),
        ...videoTitles(nicheSnapshot?.metrics, "topVideos"),
      ])]
    : [...new Set([
        ...videoTitles(nicheSnapshot?.metrics, "recentVideos"),
        ...videoTitles(nicheSnapshot?.metrics, "topVideos"),
      ])];
  const suggestedNiche = actualConnection && !confirmedForConnectedChannel
    ? await inferCreatorNiche({
        channelTitle: connection?.channel_title,
        recentTitles,
      }).catch(() => null)
    : null;
  const showChannelConflict = query.youtube === "channel_in_use";
  const showConnectionDialog = query.youtube === "connect";
  const rawAccountHint = (await cookies()).get("youtube_connection_account_hint")?.value;
  let accountHint = "another Scripted Fox account";
  if (showChannelConflict && rawAccountHint) {
    try {
      const decoded = decodeURIComponent(rawAccountHint);
      if (decoded.length <= 120) accountHint = decoded;
    } catch {
      accountHint = "another Scripted Fox account";
    }
  }

  return <>
    <HomeDashboard
      setup={setup}
      canUseScriptWriter={hasBillingFeature(access, "ai_script_writer")}
      userName={userName}
      channelName={connection?.channel_title ?? null}
      performance={performance}
      channelSetup={confirmedForConnectedChannel && (explicitSetupStatus === "processing" || explicitSetupStatus === "error")
        ? {
            status: explicitSetupStatus === "error" ? "error" : "processing",
            channelName: connection?.channel_title ?? "your YouTube channel",
          }
        : null}
    />
    {query.youtube === "disconnected" ? <p className="dashboard-toast" role="status">YouTube disconnected successfully.</p> : null}
    {showChannelConflict ? <ChannelConflictDialog accountHint={accountHint} /> : null}
    {showConnectionDialog ? <YouTubeConnectionDialog connected={actualConnection} channelTitle={connection?.channel_title} notice={query.notice} issue={query.issue} /> : null}
    {actualConnection && !confirmedForConnectedChannel && !showChannelConflict && !showConnectionDialog ? (
      <NicheConfirmationDialog
        channelName={connection?.channel_title ?? "your YouTube channel"}
        suggestedNiche={suggestedNiche ?? ""}
      />
    ) : null}
  </>;
}
