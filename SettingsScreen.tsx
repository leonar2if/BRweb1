import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/Icon';
import { Button } from '../../components/Button';
import { Switch, LogoutConfirmDialog } from '../../components/Misc';
import { PasswordField, PhoneField } from '../../components/Fields';
import { Dialog } from '../../components/Dialog';
import DeveloperCreditFooter from '../../components/DeveloperCreditFooter';
import { isValidLocalPhone, toLocalDisplay } from '../../utils/validators';
import { formatDateForDisplay } from '../../utils/dateFormatter';
import * as store from '../../data/store';

export default function SettingsScreen({ managerPhone }: { managerPhone: string }) {
  const { userPhone, userBirthday, isDarkMode, setDarkMode, logout, changePassword, updatePhone, saveBirthday } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showBirthdayDialog, setShowBirthdayDialog] = useState(false);
  const [birthdayInput, setBirthdayInput] = useState(userBirthday ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState(toLocalDisplay(userPhone));

  const rows: Array<{ icon: string; label: string; value?: string; onClick?: () => void; trailing?: React.ReactNode }> = [
    {
      icon: 'phone',
      label: 'Número de Teléfono',
      value: isEditingPhone ? undefined : `+53 ${toLocalDisplay(userPhone)}`,
      onClick: () => {
        setPhoneInput(toLocalDisplay(userPhone));
        setIsEditingPhone(true);
      },
    },
    {
      icon: 'lock',
      label: 'Cambiar contraseña',
      onClick: () => {
        setShowPasswordDialog(true);
        setPasswordSaved(false);
        setPasswordError(null);
        setNewPassword('');
      },
    },
  ];

  return (
    <div className="device-scroll" style={{ overflowY: 'auto', padding: '16px 16px 32px' }}>
      <div className="flex-col items-center" style={{ padding: '8px 0 24px' }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--primary-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="person" size={40} style={{ color: 'var(--on-primary-container)' }} />
        </div>
        <p className="text-title-lg fw-bold mt-3">+53 {toLocalDisplay(userPhone)}</p>
      </div>

      <p className="text-title-sm fw-bold text-onSurfaceVariant" style={{ padding: '0 4px 4px' }}>
        CUENTA
      </p>
      <div className="card" style={{ background: 'var(--surface-variant)', overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <div
            key={row.label}
            className="flex items-center gap-3"
            onClick={row.onClick}
            style={{
              padding: '14px 16px',
              cursor: row.onClick ? 'pointer' : 'default',
              borderBottom: i < rows.length - 1 ? '1px solid color-mix(in srgb, var(--on-surface-variant) 12%, transparent)' : 'none',
            }}
          >
            <Icon name={row.icon} size={22} style={{ color: 'var(--primary)' }} />
            <div style={{ flex: 1 }}>
              <p className="text-body-lg" style={{ margin: 0 }}>
                {row.label}
              </p>
              {row.value && (
                <p className="text-body-sm text-onSurfaceVariant" style={{ margin: '2px 0 0' }}>
                  {row.value}
                </p>
              )}
            </div>
            {row.onClick && !isEditingPhone && <Icon name="chevron_right" size={20} style={{ color: 'var(--on-surface-variant)' }} />}
          </div>
        ))}

        {isEditingPhone && (
          <div style={{ padding: '0 16px 14px' }}>
            <PhoneField label="Nuevo teléfono" value={phoneInput} onChange={setPhoneInput} />
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="text" small onClick={() => setIsEditingPhone(false)}>
                Cancelar
              </Button>
              <Button
                variant="filled"
                small
                disabled={!isValidLocalPhone(phoneInput)}
                onClick={async () => {
                  await updatePhone(phoneInput);
                  setIsEditingPhone(false);
                }}
              >
                Guardar
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="text-title-sm fw-bold text-onSurfaceVariant mt-5" style={{ padding: '0 4px 4px' }}>
        CUMPLEAÑOS
      </p>
      <div
        className="card flex items-center justify-between"
        style={{ background: 'var(--surface-variant)', padding: '14px 16px', cursor: 'pointer' }}
        onClick={() => {
          setBirthdayInput(userBirthday ?? '');
          setShowBirthdayDialog(true);
        }}
      >
        <div className="flex items-center gap-3">
          <Icon name="cake" size={22} style={{ color: 'var(--primary)' }} />
          <div>
            <p className="text-body-lg" style={{ margin: 0 }}>
              {userBirthday
                ? formatDateForDisplay(userBirthday)
                : 'No configurado — avisanos y te tenemos un detalle ese día 🎉'}
            </p>
          </div>
        </div>
        <Icon name="edit" size={20} style={{ color: 'var(--primary)' }} />
      </div>

      <p className="text-title-sm fw-bold text-onSurfaceVariant mt-5" style={{ padding: '0 4px 4px' }}>
        PREFERENCIAS
      </p>
      <div className="card flex items-center gap-3" style={{ background: 'var(--surface-variant)', padding: '14px 16px' }}>
        <Icon name={isDarkMode ? 'brightness_7' : 'brightness_4'} size={22} style={{ color: 'var(--primary)' }} />
        <p className="text-body-lg" style={{ flex: 1, margin: 0 }}>
          Modo oscuro
        </p>
        <Switch checked={isDarkMode} onChange={setDarkMode} label="Modo oscuro" />
      </div>

      <p className="text-title-sm fw-bold text-onSurfaceVariant mt-5" style={{ padding: '0 4px 4px' }}>
        BARBERÍA
      </p>
      <div
        className="card flex items-center gap-3"
        style={{ background: 'var(--surface-variant)', padding: '14px 16px' }}
      >
        <Icon name="call" size={22} style={{ color: 'var(--primary)' }} />
        <div style={{ flex: 1 }}>
          <p className="text-body-lg" style={{ margin: 0 }}>
            Contactar por WhatsApp
          </p>
          <p className="text-body-sm text-onSurfaceVariant" style={{ margin: '2px 0 0' }}>
            +53 {toLocalDisplay(managerPhone)}
          </p>
        </div>
        <a
          href={`https://wa.me/${managerPhone}`}
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: 'none' }}
        >
          <Button variant="whatsapp" small icon="chat">
            Chat
          </Button>
        </a>
      </div>

      <div className="mt-8">
        <Button variant="outlined-error" full icon="exit_to_app" onClick={() => setShowLogoutConfirm(true)}>
          Cerrar sesión
        </Button>
      </div>

      <DeveloperCreditFooter />

      {showLogoutConfirm && (
        <LogoutConfirmDialog onConfirm={logout} onDismiss={() => setShowLogoutConfirm(false)} />
      )}

      {showBirthdayDialog && (
        <Dialog
          title="Cumpleaños"
          onDismiss={() => setShowBirthdayDialog(false)}
          actions={
            <>
              <Button variant="text" onClick={() => setShowBirthdayDialog(false)}>
                Cancelar
              </Button>
              <Button
                variant="filled"
                disabled={birthdayInput === ''}
                onClick={async () => {
                  await saveBirthday(birthdayInput || null);
                  setShowBirthdayDialog(false);
                }}
              >
                Guardar
              </Button>
            </>
          }
        >
          <label className="field">
            <span className="field-static-label">Fecha de nacimiento</span>
            <span className="field-input-wrap">
              <input
                className="field-input"
                type="date"
                value={birthdayInput}
                max={store.todayStr()}
                onChange={(e) => setBirthdayInput(e.target.value)}
              />
            </span>
          </label>
        </Dialog>
      )}

      {showPasswordDialog && (
        <Dialog
          title="Cambiar contraseña"
          onDismiss={() => setShowPasswordDialog(false)}
          actions={
            <>
              <Button variant="text" onClick={() => setShowPasswordDialog(false)}>
                {passwordSaved ? 'Cerrar' : 'Cancelar'}
              </Button>
              {!passwordSaved && (
                <Button
                  variant="filled"
                  disabled={newPassword.trim().length < 6}
                  onClick={async () => {
                    const err = await changePassword(newPassword);
                    if (err) setPasswordError(err);
                    else setPasswordSaved(true);
                  }}
                >
                  Guardar
                </Button>
              )}
            </>
          }
        >
          {passwordSaved ? (
            <p>Tu contraseña se actualizó correctamente.</p>
          ) : (
            <>
              <PasswordField
                label="Nueva contraseña (mín. 6 caracteres)"
                showLockIcon={false}
                value={newPassword}
                onChange={setNewPassword}
              />
              {passwordError && (
                <p className="text-body-sm mt-2" style={{ color: 'var(--error)' }}>
                  {passwordError}
                </p>
              )}
            </>
          )}
        </Dialog>
      )}
    </div>
  );
}
