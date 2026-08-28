import Link from "next/link";
import { ArrowRight, CirclePlay, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectDialog } from "./connect-dialog";
import { IdeaComposer } from "./idea-composer";

export function HeroSection() {
  return (
    <section className="hero section-shell" aria-labelledby="hero-title">
      <div className="hero__copy">
        <p className="hero__context"><CirclePlay aria-hidden="true" size={17} /> Planning for YouTube creators</p>
        <h1 id="hero-title">Know what to make. Write it ready to record.</h1>
        <p className="hero__lede">
          Turn one rough idea into a focused video plan and a script you can actually say on camera. Add your channel when you want recommendations grounded in your work.
        </p>
        <div className="hero__actions">
          <Button asChild><Link href="#idea">Start with an idea <ArrowRight aria-hidden="true" size={17} /></Link></Button>
          <ConnectDialog triggerLabel="Use my channel" />
        </div>
        <div className="hero__proof-note">
          <Sparkles aria-hidden="true" size={16} />
          <span>You choose the direction before a script is written.</span>
        </div>
      </div>
      <div className="hero__workbench">
        <div className="creator-preview">
          <div className="creator-preview__topline">
            <span><i aria-hidden="true" /> New video plan</span>
            <span>Draft</span>
          </div>
          <IdeaComposer />
          <div className="creator-preview__handoff">
            <span><i aria-hidden="true" /> Your idea stays with you</span>
            <small>Next: open the script editor</small>
          </div>
        </div>
      </div>
    </section>
  );
}
