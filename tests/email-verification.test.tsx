import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { signUpEmail, verifyEmailOTP, redirect } = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
  verifyEmailOTP: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
}));

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/auth", () => ({
  auth: { api: { signUpEmail, verifyEmailOTP, signInEmail: vi.fn(), signOut: vi.fn() } },
}));
vi.mock("@/lib/email/verification-email", () => ({ isVerificationEmailConfigured: () => true }));

import { signUpWithEmail, verifySignUpEmail } from "@/app/(auth)/actions";
import { EmailVerificationStep } from "@/components/auth/auth-form";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("email signup verification", () => {
  it("keeps a password signup pending until the email code is verified", async () => {
    const form = new FormData();
    form.set("displayName", "Aryan");
    form.set("email", "Aryan@Example.com");
    form.set("password", "correct-horse-battery");
    form.set("next", "/dashboard");

    const result = await signUpWithEmail({ status: "idle" }, form);

    expect(signUpEmail).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ email: "aryan@example.com" }) }));
    expect(result).toMatchObject({ status: "verification", email: "aryan@example.com", next: "/dashboard" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("rejects malformed codes before calling the auth provider", async () => {
    const form = new FormData();
    form.set("email", "aryan@example.com");
    form.set("otp", "12ab");
    form.set("next", "/dashboard");

    const result = await verifySignUpEmail({ status: "idle", email: "aryan@example.com", next: "/dashboard" }, form);

    expect(result).toMatchObject({ status: "error", message: "Enter the complete 6-digit code" });
    expect(verifyEmailOTP).not.toHaveBeenCalled();
  });

  it("creates the session and redirects only after a valid OTP", async () => {
    const form = new FormData();
    form.set("email", "aryan@example.com");
    form.set("otp", "123456");
    form.set("next", "/dashboard");

    await expect(verifySignUpEmail({ status: "idle", email: "aryan@example.com" }, form)).rejects.toThrow("REDIRECT:/dashboard");
    expect(verifyEmailOTP).toHaveBeenCalledWith(expect.objectContaining({ body: { email: "aryan@example.com", otp: "123456" } }));
  });

  it("renders a numeric one-time-code form", () => {
    render(<EmailVerificationStep email="aryan@example.com" nextPath="/dashboard" message="Enter your code." />);

    const input = screen.getByRole("textbox", { name: "Verification code" });
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("autocomplete", "one-time-code");
    expect(screen.getByRole("button", { name: /Verify and continue/ })).toBeVisible();
  });
});
