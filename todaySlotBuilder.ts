// Puerto directo de app/src/main/java/com/example/ui/admin/TodaySlotState.kt

import type { Appointment, Service } from '../types/models';
import { formatTimeForDisplay, getNowTimeString } from './dateFormatter';
import { DEFAULT_SLOTS, slotRangeFor } from './slotSchedule';

export type TagKind = 'LIBRE' | 'OCUPADO' | 'ACTUAL' | 'PASADO' | 'CANCELADO';
export type IconKind = 'NONE' | 'PENDING_CLOCK' | 'CONFIRMED_CHECK' | 'CANCELED_X';

export interface TodaySlotItem {
  time: string;
  appointment: Appointment | null; // null = libre
  canceledAppointment: Appointment | null;
  tag: TagKind;
  icon: IconKind;
  isCurrent: boolean;
  showCheckButton: boolean;
  isContinuation: boolean;
}

/**
 * Arma la lista de turnos del día a partir de las citas de hoy. "Actual" =
 * el último turno cuya hora ya llegó (hora <= ahora).
 */
export function buildTodaySlots(
  appointments: Appointment[],
  nowTime: string = getNowTimeString(),
  services: Service[] = [],
  slots: string[] = DEFAULT_SLOTS
): TodaySlotItem[] {
  const currentSlot = [...slots].filter((s) => s <= nowTime).pop() ?? null;

  // Para cada cita activa, calcula TODOS los turnos que ocupa según la
  // duración de su servicio, no solo el turno de inicio.
  const slotOwner = new Map<string, { appt: Appointment; isStart: boolean }>();
  appointments
    .filter((a) => a.status !== 'canceled')
    .forEach((appt) => {
      const durationSlots = services.find((s) => s.id === appt.serviceId)?.durationSlots ?? 1;
      const range = slotRangeFor(appt.appointmentTime.slice(0, 5), durationSlots, slots) ?? [
        appt.appointmentTime.slice(0, 5),
      ];
      range.forEach((s, index) => {
        if (!slotOwner.has(s) || index === 0) {
          slotOwner.set(s, { appt, isStart: index === 0 });
        }
      });
    });

  return slots.map((slot) => {
    const owner = slotOwner.get(slot);
    const active = owner?.appt ?? null;
    const isStart = owner?.isStart ?? true;
    const canceled = !active
      ? appointments.find((a) => a.status === 'canceled' && a.appointmentTime.slice(0, 5) === slot) ?? null
      : null;
    const isCurrent = slot === currentSlot;
    const isPast = currentSlot !== null && slot < currentSlot;
    const isContinuation = active !== null && !isStart;

    if (isContinuation) {
      return {
        time: slot,
        appointment: active,
        canceledAppointment: null,
        tag: isCurrent ? 'ACTUAL' : 'OCUPADO',
        icon: 'NONE',
        isCurrent,
        showCheckButton: false,
        isContinuation: true,
      } as TodaySlotItem;
    }

    if (active && active.status === 'attended') {
      return {
        time: slot,
        appointment: active,
        canceledAppointment: null,
        tag: isCurrent ? 'ACTUAL' : 'PASADO',
        icon: 'CONFIRMED_CHECK',
        isCurrent,
        showCheckButton: false,
        isContinuation: false,
      } as TodaySlotItem;
    }

    if (active) {
      const tag: TagKind = isCurrent ? 'ACTUAL' : isPast ? 'PASADO' : 'OCUPADO';
      return {
        time: slot,
        appointment: active,
        canceledAppointment: null,
        tag,
        icon: isCurrent || isPast ? 'PENDING_CLOCK' : 'NONE',
        isCurrent,
        showCheckButton: isCurrent || isPast,
        isContinuation: false,
      } as TodaySlotItem;
    }

    if (canceled) {
      return {
        time: slot,
        appointment: null,
        canceledAppointment: canceled,
        tag: 'CANCELADO',
        icon: 'CANCELED_X',
        isCurrent,
        showCheckButton: false,
        isContinuation: false,
      } as TodaySlotItem;
    }

    return {
      time: slot,
      appointment: null,
      canceledAppointment: null,
      tag: isPast ? 'PASADO' : 'LIBRE',
      icon: 'NONE',
      isCurrent,
      showCheckButton: false,
      isContinuation: false,
    } as TodaySlotItem;
  });
}

/**
 * Título + subtítulo para un turno libre en la galería (puerto de
 * TodaySlotBuilder.freeSlotStatusText):
 * - Si ya no hay ningún turno después de este en el día: "Ya no tiene más
 *   turnos hoy." y no hay subtítulo.
 * - Si el turno ya pasó de hora: "Este turno libre ya concluyó."
 * - Si no pasó: "Este turno está libre." + subtítulo con el turno siguiente
 *   A ESTE (no el más próximo desde "ahora", ni el primero del día).
 */
export function freeSlotStatusText(
  items: TodaySlotItem[],
  currentTime: string,
  nowTime: string = getNowTimeString()
): { title: string; subtitle: string | null } {
  const nextItem = items.find((i) => i.time > currentTime);
  const hasPassed = currentTime < nowTime;

  if (!nextItem) return { title: 'Ya no tiene más turnos hoy.', subtitle: null };
  if (hasPassed) return { title: 'Este turno libre ya concluyó.', subtitle: null };
  return {
    title: 'Este turno está libre.',
    subtitle: `El siguiente turno es a las ${formatTimeForDisplay(nextItem.time)}.`,
  };
}

/** Texto "en 45 min" / "en 1h 30min" hasta la próxima cita reservada a partir de un turno libre. */
export function nextAppointmentLabel(
  items: TodaySlotItem[],
  fromSlot: string,
  nowTime: string = getNowTimeString()
): string {
  const next =
    items.find((i) => i.appointment !== null && i.appointment.status !== 'attended' && i.time > fromSlot) ??
    items.find((i) => i.appointment !== null && i.appointment.status !== 'attended' && i.time > nowTime);

  if (!next) return 'No hay más turnos reservados por hoy';

  const diffMin = timeDiffMinutes(nowTime, next.time);
  if (diffMin <= 0) return `Tu próximo turno es ahora — ${next.time}`;
  if (diffMin < 60) return `Tu próximo turno es en ${diffMin} min (${next.time})`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m === 0 ? `Tu próximo turno es en ${h}h (${next.time})` : `Tu próximo turno es en ${h}h ${m}min (${next.time})`;
}

function timeDiffMinutes(from: string, to: string): number {
  try {
    const [fh, fm] = from.split(':').map(Number);
    const [th, tm] = to.split(':').map(Number);
    return th * 60 + tm - (fh * 60 + fm);
  } catch {
    return 0;
  }
}
