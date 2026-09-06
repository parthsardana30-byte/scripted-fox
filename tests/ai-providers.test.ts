import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({
  serverEnvironment: {
    AI_PROVIDER: "gemini,grok",
    GEMINI_API_KEY: "gemini-test-key",
    GEMINI_MODEL: "gemini-test-model",
    XAI_API_KEY: "xai-test-key",
    XAI_MODEL: "grok-test-model",
  },
}));

import { createAiCompletion } from "@/lib/ai/groq";

function providerResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AI provider routing", () => {
  it("uses Gemini as the primary provider", async () => {
    const fetchMock = vi.fn().mockResolvedValue(providerResponse(200, {
      choices: [{ message: { content: "gemini result" } }],
      usage: { prompt_tokens: 8, completion_tokens: 3 },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createAiCompletion({ system: "System", user: "User" })).resolves.toMatchObject({
      content: "gemini result",
      provider: "gemini",
      model: "gemini-test-model",
    });
    expect(fetchMock.mock.calls[0][0]).toContain("generativelanguage.googleapis.com");
  });

  it("falls back to Grok when Gemini rejects the request", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(providerResponse(401, { error: { code: "invalid_api_key" } }))
      .mockResolvedValueOnce(providerResponse(200, {
        choices: [{ message: { content: "grok result" } }],
        usage: { prompt_tokens: 7, completion_tokens: 2 },
      }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createAiCompletion({ system: "System", user: "User" })).resolves.toMatchObject({
      content: "grok result",
      provider: "grok",
      model: "grok-test-model",
    });
    expect(fetchMock.mock.calls[1][0]).toContain("api.x.ai");
  });
});
