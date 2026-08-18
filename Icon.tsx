import React from 'react';

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  filled?: boolean;
  style?: React.CSSProperties;
}

/**
 * Envoltorio del font "Material Symbols Rounded" para replicar 1:1 los
 * `Icons.Default.*` usados en Jetpack Compose (mismo set de iconos de
 * Google, misma familia visual "Material").
 */
export default function Icon({ name, size = 24, className = '', filled = false, style }: IconProps) {
  return (
    <span
      className={`material-symbols-rounded ${className}`}
      style={{
        fontSize: size,
        width: size,
        height: size,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
