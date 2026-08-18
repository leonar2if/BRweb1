import React, { useState } from 'react';
import type { Appointment, BlockedSlot, Service } from '../../types/models';
import AppointmentCard from '../../components/AppointmentCard';
import TimeSlotWidget from '../../components/TimeSlotWidget';
import BlockRestOfDayDialog, { AffectedClientsDialog } from '../../components/BlockRestOfDayDialog';
import { Button, IconButton } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { PhoneField } from '../../components/Fields';
import { useAuth } from '../../context/AuthContext';
import {
  formatDateForDisplay,
  formatTimeForDisplay,
  dateToString,
  stringToDate,
  getTodayDateString,
  getNowTimeString,
} from '../../utils/dateFormatter';
import { slotRangeFor } from '../../utils/slotSchedule';
import { COUNTRY_CODE } from '../../utils/validators';
import * as store from '../../data/store';

interface AdminAgendaScreenProps {
  services: Service[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  dayAppointments: Appointment[];
  dayBlockedSlots: BlockedSlot[];
  activeSlots?: string[];
  workingDays?: Set<number>;
  onRefresh: () => void;
}

type ViewMode = 'slots' | 'admin';

/**
 * Pestaña "AGENDA" (puerto directo de AdminCalendarScreen.kt): encabezado con
 * título "Agenda" y botón rojo "Día Libre" (BlockRestOfDayDialog de 3
 * opciones), chips "Vista turnos" (TimeSlotWidget por turno, con ocupación por
 * rango y tocar un turno libre abre la reserva rápida del admin) / "Vista
 * administrativa" (lista de citas con acciones), y calendario mensual siempre
 * visible donde el admin puede elegir cualquier día laborable futuro.
 */
export default function AdminAgendaScreen({
  services,
  selectedDate,
  onDateChange,
  dayAppointments,
  dayBlockedSlots,
  activeSlots = [],
  workingDays,
  onRefresh,
}: AdminAgendaScreenProps) {
  const { userId } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('slots');
  const [showDayOffDialog, setShowDayOffDialog] = useState(false);
  const [affectedClients, setAffectedClients] = useState<Appointment[] | null>(null);
  const [quickBookSlot, setQuickBookSlot] = useState<string | null>(null);

  const blockedTimes = new Set(dayBlockedSlots.map((b) => b.blockTime.slice(0, 5)));
  const isToday = selectedDate === getTodayDateString();
  const nonCanceledCount = dayAppointments.filter((a) => a.status !== 'canceled').length;

  // Igual que AdminCalendarScreen.kt: una cita ocupa service.durationSlots
  // turnos consecutivos desde su inicio, no solo el turno en el que empieza.
  const appointmentForSlot = (slot: string): Appointment | null => {
    for (const appt of dayAppointments) {
      if (appt.status === 'canceled') continue;
      const durationSlots = services.find((s) => s.id === appt.serviceId)?.durationSlots ?? 1;
      const range = slotRangeFor(appt.appointmentTime.slice(0, 5), durationSlots, activeSlots) ?? [
        appt.appointmentTime.slice(0, 5),
      ];
      if (range.includes(slot)) return appt;
    }
    return null;
  };

  const affectedCount = (fromTime: string | null, wholeDay: boolean): number => {
    const now = getNowTimeString();
    let slotsToCheck: string[];
    if (wholeDay) {
      slotsToCheck = activeSlots;
    } else {
      const start = fromTime ?? activeSlots.find((s) => s > now) ?? activeSlots[activeSlots.length - 1];
      const idx = Math.max(activeSlots.indexOf(start), 0);
      slotsToCheck = activeSlots.slice(idx);
    }
    return dayAppointments.filter(
      (a) =>
        a.status !== 'canceled' &&
        a.status !== 'attended' &&
        a.status !== 'no_show' &&
        slotsToCheck.includes(a.appointmentTime.slice(0, 5))
    ).length;
  };

  return (
    <div className="device-scroll" style={{ overflowY: 'auto', padding: '0 0 24px' }}>
      <div
        className="surface-variant"
        style={{ padding: '16px 16px 12px', boxShadow: 'var(--elevation-1, 0 1px 3px rgba(0,0,0,0.15))' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-title-lg fw-bold text-primary">Agenda</span>
          <Button variant="danger" small icon="block" onClick={() => setShowDayOffDialog(true)}>
            Día Libre
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            className="text-label-lg fw-bold"
            onClick={() => setViewMode('slots')}
            style={{
              border: 'none',
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: 'var(--radius-pill)',
              background: viewMode === 'slots' ? 'var(--primary-container)' : 'var(--surface-variant)',
              color: viewMode === 'slots' ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
            }}
          >
            Vista turnos
          </button>
          <button
            className="text-label-lg fw-bold"
            onClick={() => setViewMode('admin')}
            style={{
              border: 'none',
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: 'var(--radius-pill)',
              background: viewMode === 'admin' ? 'var(--primary-container)' : 'var(--surface-variant)',
              color: viewMode === 'admin' ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
            }}
          >
            Vista administrativa
          </button>
        </div>
      </div>

      <AdminMonthCalendar selectedDate={selectedDate} workingDays={workingDays} onDateSelected={onDateChange} />

      <p className="text-title-md fw-bold" style={{ padding: '8px 16px', margin: 0 }}>
        Reservas para {formatDateForDisplay(selectedDate)} ({nonCanceledCount}):
      </p>

      {viewMode === 'slots' ? (
        <div className="flex-col" style={{ padding: '0 8px' }}>
          {activeSlots.map((slot) => {
            const appt = appointmentForSlot(slot);
            const isBlocked = !appt && blockedTimes.has(slot);
            return (
              <TimeSlotWidget
                key={slot}
                time={slot}
                isOccupied={appt !== null}
                isBlocked={isBlocked}
                onClick={() => {
                  if (!appt && !isBlocked) setQuickBookSlot(slot);
                }}
              />
            );
          })}
        </div>
      ) : dayAppointments.length === 0 ? (
        <p className="text-body-md text-onSurfaceVariant text-center" style={{ padding: 32 }}>
          No hay reservas registradas en este día.
        </p>
      ) : (
        <div className="card-grid" style={{ padding: '0 12px' }}>
          {dayAppointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              serviceName={store.serviceNameFor(services, appt.serviceId)}
              isAdmin
              onCallClick={() => window.open(`tel:${COUNTRY_CODE}${appt.phone.replace(/\s|\+/g, '')}`, '_self')}
              onCancelClick={async () => {
                await store.updateAppointmentStatus(appt.id, 'canceled', 'admin');
                onRefresh();
              }}
              onAttendClick={async () => {
                await store.finalizeAppointment(appt.id, appt.phone);
                onRefresh();
              }}
            />
          ))}
        </div>
      )}

      {quickBookSlot && (
        <QuickAdminBookingDialog
          services={services}
          date={selectedDate}
          time={quickBookSlot}
          activeSlots={activeSlots}
          adminId={userId}
          onDismiss={() => setQuickBookSlot(null)}
          onBooked={() => {
            setQuickBookSlot(null);
            onRefresh();
          }}
        />
      )}

      {showDayOffDialog && (
        <BlockRestOfDayDialog
          timeSlots={activeSlots}
          currentTime={getNowTimeString()}
          isToday={isToday}
          affectedCount={affectedCount}
          onDismiss={() => setShowDayOffDialog(false)}
          onConfirm={async (fromTime, wholeDay) => {
            const affected = await store.blockRestOfDay(selectedDate, fromTime, activeSlots, wholeDay, userId);
            setShowDayOffDialog(false);
            onRefresh();
            if (affected.length > 0) setAffectedClients(affected);
          }}
        />
      )}

      {affectedClients && (
        <AffectedClientsDialog affected={affectedClients} onDismiss={() => setAffectedClients(null)} />
      )}
    </div>
  );
}

/**
 * Reserva rápida del admin al tocar un turno libre (puerto de
 * QuickAdminBookingDialog en AdminCalendarScreen.kt): lista de servicios con
 * radio buttons "Nombre (N turnos)" y nombre/teléfono opcionales del cliente.
 */
function QuickAdminBookingDialog({
  services,
  date,
  time,
  activeSlots,
  adminId,
  onDismiss,
  onBooked,
}: {
  services: Service[];
  date: string;
  time: string;
  activeSlots: string[];
  adminId: string;
  onDismiss: () => void;
  onBooked: () => void;
}) {
  const [service, setService] = useState<Service | null>(services[0] ?? null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!service) return;
    setIsLoading(true);
    setError(null);
    try {
      await store.createQuickAdminAppointment(date, time, service, name, phone, adminId, activeSlots);
      onBooked();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reservar el turno.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      title={`Reservar ${formatTimeForDisplay(time)} — ${formatDateForDisplay(date)}`}
      onDismiss={onDismiss}
      actions={
        <>
          <Button variant="text" onClick={onDismiss}>
            Cancelar
          </Button>
          <Button variant="filled" loading={isLoading} disabled={!service || isLoading} onClick={submit}>
            Reservar
          </Button>
        </>
      }
    >
      <p className="text-label-lg fw-bold" style={{ margin: '0 0 4px' }}>
        Servicio
      </p>
      <div style={{ maxHeight: 160, overflowY: 'auto' }}>
        {services.map((s) => (
          <label key={s.id} className="flex items-center gap-2" style={{ padding: '2px 0' }}>
            <input type="radio" checked={service?.id === s.id} onChange={() => setService(s)} />
            <span className="text-body-md">
              {s.name} ({s.durationSlots} turno{s.durationSlots > 1 ? 's' : ''})
            </span>
          </label>
        ))}
      </div>
      <p className="text-label-lg fw-bold text-onSurfaceVariant" style={{ margin: '12px 0 4px' }}>
        Datos del cliente (opcional)
      </p>
      <label className="field">
        <span className="field-static-label">Nombre (opcional)</span>
        <span className="field-input-wrap">
          <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
        </span>
      </label>
      <div className="mt-2">
        <PhoneField label="Teléfono (opcional)" value={phone} onChange={setPhone} />
      </div>
      {error && (
        <p className="text-body-sm mt-2" style={{ color: 'var(--error)' }}>
          {error}
        </p>
      )}
    </Dialog>
  );
}

/**
 * Calendario mensual del admin (puerto del CalendarScreen con getDayStatus de
 * AdminCalendarScreen.kt): días pasados o no laborables en gris, cualquier día
 * laborable futuro seleccionable en verde.
 */
function AdminMonthCalendar({
  selectedDate,
  workingDays,
  onDateSelected,
}: {
  selectedDate: string;
  workingDays?: Set<number>;
  onDateSelected: (date: string) => void;
}) {
  const selected = stringToDate(selectedDate) ?? new Date();
  const [year, setYear] = useState(selected.getFullYear());
  const [month, setMonth] = useState(selected.getMonth());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const firstDayOffset = (firstDayOfMonth - 1 + 7) % 7;
  const today = getTodayDateString();

  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;
  const rows: number[][] = [];
  for (let start = 0; start < totalCells; start += 7) {
    rows.push(Array.from({ length: 7 }, (_, i) => start + i));
  }

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  return (
    <div className="surface-variant" style={{ margin: '8px 16px 0', borderRadius: 'var(--radius-xl)', padding: 12 }}>
      <div className="flex items-center justify-between">
        <IconButton icon="chevron_left" label="Mes anterior" onClick={() => shiftMonth(-1)} />
        <span className="text-title-md">
          {new Date(year, month, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </span>
        <IconButton icon="chevron_right" label="Mes siguiente" onClick={() => shiftMonth(1)} />
      </div>
      <div style={{ marginTop: 6 }}>
        {rows.map((row, ri) => (
          <div key={ri} className="flex">
            {row.map((cell) => {
              const day = cell - firstDayOffset + 1;
              if (day < 1 || day > daysInMonth) return <div key={cell} style={{ flex: 1, height: 40 }} />;
              const dateString = dateToString(new Date(year, month, day));
              const isToday = dateString === today;
              const isSelected = dateString === selectedDate;
              const dow = new Date(year, month, day).getDay();
              const isWorking = !workingDays || workingDays.has(dow);
              // getDayStatus de la app: pasado o no laborable → gris (no
              // seleccionable); cualquier día laborable futuro → verde.
              const isSelectable = isWorking && dateString >= today;
              return (
                <div key={cell} style={{ flex: 1, height: 40, padding: 2 }}>
                  <button
                    onClick={() => isSelectable && onDateSelected(dateString)}
                    disabled={!isSelectable}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      border: isSelected ? '2px solid var(--primary)' : 'none',
                      background: isToday ? '#F9A825' : 'transparent',
                      color: isToday ? '#000' : isSelectable ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                      cursor: isSelectable ? 'pointer' : 'default',
                      fontWeight: isToday || isSelected ? 700 : 400,
                      opacity: isSelectable ? 1 : 0.4,
                    }}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
