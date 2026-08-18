import React from 'react';
import Icon from './Icon';
import { COUNTRY_CODE } from '../utils/validators';

interface TextFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  icon?: string;
  type?: 'text' | 'password' | 'number' | 'tel';
  error?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
  trailing?: React.ReactNode;
  autoFocus?: boolean;
}

/** Equivalente visual de OutlinedTextField (Material 3). */
export function TextField({
  value,
  onChange,
  label,
  icon,
  type = 'text',
  error,
  trailing,
  placeholder,
  autoFocus,
}: TextFieldProps) {
  return (
    <label className="field">
      <span className="field-static-label">{label}</span>
      <span className={`field-input-wrap ${error ? 'has-error' : ''}`}>
        {icon && (
          <span className="field-icon">
            <Icon name={icon} size={20} />
          </span>
        )}
        <input
          className="field-input"
          value={value}
          type={type}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
        {trailing && <span className="field-trailing">{trailing}</span>}
      </span>
    </label>
  );
}

/**
 * Campo de contraseña reutilizable con ícono de ojo para mostrar/ocultar el
 * texto — puerto directo de PasswordField.kt. Usado en login, registro y los
 * diálogos de cambiar contraseña (cliente y admin).
 */
export function PasswordField({
  value,
  onChange,
  label = 'Contraseña',
  showLockIcon = true,
  error,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  showLockIcon?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = React.useState(false);

  return (
    <label className="field">
      <span className="field-static-label">{label}</span>
      <span className={`field-input-wrap ${error ? 'has-error' : ''}`}>
        {showLockIcon && (
          <span className="field-icon">
            <Icon name="lock" size={20} />
          </span>
        )}
        <input
          className="field-input"
          type={visible ? 'text' : 'password'}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="field-trailing">
          <button
            type="button"
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onClick={() => setVisible((v) => !v)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--on-surface-variant)',
              display: 'flex',
              padding: 4,
            }}
          >
            <Icon name={visible ? 'visibility_off' : 'visibility'} size={20} />
          </button>
        </span>
      </span>
    </label>
  );
}
export function PhoneField({
  value,
  onChange,
  label = 'Número de teléfono',
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: boolean;
}) {
  return (
    <label className="field">
      <span className="field-static-label">{label}</span>
      <span className={`field-input-wrap ${error ? 'has-error' : ''}`}>
        <span className="field-icon">
          <Icon name="phone" size={20} />
        </span>
        <span className="field-prefix">{COUNTRY_CODE} |</span>
        <input
          className="field-input"
          value={value}
          inputMode="numeric"
          placeholder="5XXXXXXX"
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
        />
      </span>
    </label>
  );
}
