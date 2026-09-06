"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole, Mail } from "lucide-react";
import { useActionState } from "react";

import {
  sendPasswordReset,
  signInWithEmail,
  signUpWithEmail,
  updatePassword,
} from "@/app/(auth)/actions";
import type { AuthActionState } from "@/app/(auth)/actions";

type AuthMode = "sign-in" | "sign-up" | "forgot" | "reset";
const initialAuthActionState: AuthActionState = { status: "idle" };

const copy = {
  "sign-in": { eyebrow: "Welcome back", title: "Sign in", description: "Continue to your Scripted Fox workspace.", submit: "Sign in with email" },
  "sign-up": { eyebrow: "Get started", title: "Create your account", description: "You can connect your YouTube channel later.", submit: "Create account" },
  forgot: { eyebrow: "Password recovery", title: "Reset your password", description: "Enter your email and we’ll send reset instructions.", submit: "Send reset link" },
  reset: { eyebrow: "Choose a new password", title: "Set a new password", description: "Use at least eight characters and avoid a password you use elsewhere.", submit: "Save new password" },
};

export function AuthForm({ mode, nextPath = "/dashboard" }: { mode: AuthMode; nextPath?: string }) {
  const details = copy[mode];
  const nextQuery = `?next=${encodeURIComponent(nextPath)}`;
  const action = mode === "sign-in" ? signInWithEmail : mode === "sign-up" ? signUpWithEmail : mode === "forgot" ? sendPasswordReset : updatePassword;
  const [state, formAction, pending] = useActionState(action, initialAuthActionState);

  if (state.status === "success") return <div className="auth-card auth-card--complete"><span><CheckCircle2 size={24} aria-hidden="true" /></span><p className="auth-eyebrow">Check your inbox</p><h1>{mode === "sign-up" ? "Verify your email" : "Reset link sent"}</h1><p>{state.message}</p><Link className="button button--secondary" href={`/sign-in${nextQuery}`}>Back to sign in</Link><p className="auth-legal">By continuing, you agree to the Terms and Privacy Policy.</p></div>;

  return <div className={`auth-card auth-card--${mode}`}>
    <p className="auth-eyebrow">{details.eyebrow}</p><h1>{details.title}</h1><p className="auth-description">{details.description}</p>
    {(mode === "sign-in" || mode === "sign-up") && <><form action="/auth/google" method="get"><input type="hidden" name="next" value={nextPath} /><button className="auth-google" type="submit"><span aria-hidden="true">G</span> {mode === "sign-up" ? "Sign up with Google" : "Continue with Google"}</button></form><div className="auth-divider"><span>or continue with email</span></div></>}
    <form action={formAction}>
      <input type="hidden" name="next" value={nextPath} />
      {mode === "sign-up" && <label>Display name<div><input name="displayName" type="text" autoComplete="name" required maxLength={80} placeholder="Your name" /></div>{state.fieldErrors?.displayName && <small className="auth-field-error">{state.fieldErrors.displayName[0]}</small>}</label>}
      {mode !== "reset" && <label>Email address<div><Mail size={17} aria-hidden="true" /><input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></div>{state.fieldErrors?.email && <small className="auth-field-error">{state.fieldErrors.email[0]}</small>}</label>}
      {(mode === "sign-in" || mode === "sign-up" || mode === "reset") && <label>{mode === "reset" ? "New password" : "Password"}<div><LockKeyhole size={17} aria-hidden="true" /><input name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={8} maxLength={72} required placeholder="At least 8 characters" /></div>{state.fieldErrors?.password && <small className="auth-field-error">{state.fieldErrors.password[0]}</small>}</label>}
      {mode === "sign-in" && <div className="auth-form-help"><span>Secure session</span><Link href="/forgot-password">Forgot password?</Link></div>}
      {state.message && <p className="auth-form-error" role="alert">{state.message}</p>}
      <button className="button button--primary auth-submit" type="submit" disabled={pending}>{pending ? "Please wait…" : details.submit}<ArrowRight size={17} aria-hidden="true" /></button>
    </form>
    <p className="auth-switch">{mode === "sign-in" ? <>New to Scripted Fox? <Link href={`/sign-up${nextQuery}`}>Create an account</Link></> : mode === "sign-up" ? <>Already have an account? <Link href={`/sign-in${nextQuery}`}>Sign in</Link></> : mode === "forgot" ? <Link href="/sign-in">Return to sign in</Link> : null}</p>
    <p className="auth-legal">By continuing, you agree to the Terms and Privacy Policy.</p>
  </div>;
}
