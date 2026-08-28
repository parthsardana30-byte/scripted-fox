"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { nicheExamples } from "@/content/landing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function NicheExamples() {
  const [selectedId, setSelectedId] = useState(nicheExamples[0].id);
  const selected = nicheExamples.find((item) => item.id === selectedId) ?? nicheExamples[0];

  return (
    <section className="niche-examples section-shell" aria-labelledby="niche-title">
      <header className="section-heading section-heading--compact">
        <h2 id="niche-title">Made for your niche—not one type of creator.</h2>
        <p>The recommendation changes because different audiences respond to different formats, proof, and pacing.</p>
      </header>
      <Tabs value={selectedId} onValueChange={setSelectedId}>
        <TabsList className="niche-selector" aria-label="Choose a creator niche">
          {nicheExamples.map((item) => (
            <TabsTrigger key={item.id} value={item.id}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={selected.id}>
          <motion.article
            key={selected.id}
            className="niche-result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            <div><span>Example recommendation</span><h3>{selected.title}</h3></div>
            <div><strong>Angle</strong><p>{selected.angle}</p></div>
            <div><strong>Why it fits</strong><p>{selected.reason}</p></div>
          </motion.article>
        </TabsContent>
      </Tabs>
    </section>
  );
}
