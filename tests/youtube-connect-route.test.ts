// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn(), authorize: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getAuthenticatedUser: mocks.user }));
vi.mock("@/lib/env/public", () => ({ publicEnvironment: { NEXT_PUBLIC_SITE_URL: "https://scriptedfox.com" } }));
vi.mock("@/lib/youtube/google", () => ({ createYouTubeAuthorizationUrl: mocks.authorize }));
import { GET } from "@/app/api/youtube/connect/route";

beforeEach(() => vi.resetAllMocks());

it("redirects signed-out visitors to the public sign-in URL", async () => {
  mocks.user.mockResolvedValue(null);
  expect((await GET()).headers.get("location")).toBe("https://scriptedfox.com/sign-in?next=/connect");
});

it("keeps configuration errors on the public domain behind a proxy", async () => {
  mocks.user.mockResolvedValue({ id: "test-user" });
  mocks.authorize.mockImplementation(() => { throw new Error("Not configured"); });
  expect((await GET()).headers.get("location")).toBe("https://scriptedfox.com/connect?error=not_configured");
});

it("preserves Google authorization and HTTP-only state cookies", async () => {
  mocks.user.mockResolvedValue({ id: "test-user" });
  mocks.authorize.mockReturnValue("https://accounts.google.com/o/oauth2/v2/auth");
  const response = await GET();
  expect(response.headers.get("location")).toBe("https://accounts.google.com/o/oauth2/v2/auth");
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(response.cookies.get("youtube_oauth_verifier")?.value).toBeTruthy();
});
