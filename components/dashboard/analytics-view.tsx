import Link from "next/link";
import { BarChart3, Clock3, Eye, Link2, RotateCcw, Timer, UsersRound, Video } from "lucide-react";

import type { AnalyticsSnapshot, ChannelAnalyticsState } from "@/lib/youtube/analytics";
import { PageHeader } from "./page-header";

const compactNumber = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
const wholeNumber = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

function formatDuration(seconds: number) {
  const rounded = Math.max(0, Math.round(seconds));
  return `${Math.floor(rounded / 60)}:${(rounded % 60).toString().padStart(2, "0")}`;
}

function weeklyViews(snapshot: AnalyticsSnapshot) {
  const weeks: Array<{ label: string; views: number }> = [];
  for (let index = 0; index < snapshot.daily.length; index += 7) {
    const days = snapshot.daily.slice(index, index + 7);
    if (days.length === 0) continue;
    const start = shortDate.format(new Date(`${days[0].date}T00:00:00Z`));
    const end = shortDate.format(new Date(`${days[days.length - 1].date}T00:00:00Z`));
    weeks.push({ label: `${start}–${end}`, views: days.reduce((sum, day) => sum + day.views, 0) });
  }
  return weeks;
}

function AnalyticsGate({ state }: { state: Exclude<ChannelAnalyticsState, { kind: "ready" }> }) {
  const permissionExpired = state.kind === "permission_expired";
  const unavailable = state.kind === "unavailable";
  const title = permissionExpired
    ? "Reconnect your YouTube channel"
    : unavailable
      ? "Channel analytics are unavailable"
      : "Connect YouTube to see your analytics";
  const detail = permissionExpired
    ? "Google no longer allows access to this channel. Reconnect it to continue syncing analytics."
    : unavailable
      ? "The channel is connected, but YouTube could not return its analytics right now. Try again from the connection page."
      : "Your channel totals, recent performance, and top videos will appear here after you connect a channel.";

  return <div className="dashboard-page dashboard-analytics">
    <PageHeader title="Channel analytics" description="Understand what is working before you plan your next video." />
    <section className="dashboard-empty analytics-empty" aria-labelledby="analytics-empty-title">
      <span className="analytics-empty__icon">{permissionExpired ? <RotateCcw size={22} aria-hidden="true" /> : <Link2 size={22} aria-hidden="true" />}</span>
      <h2 id="analytics-empty-title">{title}</h2>
      <p>{detail}</p>
      <Link className="button button--primary" href="/connect">{permissionExpired || unavailable ? "Manage connection" : "Connect YouTube"}</Link>
    </section>
  </div>;
}

export function AnalyticsView({ state }: { state: ChannelAnalyticsState }) {
  if (state.kind !== "ready") return <AnalyticsGate state={state} />;

  const { snapshot, isStale } = state;
  const weeks = weeklyViews(snapshot);
  const maxWeeklyViews = Math.max(...weeks.map((week) => week.views), 1);
  const maxVideoViews = Math.max(...snapshot.topVideos.map((video) => video.views), 1);
  const netSubscribers = snapshot.summary.subscribersGained - snapshot.summary.subscribersLost;
  const periodLabel = `${shortDate.format(new Date(`${snapshot.period.start}T00:00:00Z`))}–${shortDate.format(new Date(`${snapshot.period.end}T00:00:00Z`))}`;
  const updatedLabel = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(snapshot.capturedAt));

  return <div className="dashboard-page dashboard-analytics">
    <PageHeader title="Channel analytics" description={`${snapshot.channel.title} · ${periodLabel}`} actions={<span className="analytics-updated">{isStale ? "Showing saved data" : "Updated"} {updatedLabel}</span>} />
    {isStale ? <p className="analytics-notice" role="status">YouTube could not refresh the channel. These are the latest saved results.</p> : null}

    <dl className="analytics-summary analytics-summary--four">
      <div><dt><Eye size={16} aria-hidden="true" /> Views</dt><dd>{compactNumber.format(snapshot.summary.views)}</dd><small>Last 28 days</small></div>
      <div><dt><Clock3 size={16} aria-hidden="true" /> Watch time</dt><dd>{wholeNumber.format(snapshot.summary.watchTimeMinutes / 60)} hr</dd><small>Last 28 days</small></div>
      <div><dt><UsersRound size={16} aria-hidden="true" /> Subscribers</dt><dd>{netSubscribers > 0 ? "+" : ""}{wholeNumber.format(netSubscribers)}</dd><small>{wholeNumber.format(snapshot.summary.subscribersGained)} gained · {wholeNumber.format(snapshot.summary.subscribersLost)} lost</small></div>
      <div><dt><Timer size={16} aria-hidden="true" /> Average view</dt><dd>{formatDuration(snapshot.summary.averageViewDurationSeconds)}</dd><small>Per view</small></div>
    </dl>

    <div className="analytics-grid">
      <section className="dashboard-panel analytics-chart" aria-labelledby="top-videos-title">
        <div className="dashboard-section-heading"><div><h2 id="top-videos-title">Top videos</h2><p>Ranked by views in this period.</p></div><Video size={20} aria-hidden="true" /></div>
        {snapshot.topVideos.length > 0 ? <div className="analytics-bars">{snapshot.topVideos.map((video) => <div key={video.id}>
          <div><span>{video.title}</span><strong>{compactNumber.format(video.views)} views · {wholeNumber.format(video.averageViewPercentage)}% viewed</strong></div>
          <span className="analytics-bar" aria-hidden="true"><i style={{ width: `${video.views === 0 ? 0 : Math.max(2, video.views / maxVideoViews * 100)}%` }} /></span>
        </div>)}</div> : <p className="analytics-panel-empty">No video activity was reported for this period.</p>}
      </section>

      <section className="dashboard-panel analytics-chart" aria-labelledby="view-trend-title">
        <div className="dashboard-section-heading"><div><h2 id="view-trend-title">Four-week view trend</h2><p>Weekly totals from the same 28-day period.</p></div><BarChart3 size={20} aria-hidden="true" /></div>
        {weeks.length > 0 ? <div className="analytics-bars analytics-bars--weeks">{weeks.map((week) => <div key={week.label}>
          <div><span>{week.label}</span><strong>{compactNumber.format(week.views)} views</strong></div>
          <span className="analytics-bar" aria-hidden="true"><i style={{ width: `${week.views === 0 ? 0 : Math.max(2, week.views / maxWeeklyViews * 100)}%` }} /></span>
        </div>)}</div> : <p className="analytics-panel-empty">No daily view data was reported for this period.</p>}
      </section>
    </div>

    <section className="analytics-lifetime" aria-labelledby="channel-totals-title">
      <div><h2 id="channel-totals-title">Channel totals</h2><p>Lifetime figures currently reported by YouTube.</p></div>
      <dl>
        <div><dt>Total views</dt><dd>{snapshot.channel.lifetime.views === null ? "—" : compactNumber.format(snapshot.channel.lifetime.views)}</dd></div>
        <div><dt>Subscribers</dt><dd>{snapshot.channel.lifetime.subscribersHidden || snapshot.channel.lifetime.subscribers === null ? "Hidden" : compactNumber.format(snapshot.channel.lifetime.subscribers)}</dd></div>
        <div><dt>Videos</dt><dd>{snapshot.channel.lifetime.videos === null ? "—" : wholeNumber.format(snapshot.channel.lifetime.videos)}</dd></div>
      </dl>
    </section>
  </div>;
}
