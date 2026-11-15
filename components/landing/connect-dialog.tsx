"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function ConnectDialog({ triggerLabel = "Find my next video" }: { triggerLabel?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-action" type="button">
          {triggerLabel} <ArrowRight aria-hidden="true" size={16} />
        </button>
      </DialogTrigger>
      <DialogContent>
        <div className="dialog-icon" aria-hidden="true">
          <ShieldCheck size={22} />
        </div>
        <DialogTitle>Make the recommendation personal</DialogTitle>
        <DialogDescription>
          Channel access lets the product combine what has worked for you, how your audience watches, and what is getting attention in your niche.
        </DialogDescription>
        <ul className="dialog-points">
          <li>Read-only analysis intent</li>
          <li>You choose when to connect</li>
          <li>You can disconnect later</li>
        </ul>
        <Button asChild>
          <Link href="/connect">Connect YouTube</Link>
        </Button>
        <p className="demo-disclosure">Google will show exactly which read-only YouTube permissions are requested before you approve.</p>
      </DialogContent>
    </Dialog>
  );
}
