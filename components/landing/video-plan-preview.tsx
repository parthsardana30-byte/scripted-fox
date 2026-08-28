"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { planTabs } from "@/content/landing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function VideoPlanPreview() {
  return (
    <section id="video-plan" className="video-plan section-shell" aria-labelledby="video-plan-title">
      <header className="section-heading">
        <span className="section-label">Inside the plan</span>
        <h2 id="video-plan-title">See the video before you write every line.</h2>
        <p>The plan keeps packaging, story, and recording decisions together so the script starts with a point of view.</p>
      </header>
      <Tabs defaultValue="strategy" className="video-plan__tabs">
        <TabsList aria-label="Video Plan sections">
          {planTabs.map((tab) => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}
        </TabsList>
        <div className="video-plan__surface">
          {planTabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
                <p className="plan-kicker">Example plan · Editing channel</p>
                <h3>{tab.title}</h3>
                <p className="plan-copy">{tab.body}</p>
                <ul className="plan-meta">
                  {tab.meta.map((item) => <li key={item}><Check aria-hidden="true" size={16} />{item}</li>)}
                </ul>
              </motion.div>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </section>
  );
}
