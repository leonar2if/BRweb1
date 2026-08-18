import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { PhoneField, PasswordField } from '../../components/Fields';
import { Button, IconButton } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { isValidLocalPhone } from '../../utils/validators';

export default function RegisterScreen() {
  const { authState, register, resetState } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastNames, setLastNames] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fullName = [firstName.trim(), lastNames.trim()].filter(Boolean).join(' ');
  const errorMessage = authState.kind === 'error' ? authState.message : null;
  const isLoading = authState.kind === 'loading';

  const clearErrorIfNeeded = () => {
    if (errorMessage) resetState();
  };

  const goBack = () => {
    resetState();
    navigate('/login');
  };

  return (
    <div
      className="flex-col items-center device-scroll"
      style={{
        background: `linear-gradient(to bottom, var(--surface), color-mix(in srgb, var(--surface-variant) 60%, transparent))`,
        padding: '24px 24px 40px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div className="flex items-center">
          <IconButton icon="arrow_back" label="Volver" onClick={goBack} />
          <h1 className="text-title-lg fw-bold" style={{ marginLeft: 8 }}>
            Crear Cuenta
          </h1>
        </div>

        <div className="card mt-4" style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--elevation-6)', padding: 24 }}>
          <div className="flex-col items-center">
            <h2 className="text-title-md fw-bold text-primary" style={{ margin: 0, textAlign: 'center' }}>
              Únete a Rodríguez Barbería
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
              <label className="field">
                <span className="field-static-label">Nombre</span>
                <span className="field-input-wrap">
                  <span className="field-icon">
                    <Icon name="person" size={20} />
                  </span>
                  <input
                    className="field-input"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      clearErrorIfNeeded();
                    }}
                  />
                </span>
              </label>
            </div>

            <div className="w-full mt-3">
              <label className="field">
                <span className="field-static-label">Apellidos</span>
                <span className="field-input-wrap">
                  <span className="field-icon">
                    <Icon name="person" size={20} />
                  </span>
                  <input
                    className="field-input"
                    value={lastNames}
                    onChange={(e) => {
                      setLastNames(e.target.value);
                      clearErrorIfNeeded();
                    }}
                  />
                </span>
              </label>
            </div>

            <div className="w-full mt-3">
              <PasswordField
                label="Contraseña (mín. 6 caracteres)"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  clearErrorIfNeeded();
                }}
              />
            </div>

            <div className="w-full mt-3">
              <PasswordField
                label="Confirmar contraseña"
                value={confirmPassword}
                onChange={(v) => {
                  setConfirmPassword(v);
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
                disabled={
                  isLoading ||
                  !isValidLocalPhone(phone) ||
                  firstName.trim() === '' ||
                  lastNames.trim() === '' ||
                  password.trim() === ''
                }
                onClick={() => register(phone, fullName, password, confirmPassword)}
              >
                Crear cuenta
              </Button>
            </div>
          </div>
        </div>

        <p
          className="text-body-md fw-semibold text-primary mt-4"
          style={{ cursor: 'pointer', padding: 8, textAlign: 'center' }}
          onClick={goBack}
        >
          ¿Ya tienes una cuenta? Inicia sesión
        </p>
      </div>
    </div>
  );
}
