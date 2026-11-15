import "server-only";

import { z } from "zod";

import { serverEnvironment } from "@/lib/env/server";
import { foxAiSystemPrompt } from "@/lib/support/knowledge";

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;
const MAX_RESPONSE_BYTES = 24_000;

const providerResponseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().min(1).max(12_000) }) })).min(1),
});

const answerSchema = z.object({
  message: z.string().trim().min(1).max(3_000),
  escalate: z.boolean(),
  category: z.enum(["general", "account", "billing", "technical"]).default("general"),
});

export class FoxAiConfigurationError extends Error {}
export class FoxAiProviderError extends Error {
  constructor(message: string, readonly status: number | null = null, readonly code: string | null = null) {
    super(message);
    this.name = "FoxAiProviderError";
  }
}

export type FoxAiAnswer = z.infer<typeof answerSchema>;
export type FoxAiMessage = { role: "user" | "assistant"; content: string };

function configuration() {
  const { FOX_AI_API_URL: url, FOX_AI_API_KEY: apiKey, FOX_AI_MODEL: model } = serverEnvironment;
  if (url && apiKey && model) return { url, apiKey, model };
  if (serverEnvironment.GEMINI_API_KEY && serverEnvironment.GEMINI_MODEL) return {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    apiKey: serverEnvironment.GEMINI_API_KEY,
    model: serverEnvironment.GEMINI_MODEL,
  };
  throw new FoxAiConfigurationError("Fox AI configuration is incomplete.");
}

export async function askFoxAi(input: { messages: FoxAiMessage[]; page: string; feature?: string; locale?: string }) {
  const { url, apiKey, model } = configuration();
  const body = JSON.stringify({
    model,
    messages: [
      { role: "system", content: foxAiSystemPrompt() },
      { role: "system", content: `Safe page context: page=${input.page}; feature=${input.feature ?? "unknown"}; locale=${input.locale ?? "unknown"}.` },
      ...input.messages,
    ],
    temperature: 0.2,
    max_completion_tokens: 1800,
    ...(new URL(url).hostname === "generativelanguage.googleapis.com" ? { reasoning_effort: "low" } : {}),
    response_format: { type: "json_object" },
  });

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body,
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt + 1 < MAX_ATTEMPTS) {
          const retryAfterSeconds = Number(response.headers.get("retry-after"));
          const delayMilliseconds = Number.isFinite(retryAfterSeconds)
            ? Math.min(Math.max(retryAfterSeconds * 1_000, 500), 2_500)
            : 750;
          await new Promise((resolve) => setTimeout(resolve, delayMilliseconds));
          continue;
        }
        throw new FoxAiProviderError("Fox AI provider rejected the request.", response.status, "provider_error");
      }
      const raw = await response.text();
      if (raw.length > MAX_RESPONSE_BYTES) throw new FoxAiProviderError("Fox AI returned too much data.", 502, "oversized_response");
      let decoded: unknown;
      try {
        decoded = JSON.parse(raw);
      } catch {
        throw new FoxAiProviderError("Fox AI returned an invalid response.", 502, "invalid_response");
      }
      const providerPayload = providerResponseSchema.safeParse(decoded);
      if (!providerPayload.success) throw new FoxAiProviderError("Fox AI returned an invalid response.", 502, "invalid_response");
      let decodedAnswer: unknown;
      try {
        decodedAnswer = JSON.parse(providerPayload.data.choices[0].message.content);
      } catch {
        throw new FoxAiProviderError("Fox AI returned an invalid answer.", 502, "invalid_answer");
      }
      const answer = answerSchema.safeParse(decodedAnswer);
      if (!answer.success) throw new FoxAiProviderError("Fox AI returned an invalid answer.", 502, "invalid_answer");
      return answer.data;
    } catch (error) {
      if (error instanceof FoxAiConfigurationError || error instanceof FoxAiProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") throw new FoxAiProviderError("Fox AI timed out.", 504, "timeout");
      if (attempt + 1 < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 750));
        continue;
      }
      throw new FoxAiProviderError("Fox AI could not be reached.", 503, "network_error");
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new FoxAiProviderError("Fox AI could not complete the request.", 503, "retry_exhausted");
}
