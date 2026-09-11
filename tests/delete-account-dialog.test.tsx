import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeleteAccountDialog } from "@/components/dashboard/delete-account-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/app/dashboard/account/actions", () => ({
  deleteAccount: vi.fn(async () => ({ status: "error", message: "That password is not correct." })),
}));

afterEach(cleanup);

describe("DeleteAccountDialog", () => {
  it("requires an exact confirmation phrase before enabling deletion", async () => {
    const user = userEvent.setup();
    render(<DeleteAccountDialog passwordRequired={false} />);

    await user.click(screen.getByRole("button", { name: "Delete account" }));
    expect(screen.getByRole("dialog", { name: "Delete your account permanently?" })).toBeVisible();
    const submit = screen.getByRole("button", { name: /Delete permanently/ });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/Type DELETE/), "delete");
    expect(submit).toBeDisabled();
    await user.clear(screen.getByLabelText(/Type DELETE/));
    await user.type(screen.getByLabelText(/Type DELETE/), "DELETE");
    expect(submit).toBeEnabled();
  });

  it("requests the current password for credential accounts", async () => {
    const user = userEvent.setup();
    render(<DeleteAccountDialog passwordRequired />);
    await user.click(screen.getByRole("button", { name: "Delete account" }));
    expect(screen.getByLabelText("Current password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Keep account" })).toBeVisible();
  });
});
