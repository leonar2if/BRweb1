import React, { useMemo } from 'react';
import type { Appointment } from '../../types/models';
import { Button } from '../../components/Button';
import { LoadingIndicator } from '../../components/Misc';
import { formatDayName, getTodayDateString } from '../../utils/dateFormatter';

interface AdminTodayScreenProps {
  todayAppointments: Appointment[];
  isLoading: boolean;
  onStartDayClick: () => void;
}

/**
 * Pestaña "HOY" del administrador — estado inactivo (por defecto). Puerto
 * de AdminAgendaScreen.kt: "Hoy" grande, fecha debajo, cantidad de turnos
 * pendientes, y el botón INICIAR DÍA que abre la galería (AdminTodayGallery).
 */
export default function AdminTodayScreen({ todayAppointments, isLoading, onStartDayClick }: AdminTodayScreenProps) {
  const today = useMemo(() => getTodayDateString(), []);
  const pendingCount = todayAppointments.filter((a) => a.status === 'confirmed' || a.status === 'in_progress').length;

  if (isLoading) {
    return (
      <div className="device-scroll">
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <div
      className="device-scroll flex-col items-center justify-center"
      style={{ padding: 24, textAlign: 'center' }}
    >
      <h1 className="text-display-md fw-extrabold text-primary" style={{ margin: 0 }}>
        Hoy
      </h1>
      <p className="text-body-md text-onSurfaceVariant mt-1" style={{ margin: '6px 0 0' }}>
        {formatDayName(today)}
      </p>

      <div
        className="surface-variant mt-8"
        style={{ borderRadius: 'var(--radius-2xl)', padding: '20px 32px', marginTop: 40 }}
      >
        <p className="text-display-lg fw-bold text-primary" style={{ margin: 0, fontSize: 56 }}>
          {pendingCount}
        </p>
        <p className="text-body-lg text-onSurfaceVariant" style={{ margin: 0 }}>
          {pendingCount === 1 ? 'turno pendiente para hoy' : 'turnos pendientes para hoy'}
        </p>
      </div>

      <div className="mt-8" style={{ width: '80%', maxWidth: 320, marginTop: 48 }}>
        <Button full large variant="success" icon="play_arrow" onClick={onStartDayClick}>
          INICIAR DÍA
        </Button>
      </div>
    </div>
  );
}
