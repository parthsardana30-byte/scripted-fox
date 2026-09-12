import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/fox-support", () => {
  class FoxAiConfigurationError extends Error {}
  class FoxAiProviderError extends Error {
    constructor(message: string, readonly status: number | null = null, readonly code: string | null = null) { super(message); }
  }
  return { FoxAiConfigurationError, FoxAiProviderError, askFoxAi: vi.fn() };
});
vi.mock("@/lib/auth/session", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/env/server", () => ({ serverEnvironment: { FOX_AI_SUPPORT_EMAIL: "support@example.com" } }));
vi.mock("@/lib/security/origin", () => ({ isTrustedSameOriginRequest: vi.fn(() => true) }));

import { POST } from "@/app/api/fox-ai/chat/route";
import { askFoxAi } from "@/lib/ai/fox-support";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { isTrustedSameOriginRequest } from "@/lib/security/origin";

const validBody = {
  messages: [{ role: "user", content: "My payment succeeded but access is locked." }],
  context: { page: "/dashboard/upgrade", feature: "billing", locale: "en-IN" },
};

function request(body: unknown, headers?: HeadersInit) {
  return new Request("http://localhost:3000/api/fox-ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(isTrustedSameOriginRequest).mockReturnValue(true);
  vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
  vi.mocked(askFoxAi).mockResolvedValue({ message: "Wait a few minutes, then refresh.", escalate: false, category: "billing" });
});

describe("Fox AI chat route", () => {
  it("rejects requests that fail the same-origin protection", async () => {
    vi.mocked(isTrustedSameOriginRequest).mockReturnValueOnce(false);
    expect((await POST(request(validBody))).status).toBe(403);
    expect(askFoxAi).not.toHaveBeenCalled();
  });

  it("rejects invalid and oversized requests", async () => {
    expect((await POST(request({ messages: [], context: { page: "/help" } }))).status).toBe(400);
    expect((await POST(request(validBody, { "content-length": "40000" }))).status).toBe(413);
  });

  it("supports anonymous product help under the intended rate-limited policy", async () => {
    const response = await POST(request(validBody));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Wait a few minutes, then refresh." });
  });

  it("uses authenticated identity only for a safe escalation draft", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1", email: "creator@example.com" } as Awaited<ReturnType<typeof getAuthenticatedUser>>);
    vi.mocked(askFoxAi).mockResolvedValue({ message: "This needs billing support.", escalate: true, category: "billing" });
    const response = await POST(request({ ...validBody, messages: [{ role: "user", content: "card 4242 4242 4242 4242 was charged twice" }] }));
    const data = await response.json();

    expect(data.escalation).toMatchObject({ type: "email_support", email: "support@example.com" });
    expect(data.escalation.body).toContain("creator@example.com");
    expect(data.escalation.body).not.toContain("4242 4242");
  });
});
