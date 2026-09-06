import "server-only";

import { z } from "zod";

import { serverEnvironment } from "@/lib/env/server";
import { createAdminClient } from "@/lib/db/client";
import { rankTrendSignalsWithGemini } from "@/lib/ai/trend-ranking";
import { requireYouTubeEnvironment } from "@/lib/youtube/config";
import { decryptRefreshToken } from "@/lib/youtube/crypto";
import { refreshYouTubeAccessToken } from "@/lib/youtube/google";
import { relevanceScore, scoreTrendVideos, type PublicVideoSignal, type ScoredTrendVideo } from "@/lib/youtube/trend-scoring";
import type { Json } from "@/types/database";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const CACHE_HOURS = 6;
const WINDOW_DAYS = 14;
const MAX_SIGNALS = 18;
const SNAPSHOT_SCHEMA = "youtube_public_trends_v2";

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
      channelId: z.string(),
      publishedAt: z.string(),
    }),
    statistics: z.object({
      viewCount: z.string().optional(),
      likeCount: z.string().optional(),
      commentCount: z.string().optional(),
    }).default({}),
  })).default([]),
});

const channelsResponseSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1),
    statistics: z.object({
      subscriberCount: z.string().optional(),
      hiddenSubscriberCount: z.boolean().optional(),
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
    channelSubscribers: z.number().nonnegative().nullable().optional(),
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
    momentumScore: z.number().min(0).max(100).optional(),
    recentViewsPerDay: z.number().nonnegative().optional(),
    acceleration: z.number().nonnegative().optional(),
    nicheRelevance: z.number().min(0).max(100).optional(),
    outlook: z.enum(["rising-now", "breakout-candidate", "steady"]).optional(),
    reason: z.string().max(180).optional(),
  })).max(MAX_SIGNALS),
  capturedAt: z.string(),
  aiAnalysis: z.object({ provider: z.literal("gemini"), model: z.string() }).optional(),
});

export type TrendSnapshotEvidence = z.infer<typeof trendSnapshotEvidenceSchema>;

export class YouTubeTrendsError extends Error {
  constructor(message: string, public readonly code: "configuration" | "quota" | "unavailable") {
    super(message);
    this.name = "YouTubeTrendsError";
  }
}

type TrendLookupInput = { niche: string; markets: string[]; languages: string[]; userId?: string };
type DataCredential = { kind: "key"; value: string } | { kind: "oauth"; value: string };

