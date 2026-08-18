import React, { useState } from 'react';
import type { Appointment } from '../types/models';
import Icon from './Icon';
import { Button } from './Button';
import ClientNotesSection from './ClientNotesSection';

interface AppointmentCardProps {
  appointment: Appointment;
  serviceName?: string;
  isAdmin?: boolean;
  onCallClick?: () => void;
  onCancelClick?: () => void;
  onAttendClick?: () => void;
  onCardClick?: () => void;
}

// Puerto de AppointmentCard.kt: no_show se muestra como "Ausente" en rojo.
const STATUS_COLOR: Record<string, string> = {
  attended: 'var(--slot-free)',
  canceled: 'var(--slot-occupied)',
  no_show: '#D32F2F',
  in_progress: '#EF6C00',
  confirmed: 'var(--primary)',
};

const STATUS_TEXT: Record<string, string> = {
  attended: 'Atendido',
  canceled: 'Cancelado',
  no_show: 'Ausente',
  in_progress: 'En curso',
  confirmed: 'Confirmado',
};

export default function AppointmentCard({
  appointment,
  serviceName = 'Servicio de Barbería',
  isAdmin = false,
  onCallClick,
  onCancelClick,
  onAttendClick,
  onCardClick,
}: AppointmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColor = STATUS_COLOR[appointment.status] ?? 'var(--primary)';
  const statusText = STATUS_TEXT[appointment.status] ?? 'Confirmado';

  const clientDisplayName = [appointment.fullName, appointment.lastName1, appointment.lastName2]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    <div
      className="card list-item-card"
      onClick={() => (isAdmin ? setIsExpanded((v) => !v) : onCardClick?.())}
      style={{
        padding: 16,
        cursor: isAdmin || onCardClick ? 'pointer' : 'default',
        background: 'color-mix(in srgb, var(--surface-variant) 50%, transparent)',
        boxShadow: 'var(--elevation-2)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isAdmin && (
            <span
              className="text-label-lg fw-bold"
              style={{
                background: `color-mix(in srgb, ${statusColor} 15%, transparent)`,
                color: statusColor,
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
              }}
            >
              Ticket #{appointment.ticketNumber}
            </span>
          )}
          <span className="text-title-md fw-bold">{appointment.appointmentTime.slice(0, 5)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-body-sm fw-semibold" style={{ color: statusColor }}>
            {statusText}
          </span>
          {isAdmin && <Icon name={isExpanded ? 'expand_less' : 'expand_more'} size={20} style={{ color: 'var(--on-surface-variant)' }} />}
        </div>
      </div>

      <div className="mt-2 text-title-sm fw-semibold text-primary">{serviceName}</div>
      <div className="text-body-md text-onSurfaceVariant">
        Cliente: {clientDisplayName || 'Cliente'}
      </div>

      {appointment.isAnnexed && (
        <div className="text-body-sm" style={{ color: 'var(--tertiary)' }}>
          ⚠️ Reserva anexada para otra persona
        </div>
      )}

      {isAdmin && isExpanded && (
        <div className="mt-3" style={{ borderTop: '1px solid color-mix(in srgb, var(--on-surface-variant) 20%, transparent)', paddingTop: 8 }}>
          <p className="text-body-sm">Teléfono: {appointment.phone}</p>
          <p className="text-body-sm">
            Reservado por: {appointment.createdByAdmin ? 'Administrador' : 'Cliente (App)'}
          </p>

          <ClientNotesSection clientPhone={appointment.phone} clientName={clientDisplayName || 'Cliente'} />

          {(appointment.status === 'confirmed' || appointment.status === 'in_progress') && (
            <div className="flex mt-3" style={{ justifyContent: 'space-evenly' }} onClick={(e) => e.stopPropagation()}>
              {onCallClick && (
                <Button variant="outlined" small icon="call" onClick={onCallClick}>
                  Llamar
                </Button>
              )}
              {onCancelClick && (
                <Button variant="outlined-error" small icon="close" onClick={onCancelClick}>
                  Cancelar
                </Button>
              )}
              {onAttendClick && (
                <Button variant="success" small onClick={onAttendClick}>
                  <Icon name="check" size={16} />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
