import { notFound } from "next/navigation";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { EditorWorkspace } from "@/components/dashboard/editor-workspace";
import { HomeDashboard } from "@/components/dashboard/home-dashboard";
import { IdeasView } from "@/components/dashboard/ideas-view";
import { NicheConfirmationDialog } from "@/components/dashboard/niche-confirmation-dialog";
import { SettingsView } from "@/components/dashboard/settings-view";
import { TrendingHub, type TrendSignal } from "@/components/dashboard/trending-hub";
import type { ChannelAnalyticsState } from "@/lib/youtube/analytics";

const demoTrends: TrendSignal[] = [
  { id: "dQw4w9WgXcQ", title: "I tested the creator workflow everyone is talking about", channelTitle: "Creator Lab", publishedAt: "2026-08-29T10:00:00.000Z", market: "India", views: 482000, viewsPerDay: 96400, engagementRate: 7.8, score: 96 },
  { id: "aqz-KE-bpKQ", title: "The editing system that gave me ten hours back", channelTitle: "Make Better Videos", publishedAt: "2026-08-28T10:00:00.000Z", market: "Global", views: 318000, viewsPerDay: 53000, engagementRate: 6.9, score: 91 },
  { id: "ScMzIvxBSi4", title: "How I would start a YouTube channel today", channelTitle: "The Creator Desk", publishedAt: "2026-08-27T10:00:00.000Z", market: "India", views: 247000, viewsPerDay: 35200, engagementRate: 8.1, score: 88 },
  { id: "M7lc1UVf-VE", title: "Five hook mistakes killing your retention", channelTitle: "Audience First", publishedAt: "2026-08-26T10:00:00.000Z", market: "Global", views: 196000, viewsPerDay: 24500, engagementRate: 7.2, score: 84 },
];

const demoDailyViews = [3120, 3480, 3910, 4260, 5020, 4680, 5530, 4860, 5240, 5980, 6410, 7030, 6740, 7490, 6820, 7310, 7890, 8420, 9130, 8670, 9410, 8850, 9720, 10480, 9980, 11240, 11860, 12640].map((views, index) => ({
  date: `2026-08-${String(index + 3).padStart(2, "0")}`,
  views,
}));

const demoAnalytics: ChannelAnalyticsState = {
  kind: "ready",
  isStale: false,
  snapshot: {
    schema: "youtube_channel_analytics_v2",
    channel: { id: "demo-channel", title: "Parth Creates", thumbnailUrl: null, lifetime: { views: 2840000, subscribers: 48600, subscribersHidden: false, videos: 86 } },
    period: { start: "2026-08-03", end: "2026-08-30" },
    summary: { views: 219140, watchTimeMinutes: 524160, averageViewDurationSeconds: 286, subscribersGained: 1480, subscribersLost: 220 },
    daily: demoDailyViews,
    topVideos: [
      { id: "dQw4w9WgXcQ", title: "I tested the creator workflow everyone is talking about", views: 48200, watchTimeMinutes: 121420, averageViewDurationSeconds: 302, averageViewPercentage: 58, subscribersGained: 420 },
      { id: "aqz-KE-bpKQ", title: "The simple editing system that saved me 10 hours", views: 31600, watchTimeMinutes: 83400, averageViewDurationSeconds: 318, averageViewPercentage: 64, subscribersGained: 286 },
      { id: "ScMzIvxBSi4", title: "What I would do differently starting YouTube today", views: 24700, watchTimeMinutes: 62240, averageViewDurationSeconds: 271, averageViewPercentage: 52, subscribersGained: 198 },
    ],
    capturedAt: "2026-08-31T10:30:00.000Z",
  },
};

export default async function UiPreviewPage({ searchParams }: { searchParams: Promise<{ view?: string; topic?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const requestedView = params.view ?? "overview";
  const activeView = ["overview", "trending", "script", "topics", "analytics", "settings"].includes(requestedView) ? requestedView : "overview";

  const content = activeView === "trending" ? <TrendingHub demoSignals={demoTrends} />
    : activeView === "script" ? <EditorWorkspace canUseAdvancedExports canUseScriptWriter versionChangeLimit={10} returnPath="/ui-preview?view=script" initialPrompt={params.topic ?? ""} />
      : activeView === "topics" ? <IdeasView canUseScriptWriter demoMode />
        : activeView === "analytics" ? <AnalyticsView state={demoAnalytics} syncHref="/ui-preview?view=analytics" />
          : activeView === "settings" ? <SettingsView
              account={{
                displayName: "Parth",
                email: "parth@example.com",
                memberSince: "31 Aug 2026",
                signInMethod: "Google",
                hasPassword: false,
                hasGoogle: true,
                channelNiche: "Creator Education",
                channelGoal: "growth",
                connection: { active: true, title: "Parth Creates", status: "Status: connected" },
                plan: { name: "Plus", description: "Trial access is active." },
              }}
              channel={{ name: "Parth Creates", niche: "Creator Education" }}
              initialValues={{ language: "en", secondaryLanguage: "none", market: "IN", tone: "clear", videoLength: "7-10", openingStyle: "value-first" }}
            />
          : <HomeDashboard
            demoMode
            setup={{ accountCreated: true, channelConnected: true, preferencesSet: false }}
            userName="Parth"
            performance={{
              channelTitle: "Parth Creates",
              views: 128430,
              watchTimeHours: 8420,
              netSubscribers: 1260,
              averageViewDurationSeconds: 286,
              videos: [
                { id: "dQw4w9WgXcQ", title: "I tested the creator workflow everyone is talking about", views: 48200, averageViewPercentage: 58 },
                { id: "aqz-KE-bpKQ", title: "The simple editing system that saved me 10 hours", views: 31600, averageViewPercentage: 64 },
                { id: "ScMzIvxBSi4", title: "What I would do differently starting YouTube today", views: 24700, averageViewPercentage: 52 },
              ],
            }}
          />;

  return (
    <DashboardShell previewMode activePreview={activeView} defaultCollapsed plan="pro">
      {content}
      {requestedView === "niche" ? (
        <NicheConfirmationDialog
          channelName="Parth Creates"
          suggestedNiche="Piano covers"
        />
      ) : null}
    </DashboardShell>
  );
}
