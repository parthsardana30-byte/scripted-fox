"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useReducedMotion } from "motion/react";

const signUpHref = "/sign-up?next=%2Fdashboard";
const desktopTrail = "M4 246 C22 246 22 218 22 204 C22 184 38 169 56 169 C75 169 89 184 89 202 C89 220 75 233 56 233 C36 233 25 219 25 201 C25 177 44 155 68 155 C95 155 112 174 112 197 C112 215 126 228 144 228 C166 228 178 211 178 191 C178 168 158 157 141 164 C121 172 125 197 145 197 C166 197 174 211 186 211 C199 211 203 197 203 179 C203 132 204 38 203 -11";
const mobileTrail = "M4 246 C22 246 22 218 22 204 C22 184 38 169 56 169 C75 169 89 184 89 202 C89 220 75 233 56 233 C36 233 25 219 25 201 C25 177 44 155 68 155 C95 155 112 174 112 197 C112 215 126 228 144 228 C166 228 178 211 178 191 C178 168 158 157 141 164 C121 172 125 197 145 197 C166 197 174 211 186 211 C199 211 203 197 203 179 C203 142 199 75 195 50";

export function DiwaliLaunch() {
  const [launching, setLaunching] = useState(false);
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const launchTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (launchTimer.current) window.clearTimeout(launchTimer.current);
  }, []);

  function handleLaunch(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (launching) return;

    if (reduceMotion) {
      router.push(signUpHref);
      return;
    }

    setLaunching(true);
    launchTimer.current = window.setTimeout(() => router.push(signUpHref), 820);
  }

  return (
    <a
      className={`diwali-launch-cue${launching ? " diwali-launch-cue--launching" : ""}`}
      href={signUpHref}
      onClick={handleLaunch}
      aria-label="Tap to launch your growth and create an account"
      aria-busy={launching}
    >
      <svg className="diwali-launch-cue__trail" viewBox="0 0 210 260" preserveAspectRatio="none" aria-hidden="true">
        <path vectorEffect="non-scaling-stroke" className="diwali-launch-cue__trail-base diwali-launch-cue__trail-desktop" d={desktopTrail} />
        <path vectorEffect="non-scaling-stroke" className="diwali-launch-cue__trail-live diwali-launch-cue__trail-desktop" d={desktopTrail} />
        <path vectorEffect="non-scaling-stroke" className="diwali-launch-cue__trail-base diwali-launch-cue__trail-mobile" d={mobileTrail} />
        <path vectorEffect="non-scaling-stroke" className="diwali-launch-cue__trail-live diwali-launch-cue__trail-mobile" d={mobileTrail} />
      </svg>

      <span className="diwali-launch-cue__rocket" aria-hidden="true">
        <Image
          className="diwali-launch-cue__rocket-image"
          src="/diwali-sky-rocket.png"
          alt=""
          width={1024}
          height={1536}
          sizes="(max-width: 480px) 56px, 76px"
        />
        <span className="diwali-launch-cue__exhaust" />
        <span className="diwali-launch-cue__needle-sparks">
          <i /><i /><i /><i /><i />
        </span>
      </span>

      <span className="diwali-launch-cue__copy">
        <small>Tap to launch</small>
        <strong>your growth!</strong>
      </span>
    </a>
  );
}
