import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CreditPacks } from "@/components/billing/credit-packs";
import { creditPacks } from "@/lib/billing/credit-packs";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("lists exactly the requested packs and prices", () => {
  expect(creditPacks.map(({ credits, priceInr }) => [priceInr,credits])).toEqual([[29,50],[100,170],[500,1000]]);
  render(<CreditPacks preview />);
  expect(screen.getByRole("heading", { name: "Buy more credits." })).toBeVisible();
  expect(screen.queryByText("A LITTLE MORE ROOM TO CREATE")).not.toBeInTheDocument();
  expect(screen.queryByText("Choose your boost. Keep your creative flow going.")).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Looking for a plan/ })).not.toBeInTheDocument();
  expect(screen.queryByText("one-time payment")).not.toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Buy 50 credits"})).toBeVisible();
  expect(screen.getByRole("button",{name:"Buy 170 credits"})).toBeVisible();
  expect(screen.getByRole("button",{name:"Buy 1,000 credits"})).toBeVisible();
});
it("allows pack inspection in preview without creating payments", () => {
  const fetcher=vi.fn(); vi.stubGlobal("fetch",fetcher); render(<CreditPacks preview />);
  fireEvent.click(screen.getByRole("button",{name:"Buy 170 credits"}));
  expect(screen.getByRole("dialog")).toHaveTextContent("₹100");
  expect(screen.getByRole("dialog")).toHaveTextContent("expire with your current plan");
  expect(screen.getByText(/Checkout is disabled/)).toBeVisible(); expect(fetcher).not.toHaveBeenCalled();
});
it("does not start payment without an eligible plan", () => {
  render(<CreditPacks />); fireEvent.click(screen.getByRole("button",{name:"Buy 50 credits"}));
  expect(screen.getByRole("link",{name:"View plans"})).toHaveAttribute("href","/dashboard/upgrade");
  expect(screen.queryByRole("button",{name:/Continue to PayU/})).not.toBeInTheDocument();
});
it.each(["50", "170", "1,000"])("shows checkout disclosure only after selecting %s credits", (amount) => {
  render(<CreditPacks checkoutEnabled expiresAt="2026-10-12T10:47:00.000Z" />);
  expect(screen.queryByText(/Secure checkout with PayU/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: `Buy ${amount} credits` }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText(/Secure checkout with PayU/)).toBeVisible();
  expect(dialog).toHaveTextContent("Current expiry:");
  expect(dialog).toHaveTextContent("12 Oct 2026");
  fireEvent.click(within(dialog).getByRole("button", { name: "Close dialog" }));
  expect(screen.queryByText(/Secure checkout with PayU/)).not.toBeInTheDocument();
});
