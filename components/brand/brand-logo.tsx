type BrandLogoProps = {
  animated?: boolean;
  className?: string;
  labelClassName?: string;
  markOnly?: boolean;
};

export function BrandLogo({
  animated = true,
  className = "",
  labelClassName = "",
  markOnly = false,
}: BrandLogoProps) {
  const classes = ["brand-logo", animated && "brand-logo--animated", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes}>
      <span className="brand-logo__symbol" aria-hidden="true">
        <svg className="brand-logo__icon" viewBox="0 0 44 44" focusable="false">
          <rect className="brand-logo__backdrop" x="4" y="4" width="36" height="36" rx="11" />
          <path className="brand-logo__tail" d="M8 29.5c2.5 8.8 18.5 12.3 27 5.1 3.7-3.2 4-7.1.8-10" />
          <path className="brand-logo__tail-tip" d="M35.8 24.6c3.2 2.9 2.9 6.8-.8 10" />
          <g className="brand-logo__fox-mark">
            <path className="brand-logo__ear brand-logo__ear--left" d="m10.2 19 1-11.2 9.2 6.5Z" />
            <path className="brand-logo__ear brand-logo__ear--right" d="m33.8 19-1-11.2-9.2 6.5Z" />
            <path className="brand-logo__ear-inner brand-logo__ear-inner--left" d="m12.5 15.2.5-4.2 4.2 3Z" />
            <path className="brand-logo__ear-inner brand-logo__ear-inner--right" d="m31.5 15.2-.5-4.2-4.2 3Z" />
            <path className="brand-logo__head" d="M10.5 18.2C13 13 17.2 11 22 11s9 2 11.5 7.2l-3.2 12.1L22 37l-8.3-6.7Z" />
            <path className="brand-logo__face brand-logo__face--left" d="M12.5 20.2c4.3.2 7.4 2.1 9.5 5.5l-4.4 5.5-3.9-1.7Z" />
            <path className="brand-logo__face brand-logo__face--right" d="M31.5 20.2c-4.3.2-7.4 2.1-9.5 5.5l4.4 5.5 3.9-1.7Z" />
            <path className="brand-logo__eye brand-logo__eye--left" d="m15.8 22.7 3 .7" />
            <path className="brand-logo__eye brand-logo__eye--right" d="m28.2 22.7-3 .7" />
            <path className="brand-logo__muzzle" d="m17.5 30 4.5-4.3 4.5 4.3-1.7 4.3L22 37l-2.8-2.7Z" />
            <path className="brand-logo__nose" d="m19.6 29.4 2.4-1.2 2.4 1.2-2.4 2Z" />
          </g>
          <path className="brand-logo__spark" d="M36.2 6.2c.32 2.1 1.32 3.1 3.4 3.42-2.08.32-3.08 1.32-3.4 3.4-.32-2.08-1.32-3.08-3.4-3.4 2.08-.32 3.08-1.32 3.4-3.42Z" />
        </svg>
      </span>
      {!markOnly && (
        <span className={["brand-logo__name", labelClassName].filter(Boolean).join(" ")}>
          <span className="brand-logo__scripted">Scripted</span>
          <span className="brand-logo__fox">Fox</span>
        </span>
      )}
    </span>
  );
}
