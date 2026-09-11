"use client";

import { usePathname } from "next/navigation";
import { ScriptReadyDemo } from "@/components/landing/script-ready-demo";

export function AuthAside() {
  const pathname = usePathname();
  const showDemo = pathname === "/sign-up" || pathname === "/sign-in";

  return (
    <aside className={`auth-aside${showDemo ? " auth-aside--demo" : ""}`} aria-label={showDemo ? "See how Scripted Fox works" : "About Scripted Fox"}>
      {showDemo ? (
        <div className="auth-aside__demo-surface youtube-landing">
          <ScriptReadyDemo contextLabel="See your idea become a ready-to-record script." />
        </div>
      ) : (
        <div className="auth-aside__content">
          <p className="auth-aside__label">Your workspace</p>
          <h2>Idea to script, without losing the thread.</h2>
          <p className="auth-aside__lede">Keep recommendations, drafts, and channel context together while you plan your next upload.</p>
          <div className="auth-aside__flow" aria-label="Scripted Fox workflow">
            <span>Idea</span><i aria-hidden="true" /><span>Script</span><i aria-hidden="true" /><span>Ready to record</span>
          </div>
        </div>
      )}
    </aside>
  );
}
