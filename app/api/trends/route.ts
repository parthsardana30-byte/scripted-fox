import { z } from "zod";

import { inferCreatorNiche } from "@/lib/ai/niche";
import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";
import { createClient } from "@/lib/db/client";
import { selectDiverseTrends } from "@/lib/youtube/trend-scoring";
import { rankCompetitorChannelsWithAi } from "@/lib/ai/trend-ranking";
import { getOrRefreshPublicTrends, refreshPublicTrends, YouTubeTrendsError } from "@/lib/youtube/trends";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

const trendChannelSnapshotSchema = z.object({
  channel: z.object({ title: z.string() }).optional(),
  topVideos: z.array(z.object({ title: z.string() })).max(50),
  recentVideos: z.array(z.object({ title: z.string() })).max(50).default([]),
});

function objectValue(value: Json | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function creatorTrendPreferences(userId: string) {
  const supabase = await createClient();
  const [{ data: preferences }, { data: snapshot }] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("content_languages,target_markets,default_script_preferences")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("channel_snapshots")
      .select("metrics")
      .eq("user_id", userId)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const defaults = objectValue(preferences?.default_script_preferences);
  const channel = trendChannelSnapshotSchema.safeParse(snapshot?.metrics);
  const savedNiche = typeof defaults.channelNiche === "string" && defaults.channelNiche.trim() ? defaults.channelNiche.trim() : null;
  const inferredNiche = savedNiche || !channel.success
    ? null
    : await inferCreatorNiche({
        channelTitle: channel.data.channel?.title,
        recentTitles: [...new Set([
          ...(channel.data.recentVideos ?? []).map((video) => video.title),
          ...channel.data.topVideos.map((video) => video.title),
        ])],
      }).catch(() => null);

  return {
    niche: savedNiche ?? inferredNiche ?? "content creation",
    languages: preferences?.content_languages ?? ["en"],
    markets: preferences?.target_markets ?? ["IN", "GLOBAL"],
    creatorChannel: channel.success ? channel.data.channel?.title ?? null : null,
    creatorTopVideos: channel.success ? channel.data.topVideos.map((video) => video.title) : [],
    creatorSubscribers: (() => {
      const metrics = objectValue(snapshot?.metrics);
      const lifetime = metrics.lifetime;
      return lifetime && typeof lifetime === "object" && !Array.isArray(lifetime) ? Number(lifetime.subscribers ?? 0) : 0;
    })(),
  };
}

async function recentlyRefreshed(userId: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - 2 * 60_000).toISOString();
  const { count } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("operation", "youtube_trends_refresh")
    .gte("created_at", since);
  return (count ?? 0) > 0;
}

async function recordRefresh(userId: string, rankedBy: "gemini" | "grok" | "groq" | "momentum") {
  const supabase = await createClient();
  await supabase.from("usage_events").insert({
    user_id: userId,
    operation: "youtube_trends_refresh",
    provider: rankedBy === "momentum" ? "google" : rankedBy,
    model: null,
    input_units: null,
    output_units: null,
    cost_microunits: null,
    metadata: { source: "youtube_data_api", ranking: rankedBy },
  });
}

async function recentTrendIds(userId: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const { data } = await supabase.from("usage_events").select("metadata")
    .eq("user_id", userId).eq("operation", "youtube_trends_impression").gte("created_at", since).limit(6);
  const ids = new Set<string>();
  for (const event of data ?? []) {
    const metadata = objectValue(event.metadata);
    if (Array.isArray(metadata.videoIds)) metadata.videoIds.forEach((id) => { if (typeof id === "string") ids.add(id); });
  }
  return ids;
}

async function recordTrendImpression(userId: string, videoIds: string[]) {
  const supabase = await createClient();
  const day = new Date().toISOString().slice(0, 10);
  const dayStart = `${day}T00:00:00.000Z`;
  const { count } = await supabase.from("usage_events").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("operation", "youtube_trends_impression").gte("created_at", dayStart);
  if ((count ?? 0) > 0) return;
  await supabase.from("usage_events").insert({
    user_id: userId, operation: "youtube_trends_impression", provider: "google", model: null,
    input_units: null, output_units: null, cost_microunits: null, metadata: { day, videoIds },
  });
}

