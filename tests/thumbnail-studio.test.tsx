import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ThumbnailStudio } from "@/components/dashboard/thumbnail-studio";
import { ThumbnailCreditCard } from "@/components/dashboard/thumbnail-credit-card";
const status = { credits: 30, freeAvailable: true, configured: true, resetsAt: "2099-01-01T18:30:00Z", pending: null, recent: [] };
const fetcher = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetcher); fetcher.mockReset(); fetcher.mockImplementation(async () => Response.json(status)); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("shows balance and links Home to the thumbnail studio", async () => {
  render(<ThumbnailCreditCard />);
  expect(await screen.findByText("30 Fox Credits")).toBeVisible();
  expect(screen.getByRole("link", { name: /Create thumbnail/ })).toHaveAttribute("href", "/dashboard/thumbnails");
});
it("submits optional photos and a zero-credit quote for the daily free image", async () => {
  render(<ThumbnailStudio />);
  await screen.findByText("30 Fox Credits");
  fireEvent.change(screen.getByLabelText("What is your video about?"), { target: { value: "Gaming phones" } });
  const photo = new File([new Uint8Array([137,80,78,71,13,10,26,10])], "me.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Add photos"), { target: { files: [photo] } });
  await screen.findByAltText("me.png");
  fetcher.mockImplementation(async (_url, options) => options?.method === "POST" ? Response.json({ id: "new-image", status: "succeeded", cost: 0 }) : Response.json(status));
  fireEvent.click(screen.getByRole("button", { name: "Generate free thumbnail" }));
  await screen.findByText("Your free thumbnail is ready.");
  const post = fetcher.mock.calls.find(call => call[1]?.method === "POST");
  expect(JSON.parse(post![1].body)).toMatchObject({ maxCost: 0, topic: "Gaming phones", photos: [{ mimeType: "image/png" }] });
});
it("disables paid generation when fewer than ten credits remain", async () => {
  fetcher.mockResolvedValue(Response.json({ ...status, credits: 9, freeAvailable: false }));
  render(<ThumbnailStudio />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Generate · 10 credits" })).toBeDisabled());
});
it("keeps the local preview isolated from real APIs", async () => {
  render(<ThumbnailStudio preview />);
  expect(await screen.findByText(/Local design preview/)).toBeVisible();
  expect(fetcher).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Generate free thumbnail" })).toBeDisabled();
});
