import Image from "next/image";
import Link from "next/link";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { OverviewInsightCards } from "@/components/dashboard/overview-insight-cards";
import { ChannelSetupProgress } from "@/components/dashboard/channel-setup-progress";

export type DashboardSetupStatus = { accountCreated: boolean; channelConnected: boolean; preferencesSet: boolean };
export type OverviewPerformance = {
  channelTitle: string;
  views: number;
  watchTimeHours: number;
  netSubscribers: number;
  subscribersTotal?: number;
  averageViewDurationSeconds: number;
  videos: Array<{ id: string; title: string; views: number; averageViewPercentage: number }>;
};

export function HomeDashboard({ setup, userName = "Creator", channelName = null, performance = null, demoMode = false, channelSetup = null }: {
  setup: DashboardSetupStatus;
  canUseScriptWriter?: boolean;
  userName?: string;
  channelName?: string | null;
  performance?: OverviewPerformance | null;
  demoMode?: boolean;
  channelSetup?: { status: "processing" | "error"; channelName: string } | null;
}) {
  const destination = (href: string) => demoMode
    ? href === "/dashboard/analytics" ? "/ui-preview?view=analytics"
      : href === "/dashboard/settings" ? "/ui-preview?view=settings"
        : "/ui-preview"
    : href;
  const resolvedChannelName = performance?.channelTitle ?? channelName ?? "YouTube channel";
  return (
    <div className="dashboard-page dashboard-home dashboard-overview">
      <header className="dashboard-overview__intro">
        <DashboardGreeting userName={userName} />
        <div className="dashboard-overview__actions">
          {channelSetup ? <ChannelSetupProgress initialStatus={channelSetup.status} channelName={channelSetup.channelName} /> : setup.channelConnected ? (
            <Link className="dashboard-channel-badge" href={destination("/connect")} aria-label={`Connected YouTube channel: ${resolvedChannelName}`}>
              <span className="dashboard-channel-badge__logo" aria-hidden="true">
                <Image src="/youtube-glass-channel.png" alt="" width={64} height={64} priority />
              </span>
              <span className="dashboard-channel-badge__copy"><small>YouTube channel</small><strong>{resolvedChannelName}</strong></span>
            </Link>
          ) : (
            <Link className="dashboard-youtube-connect" href={destination("/connect")}>
              <span aria-hidden="true"><Image src="/youtube-glass-channel.png" alt="" width={48} height={48} /></span>
              Connect YouTube
            </Link>
          )}
        </div>
      </header>
      <OverviewInsightCards
        latestVideo={performance?.videos[0] ?? null}
        subscriberCount={performance?.subscribersTotal ?? 0}
        channelName={resolvedChannelName}
        demoMode={demoMode}
        enabled={!channelSetup}
      />
    </div>
  );
}
