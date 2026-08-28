import { randomUUID } from "node:crypto";

import { z } from "zod";

import { AiConfigurationError, AiProviderError } from "@/lib/ai/groq";
import { generateIdeaRecommendations } from "@/lib/ai/ideas";
import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import { serverEnvironment } from "@/lib/env/server";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";
import { createClient } from "@/lib/supabase/server";
import { getOrRefreshPublicTrends, YouTubeTrendsError } from "@/lib/youtube/trends";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

const requestSchema = z.object({
  excludeTitles: z.array(z.string().trim().min(1).max(140)).max(20).optional().default([]),
});

const channelSnapshotSchema = z.object({
  summary: z.object({ views: z.number(), watchTimeMinutes: z.number(), averageViewDurationSeconds: z.number() }),
  topVideos: z.array(z.object({ title: z.string(), views: z.number() })).max(50),
});

function objectValue(value: Json | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function loadContext(userId: string) {
  const supabase = await createClient();
  const [{ data: preferences }, { data: snapshot }] = await Promise.all([
    supabase.from("user_preferences").select("content_languages,target_markets,default_script_preferences").eq("user_id", userId).maybeSingle(),
    supabase.from("channel_snapshots").select("metrics").eq("user_id", userId).order("captured_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const defaults = objectValue(preferences?.default_script_preferences);
  const channel = channelSnapshotSchema.safeParse(snapshot?.metrics);
  const topVideo = channel.success ? [...channel.data.topVideos].sort((a, b) => b.views - a.views)[0] : null;
  return {
    niche: typeof defaults.channelNiche === "string" && defaults.channelNiche.trim() ? defaults.channelNiche : "content creation",
    goal: typeof defaults.channelGoal === "string" ? defaults.channelGoal : "growth",
    languages: preferences?.content_languages ?? ["en"],
    markets: preferences?.target_markets ?? ["IN", "GLOBAL"],
    channelSummary: channel.success
      ? `Last 28 days: ${channel.data.summary.views} views, ${Math.round(channel.data.summary.watchTimeMinutes)} watch minutes, ${Math.round(channel.data.summary.averageViewDurationSeconds)} seconds average view duration${topVideo ? `; strongest recent video was “${topVideo.title}” with ${topVideo.views} views` : ""}.`
      : null,
  };
}

async function rateLimitReached(userId: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count } = await supabase.from("usage_events").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("operation", "ai_idea_recommendations").gte("created_at", since);
  return (count ?? 0) >= 6;
}

export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) return Response.json({ error: "This request is not allowed." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 5_000) return Response.json({ error: "This request is too large." }, { status: 413 });

  try {
    const user = await requireAuthenticatedUser();
    if (await rateLimitReached(user.id)) return Response.json({ error: "Idea generation limit reached. Try again later." }, { status: 429 });
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "The recommendation request is invalid." }, { status: 400 });
    const context = await loadContext(user.id);
    const trends = await getOrRefreshPublicTrends(context);
    if (trends.evidence.videos.length < 3) return Response.json({ error: "Not enough current trend evidence is available yet." }, { status: 503 });
    const trendSignals = trends.evidence.videos.slice(0, 14);
    const generated = await generateIdeaRecommendations({
      ...context,
      trendSignals,
      excludedTitles: parsed.data.excludeTitles,
    });
    const byId = new Map(trendSignals.map((signal) => [signal.id, signal]));
    const ideas = generated.ideas.map((idea, index) => {
      const signal = byId.get(idea.trendVideoId) ?? trendSignals[index % trendSignals.length];
      return {
        id: randomUUID(),
        title: idea.title,
        angle: idea.angle,
        format: idea.format,
        reason: idea.reason,
        evidence: [
          { label: "Recent public momentum", value: `${Math.round(signal.viewsPerDay).toLocaleString("en-US")} views/day · ${signal.market}`, source: "YouTube trend" as const },
          ...(context.channelSummary ? [{ label: "Channel context", value: "Included in recommendation", source: "Your channel" as const }] : []),
        ],
      };
    });
    const supabase = await createClient();
    await supabase.from("usage_events").insert({
      user_id: user.id,
      operation: "ai_idea_recommendations",
      provider: serverEnvironment.AI_PROVIDER ?? null,
      model: generated.completion.model,
      input_units: generated.completion.inputTokens,
      output_units: generated.completion.outputTokens,
      cost_microunits: null,
      metadata: { trend_snapshot_at: trends.evidence.capturedAt },
    });
    return Response.json({ ideas, capturedAt: trends.evidence.capturedAt, refreshedTrends: trends.refreshed }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: "Sign in to generate recommendations." }, { status: 401 });
    if (error instanceof AiConfigurationError) return Response.json({ error: "AI is not configured yet." }, { status: 503 });
    if (error instanceof AiProviderError) return Response.json({ error: "Recommendations are temporarily unavailable." }, { status: 502 });
    if (error instanceof YouTubeTrendsError) {
      const status = error.code === "quota" ? 429 : error.code === "configuration" ? 503 : 502;
      return Response.json({ error: error.message }, { status });
    }
    return Response.json({ error: "Recommendations could not be generated." }, { status: 500 });
  }
}
