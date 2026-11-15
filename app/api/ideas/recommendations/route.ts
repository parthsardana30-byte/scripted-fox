import { randomUUID } from "node:crypto";

import { z } from "zod";

import { AiConfigurationError, AiProviderError } from "@/lib/ai/groq";
import { generateIdeaRecommendations } from "@/lib/ai/ideas";
import { inferCreatorNiche } from "@/lib/ai/niche";
import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";
import { readJsonBody, RequestBodyError } from "@/lib/security/request-body";
import { createClient } from "@/lib/db/client";
import { databasePool } from "@/lib/db/pool";
import { getBillingAccess, hasBillingFeature } from "@/lib/billing/access";
import { consumeCredits, refundCredits } from "@/lib/billing/credits";
import { dailyIdeaLimits } from "@/lib/billing/plans";
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
  algorithmVersion: z.literal("channel-ideas-v4"),
  channelFingerprint: z.string(),
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
const RECOMMENDATION_ALGORITHM_VERSION = "channel-ideas-v4" as const;
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
  const channelVideos = channel.success ? [...new Set([
    ...channel.data.recentVideos.map((video) => video.title.trim()),
    ...channel.data.topVideos.map((video) => video.title.trim()),
  ])].filter(Boolean).slice(0, 50).map((title, index) => ({ id: `upload-${index + 1}`, title })) : [];
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
    channelVideos,
    channelFingerprint: JSON.stringify(channelVideos.map((video) => video.title)),
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

