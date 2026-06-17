type BrandLogoProps = {
  size?: number;
  className?: string;
  title?: string;
};

export function BrandLogo({
  size = 48,
  className = "",
  title = "HL Sales Management"
}: BrandLogoProps) {
  return (
    <svg
      className={`brand-logo-svg ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id="hl-logo-bg" x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#244f74" />
          <stop offset="1" stopColor="#0f304c" />
        </linearGradient>
        <linearGradient id="hl-logo-mark" x1="20" y1="18" x2="45" y2="47" gradientUnits="userSpaceOnUse">
          <stop stopColor="#b8e6ff" />
          <stop offset="1" stopColor="#67b9ea" />
        </linearGradient>
        <filter id="hl-logo-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#051729" floodOpacity="0.35" />
        </filter>
      </defs>

      <rect x="3" y="3" width="58" height="58" rx="15" fill="url(#hl-logo-bg)" />
      <rect x="4" y="4" width="56" height="56" rx="14" fill="none" stroke="#ffffff" strokeOpacity="0.08" />

      <g
        fill="none"
        stroke="url(#hl-logo-mark)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#hl-logo-shadow)"
      >
        <path d="M22 19V45" />
        <path d="M42 19V45" />
        <path d="M22 32H42" />
      </g>
    </svg>
  );
}