async function competitorPayload(
  evidence: Awaited<ReturnType<typeof refreshPublicTrends>>,
  preferences: Awaited<ReturnType<typeof creatorTrendPreferences>>,
) {
  const byChannel = new Map<string, {
    channelId: string; channelTitle: string; subscribers: number | null; views: number[]; topics: string[];
  }>();
  for (const video of evidence.videos) {
    if (!video.channelId || video.channelTitle === preferences.creatorChannel) continue;
    const current = byChannel.get(video.channelId) ?? {
      channelId: video.channelId,
      channelTitle: video.channelTitle,
      subscribers: video.channelSubscribers ?? null,
      views: [],
      topics: [],
    };
    current.views.push(video.views);
    current.topics.push(video.title);
    byChannel.set(video.channelId, current);
  }
  const candidates = [...byChannel.values()]
    .filter((candidate) => candidate.views.length >= 1)
    .map((candidate) => ({
      channelId: candidate.channelId,
      channelTitle: candidate.channelTitle,
      subscribers: candidate.subscribers,
      videosFound: candidate.views.length,
      averageViews: candidate.views.reduce((sum, views) => sum + views, 0) / candidate.views.length,
      strongestViews: Math.max(...candidate.views),
      topics: candidate.topics.slice(0, 3),
    }))
    .filter((candidate) => candidate.subscribers === null
      || preferences.creatorSubscribers === 0
      || candidate.subscribers >= Math.max(500, preferences.creatorSubscribers * .25))
    .sort((left, right) => right.videosFound - left.videosFound || right.averageViews - left.averageViews)
    .slice(0, 10);
  if (!candidates.length) return [];
  try {
    const ranked = await rankCompetitorChannelsWithAi({
      niche: evidence.niche,
      creatorChannel: preferences.creatorChannel,
      creatorSubscribers: preferences.creatorSubscribers,
      creatorTopVideos: preferences.creatorTopVideos,
      candidates,
    });
    const byId = new Map(candidates.map((candidate) => [candidate.channelId, candidate]));
    return ranked.rankings
      .filter((ranking) => ranking.relevanceScore >= 55)
      .map((ranking) => {
        const candidate = byId.get(ranking.channelId);
        return candidate ? {
          channelId: candidate.channelId,
          channelTitle: candidate.channelTitle,
          channelSubscribers: candidate.subscribers,
          averageViews: Math.round(candidate.averageViews),
          strongestViews: Math.round(candidate.strongestViews),
          videosFound: candidate.videosFound,
          topics: candidate.topics,
          relevanceScore: ranking.relevanceScore,
          reason: ranking.reason,
        } : null;
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
      .slice(0, 5);
  } catch {
    return candidates.slice(0, 3).map((candidate) => ({
      channelId: candidate.channelId,
      channelTitle: candidate.channelTitle,
      channelSubscribers: candidate.subscribers,
      averageViews: Math.round(candidate.averageViews),
      strongestViews: Math.round(candidate.strongestViews),
      videosFound: candidate.videosFound,
      topics: candidate.topics,
      relevanceScore: 50,
      reason: "Repeated relevant videos were found in your niche.",
    }));
  }
}

async function responsePayload(
  result: { evidence: Awaited<ReturnType<typeof refreshPublicTrends>>; refreshed: boolean },
  preferences: Awaited<ReturnType<typeof creatorTrendPreferences>>,
  recentlyShownIds = new Set<string>(),
) {
  const selectedSignals = selectDiverseTrends(result.evidence.videos, 12, recentlyShownIds);
  return {
    refreshed: result.refreshed,
    capturedAt: result.evidence.capturedAt,
    niche: result.evidence.niche,
    markets: result.evidence.markets,
    languages: result.evidence.languages,
    signals: selectedSignals.map((video) => ({
      id: video.id,
      title: video.title,
      channelTitle: video.channelTitle,
      channelSubscribers: video.channelSubscribers ?? null,
      publishedAt: video.publishedAt,
      market: video.market,
      views: video.views,
      viewsPerDay: Math.round(video.viewsPerDay),
      recentViewsPerDay: Math.round(video.recentViewsPerDay ?? video.viewsPerDay),
      acceleration: Number((video.acceleration ?? 1).toFixed(2)),
      engagementRate: Number((video.engagementRate * 100).toFixed(2)),
      score: video.score,
      nicheRelevance: video.nicheRelevance ?? null,
      outlook: video.outlook ?? "steady",
      reason: video.reason ?? "Momentum is based on recent public YouTube performance.",
    })),
    competitors: await competitorPayload(result.evidence, preferences),
    rankedBy: result.evidence.aiAnalysis?.provider ?? "momentum",
  };
}

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const preferences = { ...await creatorTrendPreferences(user.id), userId: user.id };
    const result = await getOrRefreshPublicTrends(preferences);
    const payload = await responsePayload(result, preferences, await recentTrendIds(user.id));
    await recordTrendImpression(user.id, payload.signals.map((signal) => signal.id));
    return Response.json(payload, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: "Sign in to view trends." }, { status: 401 });
    if (error instanceof YouTubeTrendsError) {
      const status = error.code === "quota" ? 429 : error.code === "configuration" ? 503 : 502;
      return Response.json({ error: error.message }, { status });
    }
    return Response.json({ error: "Trend data is unavailable." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) {
    return Response.json({ error: "This request is not allowed." }, { status: 403 });
  }

  try {
    const user = await requireAuthenticatedUser();
    const preferences = { ...await creatorTrendPreferences(user.id), userId: user.id };
    if (await recentlyRefreshed(user.id)) return Response.json({ error: "A fresh scan just finished. Try again in two minutes." }, { status: 429 });
    const evidence = await refreshPublicTrends(preferences);
    const result = { evidence, refreshed: true };
    await recordRefresh(user.id, evidence.aiAnalysis?.provider ?? "momentum");
    const payload = await responsePayload(result, preferences, await recentTrendIds(user.id));
    await recordTrendImpression(user.id, payload.signals.map((signal) => signal.id));
    return Response.json(payload, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: "Sign in to refresh trends." }, { status: 401 });
    if (error instanceof YouTubeTrendsError) {
      const status = error.code === "configuration" ? 503 : error.code === "quota" ? 429 : 502;
      return Response.json({ error: error.message }, { status });
    }
    return Response.json({ error: "Trend data could not be refreshed." }, { status: 500 });
  }
}
