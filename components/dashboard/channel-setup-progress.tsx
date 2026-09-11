"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

type SetupStatus = "processing" | "error";

async function setupRequest(action: "sync" | "complete" | "fail" | "retry") {
  return fetch("/api/youtube/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
}

export function ChannelSetupProgress({ initialStatus, channelName }: { initialStatus: SetupStatus; channelName: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<SetupStatus>(initialStatus);
  const running = useRef(false);
  const cancelled = useRef(false);

  const runSetup = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      const syncResponse = await setupRequest("sync");
      if (!syncResponse.ok) throw new Error("sync_failed");
      const ideasResponse = await fetch("/api/ideas/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excludeTitles: [], initialSetup: true }),
      });
      if (!ideasResponse.ok) throw new Error("topics_failed");
      const completeResponse = await setupRequest("complete");
      if (!completeResponse.ok) throw new Error("completion_failed");
      if (!cancelled.current) router.refresh();
    } catch {
      await setupRequest("fail").catch(() => undefined);
      if (!cancelled.current) setStatus("error");
    } finally {
      running.current = false;
    }
  }, [router]);

  useEffect(() => {
    if (initialStatus !== "processing") return;
    const timer = window.setTimeout(() => void runSetup(), 0);
    return () => window.clearTimeout(timer);
  }, [initialStatus, runSetup]);

  useEffect(() => {
    cancelled.current = false;
    return () => { cancelled.current = true; };
  }, []);

  useEffect(() => {
    if (status !== "processing") return;
    const timer = window.setInterval(async () => {
      const response = await fetch("/api/youtube/setup", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const payload = await response.json() as { status?: string };
      if (payload.status === "ready") router.refresh();
      if (payload.status === "error") setStatus("error");
    }, 2500);
    return () => window.clearInterval(timer);
  }, [router, status]);

  const retry = async () => {
    const response = await setupRequest("retry");
    if (response.ok) {
      setStatus("processing");
      void runSetup();
    }
  };

  return (
    <div className={`dashboard-channel-setup is-${status}`} role={status === "error" ? "alert" : "status"} aria-live="polite">
      <span className="dashboard-channel-setup__signal" aria-hidden="true">
        <Image src="/youtube-glass-channel.png" alt="" width={56} height={56} />
        {status === "processing" ? <i /> : null}
      </span>
      <span className="dashboard-channel-setup__copy">
        <small>{status === "processing" ? "Personalizing your feed" : "Setup paused"}</small>
        <strong>{status === "processing" ? `Setting up ${channelName}` : "Your channel needs another try"}</strong>
        <em>{status === "processing" ? "Usually ready in about 2 minutes" : "Your connection is safe. Resume from the last step."}</em>
      </span>
      {status === "error" ? <button type="button" onClick={retry}><RefreshCw size={15} aria-hidden="true" /> Try again</button> : <span className="dashboard-channel-setup__meter" aria-hidden="true"><i /><i /><i /></span>}
    </div>
  );
}
