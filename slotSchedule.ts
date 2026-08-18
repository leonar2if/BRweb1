// Puerto directo de app/src/main/java/com/example/utils/SlotSchedule.kt
import { dateToString, getTodayDateString, stringToDate } from './dateFormatter';

/** Los 12 turnos oficiales, en orden. Turno 5 = 13:00 (no 13:30), a propósito. */
export const DEFAULT_SLOTS: string[] = [
  '10:00', '10:30', '11:00', '11:30',
  '13:00', '14:00', '14:30', '15:00',
  '16:00', '16:30', '17:00', '17:30',
];

/** Días laborables por defecto: lunes a viernes (Date.getDay(): 0=dom..6=sab). */
export const DEFAULT_WORKING_DAYS: Set<number> = new Set([1, 2, 3, 4, 5]);

export function isWorkingDay(dateStr: string, workingDays: Set<number> = DEFAULT_WORKING_DAYS): boolean {
  const date = stringToDate(dateStr);
  if (!date) return false;
  return workingDays.has(date.getDay());
}

const DAY_CODE_TO_INDEX: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};
const INDEX_TO_DAY_CODE = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function parseWorkingDaysCsv(csv: string): Set<number> {
  const parsed = new Set<number>();
  csv.split(',').forEach((token) => {
    const code = token.trim().toUpperCase();
    if (code in DAY_CODE_TO_INDEX) parsed.add(DAY_CODE_TO_INDEX[code]);
  });
  return parsed.size === 0 ? DEFAULT_WORKING_DAYS : parsed;
}

export function workingDaysToCsv(days: Set<number>): string {
  return INDEX_TO_DAY_CODE.filter((_, i) => days.has(i)).join(',');
}

/** Orden Lunes..Domingo (para mostrar en la pantalla "Horario" del admin). */
export const ALL_DAY_CODES_IN_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const DAY_CODE_LABELS: Record<string, string> = {
  MON: 'Lunes', TUE: 'Martes', WED: 'Miércoles', THU: 'Jueves',
  FRI: 'Viernes', SAT: 'Sábado', SUN: 'Domingo',
};

export function dayLabel(code: string): string {
  return DAY_CODE_LABELS[code] ?? code;
}

const TIME_REGEX = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Convierte el CSV guardado en settings.slot_definitions (ej. "10:00,10:30,
 * 11:00,...") a la lista de turnos activa. Valida formato "HH:mm", elimina
 * duplicados y ordena cronológicamente. Si viene vacío/corrupto, cae en
 * DEFAULT_SLOTS para no dejar la app sin turnos por un dato mal guardado.
 */
export function parseSlotDefinitionsCsv(csv: string): string[] {
  const parsed = Array.from(
    new Set(
      csv
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '' && TIME_REGEX.test(s))
    )
  ).sort();
  return parsed.length === 0 ? DEFAULT_SLOTS : parsed;
}

export function slotDefinitionsToCsv(slots: string[]): string {
  return [...slots].sort().join(',');
}

/**
 * A partir de fromDateStr (inclusive), busca el próximo día que sea laborable
 * Y no esté en el pasado. Sirve para que el día seleccionado por defecto
 * ("hoy") salte automáticamente a un día válido si hoy no lo es. Busca hasta
 * 60 días adelante para no colgarse si la config quedó sin días laborables.
 */
export function findNextValidDay(fromDateStr: string, workingDays: Set<number> = DEFAULT_WORKING_DAYS): string {
  const today = getTodayDateString();
  const start = fromDateStr < today ? today : fromDateStr;
  const date = stringToDate(start);
  if (!date) return start;
  const d = new Date(date);
  for (let i = 0; i < 60; i++) {
    const candidate = dateToString(d);
    if (workingDays.has(d.getDay())) return candidate;
    d.setDate(d.getDate() + 1);
  }
  return start;
}

/** Rango navegable del calendario: mes actual + siguiente. */
export function navigableMonths(): Array<[number, number]> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const next = new Date(year, month + 1, 1);
  return [
    [year, month],
    [next.getFullYear(), next.getMonth()],
  ];
}

export function isMonthNavigable(year: number, month: number): boolean {
  return navigableMonths().some(([y, m]) => y === year && m === month);
}

/** Índices de slot [startIndex, startIndex + durationSlots) para un servicio. */
export function slotRangeFor(
  time: string,
  durationSlots: number,
  slots: string[] = DEFAULT_SLOTS
): string[] | null {
  const startIndex = slots.indexOf(time);
  if (startIndex === -1) return null;
  const endExclusive = startIndex + durationSlots;
  if (endExclusive > slots.length) return null;
  return slots.slice(startIndex, endExclusive);
}
