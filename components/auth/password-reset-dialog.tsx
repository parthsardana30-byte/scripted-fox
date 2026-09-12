"use client";

import { useActionState, useState } from "react";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";

import { sendPasswordReset, type AuthActionState } from "@/app/(auth)/actions";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const initialState: AuthActionState = { status: "idle" };

export function PasswordResetDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [state, action, pending] = useActionState(sendPasswordReset, initialState);

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><button className="auth-forgot-trigger" type="button">Forgot password?</button></DialogTrigger>
    <DialogContent className="password-reset-dialog">
      {state.status === "success" ? <div className="password-reset-dialog__complete">
        <span><CheckCircle2 size={25} aria-hidden="true" /></span>
        <p className="auth-eyebrow">Reset link sent</p>
        <DialogTitle>Check your inbox</DialogTitle>
        <DialogDescription>{state.message}</DialogDescription>
        <DialogClose asChild><button className="button button--secondary" type="button">Back to sign in</button></DialogClose>
      </div> : <>
        <div className="password-reset-dialog__heading"><DialogTitle>Reset your password</DialogTitle></div>
        <form action={action}>
          <label htmlFor="recovery-email">Email address</label>
          <div className="password-reset-dialog__field"><Mail size={17} aria-hidden="true" /><input id="recovery-email" name="email" type="email" autoComplete="email" maxLength={254} required autoFocus placeholder="you@example.com" /></div>
          {state.fieldErrors?.email ? <small className="auth-field-error">{state.fieldErrors.email[0]}</small> : null}
          {state.message ? <p className="auth-form-error" role="alert">{state.message}</p> : null}
          <div className="password-reset-dialog__actions"><DialogClose asChild><button className="button button--secondary" type="button">Cancel</button></DialogClose><button className="button button--primary" type="submit" disabled={pending}>{pending ? "Sending…" : <>Send reset link <ArrowRight size={16} /></>}</button></div>
        </form>
        <p className="password-reset-dialog__privacy">For security, we show the same confirmation whether or not that email is registered.</p>
      </>}
    </DialogContent>
  </Dialog>;
}
