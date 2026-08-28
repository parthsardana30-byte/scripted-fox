import { z } from "zod";

export const ideaSchema = z.object({
  idea: z
    .string()
    .trim()
    .min(12, "Add a little more detail so we can shape a useful video plan.")
    .max(280, "Keep the idea under 280 characters for this first step."),
});

export type IdeaInput = z.infer<typeof ideaSchema>;
