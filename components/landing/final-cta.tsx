import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectDialog } from "./connect-dialog";

export function FinalCta() {
  return (
    <section className="final-cta" aria-labelledby="final-cta-title">
      <div className="section-shell final-cta__inner">
        <div><span className="section-label">Next upload</span><h2 id="final-cta-title">Give the idea somewhere to go.</h2><p>Start with one sentence now, or connect your channel to find a direction first.</p></div>
        <div className="final-cta__actions">
          <Button asChild><Link href="#idea">Create from my idea <ArrowRight aria-hidden="true" size={17} /></Link></Button>
          <ConnectDialog triggerLabel="Find my next video" />
        </div>
      </div>
    </section>
  );
}
