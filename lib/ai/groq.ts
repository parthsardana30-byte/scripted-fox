import "server-only";

import { z } from "zod";

import { serverEnvironment } from "@/lib/env/server";

const PROVIDER_URLS = {
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  grok: "https://api.x.ai/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
} as const;
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

export type AiProviderName = keyof typeof PROVIDER_URLS;

export type AiCompletion = {
  content: string;
  model: string;
  provider: AiProviderName;
  inputTokens: number | null;
  outputTokens: number | null;
};

export type GroqCompletion = AiCompletion;

type CompletionInput = {
  system: string;
  user: string;
  responseFormat?: Record<string, unknown>;
  maxCompletionTokens?: number;
};

type ProviderConfiguration = { provider: AiProviderName; apiKey: string; model: string };

function requireGroqConfiguration() {
  if (serverEnvironment.AI_PROVIDER !== "groq") {
    throw new AiConfigurationError("The configured AI provider is unavailable.");
  }
  if (!serverEnvironment.AI_API_KEY || !serverEnvironment.AI_MODEL) {
    throw new AiConfigurationError("AI credentials are incomplete.");
  }
  return { provider: "groq" as const, apiKey: serverEnvironment.AI_API_KEY, model: serverEnvironment.AI_MODEL };
}

function requireGeminiConfiguration() {
  if (!serverEnvironment.GEMINI_API_KEY) {
    throw new AiConfigurationError("Gemini credentials are incomplete.");
  }
  return {
    provider: "gemini" as const,
    apiKey: serverEnvironment.GEMINI_API_KEY,
    model: serverEnvironment.GEMINI_MODEL ?? "gemini-3.7-flash",
  };
}

function configuredProviders(): ProviderConfiguration[] {
  const configurations: Record<AiProviderName, ProviderConfiguration | null> = {
    gemini: serverEnvironment.GEMINI_API_KEY
      ? { provider: "gemini", apiKey: serverEnvironment.GEMINI_API_KEY, model: serverEnvironment.GEMINI_MODEL ?? "gemini-3.7-flash" }
      : null,
    grok: serverEnvironment.XAI_API_KEY || serverEnvironment.GROK_API_KEY
      ? { provider: "grok", apiKey: serverEnvironment.XAI_API_KEY ?? serverEnvironment.GROK_API_KEY!, model: serverEnvironment.XAI_MODEL ?? serverEnvironment.GROK_MODEL ?? "grok-4.6" }
      : null,
    groq: serverEnvironment.AI_API_KEY && serverEnvironment.AI_MODEL
      ? { provider: "groq", apiKey: serverEnvironment.AI_API_KEY, model: serverEnvironment.AI_MODEL }
      : null,
  };
  const requested = (serverEnvironment.AI_PROVIDER ?? "auto").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  const order: AiProviderName[] = requested.includes("auto")
    ? ["gemini", "grok", "groq"]
    : requested.filter((value): value is AiProviderName => value in PROVIDER_URLS);
  return [...new Set(order)].map((provider) => configurations[provider]).filter((value): value is ProviderConfiguration => Boolean(value));
}

async function completeWithProvider(configuration: ProviderConfiguration, input: CompletionInput): Promise<AiCompletion> {
  const { provider, apiKey, model } = configuration;
  const requestBody = JSON.stringify({
    model,
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
    temperature: 0.6,
    max_completion_tokens: input.maxCompletionTokens ?? 4_000,
    ...(provider !== "groq" ? { reasoning_effort: "low" } : {}),
    ...(input.responseFormat ? { response_format: input.responseFormat } : {}),
  });

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(PROVIDER_URLS[provider], {
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
          console.error(`[AI] ${provider} request failed: status=${response.status} code=${code ?? "unknown"}`);
        }
        if (retryable && attempt + 1 < MAX_ATTEMPTS) {
          const retryAfterSeconds = Number(response.headers.get("retry-after"));
          const delayMilliseconds = Number.isFinite(retryAfterSeconds)
            ? Math.min(Math.max(retryAfterSeconds * 1_000, 500), 2_500)
            : 750;
          await new Promise((resolve) => setTimeout(resolve, delayMilliseconds));
          continue;
        }
        throw new AiProviderError(`${provider} request failed with status ${response.status}.`, response.status, code);
      }

      const parsed = groqResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new AiProviderError(`${provider} returned an unexpected response.`, 502, "invalid_response");

      return {
        content: parsed.data.choices[0].message.content,
        model,
        provider,
        inputTokens: parsed.data.usage?.prompt_tokens ?? null,
        outputTokens: parsed.data.usage?.completion_tokens ?? null,
      };
    } catch (error) {
      if (error instanceof AiConfigurationError || error instanceof AiProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new AiProviderError(`${provider} did not respond in time.`, 504, "timeout");
      }
      if (attempt + 1 < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 750));
        continue;
      }
      throw new AiProviderError(`${provider} could not be reached.`, 503, "network_error");
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new AiProviderError(`${provider} could not be reached.`, 503, "retry_exhausted");
}

export async function createAiCompletion(input: CompletionInput): Promise<AiCompletion> {
  const providers = configuredProviders();
  if (providers.length === 0) throw new AiConfigurationError("AI credentials are incomplete.");

  let lastError: unknown = null;
  for (const provider of providers) {
    try {
      return await completeWithProvider(provider, input);
    } catch (error) {
      lastError = error;
      if (process.env.NODE_ENV !== "production") console.warn(`[AI] Falling back after ${provider.provider} failed.`);
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new AiProviderError("No AI provider could complete the request.", 503, "providers_exhausted");
}

export async function createGroqCompletion(input: CompletionInput): Promise<GroqCompletion> {
  return completeWithProvider(requireGroqConfiguration(), input);
}

export async function createGeminiCompletion(input: CompletionInput): Promise<AiCompletion> {
  return completeWithProvider(requireGeminiConfiguration(), input);
}
