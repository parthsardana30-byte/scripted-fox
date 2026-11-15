import "server-only";

import { createHash } from "node:crypto";
import nodemailer from "nodemailer";

import { serverEnvironment } from "@/lib/env/server";

type TransactionalEmail = { to: string; subject: string; text: string; html: string; idempotencySource: string };

function hasSmtpConfiguration() {
  return Boolean(serverEnvironment.SMTP_HOST && serverEnvironment.SMTP_USER && serverEnvironment.SMTP_PASSWORD);
}

export function isVerificationEmailConfigured() {
  return Boolean(serverEnvironment.AUTH_EMAIL_FROM && (serverEnvironment.RESEND_API_KEY || hasSmtpConfiguration()));
}

async function sendTransactionalEmail({ to, subject, text, html, idempotencySource }: TransactionalEmail) {
  if (!serverEnvironment.AUTH_EMAIL_FROM) throw new Error("Email sender is not configured.");

  if (hasSmtpConfiguration()) {
    const port = Number(serverEnvironment.SMTP_PORT ?? "465");
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("SMTP port is invalid.");
    const transport = nodemailer.createTransport({
      host: serverEnvironment.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: serverEnvironment.SMTP_USER, pass: serverEnvironment.SMTP_PASSWORD },
    });
    await transport.sendMail({ from: serverEnvironment.AUTH_EMAIL_FROM, to, subject, text, html });
    return;
  }

  if (!serverEnvironment.RESEND_API_KEY) throw new Error("Email delivery is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnvironment.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": createHash("sha256").update(idempotencySource).digest("hex"),
    },
    body: JSON.stringify({ from: serverEnvironment.AUTH_EMAIL_FROM, to: [to], subject, text, html }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    console.error("Email delivery failed", { status: response.status });
    throw new Error("Email could not be sent.");
  }
}

export async function sendVerificationCodeEmail(email: string, otp: string) {
  await sendTransactionalEmail({
    to: email,
    subject: `${otp} is your Scripted Fox verification code`,
    text: `Welcome to Scripted Fox!\n\nYour verification code is ${otp}. It expires in 10 minutes.\n\nEvery great channel starts with one idea worth sharing. Your next chapter begins here.\n\nIf you did not try to create an account, you can safely ignore this email.`,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f3f4f6;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#111111">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">Your Scripted Fox verification code is ${otp}. It expires in 10 minutes.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #e6e6e6;border-radius:28px;overflow:hidden;box-shadow:0 20px 55px rgba(17,17,17,.10)">
            <tr>
              <td style="height:8px;background:#f51f46;font-size:0;line-height:0">&nbsp;</td>
            </tr>
            <tr>
              <td align="center" style="padding:42px 36px 18px">
                <img src="https://scriptedfox.com/scripted-fox-email-logo.png" width="76" height="76" alt="Scripted Fox" style="display:block;width:76px;height:76px;border:0;border-radius:20px;box-shadow:0 12px 28px rgba(245,31,70,.24)">
                <div style="margin-top:16px;font-size:22px;font-weight:800;letter-spacing:-.5px">Scripted <span style="color:#f51f46">Fox</span></div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:10px 36px 0">
                <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#f51f46">Welcome, creator</div>
                <h1 style="margin:12px 0 10px;font-size:36px;line-height:1.12;letter-spacing:-1.4px;color:#111111">Your next great video<br>starts right here.</h1>
                <p style="margin:0 auto;max-width:460px;font-size:16px;line-height:1.65;color:#666666">Verify your email and turn the ideas in your head into scripts your audience will remember.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:30px 36px 24px">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:440px;background:#111111;border-radius:20px">
                  <tr>
                    <td align="center" style="padding:24px 20px">
                      <div style="font-size:12px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#a7a7a7">Your verification code</div>
                      <div style="margin-top:10px;font-size:44px;line-height:1;font-weight:900;letter-spacing:10px;color:#ffffff">${otp}</div>
                      <div style="margin-top:14px;font-size:13px;color:#f86a83">Expires in 10 minutes</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 42px 34px">
                <p style="margin:0;font-size:18px;line-height:1.55;font-weight:700;color:#272727">“Consistency turns small ideas into channels people cannot ignore.”</p>
                <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#8a8a8a">If you did not create a Scripted Fox account, you can safely ignore this email. Never share this code with anyone.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 28px;background:#fff1f4;border-top:1px solid #ffd8df;font-size:12px;line-height:1.6;color:#7c5960">Made for creators who keep showing up.<br><strong style="color:#f51f46">scriptedfox.com</strong></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    idempotencySource: `signup:${email}:${otp}`,
  });
}

export async function sendAccountDeletionEmail(email: string, url: string) {
  await sendTransactionalEmail({
    to: email,
    subject: "Confirm deletion of your Scripted Fox account",
    text: `Open this link to permanently delete your Scripted Fox account: ${url}\n\nThe link expires in 24 hours. If you did not request this, ignore this email and your account will remain unchanged.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#171717"><p style="font-size:13px;color:#d90429;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Scripted Fox</p><h1 style="font-size:28px;margin:16px 0 8px">Delete your account?</h1><p style="color:#666;line-height:1.6">This permanently removes your account, channel connection, scripts, preferences, and usage history.</p><p style="margin:28px 0"><a href="${url}" style="display:inline-block;padding:14px 20px;border-radius:8px;background:#c8102e;color:#fff;text-decoration:none;font-weight:700">Permanently delete account</a></p><p style="color:#666;line-height:1.6">This link expires in 24 hours. If you did not request deletion, ignore this email and nothing will change.</p></div>`,
    idempotencySource: `delete-account:${email}:${url}`,
  });
}

export async function sendPasswordResetEmail(email: string, url: string) {
  await sendTransactionalEmail({
    to: email,
    subject: "Reset your Scripted Fox password",
    text: `Reset your Scripted Fox password: ${url}\n\nThis link expires in 1 hour and can be used once. If you did not request it, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#171717"><p style="font-size:13px;color:#d90429;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Scripted Fox</p><h1 style="font-size:28px;margin:16px 0 8px">Reset your password</h1><p style="color:#666;line-height:1.6">Use the button below to choose a new password for your account.</p><p style="margin:28px 0"><a href="${url}" style="display:inline-block;padding:14px 20px;border-radius:8px;background:#171717;color:#fff;text-decoration:none;font-weight:700">Choose a new password</a></p><p style="color:#666;line-height:1.6">The link expires in 1 hour and works once. If you did not request a reset, ignore this email.</p></div>`,
    idempotencySource: `reset-password:${email}:${url}`,
  });
}
