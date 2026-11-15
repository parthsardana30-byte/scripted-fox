"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, Download, ArrowUpRight, X } from "lucide-react";
import { PHOTO_LIMIT, type ThumbnailInput, type ThumbnailStatus } from "@/lib/thumbnails/types";
import styles from "./thumbnail-studio.module.css";

type Photo = ThumbnailInput["photos"][number] & { name: string };

export function ThumbnailStudio({ preview = false }: { preview?: boolean }) {
  const [status, setStatus] = useState<ThumbnailStatus | null>(null);
  const [topic, setTopic] = useState("");
  const [headline, setHeadline] = useState("");
  const [style, setStyle] = useState<ThumbnailInput["style"]>("bold");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [retry, setRetry] = useState<ThumbnailInput | null>(null);
  const inFlight = useRef(false);
  const refresh = useCallback(async () => {
    if (preview) {
      const data: ThumbnailStatus = { credits: 500, freeAvailable: true, resetsAt: new Date(Date.now() + 86400_000).toISOString(), configured: false, pending: null, recent: [] };
      setStatus(data);
      return data;
    }
    const response = await fetch("/api/thumbnails", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load your allowance.");
    setStatus(data);
    window.dispatchEvent(new Event("fox-credits-changed"));
    return data as ThumbnailStatus;
  }, [preview]);
  useEffect(() => {
    const update = () => { void refresh().catch(e => setError(e.message)); };
    update();
    window.addEventListener("focus", update);
    return () => window.removeEventListener("focus", update);
  }, [refresh]);
  useEffect(() => {
    if (!status?.pending) return;
    const timer = setInterval(() => { void refresh().catch(() => undefined); }, 5000);
    return () => clearInterval(timer);
  }, [status?.pending, refresh]);
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => { void refresh().catch(() => undefined); }, Math.min(86400_000, Math.max(1000, Date.parse(status.resetsAt) - Date.now() + 1000)));
    return () => clearTimeout(timer);
  }, [status, refresh]);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(""); setReading(true);
    try {
      if (photos.length + files.length > 3) throw new Error("Choose up to 3 photos.");
      const next = await Promise.all(Array.from(files).map(async file => {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > PHOTO_LIMIT || !file.size) throw new Error("Use JPG, PNG or WebP photos up to 2 MB each.");
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("Could not read this photo."));
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.readAsDataURL(file);
        });
        return { name: file.name, mimeType: file.type as Photo["mimeType"], data };
      }));
      setPhotos(current => [...current, ...next]);
      setRetry(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add photos."); }
    finally { setReading(false); }
  }

  async function generate(reuse = false) {
    if (inFlight.current || !status) return;
    inFlight.current = true; setBusy(true); setError(""); setNotice("");
    const input: ThumbnailInput = reuse && retry ? retry : {
      requestId: crypto.randomUUID(), maxCost: status.freeAvailable ? 0 : 10, topic, headline, style,
      photos: photos.map(({ mimeType, data }) => ({ mimeType, data })),
    };
    setRetry(input);
    try {
      const response = await fetch("/api/thumbnails", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const data = await response.json();
      if (!response.ok) { if (response.status < 500) setRetry(null); throw new Error(data.error || "Generation failed."); }
      if (data.status === "succeeded") {
        setSelected(data.id); setRetry(null);
        setNotice(data.cost === 0 ? "Your free thumbnail is ready." : "Thumbnail ready. 10 Fox Credits used.");
      } else { setNotice("This thumbnail is still generating. Your recent images will update when it is ready."); }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection interrupted. Check your recent images before retrying.");
      await refresh().catch(() => undefined);
    } finally { inFlight.current = false; setBusy(false); }
  }

  async function download(id: string) {
    try {
      const image = new Image();
      image.src = `/api/thumbnails/${id}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 1280; canvas.height = 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Download not supported in this browser.");
      // Contain rather than crop so AI-generated text and faces are preserved.
      ctx.fillStyle = "#111"; ctx.fillRect(0, 0, 1280, 720);
      const scale = Math.min(1280 / image.width, 720 / image.height);
      ctx.drawImage(image, (1280 - image.width * scale) / 2, (720 - image.height * scale) / 2, image.width * scale, image.height * scale);
      const link = document.createElement("a"); link.download = "scripted-fox-thumbnail.jpg"; link.href = canvas.toDataURL("image/jpeg", 0.92); link.click();
    } catch { setError("Could not download this thumbnail. Please try again."); }
  }

  const current = selected || status?.recent[0]?.id;
  const disabled = busy || reading || Boolean(status?.pending);
  return <div className={`dashboard-page ${styles.studio}`}>
    <header className={styles.heading}><div><p className={styles.eyebrow}>MAKE THE FIRST IMPRESSION COUNT</p><h1>Thumbnail <span>Studio</span></h1><p>Your photos. A fresh idea. AI takes care of the design.</p></div><Link href={preview ? "/ui-preview" : "/dashboard"}>Back to Home <ArrowUpRight size={16} /></Link></header>
    <section className={styles.allowance} aria-label="Thumbnail allowance"><strong>{status ? `${status.credits.toLocaleString()} Fox Credits` : "Loading credits…"}</strong><span>{status?.pending ? "Generation in progress" : status?.freeAvailable ? "1 free thumbnail available today" : "Next thumbnail · 10 credits"}</span><small>Daily free thumbnail resets at midnight IST</small></section>
    {status && !status.configured && <p className={styles.message} role="status">{preview ? "Local design preview — sample balance, generation disabled. No account or credits are changed." : "Image generation is being set up. You can prepare your brief; no credits will be used."}</p>}
    <div className={styles.grid}>
      <form className={styles.panel} onSubmit={e => { e.preventDefault(); void generate(); }}>
        <label htmlFor="thumbnail-topic">What is your video about?</label><textarea id="thumbnail-topic" placeholder="e.g. I tested 5 budget gaming phones — one surprised me" value={topic} minLength={3} maxLength={1000} required disabled={disabled} onChange={e => { setTopic(e.target.value); setRetry(null); }} />
        <label htmlFor="thumbnail-headline">Headline <small>optional</small></label><input id="thumbnail-headline" placeholder="THE ₹15K WINNER" value={headline} maxLength={80} disabled={disabled} onChange={e => { setHeadline(e.target.value); setRetry(null); }} />
        <label htmlFor="thumbnail-style">Visual style</label><select id="thumbnail-style" value={style} disabled={disabled} onChange={e => { setStyle(e.target.value as ThumbnailInput["style"]); setRetry(null); }}><option value="bold">Bold & punchy</option><option value="cinematic">Cinematic</option><option value="minimal">Clean & minimal</option></select>
        <label className={styles.upload}><ImagePlus size={24} /><strong>Add your photos <small>optional</small></strong><span>Up to 3 photos · JPG, PNG or WebP · 2 MB each</span><input aria-label="Add photos" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={disabled || photos.length >= 3} onChange={e => { void addPhotos(e.target.files); e.target.value = ""; }} /></label>
        <div className={styles.photos}>{photos.map((photo, index) => <div key={`${photo.name}-${index}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:${photo.mimeType};base64,${photo.data}`} alt={photo.name} /><button type="button" aria-label={`Remove ${photo.name}`} disabled={disabled} onClick={() => { setPhotos(photos.filter((_, i) => i !== index)); setRetry(null); }}><X size={14} /></button>
        </div>)}</div>
        <p className={styles.fine}>Only upload photos you have permission to use. Your brief and selected photos are sent to Google Gemini to create the image. Reference photos are not saved in your thumbnail history.</p>
        <button className={styles.primary} disabled={disabled || !status?.configured || (!status.freeAvailable && status.credits < 10)}>{busy || status?.pending ? "Creating your thumbnail…" : status?.freeAvailable ? "Generate free thumbnail" : "Generate · 10 credits"}</button>
        {status && !status.freeAvailable && status.credits < 10 && <Link href="/dashboard/credits">Get more credits or come back tomorrow</Link>}
        <p className={styles.fine}>1 free per day. Then 10 credits per image, including new variations. Failed attempts restore your allowance.</p>
        {error && <div role="alert" className={styles.message}>{error}</div>}
        {notice && <p role="status">{notice}</p>}
        {retry && !busy && <button type="button" className={styles.secondary} onClick={() => void generate(true)}>Check / retry same request (no duplicate charge)</button>}
        <button type="button" className={styles.secondary} disabled={busy} onClick={() => void refresh().catch(e => setError(e.message))}>Refresh balance & results</button>
      </form>
      <section className={styles.panel} aria-label="Thumbnail preview"><div className={styles.preview}>{current ?
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/thumbnails/${current}`} alt="Your generated YouTube thumbnail" /> : <div><ImagePlus size={40} /><h2>Your next click starts here.</h2><p>Add a topic and optional photos.<br />We will build the background, lighting and composition.</p><small>LANDSCAPE · 16:9</small></div>}</div>
        {current && <button className={styles.primary} type="button" onClick={() => void download(current)}><Download size={18} /> Download · 1280 × 720 JPG</button>}
        <h2 className={styles.recentTitle}>Recent thumbnails</h2><p className={styles.fine}>Download your favourites. Recent images are kept here for quick access.</p><div className={styles.recent}>{status?.recent.map(item => <button type="button" key={item.id} onClick={() => setSelected(item.id)} aria-label={`Preview ${item.topic}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/thumbnails/${item.id}`} alt={item.topic} /><span>{item.cost === 0 ? "Daily free" : "10 credits"}</span></button>)}</div>
      </section>
    </div>
  </div>;
}
