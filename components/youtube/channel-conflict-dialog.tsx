"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, KeyRound, LifeBuoy, LogOut, ShieldCheck, Unplug } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function ChannelConflictDialog({ accountHint }: { accountHint: string }) {
  const router = useRouter();

  return <Dialog defaultOpen onOpenChange={(open) => {
    if (!open) router.replace("/dashboard");
  }}>
    <DialogContent className="channel-conflict-dialog">
      <div className="channel-conflict-dialog__signal">
        <span><AlertTriangle size={20} aria-hidden="true" /></span>
        <p>Connection protected</p>
      </div>
      <div className="channel-conflict-dialog__heading">
        <DialogTitle>This channel is already connected</DialogTitle>
        <DialogDescription>Sign in to the Scripted Fox account below to disconnect it safely.</DialogDescription>
      </div>
      <div className="channel-conflict-dialog__identity">
        <small>Connected account</small><strong>{accountHint}</strong><ShieldCheck size={20} aria-label="Protected connection" />
      </div>
      <ol className="channel-conflict-dialog__steps">
        <li><span>01</span><LogOut size={18} aria-hidden="true" /><p><strong>Sign out here</strong><small>Leave the current Scripted Fox account.</small></p></li>
        <li><span>02</span><KeyRound size={18} aria-hidden="true" /><p><strong>Open the account above</strong><small>Use the masked address as your reminder.</small></p></li>
        <li><span>03</span><Unplug size={18} aria-hidden="true" /><p><strong>Disconnect YouTube there</strong><small>Then return and connect it to this account.</small></p></li>
      </ol>
      <div className="channel-conflict-dialog__actions">
        <form action={signOut}><Button type="submit"><LogOut size={17} aria-hidden="true" />Sign out and switch</Button></form>
        <Button asChild variant="secondary"><Link href="/help?category=account&faq=youtube-channel-in-use"><LifeBuoy size={17} aria-hidden="true" />Need help?</Link></Button>
      </div>
    </DialogContent>
  </Dialog>;
}
