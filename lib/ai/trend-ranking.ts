import "server-only";

import { z } from "zod";

import { createGeminiCompletion, type AiCompletion } from "@/lib/ai/groq";

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
  ageDays: number;
  views: number;
  viewsPerDay: number;
  recentViewsPerDay: number;
  acceleration: number;
  engagementRate: number;
  momentumScore: number;
};

export async function rankTrendSignalsWithGemini(input: {
  niche: string;
  markets: string[];
  languages: string[];
  signals: TrendRankingInput[];
}): Promise<{ rankings: z.infer<typeof rankingSchema>["rankings"]; completion: AiCompletion }> {
  const completion = await createGeminiCompletion({
    system: "You rank verified YouTube video signals for a creator. Use only supplied facts. Do not claim certainty, predict exact future views, or invent audience/search data. Niche relevance judges topical fit. Opportunity judges current velocity, freshness, engagement and measured acceleration. Rising-now requires strong present momentum; breakout-candidate means early evidence with plausible upside; steady means insufficient breakout evidence. Return only JSON.",
    user: `Creator niche: ${input.niche}\nMarkets: ${input.markets.join(", ")}\nLanguages: ${input.languages.join(", ")}\n\nRank every supplied video. Keep each reason concise and evidence-based.\n${input.signals.map((signal) => `- ID ${signal.id}: “${signal.title}” | age ${signal.ageDays.toFixed(1)}d | ${Math.round(signal.views)} views | lifetime ${Math.round(signal.viewsPerDay)} views/day | recent ${Math.round(signal.recentViewsPerDay)} views/day | acceleration ${signal.acceleration.toFixed(2)}x | engagement ${(signal.engagementRate * 100).toFixed(2)}% | momentum ${signal.momentumScore}/100`).join("\n")}`,
    responseFormat: rankingJsonSchema,
    maxCompletionTokens: 3_000,
  });
  const parsed = rankingSchema.safeParse(JSON.parse(completion.content));
  if (!parsed.success) throw new Error("Gemini trend ranking did not match the required format.");
  const allowedIds = new Set(input.signals.map((signal) => signal.id));
  const rankings = parsed.data.rankings.filter((ranking) => allowedIds.has(ranking.id));
  if (rankings.length === 0) throw new Error("Gemini trend ranking did not reference supplied videos.");
  return { rankings, completion };
}
