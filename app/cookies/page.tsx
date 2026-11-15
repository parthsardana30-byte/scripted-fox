import { LegalNavigation } from "@/components/legal/legal-navigation";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { pageMetadata } from "@/lib/seo";
import "../landing-youtube.css";
import "../legal.css";

export const metadata = pageMetadata({
  title: "Cookie Policy",
  description: "How Scripted Fox uses cookies and browser storage.",
  path: "/cookies",
});

export default function CookiePolicyPage() {
  return <div className="youtube-landing legal-shell">
    <SiteHeader />
    <main className="legal-page">
      <LegalNavigation />
      <p className="legal-page__eyebrow">Legal</p>
      <h1>Cookie Policy</h1>
      <p className="legal-page__updated">Effective: 13 September 2026</p>
      <div className="legal-page__content">
        <section><h2>What browser storage is</h2><p>Cookies are small files a website places in your browser. Similar technologies, including local storage, remember information between pages or visits.</p></section>
        <section><h2>What Scripted Fox uses</h2><ul><li><strong>Authentication and security:</strong> to keep you signed in, protect requests, and complete Google or YouTube connection flows.</li><li><strong>Preferences:</strong> to remember choices such as light or dark appearance.</li><li><strong>Core functionality:</strong> to maintain the state needed for account, billing, editor, and dashboard features.</li></ul></section>
        <section><h2>Third-party services</h2><p>When you choose Google Sign-In, connect YouTube, or continue to PayU checkout, those services may use cookies on their own pages under their policies. Scripted Fox does not currently use third-party advertising cookies.</p></section>
        <section><h2>Your controls</h2><p>You can delete or block cookies in your browser. Blocking essential storage may prevent sign-in, security, payments, or other product features from working. Because these items are required for requested functionality, there is no separate advertising-cookie opt-out inside Scripted Fox.</p></section>
        <section><h2>Changes and contact</h2><p>We may update this policy when our storage practices change. Questions can be sent to <a href="mailto:support@scriptedfox.com">support@scriptedfox.com</a>.</p></section>
      </div>
    </main>
    <SiteFooter />
  </div>;
}
