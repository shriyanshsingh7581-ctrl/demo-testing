import React from 'react';
import { Salon } from '../types/salon';

interface SalonArtworkProps {
  variant: Salon['artworkVariant'];
  salonName: string;
  className?: string;
}

export const SalonArtwork: React.FC<SalonArtworkProps> = ({
  variant,
  salonName,
  className = 'w-full h-44',
}) => {
  const configs: Record<
    Salon['artworkVariant'],
    {
      bgGradient: string;
      accentHex: string;
      secondaryHex: string;
      mirrorShape: 'arch' | 'round' | 'rect';
      tagText: string;
    }
  > = {
    flagship: {
      bgGradient: 'from-slate-900 via-amber-950/70 to-slate-950',
      accentHex: '#f59e0b',
      secondaryHex: '#fde68a',
      mirrorShape: 'arch',
      tagText: 'Flagship Studio · Olandganj',
    },
    royal: {
      bgGradient: 'from-slate-900 via-rose-950/60 to-slate-950',
      accentHex: '#fbbf24',
      secondaryHex: '#fda4af',
      mirrorShape: 'round',
      tagText: 'Makeover & Bridal · Civil Lines',
    },
    urban: {
      bgGradient: 'from-slate-950 via-zinc-900 to-slate-900',
      accentHex: '#38bdf8',
      secondaryHex: '#f59e0b',
      mirrorShape: 'rect',
      tagText: "Men's Grooming Lounge · Line Bazar",
    },
    aura: {
      bgGradient: 'from-slate-900 via-emerald-950/60 to-slate-950',
      accentHex: '#10b981',
      secondaryHex: '#fcd34d',
      mirrorShape: 'arch',
      tagText: 'Bridal & Luxury Spa · TDB College Rd',
    },
    classic: {
      bgGradient: 'from-slate-950 via-amber-950/50 to-zinc-900',
      accentHex: '#d97706',
      secondaryHex: '#e2e8f0',
      mirrorShape: 'rect',
      tagText: 'Gentlemen Barber · Machhlishahr Padav',
    },
  };

  const cfg = configs[variant] || configs.flagship;

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${cfg.bgGradient} select-none ${className}`}
      role="img"
      aria-label={`${salonName} interior preview`}
    >
      {/* Architectural Interior SVG Illustration */}
      <svg
        viewBox="0 0 600 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id={`glow-${variant}`} cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor={cfg.accentHex} stopOpacity="0.32" />
            <stop offset="60%" stopColor={cfg.secondaryHex} stopOpacity="0.08" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`floor-${variant}`} x1="0" y1="220" x2="0" y2="320" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#020617" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Ambient Warm Ceiling Spotlight */}
        <rect width="600" height="320" fill={`url(#glow-${variant})`} />

        {/* Subtle Architectural Wall Panelling */}
        <g stroke="rgba(255,255,255,0.06)" strokeWidth="1">
          <line x1="60" y1="0" x2="60" y2="230" />
          <line x1="120" y1="0" x2="120" y2="230" />
          <line x1="240" y1="0" x2="240" y2="230" />
          <line x1="360" y1="0" x2="360" y2="230" />
          <line x1="480" y1="0" x2="480" y2="230" />
          <line x1="540" y1="0" x2="540" y2="230" />
        </g>

        {/* Polished Marble Floor Horizon */}
        <rect x="0" y="225" width="600" height="95" fill={`url(#floor-${variant})`} />
        <line x1="0" y1="225" x2="600" y2="225" stroke={cfg.accentHex} strokeOpacity="0.35" strokeWidth="1.5" />

        {/* Pendant Ceiling Lamps */}
        {[175, 300, 425].map((x, idx) => (
          <g key={idx}>
            <line x1={x} y1="0" x2={x} y2="42" stroke={cfg.accentHex} strokeOpacity="0.6" strokeWidth="1.5" />
            <path
              d={`M${x - 14} 42 L${x + 14} 42 L${x + 20} 54 L${x - 20} 54 Z`}
              fill="#1e293b"
              stroke={cfg.accentHex}
              strokeWidth="1.2"
            />
            <ellipse cx={x} cy="55" rx="12" ry="3" fill={cfg.secondaryHex} fillOpacity="0.85" />
          </g>
        ))}

        {/* Three Illuminated Salon Styling Stations (Mirrors + Consoles + Chairs) */}
        {[175, 300, 425].map((centerX, idx) => (
          <g key={idx}>
            {/* Backlit Mirror */}
            {cfg.mirrorShape === 'arch' && (
              <path
                d={`M${centerX - 36} 175 V108 A36 36 0 0 1 ${centerX + 36} 108 V175 Z`}
                fill="#1e293b"
                stroke={cfg.accentHex}
                strokeWidth="2"
              />
            )}
            {cfg.mirrorShape === 'round' && (
              <circle
                cx={centerX}
                cy="128"
                r="38"
                fill="#1e293b"
                stroke={cfg.accentHex}
                strokeWidth="2"
              />
            )}
            {cfg.mirrorShape === 'rect' && (
              <rect
                x={centerX - 36}
                y="76"
                width="72"
                height="98"
                rx="6"
                fill="#1e293b"
                stroke={cfg.accentHex}
                strokeWidth="2"
              />
            )}

            {/* Mirror diagonal sheen */}
            <line
              x1={centerX - 18}
              y1="100"
              x2={centerX + 12}
              y2="155"
              stroke="rgba(255,255,255,0.16)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <line
              x1={centerX - 6}
              y1="95"
              x2={centerX + 20}
              y2="140"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Vanity Shelf */}
            <rect
              x={centerX - 46}
              y="180"
              width="92"
              height="7"
              rx="2"
              fill="#334155"
              stroke={cfg.accentHex}
              strokeOpacity="0.5"
              strokeWidth="1"
            />

            {/* Leather Hydraulic Styling Chair Silhouette */}
            <rect
              x={centerX - 24}
              y="192"
              width="48"
              height="26"
              rx="8"
              fill="#0f172a"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="1.5"
            />
            <line
              x1={centerX}
              y1="218"
              x2={centerX}
              y2="242"
              stroke={cfg.accentHex}
              strokeWidth="3"
            />
            <line
              x1={centerX - 18}
              y1="242"
              x2={centerX + 18}
              y2="242"
              stroke={cfg.accentHex}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>

      {/* Bottom Scrim Overlay for High-Contrast Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/35 to-transparent" />

      {/* Quiet Editorial Location Kicker at Bottom-Left */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-slate-300">
        <span className="font-medium tracking-wide text-amber-300/95 truncate">
          {cfg.tagText}
        </span>
      </div>
    </div>
  );
};
