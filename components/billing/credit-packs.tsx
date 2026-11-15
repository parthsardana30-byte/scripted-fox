"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, ArrowUpRight, LockKeyhole } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { creditPacks, getCreditPack, type CreditPackId } from "@/lib/billing/credit-packs";
import styles from "./credit-packs.module.css";

export function CreditPacks({ preview = false, expiresAt = null, checkoutEnabled = false, payment }: {
  preview?: boolean; expiresAt?: string | null; checkoutEnabled?: boolean; payment?: string;
}) {
  const [selected, setSelected] = useState<CreditPackId | null>(null);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const pack = selected ? getCreditPack(selected) : undefined;
  const expiry = expiresAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(expiresAt)) + " IST" : null;
  async function checkout(event: FormEvent) {
    event.preventDefault();
    if (!pack || preview || !checkoutEnabled || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/billing/credit-packs/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pack: pack.id, phone }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not open checkout.");
      if (result.action !== "https://secure.payu.in/_payment" || !result.fields || Object.values(result.fields).some(value => typeof value !== "string")) throw new Error("Could not verify the payment destination.");
      const form = document.createElement("form"); form.method = "POST"; form.action = result.action; form.hidden = true;
      for (const [name, value] of Object.entries(result.fields)) { const field = document.createElement("input"); field.type = "hidden"; field.name = name; field.value = String(value); form.appendChild(field); }
      document.body.appendChild(form); form.submit(); form.remove();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not open checkout."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const planHref = preview ? "/ui-preview?view=plans" : "/dashboard/upgrade";
  return <div className={`dashboard-page ${styles.page}`}>
    <header className={styles.header}><h1>Buy more <span>credits.</span></h1></header>
    {preview && <p className={styles.notice}>Local preview · explore packs without making a payment.</p>}
    {payment && <p className={styles.notice} role="status">{payment === "pending" ? "Payment is awaiting verification or review. Credits are added only after confirmation. If your plan expired during checkout, contact support." : payment === "success" ? "You have returned from checkout. Your available balance is shown above; contact support if it has not updated." : "Payment was not completed. No credits have been added for this attempt."}</p>}
    <section className={styles.grid} aria-label="Credit packs">{creditPacks.map(item => <article className={`${styles.card} ${item.id === "studio" ? styles.featured : ""}`} key={item.id}>
      <div className={styles.cardTop}><h2>{item.name}</h2>{item.id === "studio" && <span>BEST VALUE</span>}</div>
      <div className={styles.quantity}><span className={styles.coin} aria-hidden="true">F</span><strong>{item.credits.toLocaleString("en-IN")}</strong><span>Fox Credits</span></div>
      <p className={styles.price}>₹<strong>{item.priceInr}</strong></p>
      <ul><li><Check size={15} /> Added after verified payment</li><li><Check size={15} /> No subscription change</li><li><Check size={15} /> Valid until current plan expires</li></ul>
      <button type="button" onClick={() => { setSelected(item.id); setError(""); }}>Buy {item.credits.toLocaleString("en-IN")} credits <ArrowUpRight size={16} /></button>
    </article>)}</section>
    <Dialog open={Boolean(pack)} onOpenChange={open => { if (!open && !busy) setSelected(null); }}><DialogContent className={styles.dialog}>
      <DialogTitle>{pack ? `${pack.credits.toLocaleString("en-IN")} Fox Credits` : "Buy credits"}</DialogTitle>
      <DialogDescription>One-time payment of ₹{pack?.priceInr}. Credits expire with your current plan{expiry ? ` on ${expiry}` : ""}. No plan extension or recurring charge.</DialogDescription>
      <div className={styles.footer}><LockKeyhole size={16} aria-hidden="true" /><p>Secure checkout with PayU. Extra credits expire with your current plan and do not extend it.{expiry && <> Current expiry: <strong>{expiry}</strong>.</>}</p></div>
      {preview ? <p className={styles.notice}>Preview only. Checkout is disabled and no payment will be taken.</p> : !checkoutEnabled ? <p className={styles.notice}>You need an active plan or trial and available payment setup to buy credits. <Link href={planHref}>View plans</Link>.</p> : <form onSubmit={event => void checkout(event)}>
        <label htmlFor="credit-phone">Indian mobile number</label><input id="credit-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile number" pattern="[6-9][0-9]{9}" maxLength={10} required value={phone} disabled={busy} onChange={event => setPhone(event.target.value.replace(/\D/g, ""))} />
        {error && <p role="alert">{error}</p>}<button type="submit" disabled={busy || !/^[6-9][0-9]{9}$/.test(phone)}>{busy ? "Opening PayU…" : `Continue to PayU · ₹${pack?.priceInr}`}</button>
        <p className={styles.legal}>By continuing, you agree to our <Link href="/terms">Terms</Link> and <Link href="/refund-policy">Refund Policy</Link>. Payment details are entered only on PayU.</p>
      </form>}
    </DialogContent></Dialog>
  </div>;
}
