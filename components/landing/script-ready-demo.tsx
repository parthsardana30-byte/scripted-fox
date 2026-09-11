"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BellRing, FileText, Lightbulb, Magnet, Sparkles, type LucideIcon } from "lucide-react";

type DemoStage = {
  label: string;
  question: string;
  answer: string;
  icon: LucideIcon;
  topic?: string;
};

const stages: DemoStage[] = [
  {
    label: "Topic",
    question: "Don’t know what to make?",
    answer: "We’ve got your next idea.",
    icon: Lightbulb,
  },
  {
    label: "Angle",
    question: "Need a sharper angle?",
    answer: "We found the tension viewers will click for.",
    icon: Sparkles,
  },
  {
    label: "Hook",
    question: "Need them to keep watching?",
    answer: "Your opening promise is locked in.",
    icon: Magnet,
  },
  {
    label: "Script",
    question: "Don’t know what to say?",
    answer: "We’ve got the full script.",
    icon: FileText,
  },
  {
    label: "Ready",
    question: "Today’s script is ready.",
    answer: "Hook, structure, and CTA included.",
    icon: BellRing,
    topic: "Why viewers leave in the first 30 seconds",
  },
];

type ScriptReadyDemoProps = {
  contextLabel?: string;
};

export function ScriptReadyDemo({ contextLabel = "Scripted Fox flow" }: ScriptReadyDemoProps) {
  const [activeStage, setActiveStage] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;

    const timer = window.setInterval(() => {
      setActiveStage((current) => (current + 1) % stages.length);
    }, 2_650);

    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const visibleStage = reduceMotion ? stages.length - 1 : activeStage;
  const stage = stages[visibleStage];
  const Icon = stage.icon;

  return (
    <section
      className={`script-ready-demo${stage.topic ? " script-ready-demo--ready" : ""}`}
      aria-label="From no topic to a ready YouTube script"
    >
      <div className="script-ready-demo__topline">
        <span>{contextLabel}</span>
        <div className="script-ready-demo__steps" aria-label="Demo steps">
          {stages.map((item, index) => (
            <button
              type="button"
              key={item.label}
              aria-label={`Show ${item.label.toLowerCase()} step`}
              aria-pressed={visibleStage === index}
              onClick={() => setActiveStage(index)}
            />
          ))}
        </div>
      </div>

      <div className="script-ready-demo__stage">
        <div className="script-ready-demo__card-shell">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              className="script-ready-demo__message"
              key={stage.label}
              initial={reduceMotion ? false : { opacity: 0, y: 14, filter: "blur(5px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="script-ready-demo__icon" aria-hidden="true"><Icon size={20} /></div>
              <p className="script-ready-demo__label">{stage.topic ? "Notification" : `${visibleStage + 1} · ${stage.label}`}</p>
              <h3>{stage.question}</h3>
              <p className="script-ready-demo__answer">{stage.answer}</p>
              {stage.topic ? (
                <div className="script-ready-demo__topic">
                  <span>Your topic</span>
                  <strong>{stage.topic}</strong>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="script-ready-demo__progress" aria-hidden="true">
        <motion.i
          key={visibleStage}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: reduceMotion ? 0 : 2.55, ease: "linear" }}
        />
      </div>
    </section>
  );
}
