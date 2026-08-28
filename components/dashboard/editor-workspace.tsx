"use client";

import {
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  Download,
  Expand,
  PanelRightClose,
  PanelRightOpen,
  Play,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";

import {
  canGenerateFromEmptyScript,
  hasScriptContent,
  isEditOnlyInstruction,
  scriptDraftSchema,
  type ScriptDraft,
} from "@/lib/ai/types";
import { pricingHref } from "@/lib/billing/plans";

type SaveState = "Saved" | "Saving…";
type ChatMessage = { id: string; role: "user" | "assistant"; content: string };
type VersionOrigin = "initial" | "ai" | "restore";

class ScriptWriterAccessRequiredError extends Error {}
type ScriptVersion = {
  number: number;
  label: string;
  origin: VersionOrigin;
  createdAt: string;
  snapshot: { title: string; author: string; draft: ScriptDraft };
};

const versionHistorySchema = z.array(z.object({
  number: z.number().int().positive(),
  label: z.string().min(1).max(120),
  origin: z.enum(["initial", "ai", "restore"]),
  createdAt: z.string(),
  snapshot: z.object({
    title: z.string().max(200),
    author: z.string().max(100),
    draft: scriptDraftSchema,
  }),
})).min(1);

function emptyDraft(title: string): ScriptDraft {
  return {
    title,
    sections: [{ label: "Script", body: "" }],
  };
}

function initialVersion(title: string): ScriptVersion {
  const draft = emptyDraft(title);
  return {
    number: 1,
    label: "Initial draft",
    origin: "initial",
    createdAt: new Date().toISOString(),
    snapshot: { title, author: "", draft },
  };
}

function versionOriginLabel(origin: VersionOrigin) {
  if (origin === "ai") return "AI change";
  if (origin === "restore") return "Restored";
  return "Started";
}

function ScriptSection({ id, label, body, onInput }: { id: string; label: string; body: string; onInput: (body: string) => void }) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = "0px";
    field.style.height = `${Math.max(field.scrollHeight, 88)}px`;
  }, [body]);

  return (
    <section className="script-section">
      <label className="script-section__label" htmlFor={id}>{label}</label>
      <textarea
        ref={fieldRef}
        id={id}
        className="script-section__body"
        aria-label={label === "Script" ? "Script content" : `${label} script section`}
        value={body}
        onChange={(event) => onInput(event.target.value)}
        placeholder={label === "Script" ? "Start writing…" : `Write the ${label.toLowerCase()}…`}
        rows={1}
      />
    </section>
  );
}

