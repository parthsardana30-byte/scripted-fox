import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";
import { createClient } from "@/lib/supabase/server";
import { getCachedPublicTrends, getOrRefreshPublicTrends, YouTubeTrendsError } from "@/lib/youtube/trends";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

function objectValue(value: Json | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function creatorTrendPreferences(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_preferences")
    .select("content_languages,target_markets,default_script_preferences")
    .eq("user_id", userId)
    .maybeSingle();
  const defaults = objectValue(data?.default_script_preferences);
  return {
    niche: typeof defaults.channelNiche === "string" ? defaults.channelNiche : "content creation",
    languages: data?.content_languages ?? ["en"],
    markets: data?.target_markets ?? ["IN", "GLOBAL"],
  };
}

async function recentlyRefreshed(userId: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - 5 * 60_000).toISOString();
  const { count } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("operation", "youtube_trends_refresh")
    .gte("created_at", since);
  return (count ?? 0) > 0;
}

async function recordRefresh(userId: string) {
  const supabase = await createClient();
  await supabase.from("usage_events").insert({
    user_id: userId,
    operation: "youtube_trends_refresh",
    provider: "google",
    model: null,
    input_units: null,
    output_units: null,
    cost_microunits: null,
    metadata: { source: "youtube_data_api" },
  });
}

function responsePayload(result: Awaited<ReturnType<typeof getOrRefreshPublicTrends>>) {
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
      publishedAt: video.publishedAt,
      market: video.market,
      views: video.views,
      viewsPerDay: Math.round(video.viewsPerDay),
      engagementRate: Number((video.engagementRate * 100).toFixed(2)),
      score: video.score,
    })),
  };
}

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const preferences = await creatorTrendPreferences(user.id);
    const cached = await getCachedPublicTrends(preferences);
    return Response.json(cached ? responsePayload({ evidence: cached.evidence, refreshed: false }) : { signals: [] }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: "Sign in to view trends." }, { status: 401 });
    return Response.json({ error: "Trend data is unavailable." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) {
    return Response.json({ error: "This request is not allowed." }, { status: 403 });
  }

  try {
    const user = await requireAuthenticatedUser();
    const preferences = await creatorTrendPreferences(user.id);
    const cached = await getCachedPublicTrends(preferences);
    if (!cached?.fresh && await recentlyRefreshed(user.id)) {
      return Response.json({ error: "Trends were refreshed recently. Try again in a few minutes." }, { status: 429 });
    }
    const result = await getOrRefreshPublicTrends(preferences);
    if (result.refreshed) await recordRefresh(user.id);
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
