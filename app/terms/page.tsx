import type { Metadata } from "next";

import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import "../landing-youtube.css";
import "../legal.css";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing access to and use of Scripted Fox.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <div className="youtube-landing legal-shell">
    <SiteHeader />
    <main className="legal-page">
      <p className="legal-page__eyebrow">Legal</p>
      <h1>Terms of Service</h1>
      <p className="legal-page__updated">Last updated: 30 August 2026</p>
      <div className="legal-page__content">
        <section>
          <h2>Using Scripted Fox</h2>
          <p>You must provide accurate account information, keep your login secure, and use the service only in compliance with applicable law. You are responsible for activity performed through your account.</p>
        </section>
        <section>
          <h2>Your content</h2>
          <p>You retain ownership of the ideas, plans, scripts, and other content you submit or create. You grant Scripted Fox the limited permission needed to process that content and provide the service.</p>
        </section>
        <section>
          <h2>Google and YouTube connections</h2>
          <p>Google Sign-In and optional YouTube features are governed by Google&apos;s applicable terms. You may disconnect access at any time. Scripted Fox is not affiliated with or endorsed by Google or YouTube.</p>
        </section>
        <section>
          <h2>Acceptable use</h2>
          <p>You may not misuse the service, attempt unauthorised access, disrupt its operation, scrape it at scale, or use it to violate another person&apos;s rights.</p>
        </section>
        <section>
          <h2>Availability and generated output</h2>
          <p>The service may change or experience interruptions. Generated suggestions and scripts can contain errors; review all output before publishing or relying on it. Scripted Fox does not guarantee channel performance, revenue, or other results.</p>
        </section>
        <section>
          <h2>Suspension and termination</h2>
          <p>We may suspend access when reasonably necessary to protect the service, users, or legal compliance. You may stop using Scripted Fox and request account deletion at any time.</p>
        </section>
        <section>
          <h2>Contact</h2>
          <p>Questions about these terms can be sent to <a href="mailto:parthsardana700@gmail.com">parthsardana700@gmail.com</a>.</p>
        </section>
      </div>
    </main>
    <SiteFooter />
  </div>;
}
