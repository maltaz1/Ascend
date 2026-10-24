import { useId } from "react";

// Selo "Fundador" da lista de espera. O número é fixo (ordem de cadastro).
export function FounderBadge({
  number,
  size = 200,
}: {
  number?: number | null;
  size?: number;
}) {
  const id = useId().replace(/:/g, "");
  const label = number ? `#${String(number).padStart(4, "0")}` : "#????";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={`Selo Fundador ${label}`}
    >
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="45%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <radialGradient id={`${id}-core`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#241d38" />
          <stop offset="100%" stopColor="#12111a" />
        </radialGradient>
      </defs>
      <polygon
        points="100,10 178,55 178,145 100,190 22,145 22,55"
        fill={`url(#${id}-rim)`}
      />
      <polygon
        points="100,24 166,62 166,138 100,176 34,138 34,62"
        fill={`url(#${id}-core)`}
      />
      <polygon
        points="100,24 166,62 166,138 100,176 34,138 34,62"
        fill="none"
        stroke="#8b5cf6"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <g
        fill="none"
        stroke={`url(#${id}-rim)`}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M72 96 L100 68 L128 96" />
        <path d="M72 120 L100 92 L128 120" strokeOpacity="0.45" />
      </g>
      <text
        x="100"
        y="145"
        textAnchor="middle"
        fill="#f5f5f5"
        fontFamily="'Space Grotesk', Arial, sans-serif"
        fontSize="15"
        fontWeight="700"
        letterSpacing="3"
      >
        FUNDADOR
      </text>
      <text
        x="100"
        y="163"
        textAnchor="middle"
        fill="#f59e0b"
        fontFamily="'Space Grotesk', Arial, sans-serif"
        fontSize="13"
        fontWeight="600"
        letterSpacing="1"
      >
        {label}
      </text>
    </svg>
  );
}
