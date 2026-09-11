import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const { requestPasswordReset, resetPassword } = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(async () => ({ status: true })),
  resetPassword: vi.fn(async () => ({ status: true })),
}));

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: { api: { requestPasswordReset, resetPassword } } }));
vi.mock("@/lib/email/verification-email", () => ({ isVerificationEmailConfigured: () => true }));

import { sendPasswordReset, updatePassword } from "@/app/(auth)/actions";
import { PasswordResetDialog } from "@/components/auth/password-reset-dialog";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("password recovery", () => {
  it("opens a compact email dialog and uses a neutral success message", async () => {
    const user = userEvent.setup();
    render(<PasswordResetDialog />);
    await user.click(screen.getByRole("button", { name: "Forgot password?" }));
    expect(screen.getByRole("dialog", { name: "Reset your password" })).toBeVisible();
    await user.type(screen.getByLabelText("Email address"), "someone@example.com");
    await user.click(screen.getByRole("button", { name: /Send reset link/ }));
    expect(await screen.findByRole("heading", { name: "Check your inbox" })).toBeVisible();
    expect(screen.getByText(/If an account uses this email/)).toBeVisible();
  });

  it("requests a one-hour reset flow without exposing whether an account exists", async () => {
    const form = new FormData(); form.set("email", "Person@Example.com");
    const result = await sendPasswordReset({ status: "idle" }, form);
    expect(requestPasswordReset).toHaveBeenCalledWith(expect.objectContaining({ body: { email: "person@example.com", redirectTo: "/reset-password" } }));
    expect(result).toMatchObject({ status: "success" });
  });

  it("requires matching passwords and passes the one-time token", async () => {
    const mismatch = new FormData(); mismatch.set("password", "new-password-123"); mismatch.set("confirmPassword", "different-password"); mismatch.set("token", "valid-token");
    expect(await updatePassword({ status: "idle" }, mismatch)).toMatchObject({ status: "error" });
    expect(resetPassword).not.toHaveBeenCalled();

    const valid = new FormData(); valid.set("password", "new-password-123"); valid.set("confirmPassword", "new-password-123"); valid.set("token", "valid-token");
    expect(await updatePassword({ status: "idle" }, valid)).toMatchObject({ status: "success" });
    expect(resetPassword).toHaveBeenCalledWith({ body: { newPassword: "new-password-123", token: "valid-token" } });
  });
});
