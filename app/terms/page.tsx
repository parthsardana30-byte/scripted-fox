import Link from "next/link";

import { LegalNavigation } from "@/components/legal/legal-navigation";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { pageMetadata } from "@/lib/seo";
import "../landing-youtube.css";
import "../legal.css";

export const metadata = pageMetadata({
  title: "Terms of Service",
  description: "Terms governing access to and use of Scripted Fox.",
  path: "/terms",
});

export default function TermsPage() {
  return <div className="youtube-landing legal-shell">
    <SiteHeader />
    <main className="legal-page">
      <LegalNavigation />
      <p className="legal-page__eyebrow">Legal</p>
      <h1>Terms of Service</h1>
      <p className="legal-page__updated">Effective: 13 September 2026</p>
      <div className="legal-page__content">
        <section><h2>1. Agreement and eligibility</h2><p>These terms govern your use of Scripted Fox. By creating an account, purchasing a plan, or using the service, you agree to them. You must be legally able to enter this agreement and provide accurate account information.</p></section>
        <section><h2>2. Accounts and security</h2><p>You are responsible for activity through your account and for keeping your credentials and verification codes secure. Tell us promptly if you believe your account has been accessed without permission.</p></section>
        <section><h2>3. The service</h2><p>Scripted Fox provides creator research, channel-aware recommendations, analytics, planning, AI-assisted writing, editing, and export tools. Features, limits, and supported integrations may change as the product develops. We will not reduce paid access during an already purchased term without a reasonable substitute or remedy required by law.</p></section>
        <section><h2>4. Your content and licence</h2><p>You retain ownership of the prompts, channel materials, scripts, and other content you provide or create. You give us a limited, non-exclusive licence to host, process, transmit, and display that content only as needed to operate, secure, and improve the service. You confirm that you have the rights needed to submit your content.</p></section>
        <section><h2>5. AI-generated output</h2><p>AI output may be incomplete, inaccurate, similar to material generated for others, or unsuitable for your intended use. You must review facts, rights, disclosures, and platform rules before publishing. Scripted Fox does not guarantee views, subscribers, revenue, ranking, originality, or channel performance.</p></section>
        <section><h2>6. Google and YouTube</h2><p>Google Sign-In and optional YouTube connections are governed by Google&apos;s and YouTube&apos;s applicable terms. Access is read-only where shown, and you may disconnect it from Scripted Fox or revoke it in your Google Account. Scripted Fox is not endorsed by Google or YouTube.</p></section>
        <section><h2>7. Plans, payments, and credits</h2><p>Prices, taxes, plan duration, credit allowances, and included features are shown before payment. Paid access begins only after PayU confirms the transaction. Unless checkout clearly states otherwise and you expressly consent, purchases are prepaid for the selected one-month or annual term and do not renew automatically. Credits have no cash value, cannot be transferred, and expire with the applicable plan or as displayed when purchased.</p></section>
        <section><h2>8. Cancellations and refunds</h2><p>Our <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link> forms part of these terms. Nothing in these terms removes a refund, chargeback, or consumer remedy that cannot legally be excluded.</p></section>
        <section><h2>9. Acceptable use</h2><p>You may not break the law; infringe intellectual-property, privacy, publicity, or other rights; generate abusive or deceptive material; bypass plan limits; scrape or reverse engineer the service; introduce malicious code; disrupt the service; or attempt unauthorised access to accounts, systems, or data.</p></section>
        <section><h2>10. Our intellectual property</h2><p>Scripted Fox, its brand, interface, software, templates, and service materials are owned by us or our licensors. These terms give you a personal, limited, revocable right to use the service, not ownership of it.</p></section>
        <section><h2>11. Availability and changes</h2><p>We work to keep the service available, but maintenance, security incidents, providers, network conditions, quotas, or events beyond reasonable control may interrupt it. We may update features or these terms. Material changes will be communicated through the service or by email when reasonably practical.</p></section>
        <section><h2>12. Suspension and termination</h2><p>We may limit or suspend access to protect users, enforce these terms, respond to non-payment, or meet legal obligations. You may stop using the service and request account deletion at any time. Clauses that reasonably need to survive termination—including payment, ownership, disclaimers, and liability terms—will continue.</p></section>
        <section><h2>13. Disclaimers and liability</h2><p>To the maximum extent allowed by law, the service is provided “as available” without implied guarantees beyond those that cannot legally be excluded. We are not liable for indirect, incidental, special, or consequential loss, lost profits, or lost data arising from use of the service. Our aggregate liability for a claim will not exceed the amount you paid Scripted Fox during the three months before the event giving rise to that claim. These limits do not apply where prohibited by law, including liability that cannot be limited or excluded.</p></section>
        <section><h2>14. Governing law and disputes</h2><p>These terms are governed by the laws of India. Courts at the operator&apos;s registered place of business will have jurisdiction, except where applicable consumer law permits you to bring a claim before another competent forum. Please contact us first so we can try to resolve the issue promptly.</p></section>
        <section><h2>15. Contact</h2><p>Questions, notices, or grievances can be sent to <a href="mailto:support@scriptedfox.com">support@scriptedfox.com</a>. Include your account email and a safe reference such as a transaction ID; never send card numbers, CVV, passwords, or OTPs.</p></section>
      </div>
    </main>
    <SiteFooter />
  </div>;
}
