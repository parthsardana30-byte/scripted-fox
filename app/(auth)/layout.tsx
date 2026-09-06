import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import "./auth.css";
import "./creator-auth.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="auth-shell__form-side" aria-label="Account access">
        <header className="auth-header">
          <Link className="auth-wordmark" href="/" aria-label="Scripted Fox home">
            <BrandLogo />
          </Link>
          <ThemeToggle />
        </header>
        <div className="auth-shell__content">{children}</div>
      </section>

      <aside className="auth-aside" aria-label="About Scripted Fox">
        <div className="auth-aside__content">
          <p className="auth-aside__label">Your workspace</p>
          <h2>Idea to script, without losing the thread.</h2>
          <p className="auth-aside__lede">Keep recommendations, drafts, and channel context together while you plan your next upload.</p>
          <div className="auth-aside__flow" aria-label="Scripted Fox workflow">
            <span>Idea</span><i aria-hidden="true" /><span>Script</span><i aria-hidden="true" /><span>Ready to record</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
