import Link from "next/link";
import { BarChart3, Clock3, Eye, Link2, RefreshCw, RotateCcw, Timer, TrendingUp, Trophy, UsersRound, Video } from "lucide-react";

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
    <PageHeader title={<>Channel <span className="analytics-title-accent">analytics</span></>} description="See what’s working across your channel." />
    <section className="dashboard-empty analytics-empty" aria-labelledby="analytics-empty-title">
      <span className="analytics-empty__icon">{permissionExpired ? <RotateCcw size={22} aria-hidden="true" /> : <Link2 size={22} aria-hidden="true" />}</span>
      <h2 id="analytics-empty-title">{title}</h2>
      <p>{detail}</p>
      <Link className="button button--primary" href="/connect">{permissionExpired || unavailable ? "Manage connection" : "Connect YouTube"}</Link>
    </section>
  </div>;
}

export function AnalyticsView({ state, syncHref = "/dashboard/analytics?sync=1" }: { state: ChannelAnalyticsState; syncHref?: string }) {
  if (state.kind !== "ready") return <AnalyticsGate state={state} />;

  const { snapshot, isStale } = state;
  const weeks = weeklyViews(snapshot);
  const maxWeeklyViews = Math.max(...weeks.map((week) => week.views), 1);
  const maxVideoViews = Math.max(...snapshot.topVideos.map((video) => video.views), 1);
  const netSubscribers = snapshot.summary.subscribersGained - snapshot.summary.subscribersLost;
  return <div className="dashboard-page dashboard-analytics">
    <PageHeader
      title={<>Channel <span className="analytics-title-accent">analytics</span></>}
      description="See what’s working across your channel."
      actions={<Link className="trending-refresh analytics-sync" href={syncHref} prefetch={false} aria-label="Sync channel analytics"><span className="trending-refresh__radar" aria-hidden="true"><RefreshCw size={22} /></span><span className="trending-refresh__label">SYNC</span></Link>}
    />
    {isStale ? <p className="analytics-notice" role="status">YouTube could not refresh the channel. These are the latest saved results.</p> : null}

    <dl className="analytics-summary analytics-summary--four">
      <div className="analytics-metric-card analytics-metric-card--signal"><dt><span><Eye size={17} aria-hidden="true" /></span>Views</dt><dd>{compactNumber.format(snapshot.summary.views)}</dd><small>Last 28 days</small></div>
      <div className="analytics-metric-card analytics-metric-card--dark"><dt><span><Clock3 size={17} aria-hidden="true" /></span>Watch time</dt><dd>{wholeNumber.format(snapshot.summary.watchTimeMinutes / 60)} <em>hr</em></dd><small>Last 28 days</small></div>
      <div className="analytics-metric-card"><dt><span><UsersRound size={17} aria-hidden="true" /></span>Subscribers</dt><dd>{netSubscribers > 0 ? "+" : ""}{wholeNumber.format(netSubscribers)}</dd><small>{wholeNumber.format(snapshot.summary.subscribersGained)} gained · {wholeNumber.format(snapshot.summary.subscribersLost)} lost</small></div>
      <div className="analytics-metric-card"><dt><span><Timer size={17} aria-hidden="true" /></span>Average view</dt><dd>{formatDuration(snapshot.summary.averageViewDurationSeconds)}</dd><small>Per view</small></div>
    </dl>

    <div className="analytics-grid">
      <section className="dashboard-panel analytics-chart analytics-top-videos" aria-labelledby="top-videos-title">
        <div className="dashboard-section-heading"><div><p className="analytics-panel-kicker"><Trophy size={14} aria-hidden="true" />Content leaders</p><h2 id="top-videos-title">Top videos</h2><p>Ranked by views in this period.</p></div><span className="analytics-panel-icon"><Video size={20} aria-hidden="true" /></span></div>
        {snapshot.topVideos.length > 0 ? <div className="analytics-video-list">{snapshot.topVideos.map((video, index) => <article key={video.id}>
          <span className="analytics-video-rank">{String(index + 1).padStart(2, "0")}</span>
          <div className="analytics-video-copy"><strong>{video.title}</strong><span className="analytics-bar" aria-hidden="true"><i style={{ width: `${video.views === 0 ? 0 : Math.max(2, video.views / maxVideoViews * 100)}%` }} /></span></div>
          <div className="analytics-video-metrics"><strong>{compactNumber.format(video.views)}</strong><small>views</small><em>{wholeNumber.format(video.averageViewPercentage)}% viewed</em></div>
        </article>)}</div> : <p className="analytics-panel-empty">No video activity was reported for this period.</p>}
      </section>

      <section className="dashboard-panel analytics-chart analytics-weekly" aria-labelledby="view-trend-title">
        <div className="dashboard-section-heading"><div><p className="analytics-panel-kicker"><TrendingUp size={14} aria-hidden="true" />Momentum</p><h2 id="view-trend-title">Four-week view trend</h2><p>Weekly totals from the same 28-day period.</p></div><span className="analytics-panel-icon"><BarChart3 size={20} aria-hidden="true" /></span></div>
        {weeks.length > 0 ? <div className="analytics-weekly-chart" aria-label="Weekly views">{weeks.map((week) => <div className="analytics-week" key={week.label}>
          <strong>{compactNumber.format(week.views)}</strong>
          <span className="analytics-week__track" aria-hidden="true"><i style={{ height: `${week.views === 0 ? 0 : Math.max(5, week.views / maxWeeklyViews * 100)}%` }} /></span>
          <small>{week.label}</small>
        </div>)}</div> : <p className="analytics-panel-empty">No daily view data was reported for this period.</p>}
      </section>
    </div>

    <section className="analytics-lifetime" aria-labelledby="channel-totals-title">
      <div><h2 id="channel-totals-title">Channel totals</h2><p>Lifetime figures currently reported by YouTube.</p></div>
      <dl>
        <div><dt>Total views</dt><dd>{snapshot.channel.lifetime.views === null ? "—" : compactNumber.format(snapshot.channel.lifetime.views)}</dd><Eye size={17} aria-hidden="true" /></div>
        <div><dt>Subscribers</dt><dd>{snapshot.channel.lifetime.subscribersHidden || snapshot.channel.lifetime.subscribers === null ? "Hidden" : compactNumber.format(snapshot.channel.lifetime.subscribers)}</dd><UsersRound size={17} aria-hidden="true" /></div>
        <div><dt>Videos</dt><dd>{snapshot.channel.lifetime.videos === null ? "—" : wholeNumber.format(snapshot.channel.lifetime.videos)}</dd><Video size={17} aria-hidden="true" /></div>
      </dl>
    </section>
  </div>;
}
