import React, { useState } from 'react';
import type { Settings } from '../../types/models';
import Icon from '../../components/Icon';
import { Button, IconButton } from '../../components/Button';
import { Switch } from '../../components/Misc';
import { ALL_DAY_CODES_IN_ORDER, dayLabel } from '../../utils/slotSchedule';
import { formatTimeForDisplay } from '../../utils/dateFormatter';
import * as store from '../../data/store';

interface AdminScheduleScreenProps {
  settings: Settings;
  onBackClick: () => void;
  onSaved: () => void;
}

const TIME_REGEX = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Pestaña "Horario" en Ajustes — puerto de AdminScheduleScreen.kt. Reemplaza
 * el viejo diálogo que solo dejaba tocar los días laborables: ahora el admin
 * también puede agregar/quitar turnos individuales, sin cantidad ni duración
 * fija. Por defecto se mantienen los 12 turnos oficiales hasta que el admin
 * toque algo acá.
 */
const INDEX_TO_DAY_CODE: Record<number, string> = { 0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT' };

export default function AdminScheduleScreen({ settings, onBackClick, onSaved }: AdminScheduleScreenProps) {
  const [selectedDays, setSelectedDays] = useState<Set<string>>(
    () => new Set(settings.workingDays.map((i) => INDEX_TO_DAY_CODE[i]).filter(Boolean))
  );
  const [slots, setSlots] = useState<string[]>([...settings.activeSlots]);
  const [newSlotTime, setNewSlotTime] = useState('');
  const [slotError, setSlotError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const toggleDay = (code: string) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const addSlot = () => {
    if (!TIME_REGEX.test(newSlotTime)) {
      setSlotError('Formato inválido');
      return;
    }
    if (slots.includes(newSlotTime)) {
      setSlotError('Ese turno ya existe');
      return;
    }
    setSlots((prev) => [...prev, newSlotTime].sort());
    setNewSlotTime('');
    setSlotError(null);
  };

  const removeSlot = (slot: string) => {
    setSlots((prev) => prev.filter((s) => s !== slot));
  };

  const restoreDefaults = () => {
    setSelectedDays(new Set(['MON', 'TUE', 'WED', 'THU', 'FRI']));
    setSlots([
      '10:00', '10:30', '11:00', '11:30',
      '13:00', '14:00', '14:30', '15:00',
      '16:00', '16:30', '17:00', '17:30',
    ]);
    setSlotError(null);
  };

  const save = async () => {
    setIsSaving(true);
    const dayIndices = Array.from(selectedDays).map((code) => dayCodeToIndex(code));
    await store.saveSettings({ workingDays: dayIndices, activeSlots: slots });
    setIsSaving(false);
    onSaved();
    onBackClick();
  };

  const canSave = selectedDays.size > 0 && slots.length > 0;

  return (
    <div className="device-scroll" style={{ overflowY: 'auto' }}>
      <div className="flex items-center justify-between" style={{ padding: 8 }}>
        <div className="flex items-center">
          <IconButton icon="arrow_back" label="Volver" onClick={onBackClick} />
          <span className="text-title-md fw-bold">Horario</span>
        </div>
        <Button variant="text" small icon="refresh" onClick={restoreDefaults}>
          Restaurar
        </Button>
      </div>

      <div style={{ padding: '0 16px 32px' }}>
        <p className="text-title-md fw-bold">Días laborables</p>
        <p className="text-body-sm text-onSurfaceVariant mt-1">
          Si apagás un día, el calendario y las reservas de clientes lo reflejan al instante en toda la app.
        </p>
        <div className="mt-3">
          {ALL_DAY_CODES_IN_ORDER.map((code) => (
            <div key={code} className="flex items-center justify-between" style={{ padding: '8px 0' }}>
              <span className="text-body-lg">{dayLabel(code)}</span>
              <Switch checked={selectedDays.has(code)} onChange={() => toggleDay(code)} label={dayLabel(code)} />
            </div>
          ))}
          {selectedDays.size === 0 && (
            <p className="text-body-sm" style={{ color: 'var(--error)' }}>
              Tiene que quedar al menos un día laborable.
            </p>
          )}
        </div>

        <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--outline-variant)' }} />

        <p className="text-title-md fw-bold">Turnos del día ({slots.length})</p>
        <p className="text-body-sm text-onSurfaceVariant mt-1">
          Agregá o quitá los turnos que quiera: cantidad, horarios y descansos, todo libre. No hay un número fijo.
        </p>

        <div className="mt-3">
          {slots.length === 0 ? (
            <p className="text-body-sm" style={{ color: 'var(--error)' }}>
              Sin turnos configurados.
            </p>
          ) : (
            [...slots].sort().map((slot) => (
              <div key={slot} className="flex items-center justify-between" style={{ padding: '4px 0' }}>
                <span className="text-body-md">
                  {formatTimeForDisplay(slot)} ({slot})
                </span>
                <IconButton icon="close" label={`Quitar turno ${slot}`} color="var(--error)" onClick={() => removeSlot(slot)} />
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <label className="field" style={{ flex: 1 }}>
            <span className="field-static-label">Nuevo turno (HH:mm, ej. 09:15)</span>
            <span className={`field-input-wrap ${slotError ? 'has-error' : ''}`}>
              <input
                className="field-input"
                value={newSlotTime}
                onChange={(e) => {
                  setNewSlotTime(e.target.value.replace(/[^0-9:]/g, '').slice(0, 5));
                  setSlotError(null);
                }}
              />
            </span>
          </label>
          <div style={{ marginTop: 20 }}>
            <IconButton icon="add" label="Agregar turno" onClick={addSlot} />
          </div>
        </div>
        {slotError && (
          <p className="text-body-sm mt-1" style={{ color: 'var(--error)' }}>
            {slotError}
          </p>
        )}

        <div className="mt-6">
          <Button full large loading={isSaving} disabled={!canSave || isSaving} onClick={save}>
            Guardar horario
          </Button>
        </div>
      </div>
    </div>
  );
}

function dayCodeToIndex(code: string): number {
  const map: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
  return map[code] ?? 1;
}
