import { z } from "zod";

import { inferCreatorNiche } from "@/lib/ai/niche";
import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";
import { createClient } from "@/lib/db/client";
import { getOrRefreshPublicTrends, refreshPublicTrends, YouTubeTrendsError } from "@/lib/youtube/trends";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

const trendChannelSnapshotSchema = z.object({
  channel: z.object({ title: z.string() }).optional(),
  topVideos: z.array(z.object({ title: z.string() })).max(50),
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
        recentTitles: channel.data.topVideos.map((video) => video.title),
      }).catch(() => null);

  return {
    niche: savedNiche ?? inferredNiche ?? "content creation",
    languages: preferences?.content_languages ?? ["en"],
    markets: preferences?.target_markets ?? ["IN", "GLOBAL"],
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

async function recordRefresh(userId: string, rankedBy: "gemini" | "momentum") {
  const supabase = await createClient();
  await supabase.from("usage_events").insert({
    user_id: userId,
    operation: "youtube_trends_refresh",
    provider: rankedBy === "gemini" ? "gemini" : "google",
    model: null,
    input_units: null,
    output_units: null,
    cost_microunits: null,
    metadata: { source: "youtube_data_api", ranking: rankedBy },
  });
}

function responsePayload(result: { evidence: Awaited<ReturnType<typeof refreshPublicTrends>>; refreshed: boolean }) {
  return {
    refreshed: result.refreshed,
    capturedAt: result.evidence.capturedAt,
    niche: result.evidence.niche,
    markets: result.evidence.markets,
    languages: result.evidence.languages,
    signals: result.evidence.videos.slice(0, 12).map((video) => ({
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
    rankedBy: result.evidence.aiAnalysis?.provider ?? "momentum",
  };
}

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const preferences = { ...await creatorTrendPreferences(user.id), userId: user.id };
    const result = await getOrRefreshPublicTrends(preferences);
    return Response.json(responsePayload(result), {
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
    return Response.json(responsePayload(result), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: "Sign in to refresh trends." }, { status: 401 });
    if (error instanceof YouTubeTrendsError) {
      const status = error.code === "configuration" ? 503 : error.code === "quota" ? 429 : 502;
      return Response.json({ error: error.message }, { status });
    }
    return Response.json({ error: "Trend data could not be refreshed." }, { status: 500 });
  }
}
