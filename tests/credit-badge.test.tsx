import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CreditBadge } from "@/components/dashboard/credit-badge";
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/settings" }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("shows a clearly labelled preview without calling real APIs", () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  render(<CreditBadge preview />);
  expect(screen.getByRole("link", { name: "Preview: 500 Fox Credits" })).toHaveAttribute("href", "/ui-preview?view=credits");
  expect(screen.getByText("DEMO")).toBeVisible(); expect(fetcher).not.toHaveBeenCalled();
});
it("reads the real balance and refreshes after credit changes", async () => {
  const fetcher = vi.fn().mockImplementation(async () => Response.json({ credits: 50 }));
  vi.stubGlobal("fetch", fetcher); render(<CreditBadge />);
  expect(await screen.findByText("50")).toBeVisible();
  fetcher.mockImplementation(async () => Response.json({ credits: 40 }));
  fireEvent(window, new Event("fox-credits-changed"));
  await waitFor(() => expect(screen.getByText("40")).toBeVisible());
  expect(fetcher).toHaveBeenCalledWith("/api/billing/credits", expect.objectContaining({ cache: "no-store" }));
});
it("does not invent a balance when the service fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({}, { status: 503 })));
  render(<CreditBadge />); expect(await screen.findByText("Unavailable")).toBeVisible();
  expect(screen.queryByText("500")).not.toBeInTheDocument();
});
