import { ArrowRight } from "lucide-react";

const loop = ["Recommend", "Create", "Publish", "Learn", "Improve"];

export function LearningLoopSection() {
  return (
    <section className="learning-loop" aria-labelledby="learning-title">
      <div className="section-shell learning-loop__inner">
        <header><h2 id="learning-title">It gets more useful every time you publish.</h2><p>What happened becomes evidence for the next decision—not a scorecard you have to interpret alone.</p></header>
        <div className="loop-track" aria-label="Recommend, create, publish, learn, improve">
          {loop.map((step, index) => <div key={step}><span>{step}</span>{index < loop.length - 1 ? <ArrowRight aria-hidden="true" size={16} /> : null}</div>)}
        </div>
        <div className="learning-notes">
          <div><span>What worked</span><strong>The demonstration earned attention early.</strong></div>
          <div><span>What changed next</span><strong>The setup section should be shorter next time.</strong></div>
        </div>
      </div>
    </section>
  );
}
