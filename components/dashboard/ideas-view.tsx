"use client";

import { ArrowRight, Bookmark, BookmarkCheck, Lightbulb, RefreshCw, RotateCcw, Sparkles, ThumbsDown, TrendingUp, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { scriptDraftSchema, type ScriptDraft } from "@/lib/ai/types";
import { dashboardSnapshot } from "@/lib/dashboard-mocks";
import { dashboardService } from "@/lib/dashboard-services";
import { pricingHref } from "@/lib/billing/plans";
import type { IdeaRecommendation } from "@/types/dashboard";
import { PageHeader } from "./page-header";

type IdeasTab = "Recommended" | "Saved";
type RecommendationSource = "loading" | "live" | "demo" | "error";

export function IdeasView({ canUseScriptWriter = true }: { canUseScriptWriter?: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<IdeasTab>("Recommended");
  const [ideas, setIdeas] = useState(dashboardSnapshot.recommendations.slice(0, 3));
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<{ idea: IdeaRecommendation; wasSaved: boolean } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [generatingIds, setGeneratingIds] = useState<string[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [source, setSource] = useState<RecommendationSource>(process.env.NODE_ENV === "test" ? "demo" : "loading");
  const dismissTimer = useRef<number | undefined>(undefined);

  const fetchRecommendations = useCallback(async (excludeTitles: string[], append: boolean) => {
    const response = await fetch("/api/ideas/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ excludeTitles }),
    });
    const payload = await response.json() as { ideas?: IdeaRecommendation[]; error?: string };
    if (!response.ok || !payload.ideas) throw new Error(payload.error || "Recommendations are unavailable.");
    setIdeas((current) => append
      ? [...current, ...payload.ideas!.filter((idea) => !current.some((item) => item.id === idea.id))]
      : payload.ideas!);
    setSource("live");
  }, []);

  useEffect(() => () => window.clearTimeout(dismissTimer.current), []);
  useEffect(() => {
    if (process.env.NODE_ENV === "test") return;
    const timer = window.setTimeout(() => {
      void fetchRecommendations([], false).catch(() => setSource("error"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchRecommendations]);

  const startUndoTimer = () => {
    window.clearTimeout(dismissTimer.current);
    dismissTimer.current = window.setTimeout(() => setDismissed(null), 6000);
  };

  const dismissIdea = (idea: IdeaRecommendation) => {
    setIdeas((items) => items.filter((item) => item.id !== idea.id));
    setSavedIds((items) => items.filter((id) => id !== idea.id));
    setDismissed({ idea, wasSaved: savedIds.includes(idea.id) });
    startUndoTimer();
  };

  const undoDismiss = () => {
    if (dismissed) {
      setIdeas((items) => [dismissed.idea, ...items]);
      if (dismissed.wasSaved) setSavedIds((items) => [...items, dismissed.idea.id]);
    }
    window.clearTimeout(dismissTimer.current);
    setDismissed(null);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await fetchRecommendations(ideas.map((idea) => idea.title), true);
    } catch {
      const nextIdeas = await dashboardService.getMoreIdeas();
      setIdeas((current) => [...current, ...nextIdeas.filter((idea) => !current.some((item) => item.id === idea.id))]);
      setSource("error");
    } finally {
      setLoadingMore(false);
    }
  };

  const generate = async (idea: IdeaRecommendation) => {
    if (generatingIds.includes(idea.id)) return;
    if (!canUseScriptWriter) {
      router.push(pricingHref("ai_script_writer", "/dashboard/ideas"));
      return;
    }
    setGeneratingIds((ids) => [...ids, idea.id]);
    setGenerationError(null);
    try {
      const response = await fetch("/api/ai/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "generate",
          title: idea.title,
          brief: `Angle: ${idea.angle}\nFormat: ${idea.format}\nWhy this idea was recommended: ${idea.reason}`,
        }),
      });
      const payload = await response.json() as { draft?: ScriptDraft; error?: string };
      if (response.status === 402) {
        router.push(pricingHref("ai_script_writer", "/dashboard/ideas"));
        return;
      }
      if (!response.ok) throw new Error(payload.error || "The script could not be generated.");
      const parsedDraft = scriptDraftSchema.safeParse(payload.draft);
      if (!parsedDraft.success) throw new Error("The generated script was incomplete.");
      window.sessionStorage.setItem("next-video:draft", JSON.stringify(parsedDraft.data));
      router.push("/dashboard/editor/new-script");
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "The script could not be generated.");
    } finally {
      setGeneratingIds((ids) => ids.filter((id) => id !== idea.id));
    }
  };

  const visibleIdeas = tab === "Saved" ? ideas.filter((idea) => savedIds.includes(idea.id)) : ideas;

  return (
    <div className="dashboard-page dashboard-ideas">
      <PageHeader eyebrow="Channel-aware planning" title="Ideas worth making next" description="A short list based on your channel patterns and current YouTube interest—not a wall of generic prompts." actions={<span className="demo-data-label">{source === "live" ? "Live YouTube signals" : source === "loading" ? "Checking current signals…" : source === "error" ? "Using fallback ideas" : "Demo channel data"}</span>} />

      <div className="dashboard-subtabs" role="tablist" aria-label="Idea lists">
        {(["Recommended", "Saved"] as IdeasTab[]).map((item) => <button key={item} role="tab" type="button" aria-selected={tab === item} onClick={() => setTab(item)}>{item}</button>)}
      </div>

      {visibleIdeas.length > 0 ? <div className="idea-list">
        {visibleIdeas.map((idea, index) => {
          const saved = savedIds.includes(idea.id);
          const isGenerating = generatingIds.includes(idea.id);
          return <article className="idea-row" key={idea.id}>
            <div className="idea-row__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
            <div className="idea-row__main">
              <p className="dashboard-kicker">{idea.format}</p>
              <h2>{idea.title}</h2>
              <p className="idea-row__angle">{idea.angle}</p>
              <div className="idea-row__why"><strong>Why this could work</strong><p>{idea.reason}</p></div>
            </div>
            <div className="idea-row__evidence" aria-label="Supporting evidence">
              {idea.evidence.map((item) => <div key={item.label}><span>{item.source === "Your channel" ? <UsersRound size={14} aria-hidden="true" /> : <TrendingUp size={14} aria-hidden="true" />}{item.source}</span><strong>{item.value}</strong><small>{item.label}</small></div>)}
            </div>
            <div className="idea-row__actions">
              <button className="button button--primary button--small" type="button" onClick={() => generate(idea)} disabled={isGenerating}>{isGenerating ? <><RefreshCw className="spin" size={15} aria-hidden="true" /> Preparing…</> : <><Sparkles size={15} aria-hidden="true" /> Generate script</>}</button>
              <button className="button button--secondary button--small" type="button" onClick={() => setSavedIds((items) => saved ? items.filter((id) => id !== idea.id) : [...items, idea.id])} aria-pressed={saved}>{saved ? <BookmarkCheck size={15} aria-hidden="true" /> : <Bookmark size={15} aria-hidden="true" />}{saved ? "Saved" : "Save for later"}</button>
              <button className="idea-row__dismiss" type="button" onClick={() => dismissIdea(idea)}><ThumbsDown size={14} aria-hidden="true" /> Not interested</button>
            </div>
          </article>;
        })}
      </div> : <div className="dashboard-empty"><Lightbulb size={24} aria-hidden="true" /><h2>{tab === "Saved" ? "No saved ideas yet" : "You’re caught up"}</h2><p>{tab === "Saved" ? "Save a recommendation and it will stay here without adding another sidebar page." : "Ask for more ideas when you are ready."}</p>{tab === "Saved" && <button className="button button--secondary button--small" type="button" onClick={() => setTab("Recommended")}>Browse recommendations</button>}</div>}

      {tab === "Recommended" && <div className="more-ideas"><p>Want a wider set of directions?</p><button className="button button--secondary" type="button" onClick={loadMore} disabled={loadingMore || source === "loading"}>{loadingMore ? <><RefreshCw className="spin" size={17} aria-hidden="true" /> Finding ideas…</> : <>More ideas <ArrowRight size={17} aria-hidden="true" /></>}</button></div>}

      {dismissed && <div className="dashboard-toast" role="status" onMouseEnter={() => window.clearTimeout(dismissTimer.current)} onMouseLeave={startUndoTimer} onFocus={() => window.clearTimeout(dismissTimer.current)} onBlur={startUndoTimer}><span>“{dismissed.idea.title}” removed</span><button type="button" onClick={undoDismiss}><RotateCcw size={15} aria-hidden="true" /> Undo</button></div>}
      {generationError && <div className="dashboard-toast" role="alert"><span>{generationError}</span><button type="button" onClick={() => setGenerationError(null)}>Dismiss</button></div>}
    </div>
  );
}
