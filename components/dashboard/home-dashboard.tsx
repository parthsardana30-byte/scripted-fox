import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Circle, MoonStar } from "lucide-react";
import type { CSSProperties } from "react";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { OverviewInsightCards } from "@/components/dashboard/overview-insight-cards";
import type { PlanCode } from "@/lib/billing/plans";

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

export function HomeDashboard({ setup, userName = "Creator", channelName = null, performance = null, plan = "free", demoMode = false }: {
  setup: DashboardSetupStatus;
  canUseScriptWriter?: boolean;
  userName?: string;
  channelName?: string | null;
  performance?: OverviewPerformance | null;
  plan?: PlanCode;
  demoMode?: boolean;
}) {
  const destination = (href: string) => demoMode
    ? href === "/dashboard/analytics" ? "/ui-preview?view=analytics"
      : href === "/dashboard/settings" ? "/ui-preview?view=settings"
        : "/ui-preview"
    : href;
  const setupItems = [
    { complete: setup.accountCreated, title: "Account created", detail: "Your workspace is ready.", href: null, action: null },
    { complete: setup.channelConnected, title: "Channel connected", detail: setup.channelConnected ? "Your YouTube channel is connected." : "Connect YouTube to unlock channel performance.", href: "/connect", action: "Connect channel" },
    { complete: setup.preferencesSet, title: "Set your script preferences", detail: "Choose tone, length, structure, and export defaults.", href: "/dashboard/settings", action: "Set preferences" },
  ];
  const completed = setupItems.filter((item) => item.complete).length;
  const resolvedChannelName = performance?.channelTitle ?? channelName ?? "YouTube channel";
  const planUi = plan === "elite"
    ? { key: "pro", label: "Pro" }
    : plan === "pro"
      ? { key: "plus", label: "Plus" }
      : { key: "basic", label: "Basic" };

  return (
    <div className="dashboard-page dashboard-home dashboard-overview">
      <header className="dashboard-overview__intro">
        <DashboardGreeting userName={userName} />
        <div className="dashboard-overview__actions">
          <Link className={`dashboard-plan-badge dashboard-plan-badge--${planUi.key}`} href={destination("/dashboard/upgrade")} aria-label={`Current plan: ${planUi.label}`}>
            <span className="dashboard-plan-badge__dark-icon" aria-hidden="true"><MoonStar size={18} /></span>
            <strong>{planUi.label}</strong>
          </Link>
          {setup.channelConnected ? (
            <Link className="dashboard-channel-badge" href={destination("/connect")} aria-label={`Connected YouTube channel: ${resolvedChannelName}`}>
              <span className="dashboard-channel-badge__logo" aria-hidden="true">
                <Image src="/youtube-glass-channel.png" alt="" width={64} height={64} priority />
              </span>
              <span className="dashboard-channel-badge__copy"><small>YouTube channel</small><strong>{resolvedChannelName}</strong></span>
            </Link>
          ) : null}
        </div>
      </header>

      {completed < setupItems.length ? (
        <section className="overview-setup" aria-labelledby="finish-setup-title">
          <div className="overview-setup__heading"><div><h2 id="finish-setup-title">Finish setup</h2><p>Complete these steps to personalize every recommendation.</p></div><span>{completed} of {setupItems.length}</span></div>
          <div className="overview-setup__progress" aria-hidden="true"><i style={{ "--setup-progress": `${completed / setupItems.length * 100}%` } as CSSProperties} /></div>
          <ul>
            {setupItems.map((item) => <li className={item.complete ? "is-complete" : ""} key={item.title}>
              {item.complete ? <Check size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}
              <div><strong>{item.title}</strong><p>{item.detail}</p>{!item.complete && item.href && item.action ? <Link href={destination(item.href)}>{item.action} <ArrowRight size={14} aria-hidden="true" /></Link> : null}</div>
            </li>)}
          </ul>
        </section>
      ) : null}
      <OverviewInsightCards
        latestVideo={performance?.videos[0] ?? null}
        subscriberCount={performance?.subscribersTotal ?? 0}
        channelName={resolvedChannelName}
        demoMode={demoMode}
      />
    </div>
  );
}
