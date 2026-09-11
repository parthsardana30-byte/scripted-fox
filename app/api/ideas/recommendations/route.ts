import { randomUUID } from "node:crypto";

import { z } from "zod";

import { AiConfigurationError, AiProviderError } from "@/lib/ai/groq";
import { generateIdeaRecommendations } from "@/lib/ai/ideas";
import { buildEvidenceBackedFallbackRecommendations } from "@/lib/ideas/fallback";
import { inferCreatorNiche } from "@/lib/ai/niche";
import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";
import { createClient } from "@/lib/db/client";
import { getOrRefreshPublicTrends, YouTubeTrendsError } from "@/lib/youtube/trends";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

const requestSchema = z.object({
  excludeTitles: z.array(z.string().trim().min(1).max(140)).max(20).optional().default([]),
  initialSetup: z.boolean().optional().default(false),
});

const channelSnapshotSchema = z.object({
  channel: z.object({ title: z.string() }).optional(),
  summary: z.object({ views: z.number(), watchTimeMinutes: z.number(), averageViewDurationSeconds: z.number() }),
  topVideos: z.array(z.object({
    title: z.string(), views: z.number(), averageViewPercentage: z.number().optional(),
    averageViewDurationSeconds: z.number().optional(), subscribersGained: z.number().optional(),
  })).max(50),
  recentVideos: z.array(z.object({ title: z.string() })).max(50).default([]),
});
const cachedRecommendationsSchema = z.object({
  algorithmVersion: z.literal("niche-v3"),
  batchId: z.uuid(),
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

const RECOMMENDATION_CACHE_HOURS = 24;
const RECOMMENDATION_ALGORITHM_VERSION = "niche-v3" as const;
const HOURLY_GENERATION_LIMIT = 20;

function objectValue(value: Json | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function loadContext(userId: string) {
  const supabase = await createClient();
  const historySince = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const [{ data: preferences }, { data: snapshot }, { data: ideaHistory }, { data: projects }] = await Promise.all([
    supabase.from("user_preferences").select("content_languages,target_markets,default_script_preferences").eq("user_id", userId).maybeSingle(),
    supabase.from("channel_snapshots").select("metrics").eq("user_id", userId).order("captured_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("ideas").select("title,status").eq("user_id", userId).gte("created_at", historySince).order("created_at", { ascending: false }).limit(100),
    supabase.from("projects").select("title").eq("user_id", userId).gte("created_at", historySince).order("updated_at", { ascending: false }).limit(40),
  ]);
  const defaults = objectValue(preferences?.default_script_preferences);
  const channel = channelSnapshotSchema.safeParse(snapshot?.metrics);
  const topVideo = channel.success ? [...channel.data.topVideos].sort((a, b) => b.views - a.views)[0] : null;
  const savedNiche = typeof defaults.channelNiche === "string" && defaults.channelNiche.trim() ? defaults.channelNiche.trim() : null;
  const inferredNiche = savedNiche || !channel.success ? null : await inferCreatorNiche({
    channelTitle: channel.data.channel?.title,
    recentTitles: [...new Set([
      ...(channel.data.recentVideos ?? []).map((video) => video.title),
      ...channel.data.topVideos.map((video) => video.title),
    ])],
  }).catch(() => null);
  const typedIdeaHistory = (ideaHistory ?? []) as Array<{ title: string; status: string }>;
  const typedProjects = (projects ?? []) as Array<{ title: string }>;
  const positiveIdeas = typedIdeaHistory.filter((idea) => idea.status === "saved" || idea.status === "used").slice(0, 8).map((idea) => idea.title);
  const negativeIdeas = typedIdeaHistory.filter((idea) => idea.status === "dismissed").slice(0, 8).map((idea) => idea.title);
  const historicalTitles = [...new Set([...typedIdeaHistory.map((idea) => idea.title), ...typedProjects.map((project) => project.title)])];
  const performanceDetails = channel.success
    ? channel.data.topVideos.slice(0, 5).map((video) => `“${video.title}” (${video.views} views${video.averageViewPercentage == null ? "" : `, ${Math.round(video.averageViewPercentage)}% average viewed`}${video.subscribersGained == null ? "" : `, +${video.subscribersGained} subscribers`})`).join("; ")
    : "";
  return {
    userId,
    niche: savedNiche ?? inferredNiche ?? "content creation",
    goal: typeof defaults.channelGoal === "string" ? defaults.channelGoal : "growth",
    languages: preferences?.content_languages ?? ["en"],
    markets: preferences?.target_markets ?? ["IN", "GLOBAL"],
    historicalTitles,
    channelSummary: channel.success
      ? `Established channel topics: ${(channel.data.recentVideos ?? []).slice(0, 8).map((video) => `“${video.title}”`).join(", ") || "not enough upload history"}. Last 28 days: ${channel.data.summary.views} views, ${Math.round(channel.data.summary.watchTimeMinutes)} watch minutes, ${Math.round(channel.data.summary.averageViewDurationSeconds)} seconds average view duration${topVideo ? `; strongest recent video was “${topVideo.title}” with ${topVideo.views} views` : ""}. Per-video evidence: ${performanceDetails || "not enough data"}. User saved/used: ${positiveIdeas.join(" | ") || "none yet"}. User dismissed: ${negativeIdeas.join(" | ") || "none yet"}.`
      : null,
    setupStartedAt: typeof defaults.channelSetupStartedAt === "string" ? defaults.channelSetupStartedAt : null,
  };
}

async function cachedRecommendations(userId: string, niche: string, notBefore?: string | null) {
  const supabase = await createClient();
  const cacheFloor = Date.now() - RECOMMENDATION_CACHE_HOURS * 60 * 60_000;
  const requestedFloor = notBefore ? Date.parse(notBefore) : Number.NaN;
  const since = new Date(Number.isFinite(requestedFloor) ? Math.max(cacheFloor, requestedFloor) : cacheFloor).toISOString();
  const { data } = await supabase.from("usage_events")
    .select("metadata")
    .eq("user_id", userId)
    .eq("operation", "ai_idea_recommendations")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10);

  for (const event of data ?? []) {
    const parsed = cachedRecommendationsSchema.safeParse(event.metadata);
    if (!parsed.success || parsed.data.niche !== niche) continue;
    const { data: rows } = await supabase.from("ideas").select("id,status")
      .eq("user_id", userId).eq("recommendation_batch_id", parsed.data.batchId).limit(5);
    const statuses = (rows ?? []) as Array<{ id: string; status: string }>;
    if (statuses.length !== 5 || statuses.some((idea) => idea.status === "dismissed" || idea.status === "used")) continue;
    return {
      ...parsed.data,
      savedIds: statuses.filter((idea) => idea.status === "saved").map((idea) => idea.id),
    };
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
      const cached = await cachedRecommendations(
        user.id,
        context.niche,
        parsed.data.initialSetup ? context.setupStartedAt : null,
      );
      if (cached) {
        return Response.json({ ideas: cached.recommendations, savedIds: cached.savedIds, niche: cached.niche, capturedAt: cached.trendSnapshotAt, refreshedTrends: false }, { headers: { "Cache-Control": "private, no-store" } });
      }
    }
    if (!parsed.data.initialSetup && await rateLimitReached(user.id)) {
      return Response.json({ error: "Idea generation limit reached. Try again later." }, { status: 429 });
    }
    const trends = await getOrRefreshPublicTrends(context);
    if (trends.evidence.videos.length < 3) return Response.json({ error: "Not enough current trend evidence is available yet." }, { status: 503 });
    const trendSignals = trends.evidence.videos.slice(0, 14);
    const excludedTitles = [...new Set([...parsed.data.excludeTitles, ...context.historicalTitles])].slice(0, 140);
    const generated = parsed.data.initialSetup
      ? {
          ideas: buildEvidenceBackedFallbackRecommendations({ niche: context.niche, trendSignals }),
          completion: null,
        }
      : await generateIdeaRecommendations({ ...context, trendSignals, excludedTitles });
    const byId = new Map(trendSignals.map((signal) => [signal.id, signal]));
    const batchId = randomUUID();
    const ideas = generated.ideas.map((idea) => {
      const signal = byId.get(idea.trendVideoId);
      if (!signal) throw new AiProviderError("A recommendation referenced unverified trend evidence.");
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
    const { error: ideasError } = await supabase.from("ideas").insert(ideas.map((idea) => ({
      id: idea.id, user_id: user.id, title: idea.title, angle: idea.angle, format: idea.format, reason: idea.reason,
      status: "recommended", recommendation_batch_id: batchId, creator_profile_version: null,
      generation_version: parsed.data.initialSetup ? `${RECOMMENDATION_ALGORITHM_VERSION}-evidence` : RECOMMENDATION_ALGORITHM_VERSION, dismissed_at: null,
    })));
    if (ideasError) {
      console.error("[Ideas] Recommendation insert failed", {
        name: ideasError.name,
        message: ideasError.message,
      });
      throw new Error("Recommendations could not be stored.");
    }
    const evidenceRows = ideas.flatMap((idea) => idea.evidence.map((evidence) => ({
      user_id: user.id, idea_id: idea.id, source: evidence.source === "YouTube trend" ? "youtube_trend" : "channel",
      label: evidence.label, value: evidence.value, explanation: idea.reason, source_snapshot_id: null,
      captured_at: trends.evidence.capturedAt,
    })));
    const { error: evidenceError } = await supabase.from("idea_evidence").insert(evidenceRows);
    if (evidenceError) {
      console.error("[Ideas] Recommendation evidence insert failed", {
        name: evidenceError.name,
        message: evidenceError.message,
      });
      throw new Error("Recommendation evidence could not be stored.");
    }
    await supabase.from("usage_events").insert({
      user_id: user.id,
      operation: "ai_idea_recommendations",
      provider: generated.completion?.provider ?? null,
      model: generated.completion?.model ?? "evidence-template-v1",
      input_units: generated.completion?.inputTokens ?? null,
      output_units: generated.completion?.outputTokens ?? null,
      cost_microunits: null,
      metadata: { algorithmVersion: RECOMMENDATION_ALGORITHM_VERSION, batchId, generationMode: parsed.data.initialSetup ? "evidence_template" : "ai", trend_snapshot_at: trends.evidence.capturedAt, trendSnapshotAt: trends.evidence.capturedAt, niche: context.niche, recommendations: ideas },
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
    console.error("[Ideas] Recommendation generation failed", error instanceof Error ? {
      name: error.name,
      message: error.message,
    } : { name: "UnknownError" });
    return Response.json({ error: "Recommendations could not be generated." }, { status: 500 });
  }
}
