// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ access: vi.fn(), image: vi.fn(), user: vi.fn(), origin: vi.fn(), configured: vi.fn(), reserve: vi.fn(), generate: vi.fn(), complete: vi.fn(), fail: vi.fn(), status: vi.fn() }));
vi.mock("@/lib/thumbnails/access", () => ({ canUseThumbnailStudio: mocks.access }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ requireAuthenticatedUser: mocks.user, AuthenticationRequiredError: class extends Error {} }));
vi.mock("@/lib/security/origin", () => ({ isTrustedSameOriginRequest: mocks.origin }));
vi.mock("@/lib/thumbnails/provider", () => ({ thumbnailConfigured: mocks.configured, generateThumbnail: mocks.generate, decodeImage: vi.fn(), ThumbnailError: class extends Error { constructor(message: string, public status = 503) { super(message); } } }));
vi.mock("@/lib/thumbnails/repository", () => ({ thumbnailImage: mocks.image, reserveThumbnail: mocks.reserve, completeThumbnail: mocks.complete, failThumbnail: mocks.fail, thumbnailStatus: mocks.status }));
import { POST, GET } from "@/app/api/thumbnails/route";
import { GET as imageGET } from "@/app/api/thumbnails/[id]/route";
import { AuthenticationRequiredError } from "@/lib/auth/session";
const input = { requestId: "7798c7a9-f373-424d-8ea2-d3eb7f768576", maxCost: 0, topic: "Gaming phones" };
const request = (body: unknown = input) => new Request("https://scriptedfox.com/api/thumbnails", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.access.mockResolvedValue(true);
  mocks.user.mockResolvedValue({ id: "owner" }); mocks.origin.mockReturnValue(true); mocks.configured.mockReturnValue(true);
  mocks.reserve.mockResolvedValue({ fresh: true, status: "pending", cost: 0 });
  mocks.generate.mockResolvedValue({ bytes: Buffer.from("image"), mime: "image/png" });
});
it("blocks non-Gold users before reading images, reserving allowance or calling AI", async () => {
  mocks.access.mockResolvedValue(false);
  expect((await POST(request())).status).toBe(403);
  expect((await GET()).status).toBe(403);
  expect((await imageGET(request(), { params: Promise.resolve({ id: input.requestId }) })).status).toBe(403);
  expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  expect(mocks.status).not.toHaveBeenCalled(); expect(mocks.image).not.toHaveBeenCalled();
});
it("rejects cross-origin requests before any authentication or writes", async () => {
  mocks.origin.mockReturnValue(false);
  expect((await POST(request())).status).toBe(403); expect(mocks.user).not.toHaveBeenCalled();
});
it("requires a session", async () => {
  mocks.user.mockRejectedValue(new AuthenticationRequiredError());
  expect((await POST(request())).status).toBe(401); expect(mocks.reserve).not.toHaveBeenCalled();
});
it("does not debit for malformed input or missing configuration", async () => {
  expect((await POST(request({ ...input, maxCost: 5 }))).status).toBe(400);
  mocks.configured.mockReturnValue(false);
  expect((await POST(request())).status).toBe(503); expect(mocks.reserve).not.toHaveBeenCalled();
});
it("saves a successful result before returning", async () => {
  const response = await POST(request()); expect(response.status).toBe(200);
  expect(mocks.complete).toHaveBeenCalledWith("owner", input.requestId, expect.any(Object));
  expect(mocks.fail).not.toHaveBeenCalled();
});
it("releases a reservation on provider failure", async () => {
  mocks.generate.mockRejectedValue(new Error("provider offline"));
  expect((await POST(request())).status).toBe(503);
  expect(mocks.fail).toHaveBeenCalledWith("owner", input.requestId);
  expect(mocks.complete).not.toHaveBeenCalled();
});
it.each(["succeeded", "pending"])("does not regenerate duplicate %s requests", async status => {
  mocks.reserve.mockResolvedValue({ fresh: false, status, cost: 10 });
  expect((await POST(request())).status).toBe(status === "pending" ? 202 : 200);
  expect(mocks.generate).not.toHaveBeenCalled();
});
