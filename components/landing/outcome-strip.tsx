const steps = [
  { number: "01", title: "Describe the idea", detail: "Give us the topic and angle." },
  { number: "02", title: "Add channel context", detail: "Use your channel when it helps." },
  { number: "03", title: "Shape the plan", detail: "Choose the structure and direction." },
  { number: "04", title: "Write the script", detail: "Edit until it sounds like you." },
];

export function OutcomeStrip() {
  return (
    <section className="outcome-strip" aria-labelledby="workflow-title">
      <div className="section-shell outcome-strip__inner">
        <header className="outcome-strip__heading">
          <h2 id="workflow-title">From rough idea to record-ready</h2>
          <p>One focused workflow. You stay in control of the direction.</p>
        </header>
        <ol className="outcome-strip__steps">
          {steps.map((step) => (
            <li key={step.number} className="outcome-strip__step">
              <span className="outcome-strip__number">{step.number}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
