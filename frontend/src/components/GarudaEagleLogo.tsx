import React from 'react';

interface GarudaEagleLogoProps {
  className?: string;
  size?: number;
}

export const GarudaEagleLogo: React.FC<GarudaEagleLogoProps> = ({
  className = 'w-6 h-6',
  size,
}) => {
  const dimensionProps = size ? { width: size, height: size } : {};

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      {...dimensionProps}
      aria-label="GARUDA Emblem"
    >
      <defs>
        <linearGradient id="garudaTailGradReact" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00CFE8" />
          <stop offset="100%" stopColor="#7047C8" />
        </linearGradient>
      </defs>

      {/* Primary Swept Wings (Cyan #00CFE8) */}
      <polygon points="19,13 3,10 11,20 21,21" fill="#00CFE8" />
      <polygon points="29,13 45,10 37,20 27,21" fill="#00CFE8" />

      {/* Secondary Mid Wings (Adapts to Light / Dark Mode) */}
      <polygon points="21,22 6,23 15,29 21,28" fill="currentColor" />
      <polygon points="27,22 42,23 33,29 27,28" fill="currentColor" />

      {/* Tertiary Lower Wing Strakes (Subtle Amethyst #7047C8) */}
      <polygon points="21,29 11,32 18,37 22,35" fill="#7047C8" />
      <polygon points="27,29 37,32 30,37 26,35" fill="#7047C8" />

      {/* Head Crest */}
      <polygon points="24,4 28,12 24,18 20,12" fill="currentColor" />

      {/* Beak Chisel (Cyan #00CFE8) */}
      <polygon points="24,18 26,23 24,27 22,23" fill="#00CFE8" />

      {/* Optronic Sensor Core (Diamond) */}
      <polygon points="24,13.5 25.5,15.5 24,17.5 22.5,15.5" fill="#00CFE8" />

      {/* Tail Plumes / Keel */}
      <polygon points="24,28 20.5,36 24,44" fill="url(#garudaTailGradReact)" />
      <polygon points="24,28 27.5,36 24,44" fill="currentColor" opacity="0.85" />
    </svg>
  );
};
