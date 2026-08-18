// Puerto directo de app/src/main/java/com/example/utils/DateFormatter.kt

const DAY_NAMES_ES = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado',
];
const MONTH_NAMES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Parsea "YYYY-MM-DD" a Date local (evita el desfase UTC de `new Date(str)`). */
export function stringToDate(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return isNaN(date.getTime()) ? null : date;
}

export function dateToString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function getTodayDateString(): string {
  return dateToString(new Date());
}

export function getNowTimeString(): string {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** "13:00" -> "1:00" (formato 12h SIN indicador AM/PM, para caber en tarjetas/botones chicos). */
export function formatTimeForDisplay(time: string): string {
  const m = /^(\d{2}):(\d{2})/.exec(time);
  if (!m) return time;
  let h = Number(m[1]);
  const min = m[2];
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min}`;
}

/** "YYYY-MM-DD" -> "dd/MM/yyyy" */
export function formatDateForDisplay(dateStr: string): string {
  const date = stringToDate(dateStr);
  if (!date) return dateStr;
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** "YYYY-MM-DD" -> "Lunes 12 de agosto" */
export function formatDayName(dateStr: string): string {
  const date = stringToDate(dateStr);
  if (!date) return dateStr;
  const dayName = DAY_NAMES_ES[date.getDay()];
  const monthName = MONTH_NAMES_ES[date.getMonth()];
  return titleCase(`${dayName} ${date.getDate()} de ${monthName}`);
}

export function formatMonthYear(year: number, month: number): string {
  return titleCase(`${MONTH_NAMES_ES[month]} ${year}`);
}

export function getNextMonthSameDay(currentDateStr: string): string {
  const date = stringToDate(currentDateStr) ?? new Date();
  const d = new Date(date);
  d.setDate(d.getDate() + 28);
  return dateToString(d);
}
