import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Appointment, Profile, Service } from '../../types/models';
import Icon from '../../components/Icon';
import { Button, IconButton } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import ClientNotesSection from '../../components/ClientNotesSection';
import {
  buildTodaySlots,
  freeSlotStatusText,
  TodaySlotItem,
} from '../../utils/todaySlotBuilder';
import { getNowTimeString, getTodayDateString } from '../../utils/dateFormatter';
import BlockRestOfDayDialog, { AffectedClientsDialog } from '../../components/BlockRestOfDayDialog';
import { useAuth } from '../../context/AuthContext';
import * as store from '../../data/store';

interface AdminTodayGalleryProps {
  todayAppointments: Appointment[];
  services: Service[];
  activeSlots: string[];
  onClose: () => void;
  onRefresh: () => void;
}

const TAG_COLORS: Record<string, string> = {
  LIBRE: 'var(--slot-free)',
  OCUPADO: 'var(--slot-occupied)',
  ACTUAL: '#F9A825',
  PASADO: '#9E9E9E',
  CANCELADO: '#9E9E9E',
};

/** Puerto de AdminTurnScreen.kt (versión "galería"): lista de turnos + detalle con carrusel. */
export default function AdminTodayGallery({
  todayAppointments,
  services,
  activeSlots,
  onClose,
  onRefresh,
}: AdminTodayGalleryProps) {
  const [nowTick, setNowTick] = useState(getNowTimeString());
  useEffect(() => {
    const t = window.setInterval(() => setNowTick(getNowTimeString()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const items = useMemo(
    () => buildTodaySlots(todayAppointments, nowTick, services, activeSlots),
    [todayAppointments, nowTick, services, activeSlots]
  );

  const { userId } = useAuth();
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showEndDayDialog, setShowEndDayDialog] = useState(false);
  const [affectedClients, setAffectedClients] = useState<Appointment[]>([]);

  if (galleryIndex !== null) {
    const item = items[galleryIndex];
    return (
      <div className="flex-col" style={{ height: '100%' }}>
        <div className="surface-variant flex items-center justify-between" style={{ padding: 8, boxShadow: 'var(--elevation-2)' }}>
          <IconButton icon="arrow_back" label="Volver a la lista" onClick={() => setGalleryIndex(null)} />
          <span className="text-title-sm fw-bold">
            Turno {galleryIndex + 1}/{items.length}
          </span>
          <div className="flex">
            <IconButton
              icon="chevron_left"
              label="Anterior"
              disabled={galleryIndex === 0}
              onClick={() => setGalleryIndex((i) => Math.max(0, (i ?? 0) - 1))}
            />
            <IconButton
              icon="chevron_right"
              label="Siguiente"
              disabled={galleryIndex === items.length - 1}
              onClick={() => setGalleryIndex((i) => Math.min(items.length - 1, (i ?? 0) + 1))}
            />
          </div>
        </div>
        <div className="device-scroll" style={{ overflowY: 'auto' }}>
          {item.appointment ? (
            <OccupiedTurnDetail
              appointment={item.appointment}
              serviceName={services.find((s) => s.id === item.appointment!.serviceId)?.name ?? 'Servicio de Barbería'}
              onRefresh={onRefresh}
            />
          ) : (
            <FreeTurnDetail
              {...freeSlotStatusText(items, item.time, nowTick)}
              isCanceled={item.canceledAppointment !== null}
            />
          )}
        </div>
      </div>
    );
  }

  const attended = todayAppointments.filter((a) => a.status === 'attended').length;
  const canceled = todayAppointments.filter((a) => a.status === 'canceled').length;
  const rescheduled = todayAppointments.filter((a) => a.isRescheduled).length;
  const unattended = todayAppointments.filter((a) => a.status === 'confirmed' || a.status === 'in_progress').length;
  const estRevenue = todayAppointments
    .filter((a) => a.status === 'attended')
    .reduce((sum, a) => sum + (services.find((s) => s.id === a.serviceId)?.price ?? 15), 0);

  return (
    <div className="flex-col" style={{ height: '100%', position: 'relative' }}>
      <div className="surface-variant flex items-center justify-between" style={{ padding: 8, boxShadow: 'var(--elevation-2)' }}>
        <div className="flex items-center">
          <IconButton icon="arrow_back" label="Volver" onClick={onClose} />
          <span className="text-title-md fw-bold">Hoy</span>
        </div>
        <IconButton icon="block" label="Tomarse libre el resto del día" color="var(--error)" onClick={() => setShowBlockDialog(true)} />
      </div>

      <div className="device-scroll" style={{ overflowY: 'auto', padding: '12px 12px 90px' }}>
        {items.map((item, index) => (
          <TodaySlotRow key={item.time} item={item} onCardClick={() => item.appointment && setGalleryIndex(index)} onRefresh={onRefresh} />
        ))}
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 16, display: 'flex', justifyContent: 'center' }}>
        <Button variant="danger" large icon="stop_circle" onClick={() => setShowEndDayDialog(true)}>
          FINALIZAR DÍA
        </Button>
      </div>

      {showBlockDialog && (
        <BlockRestOfDayDialog
          timeSlots={activeSlots}
          currentTime={nowTick}
          isToday
          affectedCount={(fromTime, wholeDay) => {
            const slotsToCheck = wholeDay
              ? activeSlots
              : (() => {
                  const start =
                    fromTime ?? activeSlots.find((s) => s > nowTick) ?? activeSlots[activeSlots.length - 1];
                  const idx = Math.max(0, activeSlots.indexOf(start));
                  return activeSlots.slice(idx);
                })();
            return todayAppointments.filter(
              (a) =>
                a.status !== 'canceled' &&
                a.status !== 'attended' &&
                a.status !== 'no_show' &&
                slotsToCheck.includes(a.appointmentTime.slice(0, 5))
            ).length;
          }}
          onDismiss={() => setShowBlockDialog(false)}
          onConfirm={async (fromTime, wholeDay) => {
            const affected = await store.blockRestOfDay(getTodayDateString(), fromTime, activeSlots, wholeDay, userId);
            setShowBlockDialog(false);
            if (affected.length > 0) setAffectedClients(affected);
            onRefresh();
          }}
        />
      )}

      {affectedClients.length > 0 && (
        <AffectedClientsDialog affected={affectedClients} onDismiss={() => setAffectedClients([])} />
      )}

      {showEndDayDialog && (
        <Dialog
          title="Resumen del Día"
          onDismiss={() => setShowEndDayDialog(false)}
          actions={
            <>
              <Button variant="text" onClick={() => setShowEndDayDialog(false)}>
                Volver
              </Button>
              <Button
                variant="success"
                onClick={() => {
                  setShowEndDayDialog(false);
                  onClose();
                }}
              >
                Confirmar y Cerrar Día
              </Button>
            </>
          }
        >
          <div className="flex-col gap-1">
            {unattended > 0 && (
              <p className="fw-bold" style={{ color: 'var(--error)', margin: 0 }}>
                ⚠️ Quedan {unattended} turnos sin atender.
              </p>
            )}
            <p style={{ margin: 0 }}>📊 Total citas: {todayAppointments.length}</p>
            <p style={{ margin: 0 }}>✅ Atendidos: {attended}</p>
            <p style={{ margin: 0 }}>❌ Cancelados: {canceled}</p>
            <p style={{ margin: 0 }}>📅 Reprogramados: {rescheduled}</p>
            <p className="fw-bold text-body-lg mt-2" style={{ margin: '8px 0 0' }}>
              💰 Ingresos estimados: {estRevenue} €
            </p>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function TodaySlotRow({
  item,
  onCardClick,
  onRefresh,
}: {
  item: TodaySlotItem;
  onCardClick: () => void;
  onRefresh: () => void;
}) {
  const tagColor = TAG_COLORS[item.tag];
  const tagText = item.tag === 'OCUPADO' && item.isContinuation ? 'OCUPADO (cont.)' : item.tag;

  return (
    <div
      className="card"
      onClick={item.appointment ? onCardClick : undefined}
      style={{
        margin: '4px 0',
        padding: '12px 14px',
        cursor: item.appointment ? 'pointer' : 'default',
        border: item.isCurrent ? '2px solid #F9A825' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
        <span className="text-title-md fw-bold">{item.time}</span>
        {item.icon === 'PENDING_CLOCK' && <Icon name="schedule" size={20} style={{ color: '#F9A825' }} />}
        {item.icon === 'CONFIRMED_CHECK' && <Icon name="check" size={20} style={{ color: 'var(--slot-free)' }} />}
        {item.icon === 'CANCELED_X' && <Icon name="close" size={20} style={{ color: 'var(--slot-occupied)' }} />}
        {item.appointment && (
          <span
            className="text-body-md text-onSurfaceVariant"
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {item.appointment.fullName}
          </span>
        )}
      </div>

      <span
        className="text-label-sm fw-bold"
        style={{ background: `color-mix(in srgb, ${tagColor} 15%, transparent)`, color: tagColor, borderRadius: 'var(--radius-sm)', padding: '4px 8px', whiteSpace: 'nowrap' }}
      >
        {tagText}
      </span>

      {item.showCheckButton && item.appointment && (
        <IconButton
          icon="check"
          label="Marcar atendido"
          size={20}
          color="var(--slot-free)"
          onClick={async (e) => {
            e.stopPropagation();
            await store.finalizeAppointment(item.appointment!.id, item.appointment!.phone);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function OccupiedTurnDetail({
  appointment,
  serviceName,
  onRefresh,
}: {
  appointment: Appointment;
  serviceName: string;
  onRefresh: () => void;
}) {
  const [isFinalized, setIsFinalized] = useState(appointment.status === 'attended');
  const [noShowConfirmed, setNoShowConfirmed] = useState(false);
  const [clientProfile, setClientProfile] = useState<Profile | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (appointment.phone) store.getProfileByPhone(appointment.phone).then(setClientProfile);
  }, [appointment.phone]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const clientDisplayName = [appointment.fullName, appointment.lastName1, appointment.lastName2].filter(Boolean).join(' ').trim();
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="flex-col items-center" style={{ padding: 20, minHeight: '100%' }}>
      <span
        className="text-title-sm fw-extrabold"
        style={{ background: 'var(--primary)', color: 'var(--on-primary)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', marginTop: 8 }}
      >
        {appointment.appointmentTime.slice(0, 5)} · Ticket #{appointment.ticketNumber}
      </span>

      <h2 className="text-headline-sm fw-bold text-center mt-4" style={{ margin: '16px 0 0' }}>
        {clientDisplayName || 'Cliente'}
      </h2>
      {appointment.phone && <p className="text-body-md text-onSurfaceVariant" style={{ margin: 0 }}>{appointment.phone}</p>}

      {clientProfile && (
        <div className="flex items-center gap-1 mt-1">
          <Icon name="check" size={14} style={{ color: 'var(--slot-free)' }} />
          <span className="text-label-md text-onSurfaceVariant">{clientProfile.visitCount}</span>
          <Icon name="close" size={14} style={{ color: 'var(--slot-occupied)', marginLeft: 8 }} />
          <span className="text-label-md text-onSurfaceVariant">{clientProfile.noShowCount}</span>
        </div>
      )}

      <div className="flex items-center gap-1 mt-2">
        <Icon name="content_cut" size={18} style={{ color: 'var(--primary)' }} />
        <span className="text-title-sm fw-semibold text-primary">{serviceName}</span>
      </div>

      {appointment.isAnnexed && (
        <p className="text-body-sm mt-1" style={{ color: 'var(--tertiary)' }}>
          ⚠️ Reserva anexada para otra persona
        </p>
      )}

      <div className="flex mt-5 gap-2 w-full">
        <a href={`tel:${appointment.phone.replace(/\s|\+/g, '')}`} style={{ flex: 1, textDecoration: 'none' }}>
          <Button variant="outlined" full disabled={!appointment.phone || isFinalized} icon="call">
            Llamar
          </Button>
        </a>
        <Button
          variant="outlined-error"
          full
          disabled={isFinalized}
          icon="close"
          onClick={async () => {
            await store.updateAppointmentStatus(appointment.id, 'canceled', 'admin');
            onRefresh();
          }}
        >
          Cancelar
        </Button>
      </div>

      <div className="mt-5 w-full">
        <ClientNotesSection clientPhone={appointment.phone} clientName={clientDisplayName || 'Cliente'} />
      </div>

      <div className="surface-variant flex items-center gap-3 mt-5" style={{ borderRadius: 'var(--radius-xl)', padding: '10px 16px' }}>
        <Icon name="schedule" size={20} style={{ color: 'var(--primary)' }} />
        <span className="text-title-md fw-bold">{timeStr}</span>
        <Button variant="outlined" small disabled={isFinalized} onClick={() => setIsTimerRunning((v) => !v)}>
          <Icon name={isTimerRunning ? 'pause' : 'play_arrow'} size={16} />
          {isTimerRunning ? 'Pausar' : 'Iniciar cronómetro'}
        </Button>
      </div>

      <div className="flex items-center gap-2 mt-6 w-full" style={{ marginTop: 'auto', paddingTop: 24 }}>
        <Button
          variant="success"
          full
          large
          icon="check"
          disabled={isFinalized}
          onClick={async () => {
            await store.finalizeAppointment(appointment.id, appointment.phone);
            setIsFinalized(true);
            setIsTimerRunning(false);
            onRefresh();
          }}
        >
          FINALIZADO
        </Button>
        <IconButton
          icon="close"
          label="No vino"
          size={20}
          color="var(--slot-occupied)"
          disabled={isFinalized || noShowConfirmed}
          onClick={async () => {
            await store.markAsNoShow(appointment.id, appointment.phone);
            setNoShowConfirmed(true);
            onRefresh();
          }}
        />
      </div>
    </div>
  );
}

function FreeTurnDetail({ title, subtitle, isCanceled }: { title: string; subtitle: string | null; isCanceled: boolean }) {
  return (
    <div className="flex items-center justify-center" style={{ height: '100%', padding: 24 }}>
      <div className="surface-variant text-center" style={{ borderRadius: 'var(--radius-2xl)', padding: 32 }}>
        <p className="text-title-lg fw-bold" style={{ margin: 0 }}>
          {isCanceled ? 'Este turno fue cancelado' : title}
        </p>
        {!isCanceled && subtitle && (
          <p className="text-body-md text-onSurfaceVariant mt-2" style={{ margin: '8px 0 0' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}


