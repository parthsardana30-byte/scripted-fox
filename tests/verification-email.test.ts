import { afterEach, describe, expect, it, vi } from "vitest";

const { createTransport, sendMail } = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("nodemailer", () => ({ default: { createTransport } }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({
  serverEnvironment: {
    AUTH_EMAIL_FROM: "Scripted Fox <verification@scriptedfox.com>",
    RESEND_API_KEY: undefined,
    SMTP_HOST: "smtp.hostinger.com",
    SMTP_PORT: "465",
    SMTP_USER: "verification@scriptedfox.com",
    SMTP_PASSWORD: "test-password",
  },
}));

import { isVerificationEmailConfigured, sendVerificationCodeEmail } from "@/lib/email/verification-email";

afterEach(() => vi.clearAllMocks());

describe("Hostinger verification email transport", () => {
  it("sends signup OTP through secure Hostinger SMTP", async () => {
    createTransport.mockReturnValue({ sendMail });

    expect(isVerificationEmailConfigured()).toBe(true);
    await sendVerificationCodeEmail("creator@example.com", "123456");

    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: { user: "verification@scriptedfox.com", pass: "test-password" },
    });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: "Scripted Fox <verification@scriptedfox.com>",
      to: "creator@example.com",
      subject: "123456 is your Scripted Fox verification code",
      html: expect.stringContaining("Your next great video"),
    }));
    expect(sendMail.mock.calls[0]?.[0]?.html).toContain("https://scriptedfox.com/scripted-fox-email-logo.png");
    expect(sendMail.mock.calls[0]?.[0]?.html).toContain("123456");
  });
});
