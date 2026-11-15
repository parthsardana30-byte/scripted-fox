"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import styles from "./credit-badge.module.css";

export function CreditBadge({ preview = false }: { preview?: boolean }) {
  const pathname = usePathname();
  const [credits, setCredits] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (preview) return;
    let active = true;
    let pending = false;
    const controller = new AbortController();
    async function refresh() {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const response = await fetch("/api/billing/credits", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Balance unavailable");
        const data = await response.json();
        if (!Number.isSafeInteger(data.credits) || data.credits < 0) throw new Error("Invalid balance");
        if (active) { setCredits(data.credits); setFailed(false); }
      } catch { if (active) setFailed(true); }
      finally { pending = false; }
    }
    void refresh();
    const timer = setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("fox-credits-changed", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false; controller.abort(); clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("fox-credits-changed", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [preview, pathname]);

  const amount = preview ? "500" : failed ? "Unavailable" : credits === null ? "…" : credits.toLocaleString();
  return <Link className={styles.badge} href={preview ? "/ui-preview?view=credits" : "/dashboard/credits"}
    aria-label={`${preview ? "Preview: " : ""}${amount} Fox Credits${preview ? "" : ", buy more credits"}`}
    title={preview ? "Sample balance — preview credit packs" : "Your available Fox Credits. Buy more credits."}>
    <span className={styles.coin} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m7 5 10 0-1 4H9l-1 3h6l-1 4H7l-1 3H3L7 5Z" fill="currentColor" /></svg></span>
    <span className={styles.copy}><strong aria-live="polite">{amount}</strong><small>Fox Credits{preview && <em>DEMO</em>}</small></span>
    <ArrowUpRight className={styles.arrow} size={15} aria-hidden="true" />
  </Link>;
}
