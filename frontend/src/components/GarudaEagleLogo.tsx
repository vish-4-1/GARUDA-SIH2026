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
    <img
      src="/garuda-emblem.png"
      alt="GARUDA Emblem"
      className={`${className} object-contain`}
      {...dimensionProps}
    />
  );
};
