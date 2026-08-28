import "server-only";

import { z } from "zod";

import { serverEnvironment } from "@/lib/env/server";

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 2;

const groqResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.string() }),
  })).min(1),
  usage: z.object({
    prompt_tokens: z.number().int().nonnegative().optional(),
    completion_tokens: z.number().int().nonnegative().optional(),
  }).optional(),
});

export class AiConfigurationError extends Error {}
export class AiProviderError extends Error {
  constructor(message: string, readonly status: number | null = null, readonly code: string | null = null) {
    super(message);
    this.name = "AiProviderError";
  }
}

export type GroqCompletion = {
  content: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

function requireGroqConfiguration() {
  if (serverEnvironment.AI_PROVIDER !== "groq") {
    throw new AiConfigurationError("The configured AI provider is unavailable.");
  }
  if (!serverEnvironment.AI_API_KEY || !serverEnvironment.AI_MODEL) {
    throw new AiConfigurationError("AI credentials are incomplete.");
  }
  return { apiKey: serverEnvironment.AI_API_KEY, model: serverEnvironment.AI_MODEL };
}

export async function createGroqCompletion(input: {
  system: string;
  user: string;
  responseFormat?: Record<string, unknown>;
  maxCompletionTokens?: number;
}): Promise<GroqCompletion> {
  const { apiKey, model } = requireGroqConfiguration();
  const requestBody = JSON.stringify({
    model,
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
    temperature: 0.6,
    max_completion_tokens: input.maxCompletionTokens ?? 4_000,
    ...(input.responseFormat ? { response_format: input.responseFormat } : {}),
  });

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: requestBody,
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
        const code = errorPayload?.error?.code ?? null;
        const retryable = response.status === 429 || response.status >= 500;
        if (process.env.NODE_ENV !== "production") {
          console.error(`[AI] Groq request failed: status=${response.status} code=${code ?? "unknown"}`);
        }
        if (retryable && attempt + 1 < MAX_ATTEMPTS) {
          const retryAfterSeconds = Number(response.headers.get("retry-after"));
          const delayMilliseconds = Number.isFinite(retryAfterSeconds)
            ? Math.min(Math.max(retryAfterSeconds * 1_000, 500), 2_500)
            : 750;
          await new Promise((resolve) => setTimeout(resolve, delayMilliseconds));
          continue;
        }
        throw new AiProviderError(`Groq request failed with status ${response.status}.`, response.status, code);
      }

      const parsed = groqResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new AiProviderError("Groq returned an unexpected response.", 502, "invalid_response");

      return {
        content: parsed.data.choices[0].message.content,
        model,
        inputTokens: parsed.data.usage?.prompt_tokens ?? null,
        outputTokens: parsed.data.usage?.completion_tokens ?? null,
      };
    } catch (error) {
      if (error instanceof AiConfigurationError || error instanceof AiProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new AiProviderError("Groq did not respond in time.", 504, "timeout");
      }
      if (attempt + 1 < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 750));
        continue;
      }
      throw new AiProviderError("Groq could not be reached.", 503, "network_error");
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new AiProviderError("Groq could not be reached.", 503, "retry_exhausted");
}
