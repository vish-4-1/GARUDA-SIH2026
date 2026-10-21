import React from 'react';

interface GarudaEagleLogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

export const GarudaEagleLogo: React.FC<GarudaEagleLogoProps> = ({
  className = 'w-6 h-6',
  size,
  glow = true,
}) => {
  const dimensionProps = size ? { width: size, height: size } : {};

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      {...dimensionProps}
      aria-label="GARUDA Eagle Emblem"
    >
      <defs>
        {/* Electric Cyan Neon Linear Gradient */}
        <linearGradient id="garudaCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#00B0FF" />
        </linearGradient>

        {/* Royal Amethyst Gradient */}
        <linearGradient id="garudaAmethystGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B0A6B" />
          <stop offset="100%" stopColor="#241039" />
        </linearGradient>

        {/* Silver Platinum Blade Gradient */}
        <linearGradient id="garudaPlatinumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#AAA3B5" />
        </linearGradient>

        {/* Glow Filter for Cybernetic Accent */}
        {glow && (
          <filter id="eagleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}
      </defs>

      {/* Aerodynamic Eagle Wings - Left Wing Swept Blades */}
      {/* Primary Outer Flight Feather */}
      <path
        d="M50 36 L12 18 L24 38 L38 46 L50 49 Z"
        fill="url(#garudaCyanGrad)"
        opacity="0.95"
      />
      {/* Secondary Mid Feather Blade */}
      <path
        d="M50 47 L18 36 L28 50 L42 56 L50 58 Z"
        fill="url(#garudaPlatinumGrad)"
      />
      {/* Tertiary Lower Feather Blade */}
      <path
        d="M50 56 L24 50 L34 62 L45 66 L50 67 Z"
        fill="url(#garudaAmethystGrad)"
        stroke="#00E5FF"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />

      {/* Aerodynamic Eagle Wings - Right Wing Swept Blades */}
      {/* Primary Outer Flight Feather */}
      <path
        d="M50 36 L88 18 L76 38 L62 46 L50 49 Z"
        fill="url(#garudaCyanGrad)"
        opacity="0.95"
      />
      {/* Secondary Mid Feather Blade */}
      <path
        d="M50 47 L82 36 L72 50 L58 56 L50 58 Z"
        fill="url(#garudaPlatinumGrad)"
      />
      {/* Tertiary Lower Feather Blade */}
      <path
        d="M50 56 L76 50 L66 62 L55 66 L50 67 Z"
        fill="url(#garudaAmethystGrad)"
        stroke="#00E5FF"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />

      {/* Eagle Lower Body / Tail Plumes */}
      <path
        d="M50 64 L42 76 L50 92 L58 76 Z"
        fill="url(#garudaAmethystGrad)"
        stroke="#00E5FF"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M50 68 L46 78 L50 87 L54 78 Z"
        fill="url(#garudaCyanGrad)"
        opacity="0.7"
      />

      {/* Eagle Shoulder Mantle / Chest Geometry */}
      <path
        d="M50 32 L40 44 L44 60 L50 66 L56 60 L60 44 Z"
        fill="url(#garudaPlatinumGrad)"
        stroke="#3B0A6B"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Eagle Head - Fierce Aerodynamic Forward Crest */}
      <path
        d="M50 10 L44 26 L47 34 L50 38 L53 34 L56 26 Z"
        fill="#FFFFFF"
      />

      {/* Eagle Crown Feather Accents */}
      <path
        d="M50 8 L47 18 L50 22 L53 18 Z"
        fill="#00E5FF"
        filter={glow ? 'url(#eagleGlow)' : undefined}
      />

      {/* Cybernetic Beak - Hooked Predator Geometry */}
      <path
        d="M50 26 L44 32 L50 46 L56 32 Z"
        fill="url(#garudaCyanGrad)"
        stroke="#FFFFFF"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path
        d="M50 30 L48 34 L50 42 L52 34 Z"
        fill="#FFFFFF"
        opacity="0.9"
      />

      {/* Tactical Optical Eyes - Dual Piercing Sensors */}
      <polygon
        points="44,25 47,27 44,28 42,26"
        fill="#00E5FF"
        filter={glow ? 'url(#eagleGlow)' : undefined}
      />
      <polygon
        points="56,25 58,26 56,28 53,27"
        fill="#00E5FF"
        filter={glow ? 'url(#eagleGlow)' : undefined}
      />
    </svg>
  );
};
