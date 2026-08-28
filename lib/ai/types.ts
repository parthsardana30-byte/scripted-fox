import { z } from "zod";

export const scriptSectionSchema = z.object({
  label: z.string().min(1).max(80),
  body: z.string().min(1).max(12_000),
});

export const scriptDraftSchema = z.object({
  title: z.string().min(1).max(160),
  sections: z.array(scriptSectionSchema).min(1).max(12),
});

export type ScriptDraft = z.infer<typeof scriptDraftSchema>;

const placeholderTitlePattern = /^(?:untitled(?: script)?|new script|script)$/i;
const editOnlyInstructionPattern = /^(?:add|change|expand|fix|improve|make|polish|remove|rewrite|revise|shorten|strengthen|tighten)\b/i;
const genericGenerationPattern = /^(?:help me )?(?:create|generate|write)(?: me)?(?: a| the| my)?(?: full| complete| new| youtube)? script(?: using (?:this|the) title(?: and my saved preferences)?)?[.!]?$/i;

export function hasMeaningfulScriptTitle(title: string) {
  const normalized = title.trim();
  return normalized.length >= 3 && !placeholderTitlePattern.test(normalized);
}

export function hasScriptContent(draft: Pick<ScriptDraft, "sections">) {
  return draft.sections.some((section) => section.body.trim().length > 0);
}

export function isEditOnlyInstruction(instruction: string) {
  const normalized = instruction.trim();
  if (/\b(?:video|script)\s+(?:about|on)\b/i.test(normalized)) return false;
  return editOnlyInstructionPattern.test(normalized);
}

export function instructionProvidesTopic(instruction: string) {
  const normalized = instruction.trim();
  if (normalized.length < 12 || genericGenerationPattern.test(normalized) || isEditOnlyInstruction(normalized)) return false;
  return /\b(?:about|on|comparing|versus|vs\.?|why|how)\b\s+\S+/i.test(normalized)
    || normalized.split(/\s+/).length >= 4;
}

export function canGenerateFromEmptyScript(title: string, instruction: string) {
  return !isEditOnlyInstruction(instruction)
    && (hasMeaningfulScriptTitle(title) || instructionProvidesTopic(instruction));
}

const editableScriptDraftSchema = scriptDraftSchema.extend({
  sections: z.array(scriptSectionSchema.extend({ body: z.string().max(12_000) })).min(1).max(12),
});

export const aiRequestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("generate"),
    title: z.string().trim().min(3).max(160),
    brief: z.string().trim().max(2_000).optional().default(""),
  }),
  z.object({
    mode: z.literal("assist"),
    title: z.string().trim().min(1).max(160),
    instruction: z.string().trim().min(2).max(1_000),
    draft: editableScriptDraftSchema,
  }),
]).superRefine((request, context) => {
  if (request.mode === "generate" && !canGenerateFromEmptyScript(request.title, request.brief)) {
    context.addIssue({
      code: "custom",
      path: ["brief"],
      message: "A specific video topic is required before generating a script.",
    });
  }
  if (request.mode === "assist" && !hasScriptContent(request.draft)) {
    context.addIssue({
      code: "custom",
      path: ["draft", "sections"],
      message: "A script must contain text before it can be edited.",
    });
  }
});

export type AiRequest = z.infer<typeof aiRequestSchema>;
