import type { Metadata } from "next";
import { HeroSection } from "@/components/landing/hero-section";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { getLandingUser } from "@/lib/landing-user";
import "./landing-youtube.css";

export const metadata: Metadata = {
  title: { absolute: "Scripted Fox — AI YouTube Script Writer & Idea Planner" },
  description: "Discover channel-matched YouTube topics, analyze trend signals, and turn your next idea into a focused, record-ready script with Scripted Fox.",
  alternates: { canonical: "/" },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Scripted Fox",
  url: "https://scriptedfox.com",
  description: "AI-powered YouTube topic research, planning, and script writing for creators.",
};

export default async function Home() {
  const user = await getLandingUser();

  return (
    <div className="youtube-landing youtube-landing--minimal">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <SiteHeader variant="creator" isAuthenticated={Boolean(user)} />
      <main>
        <HeroSection />
      </main>
      <SiteFooter variant="creator" />
    </div>
  );
}
