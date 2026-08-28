const steps = [
  { title: "Start with the rough version.", body: "Write the idea as you would explain it to a friend. If you are stuck, connect your channel and choose from a short list of informed directions." },
  { title: "Choose the angle before writing.", body: "Review the promise, opening, title direction, and structure. Change anything that does not sound like your channel." },
  { title: "Turn the plan into your script.", body: "Generate a full draft, edit it directly, and ask the writing assistant to tighten any part that needs work." },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="how-it-works section-shell" aria-labelledby="how-title">
      <header className="section-heading"><span className="section-label">How it works</span><h2 id="how-title">One clear path from maybe to ready.</h2><p>No prompt library to learn. Make the important choices in order and keep control of the final words.</p></header>
      <ol className="step-sequence">
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className="step-sequence__number">0{index + 1}</span>
            <div><h3>{step.title}</h3><p>{step.body}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
