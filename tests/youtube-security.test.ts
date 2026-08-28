import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let decryptRefreshToken: typeof import("@/lib/youtube/crypto").decryptRefreshToken;
let encryptRefreshToken: typeof import("@/lib/youtube/crypto").encryptRefreshToken;

beforeAll(async () => {
  ({ decryptRefreshToken, encryptRefreshToken } = await import("@/lib/youtube/crypto"));
});

describe("YouTube token protection", () => {
  const key = Buffer.alloc(32, 7).toString("base64");

  it("encrypts and decrypts refresh tokens with authenticated encryption", () => {
    const token = "refresh-token-that-must-stay-private";
    const encrypted = encryptRefreshToken(token, key);

    expect(encrypted).not.toContain(token);
    expect(decryptRefreshToken(encrypted, key)).toBe(token);
  });

  it("rejects modified ciphertext", () => {
    const encrypted = Buffer.from(encryptRefreshToken("private-token", key), "base64");
    encrypted[encrypted.length - 1] ^= 1;

    expect(() => decryptRefreshToken(encrypted.toString("base64"), key)).toThrow();
  });

  it("keeps credential functions restricted to the service role", () => {
    const migration = readFileSync(
      resolve(process.cwd(), "supabase/migrations/20260824100000_youtube_credentials_rpc.sql"),
      "utf8",
    );

    expect(migration).toContain("revoke all on function public.store_youtube_credentials(uuid, text) from public, anon, authenticated;");
    expect(migration).toContain("grant execute on function public.store_youtube_credentials(uuid, text) to service_role;");
    expect(migration).toContain("insert into private.youtube_credentials");
  });
});
