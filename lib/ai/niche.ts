import "server-only";

import { z } from "zod";

import { createAiCompletion } from "@/lib/ai/groq";
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
  if (titleBasedNiche && titleBasedNiche !== "Music" && titleBasedNiche !== "Gaming") return titleBasedNiche;

  try {
    const completion = await createAiCompletion({
      system: "Infer the narrowest defensible YouTube creator niche from the supplied video titles. Treat the channel title only as identity, never as proof of topic. Prefer a specific format and subject such as 'piano covers', 'budget Android reviews', or 'BGMI gameplay' over broad labels such as 'music', 'technology', or 'gaming'. Do not infer facts that the titles do not support. Return a natural 2-6 word niche suitable as a YouTube search query. Return only JSON.",
      user: `Channel: ${input.channelTitle ?? "Unknown"}\nVideo titles (newest or strongest first):\n${input.recentTitles.slice(0, 20).map((title) => `- ${title}`).join("\n")}`,
      responseFormat: inferredNicheJsonSchema,
      maxCompletionTokens: 300,
    });
    const parsed = inferredNicheSchema.safeParse(JSON.parse(completion.content));
    return parsed.success ? parsed.data.niche.trim() : titleBasedNiche;
  } catch {
    return titleBasedNiche;
  }
}
