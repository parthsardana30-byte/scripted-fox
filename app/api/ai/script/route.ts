import { z } from "zod";

import { AuthenticationRequiredError, requireAuthenticatedUser } from "@/lib/auth/session";
import { AiConfigurationError, AiProviderError } from "@/lib/ai/groq";
import { inferCreatorNiche } from "@/lib/ai/niche";
import { assistWithScript, generateScriptDraft } from "@/lib/ai/script";
import { aiRequestSchema } from "@/lib/ai/types";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";
import { createClient } from "@/lib/db/client";
import { getBillingAccess, hasBillingFeature } from "@/lib/billing/access";
import { getCachedPublicTrends, trendSummaryForTitle } from "@/lib/youtube/trends";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 32_000;
const REQUESTS_PER_MINUTE = 10;

const snapshotContextSchema = z.object({
  channel: z.object({ title: z.string() }).optional(),
  summary: z.object({
    views: z.number().nonnegative(),
    watchTimeMinutes: z.number().nonnegative(),
    averageViewDurationSeconds: z.number().nonnegative(),
    subscribersGained: z.number().nonnegative(),
  }),
  topVideos: z.array(z.object({ title: z.string(), views: z.number().nonnegative() })).max(50),
  recentVideos: z.array(z.object({ title: z.string() })).max(50).default([]),
});

function objectValue(value: Json | undefined) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function loadCreatorContext(userId: string, title: string) {
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
  const analytics = snapshotContextSchema.safeParse(snapshot?.metrics);
  const topVideo = analytics.success
    ? [...analytics.data.topVideos].sort((a, b) => b.views - a.views)[0]
    : null;
  const savedNiche = typeof defaults.channelNiche === "string" && defaults.channelNiche.trim()
    ? defaults.channelNiche.trim()
    : null;
  const inferredNiche = savedNiche || !analytics.success
    ? null
    : await inferCreatorNiche({
        channelTitle: analytics.data.channel?.title,
        recentTitles: [...new Set([
          ...(analytics.data.recentVideos ?? []).map((video) => video.title),
          ...analytics.data.topVideos.map((video) => video.title),
        ])],
      }).catch(() => null);

  const trendPreferences = {
    userId,
    niche: savedNiche ?? inferredNiche ?? "content creation",
    languages: preferences?.content_languages ?? ["en"],
    markets: preferences?.target_markets ?? ["IN", "GLOBAL"],
  };
  const trends = await getCachedPublicTrends(trendPreferences);

  return {
    niche: trendPreferences.niche,
    languages: trendPreferences.languages,
    markets: trendPreferences.markets,
    tone: typeof defaults.tone === "string" ? defaults.tone : "clear",
    videoLength: typeof defaults.videoLength === "string" ? defaults.videoLength : "7-10 minutes",
    openingStyle: typeof defaults.openingStyle === "string" ? defaults.openingStyle : "value-first",
    analyticsSummary: analytics.success
      ? `Established upload topics: ${(analytics.data.recentVideos ?? []).slice(0, 8).map((video) => `“${video.title}”`).join(", ") || "not enough upload history"}. Last 28 days: ${analytics.data.summary.views} views, ${Math.round(analytics.data.summary.watchTimeMinutes)} watch minutes, ${Math.round(analytics.data.summary.averageViewDurationSeconds)}s average view duration, ${analytics.data.summary.subscribersGained} subscribers gained${topVideo ? `; strongest recent video: “${topVideo.title}” with ${topVideo.views} views` : ""}.`
      : null,
    trendSummary: trends ? trendSummaryForTitle(trends.evidence, title) : null,
  };
}

async function enforceRateLimit(userId: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .like("operation", "ai_script_%")
    .gte("created_at", since);
  if (error) throw new Error("Rate limit check failed");
  return (count ?? 0) < REQUESTS_PER_MINUTE;
}

async function recordUsage(userId: string, mode: "generate" | "assist", completion: { provider: string; model: string; inputTokens: number | null; outputTokens: number | null }) {
  const supabase = await createClient();
  await supabase.from("usage_events").insert({
    user_id: userId,
    operation: `ai_script_${mode}`,
    provider: completion.provider,
    model: completion.model,
    input_units: completion.inputTokens,
    output_units: completion.outputTokens,
    cost_microunits: null,
    metadata: { source: "script_editor" },
  });
}

export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) {
    return Response.json({ error: "This request is not allowed." }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return Response.json({ error: "This request is too large." }, { status: 413 });
  }

  try {
    const user = await requireAuthenticatedUser();
    const access = await getBillingAccess(user.id);
    if (!hasBillingFeature(access, "ai_script_writer")) {
      return Response.json({ error: "Choose Plus or Pro to use AI script writing." }, { status: 402 });
    }
    if (!(await enforceRateLimit(user.id))) {
      return Response.json({ error: "You’re generating too quickly. Wait a minute and try again." }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
    }
    const parsed = aiRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Check the script details and try again." }, { status: 400 });
    }
    const context = await loadCreatorContext(user.id, parsed.data.title);

    if (parsed.data.mode === "generate") {
      const { draft, completion } = await generateScriptDraft({ ...parsed.data, context });
      await recordUsage(user.id, "generate", completion);
      return Response.json({ draft });
    }

    const result = await assistWithScript({ ...parsed.data, context });
    await recordUsage(user.id, "assist", result.completion);
    return Response.json({ draft: result.draft, message: result.message });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: "Sign in to use AI writing." }, { status: 401 });
    }
    if (error instanceof AiConfigurationError) {
      return Response.json({ error: "AI is not configured yet." }, { status: 503 });
    }
    if (error instanceof AiProviderError) {
      if (error.status === 429) {
        return Response.json({ error: "The AI request limit was reached. Wait a moment and try again." }, { status: 429 });
      }
      if (error.status !== null && error.status >= 500) {
        return Response.json({ error: "The AI service had a temporary problem. Please try again." }, { status: 503 });
      }
      return Response.json({ error: "The AI could not complete this script. Try again." }, { status: 502 });
    }
    return Response.json({ error: "The script could not be generated. Try again." }, { status: 500 });
  }
}
