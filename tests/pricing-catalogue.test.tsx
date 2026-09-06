import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PricingCatalogue } from "@/components/billing/pricing-catalogue";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refresh.mockReset();
});

describe("PricingCatalogue plan testing", () => {
  it("switches a signed-in user to a selected test plan without charging", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ label: "Pro", charged: false }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<PricingCatalogue currentPlan="pro" signedIn testMode />);
    await user.click(screen.getByRole("button", { name: "Select Pro" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/billing/select-plan", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ plan: "elite", billingPeriod: "monthly" }),
    })));
    expect(await screen.findByText("Pro is active for testing. No payment was charged.")).toBeVisible();
    expect(refresh).toHaveBeenCalled();
  });

  it("explains when PayU merchant credentials are not configured", async () => {
    const user = userEvent.setup();
    render(<PricingCatalogue currentPlan="pro" signedIn />);
    await user.click(screen.getByRole("button", { name: "Select Pro" }));
    expect(screen.getByText("PayU merchant credentials are still required before checkout can open.")).toBeVisible();
  });

  it("posts the selected plan to the PayU checkout and submits the hosted form", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        action: "https://test.payu.in/_payment",
        fields: { key: "merchant-key", txnid: "SF123", hash: "signed-value" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const submit = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => undefined);
    const user = userEvent.setup();

    render(<PricingCatalogue currentPlan="free" signedIn payuConfigured />);
    await user.click(screen.getByRole("button", { name: "Pay with PayU · Plus" }));
    await user.type(screen.getByRole("textbox", { name: "Mobile number" }), "9876543210");
    await user.click(screen.getByRole("button", { name: "Continue to payment" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/billing/payu/checkout", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ plan: "pro", billingPeriod: "monthly", phone: "9876543210" }),
    })));
    expect(submit).toHaveBeenCalledOnce();
    const submittedForm = submit.mock.instances[0] as HTMLFormElement;
    expect(submittedForm.action).toBe("https://test.payu.in/_payment");
    expect(submittedForm.querySelector<HTMLInputElement>('input[name="txnid"]')?.value).toBe("SF123");
  });
});
