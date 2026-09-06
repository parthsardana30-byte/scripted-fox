import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FinalCta } from "@/components/landing/final-cta";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { OutcomeStrip } from "@/components/landing/outcome-strip";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { getLandingUser } from "@/lib/landing-user";
import "../landing-youtube.css";

export const metadata: Metadata = {
  title: "How it works",
  description: "See how Scripted Fox turns a rough YouTube idea into a focused, record-ready script.",
  alternates: { canonical: "/how-it-works" },
};

export default async function HowItWorksPage() {
  const user = await getLandingUser();

  return (
    <div className="youtube-landing landing-detail">
      <SiteHeader variant="creator" isAuthenticated={Boolean(user)} />
      <main>
        <section className="landing-detail__hero section-shell" aria-labelledby="how-page-title">
          <p className="landing-detail__kicker">How Scripted Fox works</p>
          <h1 id="how-page-title">A better script starts before the first line.</h1>
          <p>Build the promise, hook, pacing, and payoff in the right order—then turn the plan into words that sound like you.</p>
          <Button asChild><Link href="/#idea">Start with my idea <ArrowRight aria-hidden="true" size={17} /></Link></Button>
        </section>
        <OutcomeStrip />
        <HowItWorksSection />
        <FinalCta />
      </main>
      <SiteFooter variant="creator" />
    </div>
  );
}
