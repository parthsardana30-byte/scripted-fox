import "server-only";

import { z } from "zod";

import { createAiCompletion, type AiCompletion } from "@/lib/ai/groq";

const outlookSchema = z.enum(["rising-now", "breakout-candidate", "steady"]);
const rankingSchema = z.object({
  rankings: z.array(z.object({
    id: z.string().min(1).max(40),
    nicheRelevance: z.number().int().min(0).max(100),
    opportunityScore: z.number().int().min(0).max(100),
    outlook: outlookSchema,
    reason: z.string().min(8).max(180),
  })).min(1).max(18),
});

const rankingJsonSchema = {
  type: "json_schema",
  json_schema: {
    name: "youtube_trend_ranking",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["rankings"],
      properties: {
        rankings: {
          type: "array",
          minItems: 1,
          maxItems: 18,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "nicheRelevance", "opportunityScore", "outlook", "reason"],
            properties: {
              id: { type: "string", minLength: 1, maxLength: 40 },
              nicheRelevance: { type: "integer", minimum: 0, maximum: 100 },
              opportunityScore: { type: "integer", minimum: 0, maximum: 100 },
              outlook: { type: "string", enum: ["rising-now", "breakout-candidate", "steady"] },
              reason: { type: "string", minLength: 8, maxLength: 180 },
            },
          },
        },
      },
    },
  },
} as const;

export type TrendRankingInput = {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  discoveryQuery?: string;
  market: string;
  ageDays: number;
  views: number;
  channelSubscribers?: number | null;
  viewsPerDay: number;
  recentViewsPerDay: number;
  acceleration: number;
  engagementRate: number;
  momentumScore: number;
  audienceBreakout: number;
};

export async function rankTrendSignalsWithAi(input: {
  niche: string;
  markets: string[];
  languages: string[];
  signals: TrendRankingInput[];
}): Promise<{ rankings: z.infer<typeof rankingSchema>["rankings"]; completion: AiCompletion }> {
  const completion = await createAiCompletion({
    system: "You rank verified YouTube videos for a creator. Niche relevance is strict: a video must match both the creator's subject and content format, not merely share a broad category such as music, gaming, or technology. Give unrelated or only broadly related videos a nicheRelevance below 45. Use only supplied facts. Opportunity judges velocity, freshness, engagement and measured acceleration. Rising-now requires strong present momentum; breakout-candidate means early evidence with plausible upside; steady means insufficient breakout evidence. Return one ranking for every supplied ID and only JSON.",
    user: `Creator niche: ${input.niche}\nMarkets: ${input.markets.join(", ")}\nLanguages: ${input.languages.join(", ")}\n\nRank every supplied video. Reward unusual performance relative to channel size, not raw views alone. Use title, description, tags and discovery query to judge specific topical fit. Keep each reason concise and evidence-based.\n${input.signals.map((signal) => `- ID ${signal.id}: “${signal.title}” | context ${(signal.description ?? "").slice(0, 180)} | tags ${(signal.tags ?? []).slice(0, 8).join(", ") || "none"} | found by ${signal.discoveryQuery ?? signal.market} | age ${signal.ageDays.toFixed(1)}d | ${Math.round(signal.views)} views | channel subscribers ${signal.channelSubscribers == null ? "hidden" : Math.round(signal.channelSubscribers)} | audience breakout ${signal.audienceBreakout.toFixed(2)}x | lifetime ${Math.round(signal.viewsPerDay)} views/day | recent ${Math.round(signal.recentViewsPerDay)} views/day | acceleration ${signal.acceleration.toFixed(2)}x | engagement ${(signal.engagementRate * 100).toFixed(2)}% | momentum ${signal.momentumScore}/100`).join("\n")}`,
    responseFormat: rankingJsonSchema,
    maxCompletionTokens: 3_000,
  });
  const parsed = rankingSchema.safeParse(JSON.parse(completion.content));
  if (!parsed.success) throw new Error("AI trend ranking did not match the required format.");
  const allowedIds = new Set(input.signals.map((signal) => signal.id));
  const rankings = parsed.data.rankings.filter((ranking) => allowedIds.has(ranking.id));
  if (new Set(rankings.map((ranking) => ranking.id)).size !== input.signals.length) {
    throw new Error("AI trend ranking did not rank every supplied video exactly once.");
  }
  return { rankings, completion };
}
