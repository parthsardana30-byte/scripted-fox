export function PersonalizationSection() {
  return (
    <section className="personalization section-shell" aria-labelledby="personalization-title">
      <header className="section-heading"><span className="section-label">Two ways to begin</span><h2 id="personalization-title">Bring the idea, or let your channel point to one.</h2><p>You never need to connect YouTube to write. Channel context simply helps the product understand what your viewers already respond to.</p></header>
      <div className="personalization-options">
        <article>
          <span>01 · Your idea</span>
          <h3>Shape a thought you already have.</h3>
          <p>Describe the video in plain language. Get help with the promise, packaging, outline, and script.</p>
          <a href="#idea">Write the idea <span aria-hidden="true">→</span></a>
        </article>
        <article>
          <span>02 · Your channel</span>
          <h3>Find a direction from real context.</h3>
          <p>Use channel history and current interest to guide a short list of ideas. You still choose what gets made.</p>
          <a href="/connect">Connect YouTube <span aria-hidden="true">→</span></a>
        </article>
      </div>
    </section>
  );
}
