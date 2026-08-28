"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { publicEnvironment } from "@/lib/env/public";
import { signupErrorMessage } from "@/lib/auth/errors";
import { safeInternalRedirect } from "@/lib/security/redirects";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<"displayName" | "email" | "password", string[]>>;
};

const emailSchema = z.email("Enter a valid email address").max(254).transform((value) => value.trim().toLowerCase());
const passwordSchema = z.string().min(8, "Use at least 8 characters").max(72, "Use no more than 72 characters");
const nextPathSchema = z.string().max(500).optional();

function callbackUrl(path: string) {
  return new URL(path, publicEnvironment.NEXT_PUBLIC_SITE_URL).toString();
}

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { status: "error", message: "Email or password is incorrect." };
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

  const next = safeInternalRedirect(parsed.data.next);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.displayName },
      emailRedirectTo: callbackUrl(`/auth/callback?next=${encodeURIComponent(next)}`),
    },
  });

  if (error) {
    console.error("Supabase signup failed", {
      code: error.code,
      status: error.status,
    });
    return { status: "error", message: signupErrorMessage(error) };
  }
  if (data.session) redirect(next);

  return {
    status: "success",
    message: "Check your email to verify your account, then return here to sign in.",
  };
}

export async function sendPasswordReset(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z.object({ email: emailSchema }).safeParse({ email: formData.get("email") });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl("/auth/callback?next=/reset-password"),
  });

  if (error) return { status: "error", message: "Reset instructions could not be sent. Please try again shortly." };
  return { status: "success", message: "If an account exists for that email, reset instructions are on the way." };
}

export async function updatePassword(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z.object({ password: passwordSchema }).safeParse({ password: formData.get("password") });
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: "Your password could not be updated. Request a new reset link and try again." };

  await supabase.auth.signOut();
  redirect("/sign-in?password=updated");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
