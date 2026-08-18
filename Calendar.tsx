import React, { useEffect, useMemo, useState } from 'react';
import { IconButton } from './Button';
import { dateToString, formatMonthYear, getTodayDateString, stringToDate } from '../utils/dateFormatter';
import { DEFAULT_SLOTS, DEFAULT_WORKING_DAYS, isWorkingDay, navigableMonths } from '../utils/slotSchedule';
import { getDayStatus } from '../data/store';

const DAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

interface CalendarProps {
  selectedDate: string;
  onDateSelected: (date: string) => void;
  workingDays?: Set<number>;
  activeSlots?: string[];
}

/**
 * Puerto de CalendarScreen.kt (versión actualizada): mes actual + siguiente.
 * "Hoy" se marca con un círculo ámbar sólido y texto negro en negrita — no
 * es un estado más del semáforo, es solo un indicador visual de "hoy". El
 * estado verde/rojo/gris colorea el TEXTO del día (no el fondo), y el día
 * seleccionado se marca con un anillo del color primario en vez de relleno.
 */
export default function Calendar({
  selectedDate,
  onDateSelected,
  workingDays = DEFAULT_WORKING_DAYS,
  activeSlots = DEFAULT_SLOTS,
}: CalendarProps) {
  const months = useMemo(() => navigableMonths(), []);
  const selected = useMemo(() => stringToDate(selectedDate), [selectedDate]);

  const [monthIndex, setMonthIndex] = useState(() => {
    if (!selected) return 0;
    const idx = months.findIndex(([y, m]) => y === selected.getFullYear() && m === selected.getMonth());
    return idx >= 0 ? idx : 0;
  });

  useEffect(() => {
    if (!selected) return;
    const idx = months.findIndex(([y, m]) => y === selected.getFullYear() && m === selected.getMonth());
    if (idx >= 0) setMonthIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const [statusMap, setStatusMap] = useState<Record<string, 'green' | 'red' | 'gray'>>({});

  const safeIndex = Math.min(Math.max(monthIndex, 0), months.length - 1);
  const [year, month] = months[safeIndex] ?? [new Date().getFullYear(), new Date().getMonth()];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=domingo
  const firstDayOffset = (firstDayOfMonth - 1 + 7) % 7; // lunes-first

  const today = getTodayDateString();

  // Precarga el estado (verde/rojo) de todos los días laborables visibles del mes.
  useEffect(() => {
    let cancelled = false;
    const dates: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = dateToString(new Date(year, month, day));
      if (d >= today && isWorkingDay(d, workingDays)) dates.push(d);
    }
    Promise.all(dates.map((d) => getDayStatus(d, activeSlots).then((s) => [d, s] as const))).then((entries) => {
      if (cancelled) return;
      setStatusMap((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, daysInMonth, today, workingDays, activeSlots]);

  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;
  const rows: number[][] = [];
  for (let start = 0; start < totalCells; start += 7) {
    rows.push(Array.from({ length: 7 }, (_, i) => start + i));
  }

  return (
    <div className="surface-variant" style={{ margin: '0 16px', borderRadius: 'var(--radius-xl)', padding: 12 }}>
      <div className="flex items-center justify-between">
        <IconButton
          icon="chevron_left"
          label="Mes anterior"
          disabled={monthIndex === 0}
          onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
        />
        <span className="text-title-md">{formatMonthYear(year, month)}</span>
        <IconButton
          icon="chevron_right"
          label="Mes siguiente"
          disabled={monthIndex >= months.length - 1}
          onClick={() => setMonthIndex((i) => Math.min(months.length - 1, i + 1))}
        />
      </div>

      <div className="flex mt-1" style={{ marginTop: 4 }}>
        {DAY_NAMES.map((d) => (
          <div key={d} style={{ flex: 1, textAlign: 'center' }} className="text-label-sm text-onSurfaceVariant">
            {d}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 6 }}>
        {rows.map((row, ri) => (
          <div key={ri} className="flex">
            {row.map((cell) => {
              const day = cell - firstDayOffset + 1;
              if (day < 1 || day > daysInMonth) {
                return <div key={cell} style={{ flex: 1, height: 44 }} />;
              }
              const dateString = dateToString(new Date(year, month, day));
              const status = statusMap[dateString];
              const isSelected = dateString === selectedDate;
              const isToday = dateString === today;
              const isPast = dateString < today;
              const workingDay = isWorkingDay(dateString, workingDays);
              const enabled = !isPast && workingDay && status === 'green';

              // El círculo ámbar es solo para "hoy", no un estado más.
              const bg = isToday ? '#F9A825' : 'transparent';
              const fg = isToday
                ? '#000000'
                : status === 'red'
                ? 'var(--slot-occupied)'
                : status === 'green'
                ? 'var(--slot-free)'
                : 'var(--on-surface-variant)';

              return (
                <div key={cell} style={{ flex: 1, height: 44, padding: 2 }}>
                  <button
                    disabled={!enabled}
                    onClick={() => onDateSelected(dateString)}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      border: isSelected ? '2px solid var(--primary)' : 'none',
                      background: bg,
                      color: fg,
                      cursor: enabled ? 'pointer' : 'default',
                      fontSize: 'var(--body-medium-size)',
                      fontWeight: isToday || isSelected ? 700 : 400,
                      opacity: !workingDay || isPast ? 0.55 : 1,
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
