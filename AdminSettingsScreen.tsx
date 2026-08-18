import React, { useEffect, useState } from 'react';
import type { Appointment, Service, Settings } from '../../types/models';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/Icon';
import { Button } from '../../components/Button';
import { Switch, LogoutConfirmDialog } from '../../components/Misc';
import { PhoneField, PasswordField } from '../../components/Fields';
import { Dialog } from '../../components/Dialog';
import AppointmentCard from '../../components/AppointmentCard';
import DeveloperCreditFooter from '../../components/DeveloperCreditFooter';
import AdminScheduleScreen from './AdminScheduleScreen';
import AdminClientsScreen from './AdminClientsScreen';
import { toLocalDisplay } from '../../utils/validators';
import { getTodayDateString } from '../../utils/dateFormatter';
import * as store from '../../data/store';

const DAY_LABELS: Record<number, string> = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' };

interface AdminSettingsScreenProps {
  settings: Settings;
  services?: Service[];
  allAppointments?: Appointment[];
  onRefresh: () => void;
}

export default function AdminSettingsScreen({ settings, services = [], allAppointments = [], onRefresh }: AdminSettingsScreenProps) {
  const { isDarkMode, setDarkMode, logout, changePassword } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showClients, setShowClients] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [birthdayCount, setBirthdayCount] = useState(0);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [managerName, setManagerName] = useState(settings.managerName);
  const [managerLocalPhone, setManagerLocalPhone] = useState(toLocalDisplay(settings.managerPhone));
  const [saved, setSaved] = useState(false);

  // Aviso de cumpleaños de hoy en la tarjeta de Clientes (puerto de
  // clientsWithBirthdayToday en AdminViewModel.kt).
  useEffect(() => {
    const todayMonthDay = getTodayDateString().slice(5);
    store
      .getAllClients()
      .then((clients) => setBirthdayCount(clients.filter((c) => c.birthday && c.birthday.slice(5) === todayMonthDay).length))
      .catch(() => setBirthdayCount(0));
  }, []);

  if (showSchedule) {
    return (
      <AdminScheduleScreen
        settings={settings}
        onBackClick={() => setShowSchedule(false)}
        onSaved={onRefresh}
      />
    );
  }

  if (showClients) {
    return <AdminClientsScreen onBackClick={() => setShowClients(false)} />;
  }

  const save = async () => {
    await store.saveSettings({
      managerName,
      managerPhone: `53${managerLocalPhone}`,
    });
    setSaved(true);
    onRefresh();
    setTimeout(() => setSaved(false), 2000);
  };

  const activeDaysLabel =
    settings.workingDays.length === 0
      ? 'Sin configurar'
      : settings.workingDays
          .slice()
          .sort()
          .map((d) => DAY_LABELS[d])
          .join(', ');

  return (
    <div className="device-scroll" style={{ overflowY: 'auto', padding: '16px 16px 32px' }}>
      {/* Registro Histórico de Citas (puerto de AdminSettingsScreen.kt):
          ver todas las citas con filtros y detalles. */}
      <div
        className="card flex items-center justify-between"
        style={{ background: 'var(--primary-container)', padding: '14px 16px', cursor: 'pointer' }}
        onClick={() => setShowHistoryDialog(true)}
      >
        <div className="flex items-center gap-3">
          <Icon name="history" size={24} style={{ color: 'var(--primary)' }} />
          <div>
            <p className="text-title-md fw-bold" style={{ margin: 0 }}>
              Registro Histórico de Citas
            </p>
            <p className="text-body-sm text-onSurfaceVariant" style={{ margin: '2px 0 0' }}>
              Ver todas las citas con filtros y detalles
            </p>
          </div>
        </div>
        <Icon name="search" size={22} style={{ color: 'var(--primary)' }} />
      </div>

      <p className="text-title-sm fw-bold text-onSurfaceVariant mt-6" style={{ padding: '0 4px 4px' }}>
        DATOS DEL ENCARGADO
      </p>
      <div className="card" style={{ background: 'var(--surface-variant)', padding: 16 }}>
        <label className="field">
          <span className="field-static-label">Nombre del encargado</span>
          <span className="field-input-wrap">
            <span className="field-icon">
              <Icon name="person" size={20} />
            </span>
            <input className="field-input" value={managerName} onChange={(e) => { setManagerName(e.target.value); setSaved(false); }} />
          </span>
        </label>
        <div className="mt-3">
          <PhoneField
            label="Teléfono (WhatsApp)"
            value={managerLocalPhone}
            onChange={(v) => {
              setManagerLocalPhone(v);
              setSaved(false);
            }}
          />
        </div>
      </div>

      <div className="mt-4">
        <Button full onClick={save}>
          {saved ? '✓ Guardado' : 'Guardar cambios'}
        </Button>
      </div>

      {/* Horario (turnos + días laborables), configurable de verdad: el admin
          puede crear tantos turnos como quiera, con la duración que quiera, y
          prender/apagar cualquier día de la semana. */}
      <p className="text-title-sm fw-bold text-onSurfaceVariant mt-6" style={{ padding: '0 4px 4px' }}>
        HORARIO
      </p>
      <div
        className="card flex items-center justify-between"
        style={{ background: 'var(--surface-variant)', padding: '14px 16px', cursor: 'pointer' }}
        onClick={() => setShowSchedule(true)}
      >
        <div className="flex items-center gap-3">
          <Icon name="schedule" size={22} style={{ color: 'var(--primary)' }} />
          <div>
            <p className="text-title-md fw-bold" style={{ margin: 0 }}>
              Horario
            </p>
            <p className="text-body-sm text-onSurfaceVariant" style={{ margin: '2px 0 0' }}>
              {activeDaysLabel} · {settings.activeSlots.length} turnos
            </p>
          </div>
        </div>
        <Icon name="chevron_right" size={22} style={{ color: 'var(--primary)' }} />
      </div>

      <p className="text-title-sm fw-bold text-onSurfaceVariant mt-6" style={{ padding: '0 4px 4px' }}>
        CLIENTES
      </p>
      <div
        className="card"
        style={{ background: 'var(--surface-variant)', padding: '14px 16px', cursor: 'pointer' }}
        onClick={() => setShowClients(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="groups" size={22} style={{ color: 'var(--primary)' }} />
            <p className="text-title-md fw-bold" style={{ margin: 0 }}>
              Directorio de clientes
            </p>
          </div>
          <Icon name="chevron_right" size={22} style={{ color: 'var(--primary)' }} />
        </div>
        {birthdayCount > 0 && (
          <p className="text-body-md" style={{ margin: '8px 0 0', color: '#8A6D00' }}>
            🎂 {birthdayCount} cliente(s) cumple(n) años hoy
          </p>
        )}
      </div>

      <p className="text-title-sm fw-bold text-onSurfaceVariant mt-6" style={{ padding: '0 4px 4px' }}>
        CUENTA
      </p>
      <div
        className="card flex items-center justify-between"
        style={{ background: 'var(--surface-variant)', padding: '14px 16px', cursor: 'pointer' }}
        onClick={() => {
          setShowPasswordDialog(true);
          setPasswordSaved(false);
          setPasswordError(null);
          setNewPassword('');
        }}
      >
        <div className="flex items-center gap-3">
          <Icon name="lock" size={22} style={{ color: 'var(--primary)' }} />
          <p className="text-title-md fw-bold" style={{ margin: 0 }}>
            Cambiar contraseña
          </p>
        </div>
        <Icon name="chevron_right" size={22} style={{ color: 'var(--primary)' }} />
      </div>

      <p className="text-title-sm fw-bold text-onSurfaceVariant mt-6" style={{ padding: '0 4px 4px' }}>
        PREFERENCIAS
      </p>
      <div className="card flex items-center gap-3" style={{ background: 'var(--surface-variant)', padding: '14px 16px' }}>
        <Icon name={isDarkMode ? 'brightness_7' : 'brightness_4'} size={22} style={{ color: 'var(--primary)' }} />
        <p className="text-body-lg" style={{ flex: 1, margin: 0 }}>
          Modo oscuro
        </p>
        <Switch checked={isDarkMode} onChange={setDarkMode} label="Modo oscuro" />
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

      {showHistoryDialog && (
        <HistoryDialog
          services={services}
          allAppointments={allAppointments}
          onDismiss={() => setShowHistoryDialog(false)}
        />
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

/**
 * Diálogo "Histórico de Citas" (puerto del AlertDialog de AdminSettingsScreen.kt):
 * busca por nombre/teléfono/ticket y filtra por fecha exacta (YYYY-MM-DD).
 */
function HistoryDialog({
  services,
  allAppointments,
  onDismiss,
}: {
  services: Service[];
  allAppointments: Appointment[];
  onDismiss: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const filtered = allAppointments.filter((appt) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      q === '' ||
      appt.fullName.toLowerCase().includes(q) ||
      appt.phone.includes(q) ||
      String(appt.ticketNumber).includes(q);
    const matchesDate = filterDate.trim() === '' || appt.appointmentDate === filterDate.trim();
    return matchesQuery && matchesDate;
  });

  return (
    <Dialog
      title={`Histórico de Citas (${filtered.length})`}
      onDismiss={onDismiss}
      actions={
        <Button variant="filled" onClick={onDismiss}>
          Cerrar
        </Button>
      }
    >
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        <label className="field">
          <span className="field-static-label">Buscar por nombre, teléfono o ticket</span>
          <span className="field-input-wrap">
            <span className="field-icon">
              <Icon name="search" size={20} />
            </span>
            <input className="field-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </span>
        </label>
        <div className="mt-2">
          <label className="field">
            <span className="field-static-label">Filtrar por fecha (YYYY-MM-DD)</span>
            <span className="field-input-wrap">
              <input
                className="field-input"
                placeholder="YYYY-MM-DD"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </span>
          </label>
        </div>
        <div className="flex-col gap-2 mt-3">
          {filtered.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              serviceName={store.serviceNameFor(services, appt.serviceId)}
            />
          ))}
        </div>
      </div>
    </Dialog>
  );
}
