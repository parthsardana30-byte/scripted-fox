"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, Search, Target } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { confirmYouTubeNiche, type NicheConfirmationState } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { closestNiche, nicheById, rankedNiches } from "@/lib/youtube/niches";

const initialState: NicheConfirmationState = { status: "idle" };

export function NicheConfirmationDialog({
  channelName,
  suggestedNiche,
  mode = "onboarding",
}: {
  channelName: string;
  suggestedNiche: string;
  mode?: "onboarding" | "settings";
}) {
  const [state, formAction, pending] = useActionState(confirmYouTubeNiche, initialState);
  const inferredNiche = useMemo(() => closestNiche(suggestedNiche), [suggestedNiche]);
  const [selectedId, setSelectedId] = useState(inferredNiche.id);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(mode === "onboarding");
  const reduceMotion = useReducedMotion();
  const isOnboarding = mode === "onboarding";
  const selectedNiche = nicheById(selectedId) ?? inferredNiche;
  const visibleNiches = useMemo(() => rankedNiches(query, selectedId, 24), [query, selectedId]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) {
        setSelectedId(inferredNiche.id);
        setQuery("");
      }
      setOpen(nextOpen);
    }}>
      {!isOnboarding ? (
        <DialogTrigger asChild>
          <Button variant="secondary" size="small" type="button">Change niche</Button>
        </DialogTrigger>
      ) : null}
      <DialogContent
        className={`niche-confirmation niche-confirmation--${mode}`}
      >
        <header className="niche-confirmation__header">
          <span aria-hidden="true"><Target size={20} /></span>
          <div>
            <p>Channel personalization</p>
            <DialogTitle>{isOnboarding ? "Choose your channel niche" : "Change your channel niche"}</DialogTitle>
          </div>
        </header>
        <DialogDescription className="sr-only">
          Select one niche for your channel from the searchable choices.
        </DialogDescription>

        <form action={formAction}>
          <input name="nicheId" type="hidden" value={selectedId} />
          <input name="returnPath" type="hidden" value={isOnboarding ? "/dashboard" : "/dashboard/settings"} />
          <div className="niche-confirmation__selection" aria-live="polite">
            <div>
              <span>Selected niche</span>
              <strong>{selectedNiche.label}</strong>
            </div>
            <small>{selectedId === inferredNiche.id
              ? isOnboarding ? "Suggested from your channel" : "Current niche"
              : "Your choice"}</small>
          </div>

          <label htmlFor="niche-search">Find another niche</label>
          <div className="niche-confirmation__search">
            <input
              id="niche-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search music, gaming, finance…"
              autoComplete="off"
              autoFocus
              aria-describedby="niche-results-status"
            />
            <Search size={18} aria-hidden="true" />
          </div>
          <div className="niche-confirmation__choices">
            <span className="sr-only" id="niche-results-status" aria-live="polite">
              {query ? `Showing closest matches for ${query}` : `Showing niches relevant to ${channelName}`}
            </span>
            <motion.div className="niche-confirmation__pills" role="group" aria-label="Niche choices" layout>
              <AnimatePresence initial={false} mode="popLayout">
                {visibleNiches.map((niche) => {
                  const selected = niche.id === selectedId;
                  return (
                    <motion.button
                      layout
                      key={niche.id}
                      type="button"
                      className="niche-pill"
                      aria-pressed={selected}
                      onClick={() => setSelectedId(niche.id)}
                      initial={reduceMotion ? false : { opacity: 0, scale: .94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0, scale: .94 }}
                      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 430, damping: 34, mass: .7 }}
                    >
                      <span className="niche-pill__check" aria-hidden="true">
                        {selected ? <Check size={14} /> : null}
                      </span>
                      {niche.label}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </div>

          {state.status === "error" ? (
            <p id="niche-confirmation-error" className="niche-confirmation__error" role="alert">
              {state.message}
            </p>
          ) : null}

          <footer className="niche-confirmation__footer">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving niche…" : isOnboarding ? "Confirm niche" : "Save niche"}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
