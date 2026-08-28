import "server-only";

import { z } from "zod";

import { serverEnvironment } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { relevanceScore, scoreTrendVideos, type PublicVideoSignal } from "@/lib/youtube/trend-scoring";
import type { Json } from "@/types/database";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const CACHE_HOURS = 6;
const WINDOW_DAYS = 14;
const MAX_SIGNALS = 18;
const SNAPSHOT_SCHEMA = "youtube_public_trends_v1";

const searchResponseSchema = z.object({
  items: z.array(z.object({
    id: z.object({ videoId: z.string().min(1) }),
  })).default([]),
});

const videosResponseSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1),
    snippet: z.object({
      title: z.string(),
      channelTitle: z.string(),
      publishedAt: z.string(),
    }),
    statistics: z.object({
      viewCount: z.string().optional(),
      likeCount: z.string().optional(),
      commentCount: z.string().optional(),
    }).default({}),
  })).default([]),
});

export const trendSnapshotEvidenceSchema = z.object({
  schema: z.literal(SNAPSHOT_SCHEMA),
  niche: z.string(),
  markets: z.array(z.string()),
  languages: z.array(z.string()),
  queries: z.array(z.object({ market: z.string(), language: z.string(), query: z.string() })),
  videos: z.array(z.object({
    id: z.string(),
    title: z.string(),
    channelTitle: z.string(),
    publishedAt: z.string(),
    views: z.number().nonnegative(),
    likes: z.number().nonnegative(),
    comments: z.number().nonnegative(),
    market: z.string(),
    language: z.string(),
    discovery: z.enum(["popular", "search"]),
    viewsPerDay: z.number().nonnegative(),
    engagementRate: z.number().nonnegative(),
    freshness: z.number().min(0).max(1),
    score: z.number().min(0).max(100),
  })).max(MAX_SIGNALS),
  capturedAt: z.string(),
});

export type TrendSnapshotEvidence = z.infer<typeof trendSnapshotEvidenceSchema>;

export class YouTubeTrendsError extends Error {
  constructor(message: string, public readonly code: "configuration" | "quota" | "unavailable") {
    super(message);
    this.name = "YouTubeTrendsError";
  }
}

function requireDataApiKey() {
  const key = serverEnvironment.YOUTUBE_DATA_API_KEY;
  if (!key || key.length < 20) throw new YouTubeTrendsError("YouTube trends are not configured.", "configuration");
  return key;
}

function count(value: string | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizedNiche(niche: string) {
  const value = niche.trim().replace(/\s+/g, " ").slice(0, 80);
  return value || "content creation";
}

function lookupKey(input: { niche: string; markets: string[]; languages: string[] }) {
  return {
    niche: normalizedNiche(input.niche).toLocaleLowerCase(),
    market: [...new Set(input.markets)].sort().join(","),
    language: [...new Set(input.languages)].sort().join(","),
  };
}

async function youtubeRequest<T>(path: string, parameters: Record<string, string>, schema: z.ZodType<T>) {
  const url = new URL(`${YOUTUBE_API_BASE}/${path}`);
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("key", requireDataApiKey());
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const quotaRelated = response.status === 403 || response.status === 429;
    throw new YouTubeTrendsError(
      quotaRelated ? "YouTube trend quota is currently unavailable." : "YouTube public data could not be loaded.",
      quotaRelated ? "quota" : "unavailable",
    );
  }
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new YouTubeTrendsError("YouTube returned an unexpected response.", "unavailable");
  return parsed.data;
}

function collectionTargets(markets: string[]) {
  const wantsIndia = markets.length === 0 || markets.includes("IN");
  const wantsGlobal = markets.length === 0 || markets.includes("GLOBAL");
  const targets = [
    ...(wantsIndia ? [{ market: "IN", language: "en" }] : []),
    ...(wantsIndia ? [{ market: "IN", language: "hi" }] : []),
    ...(wantsGlobal ? [{ market: "GLOBAL", language: "en" }] : []),
  ];
  return targets.length > 0 ? targets : [{ market: "IN", language: "en" }];
}

