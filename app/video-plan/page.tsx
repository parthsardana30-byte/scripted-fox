import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PersonalizationSection } from "@/components/landing/personalization-section";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { VideoPlanPreview } from "@/components/landing/video-plan-preview";
import { getLandingUser } from "@/lib/landing-user";
import "../landing-youtube.css";

export const metadata: Metadata = {
  title: "Video plan · Scripted Fox",
  description: "See how Scripted Fox plans the hook, structure, pacing, and payoff before writing your YouTube script.",
};

export default async function VideoPlanPage() {
  const user = await getLandingUser();

  return (
    <div className="youtube-landing landing-detail">
      <SiteHeader variant="creator" isAuthenticated={Boolean(user)} />
      <main>
        <section className="landing-detail__hero section-shell" aria-labelledby="plan-page-title">
          <p className="landing-detail__kicker">Your video, before the draft</p>
          <h1 id="plan-page-title">Know why viewers should keep watching.</h1>
          <p>Lock the angle, opening, story beats, and viewer payoff before the script gets long. Less filler, more forward motion.</p>
          <Button asChild><Link href="/#idea">Plan my next video <ArrowRight aria-hidden="true" size={17} /></Link></Button>
        </section>
        <VideoPlanPreview />
        <PersonalizationSection />
      </main>
      <SiteFooter variant="creator" />
    </div>
  );
}
