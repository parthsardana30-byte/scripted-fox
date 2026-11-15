"use client";

import { ArrowLeft, ArrowRight, FilePenLine, Languages, Lightbulb, SlidersHorizontal, Zap } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { saveScriptHubSetup, type ScriptSetupState } from "@/app/dashboard/editor/actions";
import { EditorWorkspace } from "@/components/dashboard/editor-workspace";

type ScriptMode = "own" | "ai";
export type ScriptSetupValues = {
  language: string;
  market: string;
  tone: string;
  videoLength: string;
  detailLevel: string;
  openingStyle: string;
  format: string;
};

const initialActionState: ScriptSetupState = { status: "idle" };

export function ScriptHub({
  initialSetupComplete,
  initialValues,
  initialPrompt,
  canUseAdvancedExports,
  canUseScriptWriter,
  versionChangeLimit,
}: {
  initialSetupComplete: boolean;
  initialValues: ScriptSetupValues;
  initialPrompt: string;
  canUseAdvancedExports: boolean;
  canUseScriptWriter: boolean;
  versionChangeLimit: number;
}) {
  const [mode, setMode] = useState<ScriptMode | null>(initialPrompt ? "ai" : null);
  const [showSetup, setShowSetup] = useState(Boolean(initialPrompt) && !initialSetupComplete);
  const [scriptBrief, setScriptBrief] = useState(initialPrompt);
  const [state, formAction, pending] = useActionState(saveScriptHubSetup, initialActionState);
  const setupComplete = initialSetupComplete || state.status === "success";
  const setupVisible = showSetup && state.status !== "success";

  const chooseMode = (nextMode: ScriptMode) => {
    setMode(nextMode);
    setShowSetup(nextMode === "own" || !setupComplete);
  };
  if (mode && setupComplete && !setupVisible) {
    return <EditorWorkspace
      persistProjects
      canUseAdvancedExports={canUseAdvancedExports}
      canUseScriptWriter={canUseScriptWriter}
      versionChangeLimit={versionChangeLimit}
      returnPath="/dashboard/editor"
      initialPrompt={mode === "own" ? scriptBrief : initialPrompt}
      initialAiOpen={mode === "ai" || mode === "own"}
      autoGenerateInitialPrompt={mode === "own"}
    />;
  }

  if (mode && setupVisible) {
    return <div className="dashboard-page script-hub script-hub--setup">
      <button className="script-hub__back" type="button" onClick={() => { setMode(null); setShowSetup(false); }}><ArrowLeft size={17} aria-hidden="true" /> Back</button>
      <header className="script-hub__setup-heading">
        <span><SlidersHorizontal size={19} aria-hidden="true" /> {mode === "own" ? "8 quick questions" : "One-time setup"}</span>
        <h1>{mode === "own" ? "Tell us what you want to create." : "Make every script sound like you."}</h1>
        <p>{mode === "own" ? "Answer these before we write. AI will turn your topic and choices into a complete first draft." : "Set this once. Scripted Fox will use it for every new draft, and you can change it later in Settings."}</p>
      </header>
      <form className="script-setup" action={formAction} onSubmit={(event) => {
        if (mode !== "own") return;
        const answers = new FormData(event.currentTarget);
        const topic = String(answers.get("topic") ?? "").trim();
        setScriptBrief("Write a complete " + String(answers.get("format")) + " script about '" + topic + "'. Language: " + String(answers.get("language")) + ". Audience: " + String(answers.get("market")) + ". Tone: " + String(answers.get("tone")) + ". Target length: " + String(answers.get("videoLength")) + ". Opening style: " + String(answers.get("openingStyle")) + ". Detail level: " + String(answers.get("detailLevel")) + ".");
      }}>
        <div className="script-setup__progress"><span>01</span><i /><strong>YOUR SCRIPT DNA</strong></div>
        <div className="script-setup__grid">
          {mode === "own" && <label className="script-setup__wide"><span>What is your script about?</span><input name="topic" type="text" required maxLength={180} placeholder="Enter your topic or video idea" autoFocus /></label>}
          <label><span>Primary language</span><select name="language" defaultValue={initialValues.language}><option value="en">English</option><option value="hi">Hindi</option><option value="hinglish">Hinglish</option></select></label>
          <label><span>Audience</span><select name="market" defaultValue={initialValues.market}><option value="IN">India</option><option value="GLOBAL">Worldwide</option></select></label>
          <label><span>Voice & tone</span><select name="tone" defaultValue={initialValues.tone}><option value="clear">Clear & conversational</option><option value="direct">Direct & concise</option><option value="educational">Warm & educational</option><option value="energetic">High-energy creator</option></select></label>
          <label><span>Content format</span><select name="format" defaultValue={initialValues.format}><option value="youtube">YouTube video</option><option value="shorts">YouTube Short</option><option value="reel">Instagram Reel</option></select></label>
          <label><span>Target length</span><select name="videoLength" defaultValue={initialValues.videoLength}><option value="shorts">Under 60 seconds</option><option value="under-5">Under 5 minutes</option><option value="7-10">7–10 minutes</option><option value="10-15">10–15 minutes</option></select></label>
          <label><span>Opening style</span><select name="openingStyle" defaultValue={initialValues.openingStyle}><option value="hook">Strong hook</option><option value="value-first">Value first</option><option value="story">Short story</option></select></label>
          <label className="script-setup__wide"><span>Script detail</span><select name="detailLevel" defaultValue={initialValues.detailLevel}><option value="lean">Lean — key beats only</option><option value="balanced">Balanced — complete, natural script</option><option value="detailed">Detailed — full notes and transitions</option></select></label>
        </div>
        <div className="script-setup__footer">
          <p className={state.status === "error" ? "is-error" : ""} role="status">{state.message ?? <><Languages size={16} aria-hidden="true" /> {mode === "own" ? "AI will use all 8 answers for your first draft" : "Used by your AI drafts and recommendations"}</>}</p>
          <button type="submit" disabled={pending}>{pending ? "Preparing your script…" : <>{mode === "own" ? "Generate my script" : "Save & get my script"}<ArrowRight size={18} aria-hidden="true" /></>}</button>
        </div>
      </form>
    </div>;
  }

  return <div className="dashboard-page script-hub">
    <header className="script-hub__hero">
      <h1><span>Script</span><span> Hub</span></h1>
      <p>Choose how you want to start.</p>
    </header>
    <div className="script-hub__choices">
      <button className="script-choice script-choice--own" type="button" onClick={() => chooseMode("own")}>
        <span className="script-choice__icon script-choice__icon--guided"><FilePenLine className="script-choice__primary-icon" size={30} aria-hidden="true" /><Zap className="script-choice__accent-icon" size={13} aria-hidden="true" /></span>
        <strong>Create your own script</strong>
        <ArrowRight className="script-choice__arrow" size={28} aria-hidden="true" />
      </button>
      <Link className="script-choice script-choice--ai" href="/dashboard/ideas">
        <span className="script-choice__icon"><Lightbulb size={31} strokeWidth={2.1} aria-hidden="true" /></span>
        <strong>Get a script</strong>
        <ArrowRight className="script-choice__arrow" size={28} aria-hidden="true" />
      </Link>
    </div>
  </div>;
}
