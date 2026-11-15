import Link from "next/link";

import { LegalNavigation } from "@/components/legal/legal-navigation";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { pageMetadata } from "@/lib/seo";
import "../landing-youtube.css";
import "../legal.css";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description: "How Scripted Fox collects, uses, shares, and protects creator data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return <div className="youtube-landing legal-shell">
    <SiteHeader />
    <main className="legal-page">
      <LegalNavigation />
      <p className="legal-page__eyebrow">Legal</p>
      <h1>Privacy Policy</h1>
      <p className="legal-page__updated">Effective: 13 September 2026</p>
      <div className="legal-page__content">
        <section><h2>1. What we collect</h2><p>We collect account details such as name, email, authentication records, profile settings, support messages, and security logs. We also collect the prompts, scripts, projects, exports, preferences, and usage records needed to provide the service.</p><p>If you use Google Sign-In, Google provides basic profile information and a provider identifier. If you connect YouTube, we process the channel identity, permissions, encrypted authorisation credentials, public video information, and analytics you authorise.</p></section>
        <section><h2>2. Payments</h2><p>PayU processes payment details on its secure checkout. Scripted Fox receives transaction identifiers, plan and amount, payment status, and limited billing information needed to activate access, prevent fraud, provide support, and maintain accounting records. We do not ask you to send card numbers or CVV to us.</p></section>
        <section><h2>3. How we use information</h2><ul><li>Authenticate users and secure accounts.</li><li>Personalise ideas, trends, scripts, analytics, and creator workflows.</li><li>Process purchases and manage plan access and credits.</li><li>Respond to support, refund, privacy, and deletion requests.</li><li>Detect abuse, troubleshoot errors, and improve reliability.</li><li>Meet legal, tax, accounting, and safety obligations.</li></ul><p>We do not sell personal information.</p></section>
        <section><h2>4. AI processing</h2><p>Prompts and relevant channel context may be sent to configured AI providers to generate requested output. We limit the information sent to what is reasonably needed for the feature and do not intentionally include payment credentials. Do not place sensitive personal information in prompts unless it is necessary.</p></section>
        <section><h2>5. Service providers and disclosures</h2><p>We use service providers for hosting, databases, authentication, email delivery, payments, AI generation, and Google/YouTube integrations. They process information for their contracted function under their own security and privacy obligations. We may also disclose information when required by law, to protect users or the service, or in connection with a business reorganisation subject to appropriate safeguards.</p></section>
        <section><h2>6. Google API data</h2><p>Our use and transfer of information received from Google APIs follows the Google API Services User Data Policy, including its Limited Use requirements. You can disconnect YouTube in Scripted Fox and revoke access from your Google Account. Disconnecting removes the stored channel connection and encrypted authorisation credential, subject to limited backup and legal retention.</p></section>
        <section><h2>7. Cookies and local storage</h2><p>We use essential browser storage for sessions, security, OAuth state, preferences such as theme, and core product functions. See our <Link href="/cookies">Cookie Policy</Link> for details. We do not currently use third-party advertising cookies.</p></section>
        <section><h2>8. Retention</h2><p>We retain account and project information while your account is active and for a limited period afterward where needed for recovery, security, disputes, or legal obligations. Payment and transaction records may be kept longer for tax and accounting purposes. We delete or de-identify information when it is no longer reasonably required.</p></section>
        <section><h2>9. Security</h2><p>We use access controls, server-side secrets, encrypted YouTube credentials, transport encryption, and a database that is not directly exposed to the public internet. No system is perfectly secure, so keep your credentials private and contact us if you suspect unauthorised access.</p></section>
        <section><h2>10. Your choices and rights</h2><p>You may request access, correction, export, or deletion of your personal information, subject to applicable law and necessary identity checks. You may disconnect YouTube without deleting your account. Account deletion is available in account settings or by contacting support.</p></section>
        <section><h2>11. Children</h2><p>Scripted Fox is not directed to children who cannot legally consent to data processing in their location. If you believe a child has provided personal information without appropriate permission, contact us so we can investigate and remove it where required.</p></section>
        <section><h2>12. Changes and contact</h2><p>We may update this policy as the service or law changes and will show the effective date above. For privacy requests or grievances, email <a href="mailto:support@scriptedfox.com">support@scriptedfox.com</a>.</p></section>
      </div>
    </main>
    <SiteFooter />
  </div>;
}
