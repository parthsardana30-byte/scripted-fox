"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteAccount, type DeleteAccountState } from "@/app/dashboard/account/actions";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const initialState: DeleteAccountState = { status: "idle", message: "" };

export function DeleteAccountDialog({ passwordRequired }: { passwordRequired: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [state, action, pending] = useActionState(deleteAccount, initialState);

  useEffect(() => {
    if (state.status !== "deleted") return;
    window.localStorage.removeItem("scripted-fox-support-threads-v2");
    router.replace("/?account=deleted");
    router.refresh();
  }, [router, state.status]);

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <button className="button button--danger-outline button--small" type="button"><Trash2 size={16} aria-hidden="true" /> Delete account</button>
    </DialogTrigger>
    <DialogContent className="delete-account-dialog">
      <span className="delete-account-dialog__icon"><AlertTriangle size={21} aria-hidden="true" /></span>
      <div className="delete-account-dialog__heading">
        <p className="delete-account-dialog__eyebrow">Irreversible action</p>
        <DialogTitle>Delete your account permanently?</DialogTitle>
        <DialogDescription className="delete-account-dialog__description">This removes your Scripted Fox workspace and releases its YouTube channel connection.</DialogDescription>
      </div>
      <ul className="delete-account-dialog__list">
        <li>Scripts, ideas, preferences, and usage history</li>
        <li>YouTube connection, stored token, and channel analytics</li>
        <li>Profile, sign-in methods, and all active sessions</li>
      </ul>
      {state.status === "verification-sent" ? <div className="delete-account-dialog__sent" role="status">
        <strong>Confirmation email sent</strong><p>{state.message}</p>
      </div> : <form action={action} className="delete-account-dialog__form">
        <label htmlFor="delete-confirmation">Type <strong>DELETE</strong> to confirm</label>
        <input id="delete-confirmation" name="confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" spellCheck={false} />
        {passwordRequired ? <><label htmlFor="delete-password">Current password</label><input id="delete-password" name="password" type="password" autoComplete="current-password" /></> : null}
        <input name="passwordRequired" type="hidden" value={String(passwordRequired)} />
        {state.status === "error" ? <p className="delete-account-dialog__error" role="alert">{state.message}</p> : null}
        <div className="delete-account-dialog__actions">
          <DialogClose asChild><button className="button button--secondary" type="button">Keep account</button></DialogClose>
          <button className="button button--danger" type="submit" disabled={confirmation !== "DELETE" || pending}>
            {pending ? "Deleting…" : <>Delete permanently <ArrowRight size={16} aria-hidden="true" /></>}
          </button>
        </div>
      </form>}
    </DialogContent>
  </Dialog>;
}
