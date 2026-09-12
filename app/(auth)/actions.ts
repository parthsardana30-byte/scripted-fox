"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { isVerificationEmailConfigured } from "@/lib/email/verification-email";
import { safeInternalRedirect } from "@/lib/security/redirects";

export type AuthActionState = {
  status: "idle" | "error" | "success" | "verification";
  message?: string;
  email?: string;
  next?: string;
  fieldErrors?: Partial<Record<"email" | "password" | "confirmPassword" | "token", string[]>>;
};

export type EmailVerificationActionState = {
  status: "idle" | "error";
  message?: string;
  email: string;
  next?: string;
};

const emailSchema = z.email("Enter a valid email address").max(254).transform((value) => value.trim().toLowerCase());
const passwordSchema = z.string().min(8, "Use at least 8 characters").max(72, "Use no more than 72 characters");
const nextPathSchema = z.string().max(500).optional();

export async function signInWithEmail(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z.object({
    email: emailSchema,
    password: passwordSchema,
    next: nextPathSchema,
  }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await auth.api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
      headers: await headers(),
    });
  } catch {
    return { status: "error", message: "Email or password is incorrect." };
  }
  redirect(safeInternalRedirect(parsed.data.next));
}

export async function verifySignUpEmail(
  state: EmailVerificationActionState,
  formData: FormData,
): Promise<EmailVerificationActionState> {
  const parsed = z.object({
    email: emailSchema,
    otp: z.string().trim().regex(/^\d{6}$/, "Enter the complete 6-digit code"),
    next: nextPathSchema,
  }).safeParse({
    email: formData.get("email"),
    otp: formData.get("otp"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { ...state, status: "error", message: parsed.error.issues[0]?.message ?? "Enter a valid verification code." };
  }

  try {
    await auth.api.verifyEmailOTP({
      body: { email: parsed.data.email, otp: parsed.data.otp },
      headers: await headers(),
    });
  } catch (error) {
    const code = error && typeof error === "object" && "body" in error
      ? String((error as { body?: { code?: string } }).body?.code ?? "")
      : "";
    const message = code.includes("OTP_EXPIRED")
      ? "This code has expired. Start sign-up again to request a new code."
      : code.includes("TOO_MANY_ATTEMPTS")
        ? "Too many incorrect attempts. Start sign-up again for a new code."
        : "That verification code is incorrect.";
    return { email: parsed.data.email, next: parsed.data.next, status: "error", message };
  }

  redirect(safeInternalRedirect(parsed.data.next));
}

export async function signUpWithEmail(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z.object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    next: nextPathSchema,
  }).refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.", path: ["confirmPassword"],
  }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  if (!isVerificationEmailConfigured()) {
    return { status: "error", message: "Email verification is temporarily unavailable. Try Google sign-up or contact support." };
  }

  try {
    const defaultName = parsed.data.email
      .split("@", 1)[0]
      .replace(/[._-]+/g, " ")
      .trim()
      .slice(0, 80) || "Creator";
    await auth.api.signUpEmail({
      body: { name: defaultName, email: parsed.data.email, password: parsed.data.password },
      headers: await headers(),
    });
  } catch (error) {
    const code = error && typeof error === "object" && "body" in error
      ? String((error as { body?: { code?: string } }).body?.code ?? "")
      : "";
    if (code.includes("USER_ALREADY_EXISTS")) {
      return { status: "error", message: "An account already exists for this email. Sign in instead." };
    }
    return { status: "error", message: "We could not create your account right now. Please try again shortly." };
  }
  return {
    status: "verification",
    email: parsed.data.email,
    next: parsed.data.next,
    message: "Enter the 6-digit code we sent to your email. It expires in 10 minutes.",
  };
}

export async function sendPasswordReset(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z.object({ email: emailSchema }).safeParse({ email: formData.get("email") });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  if (!isVerificationEmailConfigured()) {
    return { status: "error", message: "Password recovery is temporarily unavailable. Contact support for help." };
  }
  try {
    await auth.api.requestPasswordReset({
      body: { email: parsed.data.email, redirectTo: "/reset-password" },
      headers: await headers(),
    });
  } catch {
    return { status: "error", message: "The reset email could not be sent. Try again shortly." };
  }
  return { status: "success", message: "If an account uses this email, a reset link is on its way. Check spam too." };
}

export async function updatePassword(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z.object({
    password: passwordSchema,
    confirmPassword: z.string(),
    token: z.string().min(1),
  }).refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.", path: ["confirmPassword"],
  }).safeParse({ password: formData.get("password"), confirmPassword: formData.get("confirmPassword"), token: formData.get("token") });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await auth.api.resetPassword({ body: { newPassword: parsed.data.password, token: parsed.data.token } });
  } catch {
    return { status: "error", message: "This reset link is invalid or has expired. Request a new one." };
  }
  return { status: "success", message: "Your password has been updated. Sign in with your new password." };
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/sign-in");
}
