import "server-only";

import { z } from "zod";

import { AiProviderError, createAiCompletion, type AiCompletion } from "@/lib/ai/groq";

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

export async function generateIdeaRecommendations(input: {
  niche: string;
  goal: string;
  languages: string[];
  markets: string[];
  trendSignals: Array<{ id: string; title: string; market: string; score: number; viewsPerDay: number }>;
  channelSummary: string | null;
  excludedTitles: string[];
}): Promise<{ ideas: z.infer<typeof generatedIdeasSchema>["ideas"]; completion: AiCompletion }> {
  const completion = await createAiCompletion({
    system: "You are a YouTube content strategist. Recommend original ideas inspired by supplied evidence, never copies of an existing video's title or premise. Use only the supplied channel and trend facts. Do not invent percentages, searches, competition levels, or audience behavior. Return only the requested JSON.",
    user: `Create exactly five strong next-video ideas.\n\nCreator niche: ${input.niche}\nCreator goal: ${input.goal}\nLanguages: ${input.languages.join(", ")}\nMarkets: ${input.markets.join(", ")}\nChannel evidence: ${input.channelSummary ?? "No reliable private channel performance is available yet."}\nTitles to avoid: ${input.excludedTitles.join(" | ") || "None"}\n\nVerified public YouTube signals:\n${input.trendSignals.map((signal) => `- ID ${signal.id}: “${signal.title}” · ${signal.market} · ${Math.round(signal.viewsPerDay)} views/day · score ${signal.score}/100`).join("\n")}\n\nFor every idea, choose one supplied trend video ID that most directly supports it. Make the title specific and natural, the angle clearly different from the source video, and the reason understandable to a creator.`,
    responseFormat: generatedIdeasJsonSchema,
    maxCompletionTokens: 3_000,
  });
  let parsed: ReturnType<typeof generatedIdeasSchema.safeParse>;
  try {
    parsed = generatedIdeasSchema.safeParse(JSON.parse(completion.content));
  } catch {
    throw new AiProviderError("The recommendation response was not valid JSON.");
  }
  if (!parsed.success) throw new AiProviderError("The recommendation response did not match the required format.");
  return { ideas: parsed.data.ideas, completion };
}
