import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({
  serverEnvironment: {
    AI_PROVIDER: "groq",
    AI_API_KEY: "test-key",
    AI_MODEL: "test-model",
  },
}));

import { AiProviderError, createGroqCompletion } from "@/lib/ai/groq";

function groqResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("createGroqCompletion", () => {
  it("retries one temporary provider failure", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(groqResponse(503, { error: { code: "service_unavailable" } }))
      .mockResolvedValueOnce(groqResponse(200, {
        choices: [{ message: { content: "ready" } }],
        usage: { prompt_tokens: 4, completion_tokens: 1 },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const completionPromise = createGroqCompletion({ system: "Test", user: "Test" });
    await vi.runAllTimersAsync();

    await expect(completionPromise).resolves.toMatchObject({ content: "ready" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a permanent request error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(groqResponse(400, { error: { code: "invalid_request" } }));
    vi.stubGlobal("fetch", fetchMock);

    const error = await createGroqCompletion({ system: "Test", user: "Test" }).catch((caught) => caught);

    expect(error).toBeInstanceOf(AiProviderError);
    expect(error).toMatchObject({ status: 400, code: "invalid_request" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
