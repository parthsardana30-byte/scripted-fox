import "server-only";

import { z } from "zod";

import { AiProviderError, createAiCompletion, type AiCompletion } from "@/lib/ai/groq";
import { topicTokens } from "@/lib/youtube/trend-scoring";

const generatedIdeasSchema = z.object({
  ideas: z.array(z.object({
    title: z.string().min(4).max(140),
    angle: z.string().min(10).max(320),
    format: z.string().min(3).max(80),
    reason: z.string().min(10).max(420),
    trendVideoId: z.string().min(1).max(40),
  })).min(5).max(5),
});

const generatedIdeasJsonSchema = {
  type: "json_schema",
  json_schema: {
    name: "youtube_idea_recommendations",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["ideas"],
      properties: {
        ideas: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "angle", "format", "reason", "trendVideoId"],
            properties: {
              title: { type: "string", minLength: 4, maxLength: 140 },
              angle: { type: "string", minLength: 10, maxLength: 320 },
              format: { type: "string", minLength: 3, maxLength: 80 },
              reason: { type: "string", minLength: 10, maxLength: 420 },
              trendVideoId: { type: "string", minLength: 1, maxLength: 40 },
            },
          },
        },
      },
    },
  },
} as const;

function similarity(left: string, right: string) {
  const leftTokens = topicTokens(left);
  const rightTokens = topicTokens(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let intersection = 0;
  leftTokens.forEach((token) => { if (rightTokens.has(token)) intersection += 1; });
  return intersection / new Set([...leftTokens, ...rightTokens]).size;
}

function validRecommendationSet(
  ideas: z.infer<typeof generatedIdeasSchema>["ideas"],
  trendTitlesById: Map<string, string>,
  excludedTitles: string[],
) {
  if (ideas.some((idea) => {
    const sourceTitle = trendTitlesById.get(idea.trendVideoId);
    return !sourceTitle || similarity(`${idea.title} ${idea.angle}`, sourceTitle) === 0;
  })) return false;
  if (ideas.some((idea) => excludedTitles.some((title) => similarity(idea.title, title) >= .62))) return false;
  for (let index = 0; index < ideas.length; index += 1) {
    if (ideas.slice(index + 1).some((idea) => similarity(ideas[index].title, idea.title) >= .68)) return false;
  }
  const formatCounts = new Map<string, number>();
  ideas.forEach((idea) => {
    const key = idea.format.trim().toLocaleLowerCase();
    formatCounts.set(key, (formatCounts.get(key) ?? 0) + 1);
  });
  return [...formatCounts.values()].every((count) => count <= 2);
}

export async function generateIdeaRecommendations(input: {
  niche: string;
  goal: string;
  languages: string[];
  markets: string[];
  trendSignals: Array<{ id: string; title: string; market: string; score: number; viewsPerDay: number }>;
  channelSummary: string | null;
  excludedTitles: string[];
}): Promise<{ ideas: z.infer<typeof generatedIdeasSchema>["ideas"]; completion: AiCompletion }> {
  const trendTitlesById = new Map(input.trendSignals.map((signal) => [signal.id, signal.title]));
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const completion = await createAiCompletion({
      system: "You are a rigorous YouTube content strategist. Every recommendation must stay inside the creator's specific niche and be realistically supported by one supplied trend video plus the creator's actual channel evidence. Recommend original angles, never copies. Use varied formats: no format may appear more than twice. A video's velocity proves only that specific video's momentum; it does not prove global demand. Never invent release years, rankings, search demand, competition, demographics, creator experiences, or performance claims. If evidence is sparse, describe the idea as an experiment. Return only the requested JSON.",
      user: `Create exactly five strong next-video ideas.${attempt > 0 ? " The previous set failed strict novelty or evidence validation; make every title and format more distinct and use only the supplied IDs." : ""}\n\nCreator niche: ${input.niche}\nCreator goal: ${input.goal}\nLanguages: ${input.languages.join(", ")}\nMarkets: ${input.markets.join(", ")}\nChannel evidence and feedback: ${input.channelSummary ?? "No reliable private channel performance is available yet."}\nTitles to avoid: ${input.excludedTitles.join(" | ") || "None"}\n\nVerified public YouTube signals:\n${input.trendSignals.map((signal) => `- ID ${signal.id}: “${signal.title}” · ${signal.market} · ${Math.round(signal.viewsPerDay)} views/day · opportunity score ${signal.score}/100`).join("\n")}\n\nFor every idea, choose the supplied trend video ID that most directly supports it. Keep the angle inside ${input.niche}, clearly different from the source and all excluded titles, and explain the evidence without turning correlation into fact.`,
      responseFormat: generatedIdeasJsonSchema,
      maxCompletionTokens: 3_000,
    });
    try {
      const parsed = generatedIdeasSchema.safeParse(JSON.parse(completion.content));
      if (parsed.success && validRecommendationSet(parsed.data.ideas, trendTitlesById, input.excludedTitles)) {
        return { ideas: parsed.data.ideas, completion };
      }
    } catch {
      // Retry once with stricter repair instructions.
    }
  }
  throw new AiProviderError("The recommendations did not pass evidence and novelty validation.");
}
