import Link from "next/link";
import { ArrowRight, CirclePlay, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectDialog } from "./connect-dialog";
import { IdeaComposer } from "./idea-composer";
import { ScriptReadyDemo } from "./script-ready-demo";
import { SubscriberCounter } from "./subscriber-counter";

export function HeroSection() {
  return (
    <section className="hero section-shell" aria-labelledby="hero-title">
      <div className="hero__copy">
        <p className="hero__context"><CirclePlay aria-hidden="true" size={17} /> Built for YouTube growth</p>
        <h1 id="hero-title">Write videos worth subscribing for.</h1>
        <p className="hero__lede">
          Turn a rough idea into a sharper hook, tighter pacing, and a payoff viewers stay for—so every upload has a better chance to earn the next subscriber.
        </p>
        <div className="hero__actions">
          <Button asChild><Link href="#idea">Write my next video <ArrowRight aria-hidden="true" size={17} /></Link></Button>
          <ConnectDialog triggerLabel="Plan from my channel" />
        </div>
        <div className="hero__proof-note">
          <Sparkles aria-hidden="true" size={16} />
          <span>Better hook. Better retention. Better chance to grow.</span>
        </div>
      </div>
      <SubscriberCounter />
      <div className="hero__workbench">
        <div className="creator-preview">
          <div className="creator-preview__topline">
            <span><i aria-hidden="true" /> New video plan</span>
            <span>Draft</span>
          </div>
          <div className="creator-preview__body">
            <ScriptReadyDemo />
            <IdeaComposer />
          </div>
          <div className="creator-preview__handoff">
            <span><i aria-hidden="true" /> Your idea stays with you</span>
            <small>Next: open the script editor</small>
          </div>
        </div>
      </div>
    </section>
  );
}