async function collectPublicSignals(input: { niche: string; markets: string[]; languages: string[] }) {
  const niche = normalizedNiche(input.niche);
  const targets = collectionTargets(input.markets);
  const publishedAfter = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const discoveries = new Map<string, { market: string; language: string; discovery: "popular" | "search" }>();

  const searches = await Promise.all(targets.map(async (target) => {
    const parameters: Record<string, string> = {
      part: "snippet",
      type: "video",
      q: niche,
      order: "viewCount",
      publishedAfter,
      relevanceLanguage: target.language,
      safeSearch: "moderate",
      maxResults: "12",
    };
    if (target.market !== "GLOBAL") parameters.regionCode = target.market;
    const result = await youtubeRequest("search", parameters, searchResponseSchema);
    result.items.forEach((item) => discoveries.set(item.id.videoId, { ...target, discovery: "search" }));
    return { ...target, query: niche };
  }));

  await Promise.all([...new Set(targets.map((target) => target.market))].map(async (market) => {
    const parameters: Record<string, string> = {
      part: "id",
      chart: "mostPopular",
      maxResults: "10",
    };
    if (market !== "GLOBAL") parameters.regionCode = market;
    const result = await youtubeRequest("videos", parameters, z.object({ items: z.array(z.object({ id: z.string().min(1) })).default([]) }));
    result.items.forEach((item) => {
      if (!discoveries.has(item.id)) discoveries.set(item.id, { market, language: market === "IN" ? "mixed" : "en", discovery: "popular" });
    });
  }));

  const ids = [...discoveries.keys()].slice(0, 50);
  if (ids.length === 0) return { niche, targets, searches, videos: [] };
  const details = await youtubeRequest("videos", {
    part: "snippet,statistics",
    id: ids.join(","),
    maxResults: "50",
  }, videosResponseSchema);
  const signals: PublicVideoSignal[] = details.items.map((video) => {
    const discovery = discoveries.get(video.id) ?? { market: "IN", language: "en", discovery: "popular" as const };
    return {
      id: video.id,
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      views: count(video.statistics.viewCount),
      likes: count(video.statistics.likeCount),
      comments: count(video.statistics.commentCount),
      ...discovery,
    };
  });
  return { niche, targets, searches, videos: scoreTrendVideos(signals).slice(0, MAX_SIGNALS) };
}

export async function getCachedPublicTrends(input: { niche: string; markets: string[]; languages: string[] }) {
  const admin = createAdminClient();
  const key = lookupKey(input);
  const { data } = await admin
    .from("trend_snapshots")
    .select("evidence,expires_at")
    .eq("source", "youtube_data_api")
    .eq("market", key.market)
    .eq("language", key.language)
    .eq("niche", key.niche)
    .order("captured_at", { ascending: false })
    .limit(5);
  for (const row of data ?? []) {
    const evidence = trendSnapshotEvidenceSchema.safeParse(row.evidence);
    if (evidence.success) return { evidence: evidence.data, fresh: new Date(row.expires_at).getTime() > Date.now() };
  }
  return null;
}

export async function refreshPublicTrends(input: { niche: string; markets: string[]; languages: string[] }) {
  const collected = await collectPublicSignals(input);
  const now = new Date();
  const key = lookupKey(input);
  const evidence: TrendSnapshotEvidence = {
    schema: SNAPSHOT_SCHEMA,
    niche: collected.niche,
    markets: [...new Set(collected.targets.map((target) => target.market))],
    languages: [...new Set(collected.targets.map((target) => target.language))],
    queries: collected.searches,
    videos: collected.videos,
    capturedAt: now.toISOString(),
  };
  const admin = createAdminClient();
  const expiresAt = new Date(now.getTime() + CACHE_HOURS * 3_600_000);
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 86_400_000);
  const { error } = await admin.from("trend_snapshots").insert({
    source: "youtube_data_api",
    market: key.market,
    language: key.language,
    niche: key.niche,
    window_start: windowStart.toISOString(),
    window_end: now.toISOString(),
    evidence: evidence as unknown as Json,
    confidence: Math.min(1, evidence.videos.length / 12),
    captured_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new YouTubeTrendsError("Trend evidence could not be cached.", "unavailable");

  const retentionCutoff = new Date(now.getTime() - 29 * 86_400_000).toISOString();
  await admin.from("trend_snapshots").delete().eq("source", "youtube_data_api").lt("captured_at", retentionCutoff);
  return evidence;
}

export async function getOrRefreshPublicTrends(input: { niche: string; markets: string[]; languages: string[] }) {
  const cached = await getCachedPublicTrends(input);
  if (cached?.fresh) return { evidence: cached.evidence, refreshed: false };
  try {
    return { evidence: await refreshPublicTrends(input), refreshed: true };
  } catch (error) {
    if (cached) return { evidence: cached.evidence, refreshed: false };
    throw error;
  }
}

export function trendSummaryForTitle(evidence: TrendSnapshotEvidence, title: string) {
  const relevant = evidence.videos
    .map((video) => ({ video, relevance: relevanceScore(title, video.title) }))
    .filter(({ relevance }) => relevance > 0)
    .sort((a, b) => b.relevance - a.relevance || b.video.score - a.video.score)
    .slice(0, 3);
  if (relevant.length === 0) return null;
  return relevant.map(({ video }) => (
    `“${video.title}” is a recent ${video.market} signal (${Math.round(video.viewsPerDay).toLocaleString("en-US")} views/day, opportunity score ${video.score}/100)`
  )).join("; ");
}
