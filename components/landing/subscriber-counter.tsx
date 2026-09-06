"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Play, UserPlus } from "lucide-react";

const TARGET_COUNT = 12_842;

const growthSteps = [
  { icon: Play, label: "Stronger hook", detail: "Earn the next second" },
  { icon: Eye, label: "More retention", detail: "Keep the promise moving" },
  { icon: UserPlus, label: "More subscribers", detail: "Give viewers a reason" },
];

export function SubscriberCounter() {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    const startedAt = performance.now();
    const duration = 1_650;
    let frame = 0;

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      countRef.current = Math.floor(TARGET_COUNT * eased);
      setCount(countRef.current);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    const growth = window.setInterval(() => {
      countRef.current += Math.floor(Math.random() * 5) + 1;
      setCount(countRef.current);
    }, 1_350);

    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(growth);
    };
  }, []);

  return (
    <div className="subscriber-counter" aria-label="Illustration showing how better scripts can help turn viewers into subscribers">
      <div className="subscriber-counter__topline">
        <div className="subscriber-counter__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" role="presentation">
            <path fill="currentColor" d="M21.58 7.19a2.83 2.83 0 0 0-1.99-2C17.84 4.72 12 4.72 12 4.72s-5.84 0-7.59.47a2.83 2.83 0 0 0-1.99 2A29.5 29.5 0 0 0 1.95 12c0 1.61.16 3.22.47 4.81a2.83 2.83 0 0 0 1.99 2c1.75.47 7.59.47 7.59.47s5.84 0 7.59-.47a2.83 2.83 0 0 0 1.99-2c.31-1.59.47-3.2.47-4.81s-.16-3.22-.47-4.81ZM10 15.14V8.86L15.45 12 10 15.14Z" />
          </svg>
        </div>
        <span className="subscriber-counter__label">Growth you can write for</span>
        <div className="subscriber-counter__growth" aria-hidden="true"><i /> Live example</div>
      </div>
      <div className="subscriber-counter__stage">
        <div className="subscriber-counter__metric">
          <span>Channel subscribers</span>
          <strong className="subscriber-counter__number">{count.toLocaleString("en-US")}</strong>
          <small><b>+128</b> from recent uploads</small>
        </div>
        <div className="subscriber-counter__arrow" aria-hidden="true" title="Subscriber growth">
          <svg viewBox="0 0 120 120" role="presentation">
            <path d="M60 104V18M27 51l33-33 33 33" />
          </svg>
        </div>
      </div>
      <div className="subscriber-counter__path" aria-label="The growth path">
        {growthSteps.map(({ icon: Icon, label, detail }, index) => (
          <div className="subscriber-counter__step" key={label}>
            <span><Icon aria-hidden="true" size={16} /></span>
            <p><strong>{label}</strong><small>{detail}</small></p>
            {index < growthSteps.length - 1 ? <i aria-hidden="true">→</i> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
