/** Generative SVG avatar (shared by grid cards and profile editor). */
export function GenerativeAvatar({ primaryColor, secondaryColor, pattern = 1, className = '' }) {
  const gradId = `grad-${pattern}-${String(primaryColor).replace('#', '')}`;
  return (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={primaryColor} />
          <stop offset="100%" stopColor={secondaryColor} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gradId})`} />
      <path
        d="M 0 10 L 100 10 M 0 30 L 100 30 M 0 50 L 100 50 M 0 70 L 100 70 M 0 90 L 100 90"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="0.5"
      />
      <path
        d="M 10 0 L 10 100 M 30 0 L 30 100 M 50 0 L 50 100 M 70 0 L 70 100 M 90 0 L 90 100"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="0.5"
      />
      {pattern === 1 && (
        <>
          <circle cx="50" cy="40" r="18" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.22)" />
          <path d="M 25 80 C 25 65, 75 65, 75 80 Z" fill="rgba(255,255,255,0.18)" />
        </>
      )}
      {pattern === 2 && (
        <>
          <rect
            x="36"
            y="26"
            width="28"
            height="28"
            rx="5"
            fill="rgba(255,255,255,0.12)"
            transform="rotate(45 50 40)"
          />
          <path d="M 20 85 C 30 68, 70 68, 80 85 Z" fill="rgba(255,255,255,0.18)" />
        </>
      )}
      {pattern === 3 && (
        <>
          <polygon points="50,22 66,50 34,50" fill="rgba(255,255,255,0.12)" />
          <path d="M 15 88 C 25 70, 75 70, 85 88 Z" fill="rgba(255,255,255,0.18)" />
        </>
      )}
      {pattern === 4 && (
        <>
          <circle cx="50" cy="38" r="14" fill="rgba(255,255,255,0.1)" />
          <rect x="33" y="60" width="34" height="25" rx="6" fill="rgba(255,255,255,0.15)" />
        </>
      )}
    </svg>
  );
}