async function cachedRecommendations(userId: string, niche: string, channelFingerprint: string, notBefore?: string | null) {
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
    if (!parsed.success || parsed.data.niche !== niche || parsed.data.channelFingerprint !== channelFingerprint) continue;
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

async function dailyIdeaCount(userId: string) {
  const supabase = await createClient();
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { data } = await supabase.from("usage_events").select("metadata")
    .eq("user_id", userId).eq("operation", "ai_idea_recommendations").gte("created_at", since.toISOString()).limit(20);
  return (data ?? []).reduce((total: number, event: { metadata?: Json }) => {
    const recommendations = objectValue(event.metadata).recommendations;
    return total + (Array.isArray(recommendations) ? recommendations.length : 0);
  }, 0);
}

export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) return Response.json({ error: "This request is not allowed." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 5_000) return Response.json({ error: "This request is too large." }, { status: 413 });

  let reservedForUser: string | null = null;
  try {
    const user = await requireAuthenticatedUser();
    const access = await getBillingAccess(user.id);
    if (!hasBillingFeature(access, "channel_aware_ideas")) {
      return Response.json({ error: "Start a trial or choose Pro or Gold for channel-matched ideas." }, { status: 402 });
    }
    const parsed = requestSchema.safeParse(await readJsonBody(request, 5000));
    if (!parsed.success) return Response.json({ error: "The recommendation request is invalid." }, { status: 400 });
    const context = await loadContext(user.id);
    if (!context.channelVideos.length) {
      return Response.json({ error: "Sync your YouTube channel first. Daily Topics needs your previous upload titles to suggest fresh video ideas." }, { status: 409 });
    }
    if (parsed.data.excludeTitles.length === 0) {
      const cached = await cachedRecommendations(
        user.id,
        context.niche,
        context.channelFingerprint,
        parsed.data.initialSetup ? context.setupStartedAt : null,
      );
      if (cached) {
        return Response.json({ ideas: cached.recommendations, savedIds: cached.savedIds, niche: cached.niche, capturedAt: cached.trendSnapshotAt, refreshedTrends: false }, { headers: { "Cache-Control": "private, no-store" } });
      }
    }
    if (!parsed.data.initialSetup && await rateLimitReached(user.id)) {
      return Response.json({ error: "Idea generation limit reached. Try again later." }, { status: 429 });
    }
    const dailyLimit = dailyIdeaLimits[access.plan];
    if (await dailyIdeaCount(user.id) + 5 > dailyLimit) {
      return Response.json({ error: `Your ${dailyLimit}-idea daily limit has been reached.` }, { status: 429 });
    }
    const capturedAt = new Date().toISOString();
    const excludedTitles = [...new Set([...parsed.data.excludeTitles, ...context.historicalTitles])].slice(0, 140);
    if (!(await consumeCredits(user.id, 5))) {
      return Response.json({ error: "You need 5 Fox Credits to generate another topic set." }, { status: 402 });
    }
    reservedForUser = user.id;
    const generated = await generateIdeaRecommendations({ ...context, excludedTitles });
    const byId = new Map(context.channelVideos.map((video) => [video.id, video]));
    const batchId = randomUUID();
    const ideas = generated.ideas.map((idea) => {
      const source = byId.get(idea.sourceVideoId);
      if (!source) throw new AiProviderError("A recommendation referenced an unknown upload.");
      return {
        id: randomUUID(),
        title: idea.title,
        angle: idea.angle,
        format: idea.format,
        reason: idea.reason,
        evidence: [
          { label: "Based on your upload history", value: source.title, source: "Your channel" as const },
        ],
      };
    });
    const evidenceRows = ideas.flatMap((idea) => idea.evidence.map((evidence) => ({
      user_id: user.id, idea_id: idea.id, source: "channel",
      label: evidence.label, value: evidence.value, explanation: idea.reason, source_snapshot_id: null,
      captured_at: capturedAt,
    })));
    const client = await databasePool.connect();
    try {
      await client.query("BEGIN");
      for (const idea of ideas) {
        await client.query(
          `INSERT INTO ideas (id, user_id, title, angle, format, reason, status, recommendation_batch_id, generation_version)
           VALUES ($1, $2, $3, $4, $5, $6, 'recommended', $7, $8)`,
          [idea.id, user.id, idea.title, idea.angle, idea.format, idea.reason, batchId,
            RECOMMENDATION_ALGORITHM_VERSION],
        );
      }
      for (const evidence of evidenceRows) {
        await client.query(
          `INSERT INTO idea_evidence (user_id, idea_id, source, label, value, explanation, source_snapshot_id, captured_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)`,
          [evidence.user_id, evidence.idea_id, evidence.source, evidence.label, evidence.value, evidence.explanation,
            evidence.source_snapshot_id, evidence.captured_at],
        );
      }
      await client.query(
        `INSERT INTO usage_events (user_id, operation, provider, model, input_units, output_units, cost_microunits, metadata)
         VALUES ($1, 'ai_idea_recommendations', $2, $3, $4, $5, NULL, $6::jsonb)`,
        [user.id, generated.completion.provider, generated.completion.model,
          generated.completion.inputTokens, generated.completion.outputTokens,
          JSON.stringify({ algorithmVersion: RECOMMENDATION_ALGORITHM_VERSION, channelFingerprint: context.channelFingerprint, batchId, generationMode: "channel_ai", trendSnapshotAt: capturedAt, niche: context.niche, recommendations: ideas })],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    reservedForUser = null;
    return Response.json({ ideas, niche: context.niche, capturedAt, refreshedTrends: false }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (reservedForUser) await refundCredits(reservedForUser, 5).catch(() => undefined);
    if (error instanceof RequestBodyError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: "Sign in to generate recommendations." }, { status: 401 });
    if (error instanceof AiConfigurationError) return Response.json({ error: "The idea service is not configured. Please contact support; retrying cannot fix this." }, { status: 503 });
    if (error instanceof AiProviderError) {
      console.error("[Ideas] AI unavailable", { status: error.status, code: error.code });
      const message = error.status === 429
        ? "The AI service has reached its usage limit. Please try later or contact support. This is not a problem with your channel."
        : error.status === 401 || error.status === 403
          ? "The AI service is currently unavailable because provider access needs attention. Please contact support; repeated retries will not fix it."
          : "Fresh video ideas could not be generated right now. Please try again later.";
      return Response.json({ error: message }, { status: 503 });
    }
    console.error("[Ideas] Recommendation generation failed", error instanceof Error ? {
      name: error.name,
      message: error.message,
    } : { name: "UnknownError" });
    return Response.json({ error: "Recommendations could not be generated." }, { status: 500 });
  }
}
