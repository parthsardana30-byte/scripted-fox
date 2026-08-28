import { Eye, Link2Off, ShieldCheck } from "lucide-react";

const points = [
  { icon: Eye, title: "Used for your planning", body: "Channel information is used to improve your topic, format, and script suggestions." },
  { icon: ShieldCheck, title: "Clear permissions", body: "You will see what access is requested before you connect your account." },
  { icon: Link2Off, title: "Your choice", body: "You decide whether to connect your channel and when to disconnect it." },
];

export function PrivacySection() {
  return (
    <section id="privacy" className="privacy section-shell" aria-labelledby="privacy-title">
      <header className="section-heading section-heading--compact"><span className="section-label">Channel access</span><h2 id="privacy-title">Your channel stays under your control.</h2><p>Connecting YouTube is optional. Before you connect, you will see what access the product needs and why.</p></header>
      <div className="privacy__points">
        {points.map((point) => <div key={point.title}><point.icon aria-hidden="true" size={20} /><div><h3>{point.title}</h3><p>{point.body}</p></div></div>)}
      </div>
    </section>
  );
}
