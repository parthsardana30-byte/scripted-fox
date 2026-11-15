"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ImagePlus, ArrowUpRight } from "lucide-react";
import type { ThumbnailStatus } from "@/lib/thumbnails/types";
import styles from "./thumbnail-studio.module.css";

export function ThumbnailCreditCard({ demoMode = false }: { demoMode?: boolean }) {
  const [status, setStatus] = useState<ThumbnailStatus | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (demoMode) return;
    let active = true;
    const update = async () => {
      try {
        const response = await fetch("/api/thumbnails", { cache: "no-store" });
        if (!response.ok) throw new Error("Unavailable");
        const data = await response.json();
        if (active) { setStatus(data); setFailed(false); }
      } catch { if (active) setFailed(true); }
    };
    void update();
    window.addEventListener("focus", update);
    const timer = setInterval(update, 60_000);
    return () => { active = false; window.removeEventListener("focus", update); clearInterval(timer); };
  }, [demoMode]);
  return <section className={styles.allowance} aria-label="Fox Credits and thumbnails">
    <ImagePlus size={25} aria-hidden="true" />
    <strong>{demoMode ? "Fox Credits preview" : failed ? "Balance unavailable" : status ? `${status.credits.toLocaleString()} Fox Credits` : "Loading credits…"}</strong>
    <span>{status?.pending ? "Thumbnail generating…" : status?.freeAvailable ? "Your daily free thumbnail is ready to use" : "1 free thumbnail daily · then 10 credits each"}</span>
    <Link href={demoMode ? "/ui-preview?view=thumbnails" : "/dashboard/thumbnails"}>Create thumbnail <ArrowUpRight size={14} style={{ display: "inline" }} /></Link>
  </section>;
}