export function EditorWorkspace({
  projectTitle = "Untitled script",
  projectKey = "untitled",
  loadSessionDraft = false,
  canUseAdvancedExports = false,
  canUseScriptWriter = true,
  versionChangeLimit = 10,
  returnPath = "/dashboard/editor",
  initialPrompt = "",
}: {
  projectTitle?: string;
  projectKey?: string;
  loadSessionDraft?: boolean;
  canUseAdvancedExports?: boolean;
  canUseScriptWriter?: boolean;
  versionChangeLimit?: number;
  returnPath?: string;
  initialPrompt?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(projectTitle);
  const [author, setAuthor] = useState("");
  const [draft, setDraft] = useState<ScriptDraft>(() => emptyDraft(projectTitle));
  const [aiOpen, setAiOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [teleprompter, setTeleprompter] = useState(false);
  const [teleSize, setTeleSize] = useState(38);
  const [teleSpacing, setTeleSpacing] = useState(1.7);
  const [saveState, setSaveState] = useState<SaveState>("Saved");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [versions, setVersions] = useState<ScriptVersion[]>(() => [initialVersion(projectTitle)]);
  const saveTimer = useRef<number | undefined>(undefined);
  const editRevision = useRef(0);
  const messageSequence = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const versionMenuRef = useRef<HTMLDivElement>(null);
  const historyHydrated = useRef(false);
  const historyStorageKey = `next-video:versions:${encodeURIComponent(projectKey)}`;

  const nextMessageId = () => `message-${messageSequence.current++}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let restoredHistory: ScriptVersion[] | null = null;
      if (loadSessionDraft) {
        const serializedDraft = window.sessionStorage.getItem("next-video:draft");
        if (serializedDraft) {
          try {
            const parsedDraft = scriptDraftSchema.safeParse(JSON.parse(serializedDraft));
            if (parsedDraft.success) {
              const first = initialVersion(parsedDraft.data.title);
              restoredHistory = [{ ...first, snapshot: { ...first.snapshot, draft: parsedDraft.data, title: parsedDraft.data.title } }];
              window.sessionStorage.removeItem("next-video:draft");
            }
          } catch {
            restoredHistory = null;
          }
        }
      }
      if (!restoredHistory) {
        const serializedHistory = window.sessionStorage.getItem(historyStorageKey);
        if (serializedHistory) {
          try {
            const parsedHistory = versionHistorySchema.safeParse(JSON.parse(serializedHistory));
            if (parsedHistory.success) restoredHistory = parsedHistory.data.slice(-(versionChangeLimit + 1));
          } catch {
            restoredHistory = null;
          }
        }
      }
      if (restoredHistory) {
        const current = restoredHistory.at(-1)!;
        setVersions(restoredHistory);
        setTitle(current.snapshot.title);
        setAuthor(current.snapshot.author);
        setDraft(current.snapshot.draft);
      }
      historyHydrated.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [historyStorageKey, loadSessionDraft, versionChangeLimit]);

  useEffect(() => {
    if (!historyHydrated.current) return;
    window.sessionStorage.setItem(historyStorageKey, JSON.stringify(versions));
  }, [historyStorageKey, versions]);

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);
  useEffect(() => {
    if (!initialPrompt) return;
    void fetch("/api/landing-intent", { method: "DELETE", keepalive: true });
  }, [initialPrompt]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [messages, aiStatus]);
  useEffect(() => {
    if (!versionsOpen) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!versionMenuRef.current?.contains(event.target as Node)) setVersionsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVersionsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [versionsOpen]);

  const scheduleSave = () => {
    setSaveState("Saving…");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setSaveState("Saved"), 700);
  };

  const markUserChanged = () => {
    editRevision.current += 1;
    scheduleSave();
  };

  const syncCurrentVersion = (nextDraft: ScriptDraft, nextTitle = title, nextAuthor = author) => {
    setVersions((current) => current.map((version, index) => index === current.length - 1
      ? { ...version, snapshot: { title: nextTitle, author: nextAuthor, draft: nextDraft } }
      : version));
  };

  const versionChangesUsed = Math.max(0, versions.length - 1);
  const versionLimitReached = versionChangesUsed >= versionChangeLimit;
  const currentVersionNumber = versions.at(-1)?.number ?? 1;
  const scriptWriterPricingHref = pricingHref(
    "ai_script_writer",
    returnPath,
    canUseScriptWriter && versionChangeLimit >= 10 && versionChangeLimit < 20 ? "elite" : undefined,
  );

  const openScriptWriterPricing = () => {
    router.push(scriptWriterPricingHref);
  };

  const explainVersionLimit = () => {
    const message = versionChangeLimit >= 20
      ? "This script has used all 20 version changes. Restore or edit the current version manually to continue."
      : versionChangeLimit >= 10
        ? "This script has used all 10 Pro version changes. Elite keeps up to 20 changes per script."
        : versionChangeLimit > 0
          ? `This script has used the ${versionChangeLimit} version change available on this plan.`
        : "AI script writing is available during the free trial and on Pro or Elite.";
    addMessage("assistant", message);
  };

  const commitVersion = (nextDraft: ScriptDraft, origin: Exclude<VersionOrigin, "initial">, label: string, nextAuthor = author) => {
    if (versionLimitReached) return false;
    const nextNumber = currentVersionNumber + 1;
    setVersions((current) => [...current, {
      number: nextNumber,
      label,
      origin,
      createdAt: new Date().toISOString(),
      snapshot: { title: nextDraft.title, author: nextAuthor, draft: nextDraft },
    }]);
    return true;
  };

  const scriptText = draft.sections.map((section) => section.body).filter(Boolean).join("\n\n");
  const hasScript = hasScriptContent(draft);
  const wordCount = hasScript ? scriptText.trim().split(/\s+/).length : 0;
  const readMinutes = wordCount === 0 ? 0 : Math.max(1, Math.ceil(wordCount / 150));

  const requestAi = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/ai/script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let data: { error?: string; draft?: unknown; message?: string } = {};
    try {
      data = await response.json() as typeof data;
    } catch {
      if (response.ok) throw new Error("The writing service returned an invalid response. Please try again.");
    }
    if (response.status === 402) throw new ScriptWriterAccessRequiredError();
    if (!response.ok) throw new Error(data.error || "The writing service is unavailable.");
    return data;
  };

  const addMessage = (role: ChatMessage["role"], content: string) => {
    setMessages((current) => [...current, { id: nextMessageId(), role, content }]);
  };

  const applyAiDraft = (nextDraft: ScriptDraft) => {
    if (!commitVersion(nextDraft, "ai", "AI rewrite")) return false;
    setDraft(nextDraft);
    setTitle(nextDraft.title);
    scheduleSave();
    return true;
  };

  const restoreVersion = (version: ScriptVersion) => {
    if (version.number === currentVersionNumber) {
      setVersionsOpen(false);
      return;
    }
    if (!commitVersion(version.snapshot.draft, "restore", `Restored from Version ${version.number}`, version.snapshot.author)) {
      explainVersionLimit();
      setVersionsOpen(false);
      return;
    }
    editRevision.current += 1;
    setTitle(version.snapshot.title);
    setAuthor(version.snapshot.author);
    setDraft(version.snapshot.draft);
    scheduleSave();
    setVersionsOpen(false);
  };

  const validatedDraft = (value: unknown) => {
    const result = scriptDraftSchema.safeParse(value);
    if (!result.success) throw new Error("The AI response was incomplete. Your script was not changed—please try again.");
    return result.data;
  };

  const askForStartingPoint = (instruction: string) => {
    addMessage("user", instruction);
    addMessage(
      "assistant",
      isEditOnlyInstruction(instruction)
        ? "There isn’t a script to edit yet. What would you like the video to be about? Add a title or describe the topic here, and I’ll write the first draft before refining it."
        : "What would you like this video to be about? Add a clear title or describe the topic here, and I’ll write the script.",
    );
  };

  const generateFullScript = async (instruction = "Write a full script using this title and my saved preferences.") => {
    if (!canUseScriptWriter) {
      openScriptWriterPricing();
      return;
    }
    if (versionLimitReached) {
      explainVersionLimit();
      return;
    }
    if (!canGenerateFromEmptyScript(title, instruction)) {
      askForStartingPoint(instruction);
      return;
    }
    addMessage("user", instruction);
    setAiBusy(true);
    setAiStatus("Writing your script…");
    const requestRevision = editRevision.current;
    try {
      const data = await requestAi({ mode: "generate", title, brief: instruction });
      const nextDraft = validatedDraft(data.draft);
      if (editRevision.current !== requestRevision) {
        addMessage("assistant", "I finished the draft, but you edited the page while I was writing, so I didn’t replace your changes. Send the request again when you’re ready.");
        return;
      }
      if (!applyAiDraft(nextDraft)) {
        explainVersionLimit();
        return;
      }
      addMessage("assistant", "Done — I wrote the script and placed it in the editor.");
    } catch (error) {
      if (error instanceof ScriptWriterAccessRequiredError) openScriptWriterPricing();
      else addMessage("assistant", error instanceof Error ? error.message : "The script could not be generated.");
    } finally {
      setAiBusy(false);
      setAiStatus("");
    }
  };

  const runAiAction = async (instruction: string) => {
    if (!canUseScriptWriter) {
      openScriptWriterPricing();
      return;
    }
    if (versionLimitReached) {
      addMessage("user", instruction);
      explainVersionLimit();
      return;
    }
    if (!hasScript) {
      await generateFullScript(instruction);
      return;
    }
    addMessage("user", instruction);
    setAiBusy(true);
    setAiStatus("Updating your script…");
    const requestRevision = editRevision.current;
    try {
      const requestTitle = title.trim() || "Untitled script";
      const data = await requestAi({ mode: "assist", title: requestTitle, instruction, draft: { ...draft, title: requestTitle } });
      const nextDraft = validatedDraft(data.draft);
      if (editRevision.current !== requestRevision) {
        addMessage("assistant", "I finished the edit, but you changed the script while I was working, so I didn’t overwrite your newer text. Send the request again to apply it.");
        return;
      }
      if (!applyAiDraft(nextDraft)) {
        explainVersionLimit();
        return;
      }
      addMessage("assistant", data.message || "Done — I updated the script.");
    } catch (error) {
      if (error instanceof ScriptWriterAccessRequiredError) openScriptWriterPricing();
      else addMessage("assistant", error instanceof Error ? error.message : "The writing service is unavailable.");
    } finally {
      setAiBusy(false);
      setAiStatus("");
    }
  };

  const submitPrompt = async (event: React.FormEvent) => {
    event.preventDefault();
    const instruction = prompt.trim();
    if (!instruction || aiBusy) return;
    setPrompt("");
    await runAiAction(instruction);
  };

  const downloadText = (extension: string) => {
    const file = new Blob([scriptText], { type: "text/plain" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `next-video-script.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  return (
    <div className={`editor-workspace ${aiOpen ? "editor-workspace--ai-open" : ""} ${focusMode ? "editor-workspace--focus" : ""}`}>
      <header className="editor-toolbar">
        <div className="editor-toolbar__meta" aria-label="Script details">
          <span className="editor-save-state" aria-live="polite"><Check size={14} aria-hidden="true" />{saveState}</span>
          <span>{wordCount} words</span>
          <span>{readMinutes} min read</span>
          <div className="editor-version" ref={versionMenuRef}>
            <button className="editor-version__trigger" type="button" onClick={() => setVersionsOpen((value) => !value)} aria-expanded={versionsOpen} aria-haspopup="menu">
              Version {currentVersionNumber} <ChevronDown size={14} aria-hidden="true" />
            </button>
            {versionsOpen && <div className="editor-version__menu" role="menu" aria-label="Version history">
              <div className="editor-version__heading"><p>Version history</p><span>{versionChangesUsed} of {versionChangeLimit} changes</span></div>
              <div className="editor-version__list">
                {[...versions].reverse().map((version) => {
                  const isCurrent = version.number === currentVersionNumber;
                  return <button type="button" role="menuitem" aria-current={isCurrent ? "true" : undefined} key={version.number} onClick={() => restoreVersion(version)}>
                    <span>Version {version.number}{isCurrent ? " · Current" : ""}</span>
                    <small>{isCurrent ? version.label : `${versionOriginLabel(version.origin)} · Restore`}</small>
                  </button>;
                })}
              </div>
              {versionLimitReached && <Link href={scriptWriterPricingHref}>{versionChangeLimit === 0 ? "View Pro and Elite" : versionChangeLimit < 20 ? "Get 20 changes with Elite" : "View plan details"}</Link>}
            </div>}
          </div>
        </div>
        <div className="editor-toolbar__actions">
          <button className="dashboard-icon-button editor-distraction" type="button" aria-label={focusMode ? "Exit distraction-free mode" : "Distraction-free mode"} title={focusMode ? "Exit distraction-free mode" : "Distraction-free mode"} onClick={() => { setFocusMode((value) => !value); setAiOpen(false); }}><Expand size={18} aria-hidden="true" /></button>
          <div className="editor-export">
            <button className="button button--secondary button--small" type="button" onClick={() => setExportOpen((value) => !value)} aria-expanded={exportOpen}><Download size={16} aria-hidden="true" /> Export <ChevronDown size={14} aria-hidden="true" /></button>
            {exportOpen && <div className="editor-export__menu" role="menu">
              <p>Download</p>
              {[["Plain text", "txt"], ["Markdown", "md"], ["Subtitles", "srt"]].map(([label, ext]) => <button type="button" role="menuitem" key={ext} onClick={() => downloadText(ext)}>{label}<span>.{ext}</span></button>)}
              {canUseAdvancedExports ? <>
                <button type="button" role="menuitem" disabled>PDF <span>Provider setup pending</span></button>
                <button type="button" role="menuitem" disabled>Word document <span>Provider setup pending</span></button>
              </> : <>
                <Link role="menuitem" href="/dashboard/upgrade?feature=advanced_exports">PDF <span>Upgrade</span></Link>
                <Link role="menuitem" href="/dashboard/upgrade?feature=advanced_exports">Word document <span>Upgrade</span></Link>
              </>}
              <button type="button" role="menuitem" onClick={() => navigator.clipboard?.writeText(scriptText)}><Copy size={14} aria-hidden="true" /> Copy all</button>
              <button type="button" role="menuitem" onClick={() => { setExportOpen(false); setTeleprompter(true); }}><Play size={14} aria-hidden="true" /> Teleprompter view</button>
            </div>}
          </div>
          <button className="dashboard-icon-button" type="button" onClick={() => setAiOpen((value) => !value)} aria-label={aiOpen ? "Close AI assistant" : "Open AI assistant"} title={aiOpen ? "Close AI assistant" : "Open AI assistant"} aria-pressed={aiOpen}>{aiOpen ? <PanelRightClose size={19} aria-hidden="true" /> : <PanelRightOpen size={19} aria-hidden="true" />}</button>
        </div>
      </header>

      <div className="editor-stage">
        <div className="editor-canvas-wrap">
          <article className="script-document" aria-label="Script document">
            <header><p>Working draft</p><label className="sr-only" htmlFor="script-title">Script title</label><input className="script-title-input" id="script-title" value={title} onChange={(event) => { const nextTitle = event.target.value; const nextDraft = { ...draft, title: nextTitle }; setTitle(nextTitle); setDraft(nextDraft); syncCurrentVersion(nextDraft, nextTitle); markUserChanged(); }} placeholder="Untitled script" /><div className="script-author-field"><span aria-hidden="true">By</span><label className="sr-only" htmlFor="script-author">Author name</label><input id="script-author" value={author} onChange={(event) => { const nextAuthor = event.target.value; setAuthor(nextAuthor); syncCurrentVersion(draft, title, nextAuthor); scheduleSave(); }} placeholder="Add author name" maxLength={100} autoComplete="name" /></div><span>{wordCount === 0 ? "Start writing or ask the assistant for a draft" : "AI-assisted draft · review before recording"}</span></header>
            {draft.sections.map((section, index) => <ScriptSection id={`script-section-${index}`} key={`${section.label}-${index}`} label={section.label} body={section.body} onInput={(body) => { const nextDraft = { ...draft, sections: draft.sections.map((item, itemIndex) => itemIndex === index ? { ...item, body } : item) }; setDraft(nextDraft); syncCurrentVersion(nextDraft); markUserChanged(); }} />)}
          </article>
        </div>

        {aiOpen && <aside className="editor-ai" aria-label="AI writing assistant">
          <header><div><span><Sparkles size={16} aria-hidden="true" /></span><div><p>Writing assistant</p><small>Changes appear directly in your script</small></div></div></header>
          <div className="editor-ai__conversation" aria-live="polite">
            {messages.length === 0 && (hasScript
              ? <div className="editor-ai__suggestions"><p>What would you like to improve?</p><div><button type="button" onClick={() => runAiAction("Strengthen the hook")} disabled={aiBusy}>Strengthen the hook</button><button type="button" onClick={() => runAiAction("Make the script more concise")} disabled={aiBusy}>Make it more concise</button><button type="button" onClick={() => runAiAction("Add smoother transitions")} disabled={aiBusy}>Smooth the transitions</button></div></div>
              : <div className="editor-ai__empty"><p>Start with the idea.</p><span>Describe the topic, audience, and angle. One clear sentence is enough.</span></div>)}
            {messages.map((message) => <div className={`editor-ai__message editor-ai__message--${message.role}`} key={message.id}><p>{message.content}</p></div>)}
            {aiBusy && <div className="editor-ai__message editor-ai__message--assistant editor-ai__message--status"><RefreshCw className="spin" size={14} aria-hidden="true" /><p>{aiStatus}</p></div>}
            <div ref={chatEndRef} />
          </div>
          <form className="editor-ai__prompt" onSubmit={submitPrompt}><label className="sr-only" htmlFor="ai-prompt">Message the writing assistant</label><div><textarea id="ai-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={hasScript ? "Ask for a change to your script…" : "Describe your idea…"} rows={3} maxLength={1000} /><button type="submit" aria-label="Send message" disabled={aiBusy || !prompt.trim()}><Send size={17} aria-hidden="true" /></button></div></form>
        </aside>}
      </div>
      {teleprompter && <div className="teleprompter" role="dialog" aria-modal="true" aria-labelledby="teleprompter-title"><header><button type="button" onClick={() => setTeleprompter(false)}><ChevronLeft size={18} aria-hidden="true" /> Back to editor</button><h2 id="teleprompter-title">Teleprompter</h2><div><label>Text size<input type="range" min="28" max="58" value={teleSize} onChange={(event) => setTeleSize(Number(event.target.value))} /></label><label>Line spacing<input type="range" min="1.3" max="2.2" step="0.1" value={teleSpacing} onChange={(event) => setTeleSpacing(Number(event.target.value))} /></label></div></header><article style={{ fontSize: `${teleSize}px`, lineHeight: teleSpacing }}>{draft.sections.map((section, index) => <p key={index}>{section.body}</p>)}</article></div>}
    </div>
  );
}
