import { FaqSection } from "@/components/landing/faq-section";
import { FinalCta } from "@/components/landing/final-cta";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { OutcomeStrip } from "@/components/landing/outcome-strip";
import { PersonalizationSection } from "@/components/landing/personalization-section";
import { PrivacySection } from "@/components/landing/privacy-section";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { VideoPlanPreview } from "@/components/landing/video-plan-preview";
import { getAuthenticatedUser } from "@/lib/auth/session";
import "./landing-youtube.css";

export default async function Home() {
  const user = await getAuthenticatedUser();

  return (
    <div className="youtube-landing">
      <SiteHeader variant="creator" isAuthenticated={Boolean(user)} />
      <main>
        <HeroSection />
        <OutcomeStrip />
        <HowItWorksSection />
        <VideoPlanPreview />
        <PersonalizationSection />
        <PrivacySection />
        <FaqSection />
        <FinalCta />
      </main>
      <SiteFooter variant="creator" />
    </div>
  );
}
