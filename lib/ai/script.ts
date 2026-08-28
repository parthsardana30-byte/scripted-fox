import "server-only";

import { createGroqCompletion, type GroqCompletion } from "@/lib/ai/groq";
import { scriptWritingSystemPrompt } from "@/lib/ai/prompts/script-writing-prompt";
import { scriptDraftSchema, type ScriptDraft } from "@/lib/ai/types";

type CreatorContext = {
  languages: string[];
  markets: string[];
  tone: string;
  videoLength: string;
  openingStyle: string;
  analyticsSummary: string | null;
  trendSummary: string | null;
};

const draftJsonSchema = {
  type: "json_schema",
  json_schema: {
    name: "youtube_script_draft",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title", "sections"],
      properties: {
        title: { type: "string" },
        sections: {
          type: "array",
          minItems: 1,
          maxItems: 12,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "body"],
            properties: { label: { type: "string" }, body: { type: "string" } },
          },
        },
      },
    },
  },
} as const;

const editedDraftJsonSchema = {
  type: "json_schema",
  json_schema: {
    name: "edited_youtube_script_draft",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["draft", "message"],
      properties: {
        draft: draftJsonSchema.json_schema.schema,
        message: { type: "string", minLength: 8, maxLength: 180 },
      },
    },
  },
} as const;

function contextText(context: CreatorContext) {
  return [
    `Language: ${context.languages.join(", ") || "English"}`,
    `Target market: ${context.markets.join(", ") || "Global"}`,
    `Tone: ${context.tone}`,
    `Target length: ${context.videoLength}`,
    `Opening style: ${context.openingStyle}`,
    context.analyticsSummary ? `Recent channel signals: ${context.analyticsSummary}` : "No reliable channel analytics are available yet.",
    context.trendSummary ? `Relevant public YouTube signals: ${context.trendSummary}` : "No relevant cached YouTube trend evidence is available for this topic.",
  ].join("\n");
}

export async function generateScriptDraft(input: {
  title: string;
  brief: string;
  context: CreatorContext;
}): Promise<{ draft: ScriptDraft; completion: GroqCompletion }> {
  const completion = await createGroqCompletion({
    system: scriptWritingSystemPrompt("generate"),
    user: `Create a complete YouTube script package.\n\nTopic/title: ${input.title}\nAdditional direction: ${input.brief || "Use your best editorial judgment."}\n\nCreator context:\n${contextText(input.context)}\n\nMake the hook earn attention quickly, build a clear progression, include concrete examples where appropriate, and finish without a generic subscribe request.`,
    responseFormat: draftJsonSchema,
    maxCompletionTokens: 5_000,
  });
  const draft = scriptDraftSchema.parse(JSON.parse(completion.content));
  return { draft, completion };
}

export async function assistWithScript(input: {
  title: string;
  instruction: string;
  draft: ScriptDraft;
  context: CreatorContext;
}) {
  const completion = await createGroqCompletion({
    system: scriptWritingSystemPrompt("edit"),
    user: `Request: ${input.instruction}\n\nCreator context:\n${contextText(input.context)}\n\nCurrent draft JSON:\n${JSON.stringify(input.draft)}`,
    responseFormat: editedDraftJsonSchema,
    maxCompletionTokens: 5_000,
  });
  const parsed = JSON.parse(completion.content) as { draft: unknown; message: unknown };
  return {
    draft: scriptDraftSchema.parse(parsed.draft),
    message: typeof parsed.message === "string" ? parsed.message : "Done — I updated the script.",
    completion,
  };
}
