import { Check, Minus } from "lucide-react";

const rows = [
  ["Context", "The prompt you typed", "Your idea, channel, audience, and niche"],
  ["Angle", "A plausible direction", "A direction supported by visible signals"],
  ["Structure", "Generic best practices", "Pacing shaped around how your audience watches"],
  ["Memory", "Starts over next time", "Carries forward what the channel learns"],
  ["After publishing", "Nothing changes", "The next recommendation improves"],
];

export function ComparisonSection() {
  return (
    <section className="comparison section-shell" aria-labelledby="comparison-title">
      <header className="section-heading section-heading--compact"><h2 id="comparison-title">Not just a prompt. A plan built around your channel.</h2></header>
      <div className="comparison-table" role="table" aria-label="Prompt-only AI compared with a data-backed Video Plan">
        <div className="comparison-table__head" role="row"><span role="columnheader">What changes</span><span role="columnheader">Prompt-only AI</span><span role="columnheader">Data-backed Video Plan</span></div>
        {rows.map(([label, generic, backed]) => (
          <div className="comparison-table__row" role="row" key={label}>
            <strong role="rowheader">{label}</strong>
            <span role="cell"><Minus aria-hidden="true" size={15} />{generic}</span>
            <span role="cell"><Check aria-hidden="true" size={15} />{backed}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
