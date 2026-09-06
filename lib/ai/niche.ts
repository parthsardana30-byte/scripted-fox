import "server-only";

import { z } from "zod";

import { createGeminiCompletion } from "@/lib/ai/groq";
import { inferNicheFromVideoTitles } from "@/lib/youtube/niche-heuristics";

const inferredNicheSchema = z.object({
  niche: z.string().min(3).max(60),
});

const inferredNicheJsonSchema = {
  type: "json_schema",
  json_schema: {
    name: "youtube_channel_niche",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["niche"],
      properties: {
        niche: { type: "string", minLength: 3, maxLength: 60 },
      },
    },
  },
} as const;

export async function inferCreatorNiche(input: { channelTitle?: string | null; recentTitles: string[] }) {
  if (input.recentTitles.length === 0) return null;
  const titleBasedNiche = inferNicheFromVideoTitles(input.recentTitles);
  if (titleBasedNiche) return titleBasedNiche;

  const completion = await createGeminiCompletion({
    system: "Infer a concise YouTube creator niche primarily from the supplied recent video titles. Treat the channel title only as identity, never as proof of topic. If the channel title conflicts with recent titles, follow the recent titles. Return a natural 2-6 word niche suitable for finding related videos. Do not invent channel facts. Return only JSON.",
    user: `Channel: ${input.channelTitle ?? "Unknown"}\nRecent video titles:\n${input.recentTitles.slice(0, 8).map((title) => `- ${title}`).join("\n")}`,
    responseFormat: inferredNicheJsonSchema,
    maxCompletionTokens: 300,
  });
  const parsed = inferredNicheSchema.safeParse(JSON.parse(completion.content));
  return parsed.success ? parsed.data.niche.trim() : null;
}
