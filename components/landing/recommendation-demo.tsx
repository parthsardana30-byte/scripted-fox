"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronDown, Eye, LineChart, Radar } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { recommendation } from "@/content/landing";

const sourceIcon = {
  channel: LineChart,
  audience: Eye,
  niche: Radar,
};

export function RecommendationDemo() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section id="example" className="recommendation section-shell" aria-labelledby="recommendation-title">
      <header className="section-heading section-heading--compact">
        <h2 id="recommendation-title">Know what to make—and why.</h2>
        <p>This demonstration uses realistic example data. It does not represent a live channel analysis.</p>
      </header>
      <article className="recommendation-card">
        <div className="recommendation-card__main">
          <span className="demo-label">Example recommendation</span>
          <h3>{recommendation.title}</h3>
          <p>{recommendation.angle}</p>
          <div className="recommendation-card__actions">
            <Button asChild>
              <Link href={`/create?idea=${encodeURIComponent(recommendation.title)}`}>
                Build my Video Plan <ArrowRight aria-hidden="true" size={17} />
              </Link>
            </Button>
            <button
              className="why-button"
              type="button"
              aria-expanded={expanded}
              aria-controls="recommendation-evidence"
              onClick={() => setExpanded((value) => !value)}
            >
              Why this? <ChevronDown aria-hidden="true" size={17} data-open={expanded || undefined} />
            </button>
          </div>
        </div>
        <div className="recommendation-card__summary" aria-label="Recommendation evidence summary">
          {recommendation.evidence.map((item) => {
            const Icon = sourceIcon[item.source];
            return (
              <div key={item.source} className="evidence-summary-row">
                <Icon aria-hidden="true" size={17} />
                <span>{item.label}</span>
                <strong>Supports this angle</strong>
              </div>
            );
          })}
        </div>
        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              id="recommendation-evidence"
              className="recommendation-card__evidence"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {recommendation.evidence.map((item) => {
                const Icon = sourceIcon[item.source];
                return (
                  <div key={item.source} className="evidence-detail">
                    <Icon aria-hidden="true" size={18} />
                    <div><strong>{item.label}</strong><p>{item.detail}</p></div>
                  </div>
                );
              })}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </article>
    </section>
  );
}
