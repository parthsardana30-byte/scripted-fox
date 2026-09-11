"use client";

import Link from "next/link";
import { Check, ChevronRight, KeyRound, Link2, UserRound } from "lucide-react";
import { useActionState, useRef } from "react";

import { signOut } from "@/app/(auth)/actions";
import { updateCreatorProfile } from "@/app/dashboard/account/actions";
import { disconnectYouTubeFromSettings } from "@/app/dashboard/settings/actions";
import { DeleteAccountDialog } from "@/components/dashboard/delete-account-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export type ManagedAccount = {
  displayName: string;
  email: string;
  memberSince: string;
  signInMethod: string;
  hasPassword: boolean;
  hasGoogle: boolean;
  channelNiche: string;
  channelGoal: "growth" | "authority" | "leads" | "community";
  connection: { active: boolean; title: string; status: string };
  plan: { name: string; description: string };
};

export function ManageAccountDialog({ account }: { account: ManagedAccount }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [profileState, profileAction, profilePending] = useActionState(updateCreatorProfile, { status: "idle" as const });
  const [disconnectState, disconnectAction, disconnectPending] = useActionState(disconnectYouTubeFromSettings, { status: "idle" as const });
  const connectionActive = account.connection.active && disconnectState.status !== "success";

  return <Dialog>
    <DialogTrigger asChild>
      <button className="button button--secondary button--small" type="button">Manage account <ChevronRight size={16} aria-hidden="true" /></button>
    </DialogTrigger>
    <DialogContent
      className="manage-account-dialog"
      ref={dialogRef}
      tabIndex={-1}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        dialogRef.current?.focus({ preventScroll: true });
      }}
    >
      <header className="manage-account-dialog__header">
        <span><UserRound size={22} aria-hidden="true" /></span>
        <div><small>Account settings</small><DialogTitle>Manage account</DialogTitle><DialogDescription>Keep your profile, channel, and access details up to date.</DialogDescription></div>
      </header>

      <div className="manage-account-dialog__body">
        <section className="manage-account-dialog__panel manage-account-dialog__panel--profile">
          <div className="manage-account-dialog__section-title"><span>Profile</span><small>Creator identity</small></div>
          <form className="manage-account-dialog__profile" action={profileAction}>
            <div className="manage-account-dialog__field">
              <label htmlFor="account-display-name">Display name</label>
              <input id="account-display-name" name="displayName" defaultValue={account.displayName} minLength={2} maxLength={80} required />
            </div>
            <input name="channelNiche" type="hidden" value={account.channelNiche} />
            <div className="manage-account-dialog__field">
              <label htmlFor="account-channel-goal">Main channel goal</label>
              <select id="account-channel-goal" name="channelGoal" defaultValue={account.channelGoal}>
                <option value="growth">Grow views and subscribers</option><option value="authority">Build authority</option><option value="leads">Generate leads or sales</option><option value="community">Strengthen the community</option>
              </select>
            </div>
            {profileState.message ? <p className={`manage-account-dialog__feedback${profileState.status === "error" ? " is-error" : ""}`} role="status">{profileState.message}</p> : null}
            <button className="button button--primary button--small" type="submit" disabled={profilePending}>{profilePending ? "Saving…" : "Save profile"}</button>
          </form>
        </section>

        <div className="manage-account-dialog__side-stack">
          <section className="manage-account-dialog__panel manage-account-dialog__panel--channel">
            <div className="manage-account-dialog__section-title"><span>YouTube</span><small>Channel connection</small></div>
            <div className="manage-account-dialog__row">
              <span className="manage-account-dialog__row-icon">{connectionActive ? <Check size={17} /> : <Link2 size={17} />}</span>
              <div>
                <strong>{connectionActive ? account.connection.title : "No channel connected"}</strong>
                <small>{connectionActive ? `${account.channelNiche ? `${account.channelNiche} · ` : ""}${account.connection.status}` : disconnectState.message ?? "Connect YouTube to personalize recommendations and analytics."}</small>
              </div>
            </div>
            {connectionActive ? <div className="manage-account-dialog__channel-actions">
              <Link className="button button--secondary button--small" href="/api/youtube/connect">Reconnect</Link>
              <form action={disconnectAction} onSubmit={(event) => {
                if (!window.confirm(`Disconnect ${account.connection.title} from this account?`)) event.preventDefault();
              }}><button className="button button--secondary button--small" type="submit" disabled={disconnectPending}>{disconnectPending ? "Disconnecting…" : "Disconnect"}</button></form>
            </div> : <Link className="button button--secondary button--small" href="/api/youtube/connect">Connect YouTube</Link>}
          </section>

          <section className="manage-account-dialog__panel manage-account-dialog__panel--plan">
            <div className="manage-account-dialog__section-title"><span>Plan</span><small>Billing access</small></div>
            <div className="manage-account-dialog__row"><div><strong>{account.plan.name}</strong><small>{account.plan.description}</small></div><Link className="button button--secondary button--small" href="/dashboard/upgrade">View plans</Link></div>
          </section>
        </div>

        <section className="manage-account-dialog__panel manage-account-dialog__panel--security">
          <div className="manage-account-dialog__section-title"><span>Account access</span><small>Sign-in and recovery</small></div>
          <div className="manage-account-dialog__access">
            <div>
              <strong>{account.email}</strong>
              <small>{account.signInMethod} sign-in · Member since {account.memberSince}</small>
            </div>
            <div className="manage-account-dialog__actions">
              {!account.hasGoogle && <Link className="button button--secondary button--small" href="/auth/google/link">Connect Google</Link>}
              {account.hasPassword && <Link className="button button--secondary button--small" href="/forgot-password"><KeyRound size={15} /> Change password</Link>}
              <form action={signOut}><button className="button button--secondary button--small" type="submit">Sign out</button></form>
            </div>
          </div>
        </section>

        <section className="manage-account-dialog__danger">
          <div><strong>Delete account</strong><small>Permanently remove this workspace and release its YouTube channel.</small></div>
          <DeleteAccountDialog passwordRequired={account.hasPassword} />
        </section>
      </div>
    </DialogContent>
  </Dialog>;
}
