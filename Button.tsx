import React, { useCallback } from 'react';
import Icon from './Icon';

type Variant = 'filled' | 'outlined' | 'outlined-error' | 'text' | 'danger' | 'success' | 'whatsapp';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
  large?: boolean;
  small?: boolean;
  loading?: boolean;
  icon?: string;
  children?: React.ReactNode;
}

function useRipple() {
  return useCallback((e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    target.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 550);
  }, []);
}

export function Button({
  variant = 'filled',
  full,
  large,
  small,
  loading,
  icon,
  children,
  className = '',
  onClick,
  disabled,
  ...rest
}: ButtonProps) {
  const ripple = useRipple();
  const variantClass =
    variant === 'outlined-error' ? 'btn-outlined btn-outlined-error' : `btn-${variant}`;

  return (
    <button
      className={`btn ${variantClass} ${full ? 'btn-full' : ''} ${large ? 'btn-lg' : ''} ${
        small ? 'btn-sm' : ''
      } ${className}`}
      disabled={disabled || loading}
      onClick={(e) => {
        ripple(e);
        onClick?.(e);
      }}
      {...rest}
    >
      {loading ? (
        <span className={`spinner spinner-sm ${variant === 'filled' ? 'spinner-onprimary' : ''}`} />
      ) : (
        <>
          {icon && <Icon name={icon} size={20} />}
          {children}
        </>
      )}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  className = '',
  onClick,
  disabled,
  color,
  filled,
  size = 24,
}: {
  icon: string;
  label: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  color?: string;
  filled?: boolean;
  size?: number;
}) {
  const ripple = useRipple();
  return (
    <button
      className={`icon-btn ${className}`}
      aria-label={label}
      title={label}
      disabled={disabled}
      style={color ? { color } : undefined}
      onClick={(e) => {
        ripple(e);
        onClick?.(e);
      }}
    >
      <Icon name={icon} size={size} filled={filled} />
    </button>
  );
}
