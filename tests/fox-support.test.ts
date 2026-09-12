import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env/server", () => ({
  serverEnvironment: {
    FOX_AI_API_URL: "https://fox-ai.example/chat/completions",
    FOX_AI_API_KEY: "server-secret-key",
    FOX_AI_MODEL: "fox-support-1",
  },
}));

import { FoxAiProviderError, askFoxAi } from "@/lib/ai/fox-support";
import { gmailComposeUrl, mailtoUrl } from "@/lib/support/email-links";
import { buildSupportEscalation } from "@/lib/support/escalation";
import { foxAiSystemPrompt, redactSensitiveSupportText } from "@/lib/support/knowledge";

const input = { messages: [{ role: "user" as const, content: "Why are analytics delayed?" }], page: "/dashboard/analytics", feature: "analytics", locale: "en-IN" };

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Fox AI provider", () => {
  it("validates and returns a structured success response without exposing credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ message: "Analytics can take time to sync.", escalate: false, category: "technical" }) } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const answer = await askFoxAi(input);
    expect(answer).toMatchObject({ message: "Analytics can take time to sync.", escalate: false });
    expect(JSON.stringify(answer)).not.toContain("server-secret-key");
  });

  it("rejects invalid provider output", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [] }), { status: 200 })));
    await expect(askFoxAi(input)).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("surfaces provider errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("denied", { status: 400 })));
    await expect(askFoxAi(input)).rejects.toBeInstanceOf(FoxAiProviderError);
  });

  it("aborts requests that exceed the timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    })));
    const pending = expect(askFoxAi(input)).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(30_000);
    await pending;
  });
});

describe("Fox AI product knowledge and escalation", () => {
  it("includes FAQs, known limitations, and safety rules", () => {
    const prompt = foxAiSystemPrompt();
    expect(prompt).toContain("How are Daily Topics generated?");
    expect(prompt).toContain("does not maintain a selected competitor watchlist");
    expect(prompt).toContain("Never request passwords");
  });

  it("creates encoded Gmail and mailto links without sensitive values", () => {
    const escalation = buildSupportEscalation({
      email: "support@example.com",
      accountEmail: "creator@example.com",
      category: "billing",
      page: "/dashboard/upgrade",
      description: "Charged twice. card 4242 4242 4242 4242 password=hunter2 CVV: 123",
    });
    expect(escalation.body).toContain("[payment number removed]");
    expect(escalation.body).toContain("password: [removed]");
    expect(escalation.body).not.toContain("4242 4242");
    expect(escalation.body).not.toContain("hunter2");
    expect(gmailComposeUrl(escalation)).toContain("mail.google.com/mail/");
    expect(decodeURIComponent(gmailComposeUrl(escalation))).toContain("support@example.com");
    expect(mailtoUrl(escalation)).toContain("mailto:support%40example.com");
    expect(redactSensitiveSupportText("api key=secret-value")).toBe("api key: [removed]");
  });
});
