// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({ serverEnvironment: { GEMINI_API_KEY: "test-key", GEMINI_MODEL: "configured-model" } }));
import { askFoxAi } from "@/lib/ai/fox-support";
it("uses configured Gemini when dedicated support credentials are absent", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content: JSON.stringify({message:"Gold includes Thumbnail Studio.",escalate:false,category:"general"}) } }] }));
  vi.stubGlobal("fetch", fetcher);
  try {
    expect((await askFoxAi({page:"/help",messages:[{role:"user",content:"What plan for thumbnails?"}]})).message).toContain("Gold");
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect(JSON.parse(options.body)).toMatchObject({ model:"configured-model",reasoning_effort:"low" });
  } finally { vi.unstubAllGlobals(); }
});
