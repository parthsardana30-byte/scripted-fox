import type { Metadata } from "next";

import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import "../landing-youtube.css";
import "../legal.css";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Scripted Fox collects, uses, and protects account and creator data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <div className="youtube-landing legal-shell">
    <SiteHeader />
    <main className="legal-page">
      <p className="legal-page__eyebrow">Legal</p>
      <h1>Privacy Policy</h1>
      <p className="legal-page__updated">Last updated: 30 August 2026</p>
      <div className="legal-page__content">
        <section>
          <h2>What we collect</h2>
          <p>When you create a Scripted Fox account, we collect your name, email address, encrypted authentication records, and optional profile settings. If you use Google Sign-In, Google provides your name, email address, profile image, and a provider identifier.</p>
          <p>If you connect a YouTube channel, we store the channel details, permissions you grant, encrypted refresh credentials, and analytics needed to provide planning and writing features.</p>
        </section>
        <section>
          <h2>How we use data</h2>
          <ul>
            <li>To authenticate you and keep your account secure.</li>
            <li>To personalise video ideas, plans, scripts, and creator settings.</li>
            <li>To operate, troubleshoot, and improve Scripted Fox.</li>
            <li>To prevent abuse and enforce usage limits.</li>
          </ul>
          <p>We do not sell your personal information.</p>
        </section>
        <section>
          <h2>Storage and security</h2>
          <p>Application and account data is stored in a private PostgreSQL database on our VPS. Access credentials are kept server-side, sensitive YouTube credentials are encrypted, and the database is not exposed directly to the public internet.</p>
        </section>
        <section>
          <h2>Google data</h2>
          <p>Our use and transfer of information received from Google APIs follows the Google API Services User Data Policy, including its Limited Use requirements. You can revoke Scripted Fox access at any time from your Google Account permissions.</p>
        </section>
        <section>
          <h2>Retention and your choices</h2>
          <p>We keep account data while your account is active or as needed to provide the service. You may request access, correction, or deletion of your personal data. Disconnecting YouTube removes the stored connection and its encrypted credential.</p>
        </section>
        <section>
          <h2>Contact</h2>
          <p>For privacy questions or account deletion requests, email <a href="mailto:parthsardana700@gmail.com">parthsardana700@gmail.com</a>.</p>
        </section>
      </div>
    </main>
    <SiteFooter />
  </div>;
}
