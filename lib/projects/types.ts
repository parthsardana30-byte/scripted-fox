import { z } from "zod";

import { scriptDraftSchema, scriptSectionSchema } from "@/lib/ai/types";

const storedScriptDraftSchema = scriptDraftSchema.extend({
  sections: z.array(scriptSectionSchema.extend({ body: z.string().max(12_000) })).min(1).max(12),
});

export const scriptDocumentSchema = z.object({
  title: z.string().max(160),
  author: z.string().max(100),
  draft: storedScriptDraftSchema,
});

export const scriptVersionSchema = z.object({
  number: z.number().int().positive(),
  label: z.string().min(1).max(120),
  origin: z.enum(["initial", "ai", "restore"]),
  createdAt: z.string().datetime(),
  snapshot: scriptDocumentSchema,
});

export const projectSaveSchema = z.object({
  projectId: z.uuid().nullable().optional(),
  document: scriptDocumentSchema,
  versions: z.array(scriptVersionSchema).min(1).max(101).refine(
    (versions) => versions.every((version, index) => index === 0 || version.number > versions[index - 1].number),
    "Version numbers must be unique and increasing.",
  ),
});

export type ScriptDocument = z.infer<typeof scriptDocumentSchema>;
export type StoredScriptVersion = z.infer<typeof scriptVersionSchema>;
