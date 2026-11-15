"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useActionState } from "react";

import {
  sendPasswordReset,
  resendSignUpOTP,
  signInWithEmail,
  signUpWithEmail,
  updatePassword,
  verifySignUpEmail,
} from "@/app/(auth)/actions";
import type { AuthActionState, EmailVerificationActionState } from "@/app/(auth)/actions";
import { oauthErrorMessage } from "@/lib/auth/oauth-errors";
import { PasswordResetDialog } from "@/components/auth/password-reset-dialog";

type AuthMode = "sign-in" | "sign-up" | "forgot" | "reset";
const initialAuthActionState: AuthActionState = { status: "idle" };

function GoogleMark() {
  return (
    <span className="auth-google__mark" aria-hidden="true">
      <svg viewBox="0 0 18 18" role="img">
        <path fill="#4285f4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.874 2.684-6.614Z" />
        <path fill="#34a853" d="M9 18c2.43 0 4.467-.806 5.956-2.181l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z" />
        <path fill="#fbbc05" d="M3.963 10.706A5.42 5.42 0 0 1 3.681 9c0-.592.102-1.168.282-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.007-2.332Z" />
        <path fill="#ea4335" d="M9 3.58c1.321 0 2.507.454 3.441 1.345l2.581-2.581C13.463.892 11.426 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z" />
      </svg>
    </span>
  );
}

export function EmailVerificationStep({ email, nextPath, message }: { email: string; nextPath: string; message?: string }) {
  const initialState: EmailVerificationActionState = { status: "idle", email, next: nextPath };
  const [state, action, pending] = useActionState(verifySignUpEmail, initialState);
  const [resendState, resendAction, resendPending] = useActionState(resendSignUpOTP, initialState);

  return <div className="auth-card auth-card--verification">
    <span className="auth-verification-icon"><ShieldCheck size={25} aria-hidden="true" /></span>
    <p className="auth-eyebrow">Verify your email</p>
    <h1>Check your inbox</h1>
    <p className="auth-description">{message}</p>
    <p className="auth-verification-email"><Mail size={15} aria-hidden="true" />{email}</p>
    <form action={action}>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={nextPath} />
      <label>Verification code<div className="auth-otp-field"><KeyRound size={17} aria-hidden="true" /><input name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoFocus aria-describedby="otp-help" placeholder="000000" /></div></label>
      <small id="otp-help" className="auth-otp-help">6 digits · expires in 10 minutes · 5 attempts</small>
      {state.message ? <p className="auth-form-error" role="alert">{state.message}</p> : null}
      <button className="button button--primary auth-submit" type="submit" disabled={pending}>{pending ? "Verifying…" : "Verify and continue"}<ArrowRight size={17} aria-hidden="true" /></button>
    </form>
    <form className="auth-resend" action={resendAction}>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={nextPath} />
      <button className="button button--secondary" type="submit" disabled={resendPending}>{resendPending ? "Sending…" : "Resend code"}</button>
      {resendState.message ? <p className={resendState.status === "error" ? "auth-form-error" : "auth-resend-success"} role="status">{resendState.message}</p> : null}
    </form>
    <p className="auth-switch">Wrong email? <Link href={`/sign-up?next=${encodeURIComponent(nextPath)}`}>Start again</Link></p>
  </div>;
}

const copy = {
  "sign-in": {
    eyebrow: "",
    title: "Log In",
    description: "Welcome back to Scripted Fox.",
    submit: "Login",
  },
  "sign-up": {
    eyebrow: "",
    title: "Sign Up",
    description: "",
    submit: "Send verification code",
  },
  forgot: { eyebrow: "Password recovery", title: "Reset your password", description: "Enter your email and we’ll send reset instructions.", submit: "Send reset link" },
  reset: { eyebrow: "Choose a new password", title: "Set a new password", description: "Use at least eight characters and avoid a password you use elsewhere.", submit: "Save new password" },
};

