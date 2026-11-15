import { LegalNavigation } from "@/components/legal/legal-navigation";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { pageMetadata } from "@/lib/seo";
import "../landing-youtube.css";
import "../legal.css";

export const metadata = pageMetadata({
  title: "Refund & Cancellation Policy",
  description: "Refund eligibility, cancellation, and payment-resolution terms for Scripted Fox.",
  path: "/refund-policy",
});

export default function RefundPolicyPage() {
  return <div className="youtube-landing legal-shell">
    <SiteHeader />
    <main className="legal-page">
      <LegalNavigation />
      <p className="legal-page__eyebrow">Billing policy</p>
      <h1>Refund &amp; Cancellation Policy</h1>
      <p className="legal-page__updated">Effective: 13 September 2026</p>
      <div className="legal-page__content">
        <section><h2>Free trial</h2><p>The Basic trial lasts seven days and does not require a payment card. There is no charge to cancel or stop using the trial.</p></section>
        <section><h2>Paid access and cancellation</h2><p>Pro and Gold purchases are prepaid for the one-month or annual term selected at checkout. Unless checkout clearly states otherwise and you expressly approve recurring billing, payments do not renew automatically. You can stop using the service or delete your account at any time, but deletion does not itself create a refund.</p></section>
        <section><h2>When a refund may be available</h2><p>Contact us within seven calendar days of purchase if you experienced a duplicate charge, an unauthorised transaction, payment without plan activation, or a material service defect that we cannot reasonably correct. We will review account usage, transaction status, and the circumstances of the request. Your mandatory rights for deficient, misdescribed, or unlawfully supplied services remain unaffected.</p></section>
        <section><h2>Generally non-refundable items</h2><ul><li>Change-of-mind requests after substantial use of AI credits, generated scripts, research, exports, or other paid features.</li><li>Unused time remaining in a prepaid term after voluntary cancellation.</li><li>Expired plans or credits, promotional access, and free trials.</li><li>Third-party fees or currency-conversion charges that Scripted Fox did not receive.</li></ul><p>We may still approve an exception where fair, or provide a remedy where required by applicable law.</p></section>
        <section><h2>How to request a refund</h2><p>Email <a href="mailto:support@scriptedfox.com">support@scriptedfox.com</a> from your account email with the plan, purchase date, reason, and PayU transaction ID. Never send a card number, CVV, password, or OTP. We aim to acknowledge requests within 48 hours and resolve them within seven business days, although complex payment investigations can take longer.</p></section>
        <section><h2>Approved refunds</h2><p>Approved refunds are returned to the original payment method through PayU. Banks and payment providers commonly need additional processing time after approval; the final credit date is controlled by your provider. Access or credits related to a refunded payment may be removed.</p></section>
        <section><h2>Failed or pending payments</h2><p>If money is debited but access is not activated, do not pay repeatedly. Send us the transaction ID so we can verify the payment. A failed or reversed payment may be automatically returned by the bank or payment provider.</p></section>
        <section><h2>Digital service—no shipping</h2><p>Scripted Fox is a digital service. No physical product is shipped, so shipping, delivery, exchange, and return-shipping terms do not apply.</p></section>
        <section><h2>Chargebacks and statutory remedies</h2><p>Please contact us first so we can investigate quickly. Nothing in this policy limits any chargeback right or consumer remedy available under applicable law.</p></section>
      </div>
    </main>
    <SiteFooter />
  </div>;
}
