import "server-only";

import { createHash } from "node:crypto";

import { serverEnvironment } from "@/lib/env/server";

export function isVerificationEmailConfigured() {
  return Boolean(serverEnvironment.RESEND_API_KEY && serverEnvironment.AUTH_EMAIL_FROM);
}

export async function sendVerificationCodeEmail(email: string, otp: string) {
  if (!serverEnvironment.RESEND_API_KEY || !serverEnvironment.AUTH_EMAIL_FROM) {
    throw new Error("Verification email delivery is not configured.");
  }

  const idempotencyKey = createHash("sha256").update(`signup:${email}:${otp}`).digest("hex");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnvironment.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: serverEnvironment.AUTH_EMAIL_FROM,
      to: [email],
      subject: `${otp} is your Scripted Fox verification code`,
      text: `Your Scripted Fox verification code is ${otp}. It expires in 10 minutes. If you did not try to create an account, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#171717"><p style="font-size:13px;color:#d90429;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Scripted Fox</p><h1 style="font-size:28px;margin:16px 0 8px">Verify your email</h1><p style="color:#666;line-height:1.6">Enter this code to finish creating your account:</p><p style="font-size:36px;font-weight:800;letter-spacing:.22em;margin:24px 0">${otp}</p><p style="color:#666;line-height:1.6">The code expires in 10 minutes. If you did not try to create an account, you can ignore this email.</p></div>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    console.error("Verification email delivery failed", { status: response.status });
    throw new Error("Verification email could not be sent.");
  }
}

export async function sendAccountDeletionEmail(email: string, url: string) {
  if (!serverEnvironment.RESEND_API_KEY || !serverEnvironment.AUTH_EMAIL_FROM) {
    throw new Error("Account deletion email delivery is not configured.");
  }

  const idempotencyKey = createHash("sha256").update(`delete-account:${email}:${url}`).digest("hex");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnvironment.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: serverEnvironment.AUTH_EMAIL_FROM,
      to: [email],
      subject: "Confirm deletion of your Scripted Fox account",
      text: `Open this link to permanently delete your Scripted Fox account: ${url}\n\nThe link expires in 24 hours. If you did not request this, ignore this email and your account will remain unchanged.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#171717"><p style="font-size:13px;color:#d90429;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Scripted Fox</p><h1 style="font-size:28px;margin:16px 0 8px">Delete your account?</h1><p style="color:#666;line-height:1.6">This permanently removes your account, channel connection, scripts, preferences, and usage history.</p><p style="margin:28px 0"><a href="${url}" style="display:inline-block;padding:14px 20px;border-radius:8px;background:#c8102e;color:#fff;text-decoration:none;font-weight:700">Permanently delete account</a></p><p style="color:#666;line-height:1.6">This link expires in 24 hours. If you did not request deletion, ignore this email and nothing will change.</p></div>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    console.error("Account deletion email delivery failed", { status: response.status });
    throw new Error("Account deletion email could not be sent.");
  }
}

export async function sendPasswordResetEmail(email: string, url: string) {
  if (!serverEnvironment.RESEND_API_KEY || !serverEnvironment.AUTH_EMAIL_FROM) {
    throw new Error("Password reset email delivery is not configured.");
  }

  const idempotencyKey = createHash("sha256").update(`reset-password:${email}:${url}`).digest("hex");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnvironment.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: serverEnvironment.AUTH_EMAIL_FROM,
      to: [email],
      subject: "Reset your Scripted Fox password",
      text: `Reset your Scripted Fox password: ${url}\n\nThis link expires in 1 hour and can be used once. If you did not request it, ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#171717"><p style="font-size:13px;color:#d90429;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Scripted Fox</p><h1 style="font-size:28px;margin:16px 0 8px">Reset your password</h1><p style="color:#666;line-height:1.6">Use the button below to choose a new password for your account.</p><p style="margin:28px 0"><a href="${url}" style="display:inline-block;padding:14px 20px;border-radius:8px;background:#171717;color:#fff;text-decoration:none;font-weight:700">Choose a new password</a></p><p style="color:#666;line-height:1.6">The link expires in 1 hour and works once. If you did not request a reset, ignore this email.</p></div>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    console.error("Password reset email delivery failed", { status: response.status });
    throw new Error("Password reset email could not be sent.");
  }
}
