import Link from "next/link";

const legalLinks = [
  ["Terms", "/terms"],
  ["Privacy", "/privacy"],
  ["Refunds", "/refund-policy"],
  ["Cookies", "/cookies"],
] as const;

export function LegalNavigation() {
  return <nav className="legal-nav" aria-label="Legal policies">
    {legalLinks.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
  </nav>;
}
