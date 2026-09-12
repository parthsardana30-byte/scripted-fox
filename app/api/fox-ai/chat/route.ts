import { z } from "zod";

import { FoxAiConfigurationError, FoxAiProviderError, askFoxAi } from "@/lib/ai/fox-support";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { serverEnvironment } from "@/lib/env/server";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";
import { buildSupportEscalation } from "@/lib/support/escalation";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 32_000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const rateLimits = new Map<string, number[]>();

const requestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(2_000),
  })).min(1).max(12),
  context: z.object({
    page: z.string().trim().max(180).regex(/^\//).default("/"),
    feature: z.string().trim().max(80).optional(),
    locale: z.string().trim().max(35).optional(),
  }),
});

function allowRequest(key: string) {
  const now = Date.now();
  const recent = (rateLimits.get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) return false;
  recent.push(now);
  rateLimits.set(key, recent);
  if (rateLimits.size > 5_000) {
    for (const [entryKey, timestamps] of rateLimits) {
      if (!timestamps.some((timestamp) => now - timestamp < WINDOW_MS)) rateLimits.delete(entryKey);
    }
  }
  return true;
}

export async function POST(request: Request) {
  if (!isTrustedSameOriginRequest(request)) return Response.json({ error: "This request is not allowed." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) return Response.json({ error: "This conversation is too large. Start a new chat and try again." }, { status: 413 });

  let safeRequest: z.infer<typeof requestSchema> | undefined;
  let accountEmail: string | undefined;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
    }
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") {
      return Response.json({ error: "Check your message and try again." }, { status: 400 });
    }
    safeRequest = parsed.data;

    const user = await getAuthenticatedUser();
    accountEmail = user?.email;
    const forwardedAddress = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? "anonymous";
    if (!allowRequest(user?.id ?? `anonymous:${forwardedAddress.slice(0, 80)}`)) {
      return Response.json({ error: "Fox AI is receiving messages too quickly. Wait a minute and try again." }, { status: 429 });
    }

    const answer = await askFoxAi({ ...parsed.data.context, messages: parsed.data.messages });
    const supportEmail = serverEnvironment.FOX_AI_SUPPORT_EMAIL;
    const escalation = answer.escalate && supportEmail
      ? buildSupportEscalation({
        email: supportEmail,
        accountEmail: user?.email,
        category: answer.category,
        page: parsed.data.context.page,
        description: parsed.data.messages.at(-1)?.content ?? "Support requested",
      })
      : undefined;
    return Response.json({ message: answer.message, escalation });
  } catch (error) {
    const fallbackEscalation = serverEnvironment.FOX_AI_SUPPORT_EMAIL && safeRequest
      ? buildSupportEscalation({
        email: serverEnvironment.FOX_AI_SUPPORT_EMAIL,
        accountEmail,
        category: "technical",
        page: safeRequest.context.page,
        description: safeRequest.messages.at(-1)?.content ?? "Fox AI was unable to answer this support request.",
      })
      : undefined;
    if (error instanceof FoxAiConfigurationError) {
      console.error("[Fox AI] Configuration is incomplete.");
      return Response.json({ error: "Fox AI is temporarily unavailable. Please try again later.", escalation: fallbackEscalation }, { status: 503 });
    }
    if (error instanceof FoxAiProviderError) {
      console.error("[Fox AI] Provider request failed.", { status: error.status, code: error.code });
      const status = error.status === 429 ? 429 : error.status === 504 ? 504 : 503;
      return Response.json({ error: status === 504 ? "Fox AI took too long to respond. Please retry." : "Fox AI is temporarily unavailable. Please retry.", escalation: fallbackEscalation }, { status });
    }
    console.error("[Fox AI] Unexpected support error.", { name: error instanceof Error ? error.name : "UnknownError" });
    return Response.json({ error: "Fox AI could not answer right now. Please retry." }, { status: 500 });
  }
}
