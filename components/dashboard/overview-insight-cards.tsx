"use client";

import Link from "next/link";
import { ArrowRight, Eye, Lightbulb, Star, Target, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { dashboardSnapshot } from "@/lib/dashboard-mocks";

type Topic = { id: string; title: string };
type TrendSignal = {
  id: string;
  title: string;
  channelTitle: string;
  channelSubscribers: number | null;
  views: number;
  viewsPerDay: number;
  nicheRelevance?: number | null;
};
type LatestVideo = { id: string; title: string; views: number; averageViewPercentage: number };

const compactNumber = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

function ratingLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Good start";
  return "Needs a stronger hook";
}

export function OverviewInsightCards({
  latestVideo = null,
  subscriberCount = 0,
  channelName = null,
  demoMode = false,
  enabled = true,
}: {
  latestVideo?: LatestVideo | null;
  subscriberCount?: number;
  channelName?: string | null;
  demoMode?: boolean;
  enabled?: boolean;
}) {
  const useDemoData = demoMode || process.env.NODE_ENV === "test";
  const [topics, setTopics] = useState<Topic[]>(useDemoData ? dashboardSnapshot.recommendations.slice(0, 5) : []);
  const [signals, setSignals] = useState<TrendSignal[]>(useDemoData ? [
    { id: "demo-1", title: "The format viewers are choosing now", channelTitle: "Creator Next Door", channelSubscribers: Math.max(120, subscriberCount + 80), views: 18400, viewsPerDay: 2600 },
    { id: "demo-2", title: "A sharper take on your niche", channelTitle: "Small Channel Lab", channelSubscribers: Math.max(90, subscriberCount), views: 12600, viewsPerDay: 1800 },
  ] : []);
  const [topicsLoading, setTopicsLoading] = useState(!useDemoData && enabled);
  const [targetsLoading, setTargetsLoading] = useState(!useDemoData && enabled);

  useEffect(() => {
    if (useDemoData || !enabled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const ideasResponse = await fetch("/api/ideas/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ excludeTitles: [] }),
        });
        const ideasPayload = await ideasResponse.json() as { ideas?: Topic[] };
        if (!cancelled && ideasResponse.ok && ideasPayload.ideas) setTopics(ideasPayload.ideas.slice(0, 5));
      } finally {
        if (!cancelled) setTopicsLoading(false);
      }

      try {
        const trendsResponse = await fetch("/api/trends", { cache: "no-store" });
        const trendsPayload = await trendsResponse.json() as { signals?: TrendSignal[] };
        if (!cancelled && trendsResponse.ok && trendsPayload.signals) setSignals(trendsPayload.signals);
      } finally {
        if (!cancelled) setTargetsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [enabled, useDemoData]);

  const targets = useMemo(() => {
    const strongestByChannel = new Map<string, TrendSignal>();
    signals.forEach((signal) => {
      if (!signal.channelTitle || signal.channelTitle === channelName || (signal.nicheRelevance ?? (useDemoData ? 100 : 0)) < 50) return;
      const existing = strongestByChannel.get(signal.channelTitle);
      if (!existing || signal.views > existing.views) strongestByChannel.set(signal.channelTitle, signal);
    });
    const candidates = [...strongestByChannel.values()];
    const minimum = subscriberCount > 25 ? Math.max(1, subscriberCount * .3) : 0;
    const maximum = subscriberCount > 0 ? Math.max(500, subscriberCount * 3) : 5_000;
    const currentViews = latestVideo?.views ?? 0;
    const matched = candidates.filter((signal) => signal.channelSubscribers !== null
      && signal.channelSubscribers >= minimum
      && signal.channelSubscribers <= maximum
      && signal.views > currentViews);
    return (matched.length >= 2 ? matched : candidates.filter((signal) => signal.channelSubscribers !== null))
      .sort((a, b) => b.views - a.views)
      .slice(0, 3);
  }, [channelName, latestVideo?.views, signals, subscriberCount, useDemoData]);

  const rating = latestVideo ? Math.max(0, Math.min(100, Math.round(latestVideo.averageViewPercentage))) : 0;

  return (
    <section className="overview-insight-grid" aria-label="Your next growth moves">
      <article className="overview-insight-card overview-insight-card--topics">
        <header><span className="overview-insight-card__icon"><Lightbulb size={21} aria-hidden="true" /></span><h2>Daily Topics</h2></header>
        <div className="overview-topic-list">
          {!enabled || topicsLoading ? Array.from({ length: 5 }).map((_, index) => <span className="overview-card-skeleton" key={index} />) : topics.length > 0 ? topics.map((topic, index) => (
            <Link href="/dashboard/ideas" key={topic.id}><small>{String(index + 1).padStart(2, "0")}</small><strong>{topic.title}</strong><ArrowRight size={15} aria-hidden="true" /></Link>
          )) : <p className="overview-card-empty">Open Daily Topics to scan five ideas matched to your niche.</p>}
        </div>
        <Link className="overview-insight-card__cta" href="/dashboard/ideas">Open all topics <ArrowRight size={16} aria-hidden="true" /></Link>
      </article>

      <article className="overview-insight-card overview-insight-card--targets">
        <header><span className="overview-insight-card__icon"><Target size={21} aria-hidden="true" /></span><h2>Competitor Targets</h2></header>
        <p className="overview-insight-card__intro">Similar-size channels in your niche pulling stronger views.</p>
        <div className="overview-target-list">
          {!enabled || targetsLoading ? Array.from({ length: 3 }).map((_, index) => <span className="overview-card-skeleton" key={index} />) : targets.length > 0 ? targets.map((target) => (
            <a href={`https://www.youtube.com/watch?v=${target.id}`} target="_blank" rel="noreferrer" key={target.channelTitle}>
              <span><UsersRound size={15} aria-hidden="true" /></span><div><strong>{target.channelTitle}</strong><small>{compactNumber.format(target.channelSubscribers ?? 0)} subs · {compactNumber.format(target.views)} views</small></div><ArrowRight size={15} aria-hidden="true" />
            </a>
          )) : <p className="overview-card-empty">No close competitor match yet. Refresh Trending Hub after your next channel sync.</p>}
        </div>
        <Link className="overview-insight-card__cta" href="/dashboard/trending">Explore targets <ArrowRight size={16} aria-hidden="true" /></Link>
      </article>

      <article className="overview-insight-card overview-insight-card--rating">
        <header><span className="overview-insight-card__icon"><Star size={21} aria-hidden="true" /></span><h2>Latest Video Rating</h2></header>
        <div className="overview-rating">
          <div className="overview-rating__score" style={{ "--rating": `${rating * 3.6}deg` } as React.CSSProperties}><span><strong>{latestVideo ? rating : "—"}</strong><small>/100</small></span></div>
          <div><p>{latestVideo ? ratingLabel(rating) : "Waiting for video data"}</p><h3>{latestVideo?.title ?? "Publish or sync a video to unlock its rating."}</h3></div>
        </div>
        <div className="overview-rating__metrics"><span><Eye size={15} aria-hidden="true" /><strong>{latestVideo ? compactNumber.format(latestVideo.views) : "—"}</strong><small>views</small></span><span><Target size={15} aria-hidden="true" /><strong>{latestVideo ? `${rating}%` : "—"}</strong><small>viewed</small></span></div>
        {latestVideo ? <a className="overview-insight-card__cta" href={`https://www.youtube.com/watch?v=${latestVideo.id}`} target="_blank" rel="noreferrer">Watch latest video <ArrowRight size={16} aria-hidden="true" /></a> : <Link className="overview-insight-card__cta" href="/dashboard/analytics">Open analytics <ArrowRight size={16} aria-hidden="true" /></Link>}
      </article>
    </section>
  );
}
