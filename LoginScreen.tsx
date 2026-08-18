import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { PhoneField, PasswordField } from '../../components/Fields';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { isValidLocalPhone } from '../../utils/validators';

export default function LoginScreen() {
  const { authState, login, resetState } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const errorMessage = authState.kind === 'error' ? authState.message : null;
  const isLoading = authState.kind === 'loading';

  const clearErrorIfNeeded = () => {
    if (errorMessage) resetState();
  };

  return (
    <div
      className="flex-col items-center justify-center device-scroll"
      style={{
        background: `linear-gradient(to bottom, var(--surface), color-mix(in srgb, var(--surface-variant) 60%, transparent))`,
        padding: '24px 24px 40px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }} className="flex-col items-center">
        <div
          style={{
            width: 90,
            height: 90,
            borderRadius: '50%',
            background: 'var(--primary-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="content_cut" size={48} style={{ color: 'var(--on-primary-container)' }} />
        </div>

        <h1
          className="text-headline-md fw-extrabold text-primary mt-4"
          style={{ letterSpacing: '0.125em', margin: '16px 0 0' }}
        >
          - Rodríguez -
        </h1>
        <p className="text-title-md fw-bold text-onSurfaceVariant" style={{ letterSpacing: '0.25em', margin: '2px 0 0' }}>
          BARBERÍA
        </p>

        <div className="card mt-6 w-full" style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--elevation-6)', padding: 24 }}>
          <div className="flex-col items-center">
            <h2 className="text-title-lg fw-bold" style={{ margin: 0 }}>
              Iniciar Sesión
            </h2>

            <div className="w-full mt-5">
              <PhoneField
                value={phone}
                onChange={(v) => {
                  setPhone(v);
                  clearErrorIfNeeded();
                }}
              />
            </div>

            <div className="w-full mt-3">
              <PasswordField
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  clearErrorIfNeeded();
                }}
              />
            </div>

            {errorMessage && (
              <div className="w-full mt-3" style={{ background: 'var(--error-container)', borderRadius: 'var(--radius-sm)' }}>
                <p className="text-body-sm text-center" style={{ color: 'var(--on-error-container)', padding: 10, margin: 0 }}>
                  {errorMessage}
                </p>
              </div>
            )}

            <div className="w-full mt-6">
              <Button
                full
                large
                loading={isLoading}
                disabled={isLoading || !isValidLocalPhone(phone) || password.trim() === ''}
                onClick={() => login(phone, password)}
              >
                Iniciar sesión
              </Button>
            </div>
          </div>
        </div>

        <p
          className="text-body-md fw-semibold text-primary mt-6"
          style={{ cursor: 'pointer', padding: 8 }}
          onClick={() => {
            resetState();
            navigate('/register');
          }}
        >
          ¿No tienes cuenta? Regístrate aquí
        </p>

        <p className="text-body-sm text-onSurfaceVariant mt-4 text-center">
          Demo: +53 55512 3456 · cliente123 &nbsp;|&nbsp; +53 55500 0001 · admin123
        </p>
      </div>
    </div>
  );
}
