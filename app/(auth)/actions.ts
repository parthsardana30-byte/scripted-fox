"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { safeInternalRedirect } from "@/lib/security/redirects";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<"displayName" | "email" | "password", string[]>>;
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

export async function signUpWithEmail(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z.object({
    displayName: z.string().trim().min(2, "Enter at least 2 characters").max(80),
    email: emailSchema,
    password: passwordSchema,
    next: nextPathSchema,
  }).safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await auth.api.signUpEmail({
      body: { name: parsed.data.displayName, email: parsed.data.email, password: parsed.data.password },
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
  redirect(safeInternalRedirect(parsed.data.next));
}

export async function sendPasswordReset(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z.object({ email: emailSchema }).safeParse({ email: formData.get("email") });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };

  return { status: "error", message: "Password reset email is being configured. Contact support for account recovery." };
}

export async function updatePassword(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z.object({ password: passwordSchema }).safeParse({ password: formData.get("password") });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };

  return { status: "error", message: "This reset link is no longer valid. Request account recovery from support." };
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/sign-in");
}
