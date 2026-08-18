import React, { useState } from 'react';
import type { Appointment } from '../types/models';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { COUNTRY_CODE } from '../utils/validators';

type Option = 'now' | 'fromSlot' | 'wholeDay';

interface BlockRestOfDayDialogProps {
  timeSlots: string[];
  currentTime: string;
  isToday: boolean;
  /** Cuántas reservas activas caerían en el rango elegido (para el aviso del paso de confirmación). */
  affectedCount: (fromTime: string | null, wholeDay: boolean) => number;
  onDismiss: () => void;
  onConfirm: (fromTime: string | null, wholeDay: boolean) => void;
}

/**
 * Diálogo del botón ⊘ "Marcar como no disponible" (puerto de
 * BlockRestOfDayDialog en AdminTurnScreen.kt): elegir "Desde ahora" (todos
 * los turnos restantes), "Desde un turno" (turno elegido en adelante) o "Día
 * completo", con confirmación final antes de aplicar. Si hay reservas
 * afectadas, avisa de que se cancelarán y el cliente recibirá un aviso.
 */
export default function BlockRestOfDayDialog({
  timeSlots,
  currentTime,
  isToday,
  affectedCount,
  onDismiss,
  onConfirm,
}: BlockRestOfDayDialogProps) {
  const [option, setOption] = useState<Option>(isToday ? 'now' : 'fromSlot');
  const [selectedSlot, setSelectedSlot] = useState(
    timeSlots.find((s) => s > currentTime) ?? timeSlots[timeSlots.length - 1]
  );
  const [step, setStep] = useState<'choose' | 'confirm'>('choose');

  const wholeDay = option === 'wholeDay';
  const fromTime = option === 'now' || wholeDay ? null : selectedSlot;
  const slotIndex = fromTime ? timeSlots.indexOf(fromTime) + 1 : null;
  const affected = affectedCount(fromTime, wholeDay);

  if (step === 'confirm') {
    return (
      <Dialog
        title="Confirmar"
        onDismiss={() => setStep('choose')}
        actions={
          <>
            <Button variant="text" onClick={() => setStep('choose')}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => onConfirm(fromTime, wholeDay)}>
              Confirmar
            </Button>
          </>
        }
      >
        <p style={{ margin: 0 }}>
          {wholeDay
            ? '¿Seguro que quieres dejar el día completo libre?'
            : fromTime === null
            ? '¿Seguro que quieres dejar el resto del día libre desde ahora?'
            : `¿Seguro que quieres dejar el resto del día libre desde el turno ${slotIndex} — ${fromTime}?`}
        </p>
        {affected > 0 && (
          <p className="text-body-sm mt-2" style={{ color: 'var(--error)', margin: '8px 0 0' }}>
            Esto afectará {affected} reserva(s) existente(s): se cancelarán y el cliente recibirá un aviso.
          </p>
        )}
      </Dialog>
    );
  }

  return (
    <Dialog
      title="Marcar como no disponible"
      onDismiss={onDismiss}
      actions={
        <>
          <Button variant="text" onClick={onDismiss}>
            Cancelar
          </Button>
          <Button variant="filled" onClick={() => setStep('confirm')}>
            Continuar
          </Button>
        </>
      }
    >
      {isToday && (
        <label className="flex items-center gap-2" style={{ padding: '6px 0' }}>
          <input type="radio" checked={option === 'now'} onChange={() => setOption('now')} />
          <span className="text-body-lg">Desde ahora</span>
        </label>
      )}
      <label className="flex items-center gap-2" style={{ padding: '6px 0' }}>
        <input type="radio" checked={option === 'fromSlot'} onChange={() => setOption('fromSlot')} />
        <span className="text-body-lg">Desde un turno</span>
      </label>
      <label className="flex items-center gap-2" style={{ padding: '6px 0' }}>
        <input type="radio" checked={option === 'wholeDay'} onChange={() => setOption('wholeDay')} />
        <span className="text-body-lg">Día completo</span>
      </label>

      {option === 'fromSlot' && (
        <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 8 }}>
          {timeSlots.map((slot, i) => (
            <label key={slot} className="flex items-center gap-2" style={{ padding: '2px 0' }}>
              <input type="radio" checked={selectedSlot === slot} onChange={() => setSelectedSlot(slot)} />
              <span className="text-body-md">
                Turno {i + 1} — {slot}
              </span>
            </label>
          ))}
        </div>
      )}
    </Dialog>
  );
}

/**
 * Lista de clientes afectados por un bloqueo de día/turnos, con botón para
 * llamarlos (puerto de AffectedClientsDialog en AdminTurnScreen.kt).
 */
export function AffectedClientsDialog({ affected, onDismiss }: { affected: Appointment[]; onDismiss: () => void }) {
  return (
    <Dialog
      title="Clientes afectados"
      onDismiss={onDismiss}
      actions={
        <Button variant="filled" onClick={onDismiss}>
          Listo
        </Button>
      }
    >
      <p className="text-body-sm text-onSurfaceVariant" style={{ margin: '0 0 8px' }}>
        Ya se les canceló el turno y se les avisó en la app. Podés llamarlos igual si querés avisarles personalmente:
      </p>
      {affected.map((appt) => (
        <div
          key={appt.id}
          className="flex items-center justify-between"
          style={{ padding: '6px 0' }}
        >
          <div>
            <p className="text-body-md" style={{ margin: 0 }}>
              {appt.fullName.trim() !== '' ? appt.fullName : 'Cliente'}
            </p>
            <p className="text-label-sm text-onSurfaceVariant" style={{ margin: 0 }}>
              {appt.appointmentTime.slice(0, 5)}
            </p>
          </div>
          {appt.phone.trim() !== '' && (
            <a href={`tel:${COUNTRY_CODE}${appt.phone.replace(/\s|\+/g, '')}`} style={{ textDecoration: 'none' }}>
              <Button variant="text" small>
                Llamar
              </Button>
            </a>
          )}
        </div>
      ))}
    </Dialog>
  );
}
