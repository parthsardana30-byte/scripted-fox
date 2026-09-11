"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, Link2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DisconnectYouTubeButton } from "@/components/youtube/disconnect-button";

const notices: Record<string, string> = {
  cancelled: "Connection cancelled. Nothing was changed.",
};

const issues: Record<string, string> = {
  invalid_state: "This connection request expired. Start again.",
  no_channel: "That Google account does not have an accessible YouTube channel.",
  connection_failed: "YouTube could not be connected. Try again.",
  not_configured: "YouTube connection is not configured for this environment.",
};

function YouTubeMark() {
  return <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
    <path fill="currentColor" d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5a3 3 0 0 0-2.1 2.1A31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8Z" />
    <path fill="#ef233c" d="m10 15.2 5.2-3.2L10 8.8v6.4Z" />
  </svg>;
}

export function YouTubeConnectionDialog({
  connected,
  channelTitle,
  notice,
  issue,
}: {
  connected: boolean;
  channelTitle?: string | null;
  notice?: string;
  issue?: string;
}) {
  const router = useRouter();
  const feedback = (issue && issues[issue]) || (notice && notices[notice]);

  return <Dialog defaultOpen onOpenChange={(open) => {
    if (!open) router.replace("/dashboard");
  }}>
    <DialogContent className="youtube-connection-dialog">
      <header className="youtube-connection-dialog__signal">
        <span><YouTubeMark /></span>
        <div>
          <p>{connected ? "Channel connected" : "YouTube connection"}</p>
          <DialogTitle>{connected ? channelTitle || "YouTube connected" : "Connect your YouTube channel"}</DialogTitle>
          <DialogDescription>{connected
            ? "Manage the channel used to personalize ideas, trends, and analytics."
            : "Add your channel context so recommendations reflect what your audience watches."}</DialogDescription>
        </div>
      </header>

      {feedback ? <p className={`youtube-connection-dialog__feedback${issue ? " is-error" : ""}`} role={issue ? "alert" : "status"}>{feedback}</p> : null}

      {!connected ? <div className="youtube-connection-dialog__permissions">
        <div><Eye size={18} aria-hidden="true" /><p><strong>Read-only access</strong><small>Channel identity, video statistics, and your analytics reports.</small></p></div>
        <div><ShieldCheck size={18} aria-hidden="true" /><p><strong>You stay in control</strong><small>Scripted Fox cannot upload, edit, delete, or publish videos.</small></p></div>
      </div> : <div className="youtube-connection-dialog__connected"><span><Check size={17} /></span><p><strong>{channelTitle || "YouTube channel"}</strong><small>Connected · upload history is shaping recommendations.</small></p></div>}

      <div className="youtube-connection-dialog__actions">
        <Button asChild><Link href="/api/youtube/connect"><Link2 size={17} aria-hidden="true" />{connected ? "Reconnect channel" : "Continue with Google"}</Link></Button>
        {connected ? <DisconnectYouTubeButton /> : <button className="button button--secondary" type="button" onClick={() => router.replace("/dashboard")}>Not now</button>}
      </div>
    </DialogContent>
  </Dialog>;
}
