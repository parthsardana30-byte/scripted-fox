"use client";

import { ExternalLink, Mail, RotateCcw, Send, Sparkles, UserRound, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { gmailComposeUrl, mailtoUrl, type EmailEscalation } from "@/lib/support/email-links";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; escalation?: EmailEscalation };
type ChatResponse = { message?: string; escalation?: EmailEscalation; error?: string };

const initialMessage: ChatMessage = {
  id: "fox-ai-welcome",
  role: "assistant",
  content: "Hi, I’m Fox AI. How can i help?",
};

function FoxFavicon({ className }: { className?: string }) {
  return <img className={className} src="/icon.svg" alt="" aria-hidden="true" />;
}

function featureForPath(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/help")) return "help center";
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up") || pathname.startsWith("/auth")) return "account access";
  if (pathname.startsWith("/connect")) return "YouTube connection";
  if (pathname.includes("upgrade") || pathname === "/pricing") return "billing and plans";
  if (pathname.includes("editor")) return "script editor";
  if (pathname.includes("trending")) return "Trending Hub";
  if (pathname.includes("ideas")) return "Daily Topics";
  return pathname.startsWith("/dashboard") ? "dashboard" : "product information";
}

function supportsFoxAi(pathname: string) {
  return !pathname.startsWith("/ui-preview");
}

export function FoxAiChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const closePanel = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => launcherRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
      if (event.key !== "Tab") return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled])") ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closePanel]);

  useEffect(() => {
    if (typeof endRef.current?.scrollIntoView === "function") {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  if (!supportsFoxAi(pathname)) return null;

  async function requestAnswer(conversation: ChatMessage[]) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/fox-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversation.slice(-12).map(({ role, content }) => ({ role, content })),
          context: { page: pathname, feature: featureForPath(pathname), locale: navigator.language },
        }),
      });
      const data = await response.json().catch(() => ({})) as ChatResponse;
      if (!response.ok || !data.message) {
        if (data.escalation) {
          setMessages((current) => [...current, { id: `fox-ai-escalation-${Date.now()}`, role: "assistant", content: data.error || "Fox AI could not resolve this issue.", escalation: data.escalation }]);
        }
        throw new Error(data.error || "Fox AI could not answer right now.");
      }
      setMessages((current) => [...current, { id: `fox-ai-${Date.now()}`, role: "assistant", content: data.message!, escalation: data.escalation }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Fox AI could not answer right now.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || loading) return;
    const next = [...messages, { id: `fox-user-${Date.now()}`, role: "user" as const, content }];
    setMessages(next);
    setDraft("");
    void requestAnswer(next);
  }

  const canRetry = Boolean(error) && messages.at(-1)?.role === "user";

  return <>
    <button ref={launcherRef} className="fox-ai-launcher" type="button" onClick={() => setOpen(true)} aria-label="Open Fox AI support" aria-expanded={open}>
      <span><FoxFavicon className="fox-ai-favicon" /></span><strong>Ask Fox AI</strong>
    </button>
    {open ? <>
      <button className="fox-ai-scrim" type="button" aria-label="Close Fox AI support" onClick={closePanel} />
      <section ref={panelRef} className="fox-ai-panel" role="dialog" aria-modal="true" aria-label="Fox AI support">
        <header>
          <span className="fox-ai-avatar"><FoxFavicon className="fox-ai-favicon" /></span>
          <div><strong>Fox AI</strong><p><i />Scripted Fox support</p></div>
          <button type="button" aria-label="Close Fox AI support" onClick={closePanel}><X size={20} /></button>
        </header>
        <div className="fox-ai-context"><Sparkles size={14} aria-hidden="true" /><span>Helping with {featureForPath(pathname)}</span></div>
        <div className="fox-ai-messages" aria-live="polite">
          {messages.map((message) => <article className={`fox-ai-message is-${message.role}`} key={message.id}>
            <span>{message.role === "assistant" ? <FoxFavicon className="fox-ai-message-favicon" /> : <UserRound size={15} />}</span>
            <div><p>{message.content}</p>{message.escalation ? <div className="fox-ai-escalation">
              <strong>Need a person?</strong>
              <a href={gmailComposeUrl(message.escalation)} target="_blank" rel="noreferrer"><Mail size={15} />Email support in Gmail<ExternalLink size={13} /></a>
              <a href={mailtoUrl(message.escalation)}>Use your email app</a>
            </div> : null}</div>
          </article>)}
          {loading ? <div className="fox-ai-typing" aria-label="Fox AI is typing"><i /><i /><i /></div> : null}
          {error ? <div className="fox-ai-error" role="alert"><p>{error}</p>{canRetry ? <button type="button" onClick={() => void requestAnswer(messages)}><RotateCcw size={14} />Retry</button> : null}</div> : null}
          <div ref={endRef} />
        </div>
        <form className="fox-ai-composer" onSubmit={submit}>
          <input ref={inputRef} aria-label="Ask Fox AI" value={draft} maxLength={2_000} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about Scripted Fox…" />
          <button type="submit" aria-label="Send to Fox AI" disabled={!draft.trim() || loading}><Send size={18} /></button>
        </form>
        <p className="fox-ai-safety">Never share passwords, payment card details, OAuth codes, or API keys.</p>
      </section>
    </> : null}
  </>;
}
