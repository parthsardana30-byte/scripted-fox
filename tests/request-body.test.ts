// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readJsonBody } from "@/lib/security/request-body";

describe("bounded JSON request parsing", () => {
  it("reads ordinary JSON without a Content-Length header", async () => {
    expect(await readJsonBody(new Request("https://example.test", { method: "POST", body: '{"ok":true}' }), 20)).toEqual({ ok: true });
  });
  it("rejects invalid and missing JSON as a client error", async () => {
    for (const body of [undefined, "", "{"]) {
      await expect(readJsonBody(new Request("https://example.test", { method: "POST", body }), 20)).rejects.toMatchObject({ status: 400 });
    }
  });
  it("enforces actual UTF-8 bytes even when the declared size is wrong", async () => {
    await expect(readJsonBody(new Request("https://example.test", { method: "POST", body: '"😀😀😀"', headers: { "content-length": "1" } }), 10)).rejects.toMatchObject({ status: 413 });
  });
  it("decodes Unicode split across chunks", async () => {
    const bytes = new TextEncoder().encode('{"text":"हैलो"}');
    const body = new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(Uint8Array.of(byte)); controller.close(); } });
    const request = new Request("https://example.test", { method: "POST", body, duplex: "half" } as RequestInit);
    expect(await readJsonBody(request, bytes.length)).toEqual({ text: "हैलो" });
  });
  it("cancels an oversized stream instead of buffering the rest", async () => {
    let cancelled = false;
    const body = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(50)); }, cancel() { cancelled = true; } });
    const request = new Request("https://example.test", { method: "POST", body, duplex: "half" } as RequestInit);
    await expect(readJsonBody(request, 20)).rejects.toMatchObject({ status: 413 });
    expect(cancelled).toBe(true);
  });
});
