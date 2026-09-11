"use client";

import {
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleUserRound,
  Clock3,
  CreditCard,
  HelpCircle,
  History,
  MessageCircle,
  Paperclip,
  Radio,
  Search,
  Send,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type CategoryId = "general" | "account" | "billing" | "technical";
type SupportView = "answers" | "conversations";
type Message = { id: string; from: "user" | "agent"; text: string; time: string; attachment?: string };
type Thread = { id: string; topic: string; status: "active" | "resolved"; updatedAt: string; preview: string; messages: Message[] };
type Faq = { id: string; category: CategoryId; question: string; answer: string; chat?: boolean };

const categories = [
  { id: "general" as const, label: "General", detail: "Using Scripted Fox", icon: HelpCircle },
  { id: "account" as const, label: "Account", detail: "Login and YouTube", icon: UserRound },
  { id: "billing" as const, label: "Billing", detail: "Plans and payments", icon: CreditCard },
  { id: "technical" as const, label: "Technical", detail: "Errors and exports", icon: Wrench },
];

const faqs: Faq[] = [
  { id: "what-is-scripted-fox", category: "general", question: "What can Scripted Fox help me create?", answer: "Use it to research relevant topics, plan a video, and write or refine YouTube scripts. Connecting a channel adds context, but it is optional." },
  { id: "recommendations", category: "general", question: "How are Daily Topics and trends selected?", answer: "Recommendations combine your confirmed niche, channel signals, recent performance, and current YouTube trend data. Confirming a precise niche improves the result." },
  { id: "data-safety", category: "general", question: "Does Scripted Fox publish videos for me?", answer: "No. YouTube access is read-only. Scripted Fox cannot upload, edit, delete, or publish videos on your behalf." },
  { id: "youtube-channel-in-use", category: "account", question: "My YouTube channel is connected to another account", answer: "Sign in to the Scripted Fox account shown by the masked email hint, open Account settings, and disconnect YouTube there. A second account cannot remove that connection because it would expose private analytics and subscription access. If you cannot access the original account, start a support chat and share the channel URL and masked hint." , chat: true },
  { id: "change-channel", category: "account", question: "How do I change my connected YouTube channel?", answer: "Open Account settings, disconnect the current channel, then connect the correct Google account. Your plan usage does not reset when you change channels." },
  { id: "lost-login", category: "account", question: "I can’t access my Scripted Fox account", answer: "Try password recovery first. If the email or sign-in provider is unavailable, support can guide you through ownership verification without exposing account details.", chat: true },
  { id: "charged-plan-locked", category: "billing", question: "I paid, but my plan is still locked", answer: "Payment confirmation can occasionally arrive late. Check that the payment completed, then contact support with the transaction reference if access is not restored within a few minutes.", chat: true },
  { id: "usage-reset", category: "billing", question: "When do my script limits reset?", answer: "Monthly plan allowances reset on your billing renewal date. Disconnecting or changing a YouTube channel does not reset usage." },
  { id: "cancel-plan", category: "billing", question: "How do I cancel my subscription?", answer: "Open Account and select Manage plan. Your paid access remains available until the end of the current billing period." },
  { id: "generation-failed", category: "technical", question: "My script generation keeps failing", answer: "Retry once after checking your connection and shortening unusually large inputs. If the failure repeats, open a chat so support can inspect the request time and error state.", chat: true },
  { id: "youtube-sync", category: "technical", question: "My YouTube analytics are not updating", answer: "Reconnect YouTube if permission expired. New analytics can take time to appear after an upload because YouTube reporting is not always immediate." },
  { id: "export-issue", category: "technical", question: "My script export looks different", answer: "Check the export format in Settings. Markdown, plain text, and document exports preserve different levels of structure." },
];

const STORAGE_KEY = "scripted-fox-support-threads-v2";
const quickReplies = ["I still need help", "Where do I find this?", "Talk to a person"];

function nowLabel() {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date());
}

function makeThread(faq: Faq): Thread {
  return {
    id: `thread-${Date.now()}`,
    topic: faq.question,
    status: "active",
    updatedAt: new Date().toISOString(),
    preview: "Tell us what happened and we’ll help you from here.",
    messages: [{ id: `message-${Date.now()}`, from: "agent", text: `Hi — I can help with “${faq.question}”. Tell me what you have already tried.`, time: nowLabel() }],
  };
}

