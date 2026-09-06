import { randomUUID } from "node:crypto";

import { z } from "zod";

import { AiConfigurationError, AiProviderError } from "@/lib/ai/groq";
import { generateIdeaRecommendations } from "@/lib/ai/ideas";
import { inferCreatorNiche } from "@/lib/ai/niche";
import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";
import { createClient } from "@/lib/db/client";
import { getOrRefreshPublicTrends, YouTubeTrendsError } from "@/lib/youtube/trends";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

const requestSchema = z.object({
  excludeTitles: z.array(z.string().trim().min(1).max(140)).max(20).optional().default([]),
});

const channelSnapshotSchema = z.object({
  channel: z.object({ title: z.string() }).optional(),
  summary: z.object({ views: z.number(), watchTimeMinutes: z.number(), averageViewDurationSeconds: z.number() }),
  topVideos: z.array(z.object({ title: z.string(), views: z.number() })).max(50),
});
const cachedRecommendationsSchema = z.object({
  recommendations: z.array(z.object({
    id: z.string(),
    title: z.string(),
    angle: z.string(),
    format: z.string(),
    reason: z.string(),
    evidence: z.array(z.object({
      label: z.string(),
      value: z.string(),
      source: z.enum(["YouTube trend", "Your channel"]),
    })),
  })).length(5),
  niche: z.string(),
  trendSnapshotAt: z.string(),
});

const RECOMMENDATION_CACHE_HOURS = 6;
const HOURLY_GENERATION_LIMIT = 20;

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
  const savedNiche = typeof defaults.channelNiche === "string" && defaults.channelNiche.trim() ? defaults.channelNiche.trim() : null;
  const inferredNiche = savedNiche || !channel.success ? null : await inferCreatorNiche({
    channelTitle: channel.data.channel?.title,
    recentTitles: channel.data.topVideos.map((video) => video.title),
  }).catch(() => null);
  return {
    userId,
    niche: savedNiche ?? inferredNiche ?? "content creation",
    goal: typeof defaults.channelGoal === "string" ? defaults.channelGoal : "growth",
    languages: preferences?.content_languages ?? ["en"],
    markets: preferences?.target_markets ?? ["IN", "GLOBAL"],
    channelSummary: channel.success
      ? `Last 28 days: ${channel.data.summary.views} views, ${Math.round(channel.data.summary.watchTimeMinutes)} watch minutes, ${Math.round(channel.data.summary.averageViewDurationSeconds)} seconds average view duration${topVideo ? `; strongest recent video was “${topVideo.title}” with ${topVideo.views} views` : ""}.`
      : null,
  };
}

async function cachedRecommendations(userId: string, niche: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - RECOMMENDATION_CACHE_HOURS * 60 * 60_000).toISOString();
  const { data } = await supabase.from("usage_events")
    .select("metadata")
    .eq("user_id", userId)
    .eq("operation", "ai_idea_recommendations")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10);

  for (const event of data ?? []) {
    const parsed = cachedRecommendationsSchema.safeParse(event.metadata);
    if (parsed.success && parsed.data.niche === niche) return parsed.data;
  }
  return null;
}

async function rateLimitReached(userId: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count } = await supabase.from("usage_events").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("operation", "ai_idea_recommendations").gte("created_at", since);
  return (count ?? 0) >= HOURLY_GENERATION_LIMIT;
}

export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) return Response.json({ error: "This request is not allowed." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 5_000) return Response.json({ error: "This request is too large." }, { status: 413 });

  try {
    const user = await requireAuthenticatedUser();
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "The recommendation request is invalid." }, { status: 400 });
    const context = await loadContext(user.id);
    if (parsed.data.excludeTitles.length === 0) {
      const cached = await cachedRecommendations(user.id, context.niche);
      if (cached) {
        return Response.json({ ideas: cached.recommendations, niche: cached.niche, capturedAt: cached.trendSnapshotAt, refreshedTrends: false }, { headers: { "Cache-Control": "private, no-store" } });
      }
    }
    if (await rateLimitReached(user.id)) return Response.json({ error: "Idea generation limit reached. Try again later." }, { status: 429 });
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
      provider: generated.completion.provider,
      model: generated.completion.model,
      input_units: generated.completion.inputTokens,
      output_units: generated.completion.outputTokens,
      cost_microunits: null,
      metadata: { trend_snapshot_at: trends.evidence.capturedAt, trendSnapshotAt: trends.evidence.capturedAt, niche: context.niche, recommendations: ideas },
    });
    return Response.json({ ideas, niche: context.niche, capturedAt: trends.evidence.capturedAt, refreshedTrends: trends.refreshed }, { headers: { "Cache-Control": "private, no-store" } });
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
