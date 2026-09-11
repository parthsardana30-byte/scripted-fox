"use client";

import Link from "next/link";
import { ArrowUpRight, Eye, RefreshCw, Sparkles, TrendingUp, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "./page-header";

export type TrendSignal = { id: string; title: string; channelTitle: string; publishedAt: string; market: string; views: number; viewsPerDay: number; recentViewsPerDay?: number; acceleration?: number; engagementRate: number; score: number; nicheRelevance?: number | null; outlook?: "rising-now" | "breakout-candidate" | "steady"; reason?: string };
type TrendsPayload = { signals?: TrendSignal[]; rankedBy?: "gemini" | "grok" | "groq" | "momentum"; error?: string };

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function TrendingHub({ demoSignals }: { demoSignals?: TrendSignal[] }) {
  const [signals, setSignals] = useState<TrendSignal[]>(demoSignals ?? []);
  const [loading, setLoading] = useState(!demoSignals);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrends = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/trends", { method: refresh ? "POST" : "GET" });
      const payload = await response.json() as TrendsPayload;
      if (!response.ok) throw new Error(payload.error || "Trends are unavailable right now.");
      setSignals(payload.signals ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Trends are unavailable right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (demoSignals) return;
    const timer = window.setTimeout(() => { void loadTrends(); }, 0);
    return () => window.clearTimeout(timer);
  }, [demoSignals, loadTrends]);

  return (
    <div className="dashboard-page trending-hub">
      <PageHeader title={<>Trending <span className="trending-title-accent">Hub</span></>} description="See what’s gaining momentum in your niche." actions={<button className={`trending-refresh${refreshing ? " is-scanning" : ""}`} type="button" disabled={refreshing || Boolean(demoSignals)} onClick={() => void loadTrends(true)} aria-label={refreshing ? "Scanning fresh trends" : "Scan fresh trends"}><span className="trending-refresh__radar" aria-hidden="true"><RefreshCw size={22} /></span><span className="trending-refresh__label">SCAN</span></button>} />
      {loading ? <div className="trending-grid" aria-label="Loading trends">{Array.from({ length: 6 }).map((_, index) => <div className="trending-card trending-card--loading" key={index} />)}</div>
        : error ? <div className="trending-empty"><TrendingUp size={28} aria-hidden="true" /><h2>Trend feed needs a moment</h2><p>{error}</p><button className="button button--secondary button--small" type="button" onClick={() => void loadTrends()}>Try again</button></div>
        : signals.length === 0 ? <div className="trending-empty"><TrendingUp size={28} aria-hidden="true" /><h2>Your trend feed is ready to scan</h2><p>Refresh once to collect the newest public YouTube signals for your niche.</p><button className="button button--primary button--small" type="button" onClick={() => void loadTrends(true)}>Find trending videos</button></div>
        : <div className="trending-grid">{signals.map((video, index) => (
          <article className="trending-card" key={video.id}>
            <a className="trending-card__visual" href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer" aria-label={`Watch ${video.title} on YouTube`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" /><span>#{index + 1}</span><strong>{video.outlook === "rising-now" ? "Rising now" : video.outlook === "breakout-candidate" ? "Breakout candidate" : `${video.score} momentum`}</strong>
            </a>
            <div className="trending-card__body"><p>{video.channelTitle} · {video.market}</p><h2>{video.title}</h2><div className="trending-card__metrics"><span><Eye size={14} aria-hidden="true" />{compactNumber(video.views)} views</span><span><TrendingUp size={14} aria-hidden="true" />{compactNumber(video.recentViewsPerDay ?? video.viewsPerDay)}/day now</span>{(video.acceleration ?? 1) > 1.05 ? <span className="trending-card__acceleration"><Zap size={14} aria-hidden="true" />{(video.acceleration ?? 1).toFixed(1)}× acceleration</span> : null}</div>{video.reason ? <p className="trending-card__reason">{video.reason}</p> : null}<div className="trending-card__actions"><Link href={demoSignals ? `/ui-preview?view=script&topic=${encodeURIComponent(video.title)}` : `/dashboard/editor?topic=${encodeURIComponent(video.title)}`}>Build my angle <Sparkles size={14} aria-hidden="true" /></Link><a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">Open video <ArrowUpRight size={14} aria-hidden="true" /></a></div></div>
          </article>
        ))}</div>}
    </div>
  );
}