export function SupportCenter({ initialCategory, initialFaq, initialView }: { initialCategory?: string; initialFaq?: string; initialView?: string }) {
  const validCategory = categories.some((item) => item.id === initialCategory) ? initialCategory as CategoryId : "general";
  const [view, setView] = useState<SupportView>(initialView === "conversations" ? "conversations" : "answers");
  const [category, setCategory] = useState<CategoryId>(validCategory);
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(faqs.some((item) => item.id === initialFaq) ? initialFaq ?? null : null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let storedThreads: Thread[] = [];
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) storedThreads = JSON.parse(stored) as Thread[];
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    const restore = window.setTimeout(() => setThreads(storedThreads), 0);
    return () => window.clearTimeout(restore);
  }, []);

  useEffect(() => {
    if (threads.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThreadId, threads, typing]);

  const visibleFaqs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return faqs.filter((faq) => normalized
      ? `${faq.question} ${faq.answer}`.toLowerCase().includes(normalized)
      : faq.category === category);
  }, [category, query]);
  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? null;
  const sortedThreads = [...threads].sort((a, b) => a.status === b.status
    ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    : a.status === "active" ? -1 : 1);

  function openChat(faq: Faq) {
    const existing = threads.find((thread) => thread.status === "active" && thread.topic === faq.question);
    if (existing) return setActiveThreadId(existing.id);
    const thread = makeThread(faq);
    setThreads((current) => [thread, ...current]);
    setActiveThreadId(thread.id);
  }

  function sendMessage(text = draft) {
    if (!activeThreadId || (!text.trim() && !attachment)) return;
    const body = text.trim() || "Attachment shared";
    const userMessage: Message = { id: `${activeThreadId}-message-${activeThread?.messages.length ?? 0}`, from: "user", text: body, time: nowLabel(), attachment: attachment ?? undefined };
    setThreads((current) => current.map((thread) => thread.id === activeThreadId ? { ...thread, updatedAt: new Date().toISOString(), preview: body, messages: [...thread.messages, userMessage] } : thread));
    setDraft("");
    setAttachment(null);
    setTyping(true);
    window.setTimeout(() => {
      const reply: Message = { id: `message-${Date.now()}-agent`, from: "agent", text: "Got it. Your message is in the support queue. A team member can continue from this thread.", time: nowLabel() };
      setThreads((current) => current.map((thread) => thread.id === activeThreadId ? { ...thread, updatedAt: new Date().toISOString(), preview: reply.text, messages: [...thread.messages, reply] } : thread));
      setTyping(false);
    }, 800);
  }

  function submitMessage(event: FormEvent) {
    event.preventDefault();
    sendMessage();
  }

  return <div className="dashboard-page support-center">
    <header className="support-hero">
      <div><p className="dashboard-eyebrow">Help & Support</p><h1>What can we help you fix?</h1><p>Search for an answer, or continue a conversation without starting over.</p></div>
      <label className="support-search"><Search size={20} aria-hidden="true" /><span className="sr-only">Search help</span><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setView("answers"); }} placeholder="Search account, billing, YouTube…" /></label>
    </header>

    <div className="support-view-tabs" role="tablist" aria-label="Support sections">
      <button role="tab" aria-selected={view === "answers"} onClick={() => setView("answers")}><HelpCircle size={17} />Help topics</button>
      <button role="tab" aria-selected={view === "conversations"} onClick={() => setView("conversations")}><History size={17} />Conversations{threads.some((thread) => thread.status === "active") ? <i /> : null}</button>
    </div>

    {view === "answers" ? <div className="support-answer-layout">
      <nav className="support-categories" aria-label="Help categories">
        {categories.map(({ id, label, detail, icon: Icon }) => <button key={id} className={cn(category === id && !query && "is-active")} onClick={() => { setCategory(id); setQuery(""); }}><Icon size={19} aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span></button>)}
      </nav>
      <section className="support-faqs" aria-labelledby="faq-heading">
        <div className="support-section-heading"><div><p>{query ? "Search results" : categories.find((item) => item.id === category)?.label}</p><h2 id="faq-heading">{query ? `Answers for “${query}”` : "Frequently asked questions"}</h2></div><span>{visibleFaqs.length} {visibleFaqs.length === 1 ? "answer" : "answers"}</span></div>
        {visibleFaqs.length ? <div className="support-accordion">{visibleFaqs.map((faq) => {
          const expanded = openFaq === faq.id;
          return <article className={cn("support-faq", expanded && "is-open", faq.chat && "is-priority")} key={faq.id}>
            <button aria-expanded={expanded} aria-controls={`${faq.id}-answer`} onClick={() => setOpenFaq(expanded ? null : faq.id)}><span>{faq.question}</span>{faq.chat ? <small>Support available</small> : null}<ChevronDown size={19} aria-hidden="true" /></button>
            {expanded ? <div className="support-faq__answer" id={`${faq.id}-answer`}><p>{faq.answer}</p>{faq.chat ? <button className="support-chat-cta" onClick={() => openChat(faq)}><MessageCircle size={17} aria-hidden="true" />Chat with us</button> : null}</div> : null}
          </article>;
        })}</div> : <div className="support-empty"><Search size={24} /><h3>No matching answers</h3><p>Try a shorter phrase or browse a category.</p></div>}
      </section>
    </div> : <section className="support-history" aria-labelledby="history-heading">
      <div className="support-section-heading"><div><p>Conversation archive</p><h2 id="history-heading">Your support threads</h2></div><span>{threads.length} total</span></div>
      {sortedThreads.length ? <div className="support-thread-list">{sortedThreads.map((thread) => <button key={thread.id} className={cn("support-thread", thread.status === "active" && "is-active")} onClick={() => setActiveThreadId(thread.id)}>
        <span className="support-thread__icon">{thread.status === "active" ? <Radio size={18} /> : <CheckCircle2 size={18} />}</span>
        <span className="support-thread__copy"><span><strong>{thread.topic}</strong><em>{thread.status === "active" ? "Active" : "Resolved"}</em></span><small>{thread.preview}</small></span>
        <time dateTime={thread.updatedAt}><Clock3 size={14} />{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(thread.updatedAt))}</time>
      </button>)}</div> : <div className="support-empty"><MessageCircle size={25} /><h3>No conversations yet</h3><p>When an answer offers chat support, your thread will appear here.</p></div>}
    </section>}

    {activeThread ? <><button className="support-drawer-scrim" aria-label="Close conversation" onClick={() => setActiveThreadId(null)} /><aside className="support-chat-drawer" aria-label={`Support conversation: ${activeThread.topic}`}>
      <header><span className="support-agent-avatar"><Bot size={22} /></span><div><strong>Scripted Fox Support</strong><p><i />Online · replies are saved</p></div><button aria-label="Close conversation" onClick={() => setActiveThreadId(null)}><X size={20} /></button></header>
      <div className="support-chat-topic"><small>Topic</small><strong>{activeThread.topic}</strong></div>
      <div className="support-messages" aria-live="polite">{activeThread.messages.map((message) => <div className={cn("support-message", `is-${message.from}`)} key={message.id}>
        <span>{message.from === "agent" ? <Bot size={15} /> : <CircleUserRound size={15} />}</span><div><p>{message.text}</p>{message.attachment ? <small><Paperclip size={13} />{message.attachment}</small> : null}<time>{message.time}</time></div>
      </div>)}{typing ? <div className="support-typing" aria-label="Support is typing"><i /><i /><i /></div> : null}<div ref={messageEndRef} /></div>
      <div className="support-quick-replies">{quickReplies.map((reply) => <button key={reply} onClick={() => sendMessage(reply)}>{reply}</button>)}</div>
      {attachment ? <div className="support-attachment"><Paperclip size={14} /><span>{attachment}</span><button aria-label="Remove attachment" onClick={() => setAttachment(null)}><X size={14} /></button></div> : null}
      <form className="support-composer" onSubmit={submitMessage}><label><Paperclip size={19} /><span className="sr-only">Attach file</span><input type="file" onChange={(event) => setAttachment(event.target.files?.[0]?.name ?? null)} /></label><input aria-label="Message support" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message…" /><button type="submit" aria-label="Send message" disabled={!draft.trim() && !attachment}><Send size={18} /></button></form>
    </aside></> : null}
  </div>;
}