export function AuthForm({ mode, nextPath = "/dashboard", oauthError, resetToken, recoveryOpen = false }: { mode: AuthMode; nextPath?: string; oauthError?: string; resetToken?: string; recoveryOpen?: boolean }) {
  const details = copy[mode];
  const nextQuery = `?next=${encodeURIComponent(nextPath)}`;
  const action = mode === "sign-in" ? signInWithEmail : mode === "sign-up" ? signUpWithEmail : mode === "forgot" ? sendPasswordReset : updatePassword;
  const [state, formAction, pending] = useActionState(action, initialAuthActionState);

  if (mode === "sign-up" && state.status === "verification" && state.email) {
    return <EmailVerificationStep email={state.email} nextPath={state.next ?? nextPath} message={state.message} />;
  }

  if (state.status === "success") return <div className="auth-card auth-card--complete"><span><CheckCircle2 size={24} aria-hidden="true" /></span><p className="auth-eyebrow">Check your inbox</p><h1>{mode === "sign-up" ? "Verify your email" : "Reset link sent"}</h1><p>{state.message}</p><Link className="button button--secondary" href={`/sign-in${nextQuery}`}>Back to sign in</Link><p className="auth-legal">By continuing, you agree to the <Link href="/terms">Terms</Link> and acknowledge the <Link href="/privacy">Privacy Policy</Link>.</p></div>;

  return <div className={`auth-card auth-card--${mode}`}>
    {details.eyebrow ? <p className="auth-eyebrow">{details.eyebrow}</p> : null}<h1>{details.title}</h1>{details.description ? <p className="auth-description">{details.description}</p> : null}
    {oauthError && <p className="auth-form-error" role="alert">{oauthErrorMessage(oauthError)}</p>}
    {(mode === "sign-in" || mode === "sign-up") && <><a className="auth-google" href={`/auth/google?next=${encodeURIComponent(nextPath)}`}><GoogleMark /><span className="auth-google__label">{mode === "sign-up" ? "Sign up with Google" : "Continue with Google"}</span></a><div className="auth-divider"><span>or continue with email</span></div></>}
    <form action={formAction}>
      <input type="hidden" name="next" value={nextPath} />
      {mode === "reset" && <input type="hidden" name="token" value={resetToken ?? ""} />}
      {mode !== "reset" && <label>Email address<div><Mail size={17} aria-hidden="true" /><input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></div>{state.fieldErrors?.email && <small className="auth-field-error">{state.fieldErrors.email[0]}</small>}</label>}
      {(mode === "sign-in" || mode === "sign-up" || mode === "reset") && <label>{mode === "reset" ? "New password" : "Password"}<div><LockKeyhole size={17} aria-hidden="true" /><input name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={8} maxLength={72} required placeholder="At least 8 characters" /></div>{state.fieldErrors?.password && <small className="auth-field-error">{state.fieldErrors.password[0]}</small>}</label>}
      {(mode === "sign-up" || mode === "reset") && <label>{mode === "reset" ? "Confirm new password" : "Confirm password"}<div><LockKeyhole size={17} aria-hidden="true" /><input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required placeholder={mode === "reset" ? "Repeat your new password" : "Repeat your password"} /></div>{state.fieldErrors?.confirmPassword && <small className="auth-field-error">{state.fieldErrors.confirmPassword[0]}</small>}</label>}
      {mode === "sign-in" && <div className="auth-form-help"><span>Secure session</span><PasswordResetDialog defaultOpen={recoveryOpen} /></div>}
      {state.message && <p className="auth-form-error" role="alert">{state.message}</p>}
      <button className="button button--primary auth-submit" type="submit" disabled={pending}>{pending ? "Please wait…" : details.submit}<ArrowRight size={17} aria-hidden="true" /></button>
    </form>
    <p className="auth-switch">{mode === "sign-in" ? <>New to Scripted Fox? <Link href={`/sign-up${nextQuery}`}>Create an account</Link></> : mode === "sign-up" ? <>Already have an account? <Link href={`/sign-in${nextQuery}`}>Log In</Link></> : mode === "forgot" ? <Link href="/sign-in">Return to sign in</Link> : null}</p>
    <p className="auth-legal">By continuing, you agree to the <Link href="/terms">Terms</Link> and acknowledge the <Link href="/privacy">Privacy Policy</Link>.</p>
  </div>;
}