async function requireDataCredential(userId?: string): Promise<DataCredential> {
  const key = serverEnvironment.YOUTUBE_DATA_API_KEY;
  if (key && key.length >= 20) return { kind: "key", value: key };
  if (!userId) throw new YouTubeTrendsError("Connect YouTube to scan trends for your niche.", "configuration");
  const admin = createAdminClient();
  const { data: connection } = await admin.from("youtube_connections").select("id,status").eq("user_id", userId).maybeSingle();
  if (!connection || !["connected", "syncing", "stale"].includes(connection.status)) {
    throw new YouTubeTrendsError("Connect YouTube to scan trends for your niche.", "configuration");
  }
  const { data: encryptedToken, error } = await admin.rpc("read_youtube_credentials", { p_connection_id: connection.id });
  if (error || !encryptedToken) throw new YouTubeTrendsError("Your YouTube connection needs to be refreshed.", "configuration");
  try {
    const refreshToken = decryptRefreshToken(encryptedToken, requireYouTubeEnvironment().tokenEncryptionKey);
    const tokens = await refreshYouTubeAccessToken(refreshToken);
    return { kind: "oauth", value: tokens.access_token };
  } catch {
    throw new YouTubeTrendsError("Your YouTube connection needs to be refreshed.", "configuration");
  }
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

async function youtubeRequest<T>(path: string, parameters: Record<string, string>, schema: z.ZodType<T>, credential: DataCredential) {
  const url = new URL(`${YOUTUBE_API_BASE}/${path}`);
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
  if (credential.kind === "key") url.searchParams.set("key", credential.value);
  const response = await fetch(url, {
    headers: credential.kind === "oauth" ? { Authorization: `Bearer ${credential.value}` } : undefined,
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

async function collectPublicSignals(input: TrendLookupInput) {
  const niche = normalizedNiche(input.niche);
  const credential = await requireDataCredential(input.userId);
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
    const result = await youtubeRequest("search", parameters, searchResponseSchema, credential);
    result.items.forEach((item) => discoveries.set(item.id.videoId, { ...target, discovery: "search" }));
    return { ...target, query: niche };
  }));


  const ids = [...discoveries.keys()].slice(0, 50);
  if (ids.length === 0) return { niche, targets, searches, videos: [] };
  const details = await youtubeRequest("videos", {
    part: "snippet,statistics",
    id: ids.join(","),
    maxResults: "50",
  }, videosResponseSchema, credential);
  const channelIds = [...new Set(details.items.map((video) => video.snippet.channelId))];
  const channelDetails = channelIds.length > 0
    ? await youtubeRequest("channels", { part: "statistics", id: channelIds.join(","), maxResults: "50" }, channelsResponseSchema, credential)
    : { items: [] };
  const channelSubscriberCounts = new Map(channelDetails.items.map((channel) => [
    channel.id,
    channel.statistics.hiddenSubscriberCount ? null : count(channel.statistics.subscriberCount),
  ]));
  const signals: PublicVideoSignal[] = details.items.map((video) => {
    const discovery = discoveries.get(video.id) ?? { market: "IN", language: "en", discovery: "popular" as const };
    return {
      id: video.id,
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      channelSubscribers: channelSubscriberCounts.get(video.snippet.channelId) ?? null,
      publishedAt: video.snippet.publishedAt,
      views: count(video.statistics.viewCount),
      likes: count(video.statistics.likeCount),
      comments: count(video.statistics.commentCount),
      ...discovery,
    };
  });
  return { niche, targets, searches, videos: scoreTrendVideos(signals).slice(0, MAX_SIGNALS) };
}

function acceleratedSignals(videos: ScoredTrendVideo[], previous: TrendSnapshotEvidence | null, now: Date) {
  const previousById = new Map((previous?.videos ?? []).map((video) => [video.id, video]));
  const elapsedDays = previous
    ? Math.max(1 / 24, (now.getTime() - new Date(previous.capturedAt).getTime()) / 86_400_000)
    : null;
  return videos.map((video) => {
    const earlier = previousById.get(video.id);
    const recentViewsPerDay = earlier && elapsedDays
      ? Math.max(0, video.views - earlier.views) / elapsedDays
      : video.viewsPerDay;
    const acceleration = video.viewsPerDay > 0 ? Math.min(10, recentViewsPerDay / video.viewsPerDay) : 1;
    const accelerationLift = acceleration >= 1
      ? Math.min(16, (acceleration - 1) * 9)
      : -Math.min(8, (1 - acceleration) * 8);
    const momentumScore = Math.max(0, Math.min(100, Math.round(video.score + accelerationLift)));
    const ageDays = Math.max(.25, (now.getTime() - new Date(video.publishedAt).getTime()) / 86_400_000);
    const outlook = momentumScore >= 75 && acceleration >= 1.15
      ? "rising-now" as const
      : ageDays <= 7 && momentumScore >= 58
        ? "breakout-candidate" as const
        : "steady" as const;
    return {
      ...video,
      score: momentumScore,
      momentumScore,
      recentViewsPerDay,
      acceleration,
      nicheRelevance: 50,
      outlook,
      reason: outlook === "rising-now"
        ? "Views are arriving faster than this video's lifetime pace."
        : outlook === "breakout-candidate"
          ? "Fresh upload with enough early momentum to watch closely."
          : "Relevant signal, but breakout acceleration is not confirmed yet.",
      ageDays,
    };
  });
}

async function rankSignals(input: { niche: string; markets: string[]; languages: string[] }, signals: ReturnType<typeof acceleratedSignals>) {
  try {
    const ranked = await rankTrendSignalsWithGemini({ niche: input.niche, markets: input.markets, languages: input.languages, signals });
    const byId = new Map(ranked.rankings.map((ranking) => [ranking.id, ranking]));
    return {
      videos: signals.map((signal) => {
        const ai = byId.get(signal.id);
        if (!ai) return { ...signal, nicheRelevance: 0 };
        return {
          ...signal,
          score: Math.round(signal.momentumScore * .65 + ai.opportunityScore * .35),
          nicheRelevance: ai.nicheRelevance,
          outlook: ai.outlook,
          reason: ai.reason,
        };
      }).filter((signal) => signal.nicheRelevance >= 45)
        .sort((a, b) => b.score - a.score || b.nicheRelevance - a.nicheRelevance || b.recentViewsPerDay - a.recentViewsPerDay),
      aiAnalysis: { provider: "gemini" as const, model: ranked.completion.model },
    };
  } catch {
    return { videos: signals.sort((a, b) => b.score - a.score || b.recentViewsPerDay - a.recentViewsPerDay), aiAnalysis: undefined };
  }
}

export async function getCachedPublicTrends(input: TrendLookupInput) {
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

export async function refreshPublicTrends(input: TrendLookupInput) {
  const now = new Date();
  const previous = await getCachedPublicTrends(input);
  const collected = await collectPublicSignals(input);
  const ranked = await rankSignals({ ...input, niche: collected.niche }, acceleratedSignals(collected.videos, previous?.evidence ?? null, now));
  const key = lookupKey(input);
  const evidence: TrendSnapshotEvidence = {
    schema: SNAPSHOT_SCHEMA,
    niche: collected.niche,
    markets: [...new Set(collected.targets.map((target) => target.market))],
    languages: [...new Set(collected.targets.map((target) => target.language))],
    queries: collected.searches,
    videos: ranked.videos.map(({ ageDays, ...video }) => {
      void ageDays;
      return video;
    }),
    capturedAt: now.toISOString(),
    aiAnalysis: ranked.aiAnalysis,
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

export async function getOrRefreshPublicTrends(input: TrendLookupInput) {
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
