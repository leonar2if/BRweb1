import React from 'react';
import { formatTimeForDisplay } from '../utils/dateFormatter';

interface TimeSlotWidgetProps {
  time: string;
  isOccupied: boolean;
  isSelected?: boolean;
  isBlocked?: boolean; // turno bloqueado por el admin (⊘), sin cita
  useAbbreviatedLabels?: boolean; // true en la vista del cliente: "N.D." en vez de "NO DISPONIBLE" para que quepa
  onClick: () => void;
}

export default function TimeSlotWidget({
  time,
  isOccupied,
  isSelected = false,
  isBlocked = false,
  useAbbreviatedLabels = false,
  onClick,
}: TimeSlotWidgetProps) {
  const unavailable = isOccupied || isBlocked;

  const borderColor = isSelected
    ? 'var(--primary)'
    : isBlocked
    ? '#9E9E9E'
    : isOccupied
    ? 'var(--slot-occupied)'
    : 'var(--slot-free)';

  const backgroundColor = isSelected
    ? 'var(--primary-container)'
    : isBlocked
    ? 'rgba(158,158,158,0.12)'
    : isOccupied
    ? 'color-mix(in srgb, var(--slot-occupied) 10%, transparent)'
    : 'color-mix(in srgb, var(--slot-free) 10%, transparent)';

  const badgeColor = isBlocked ? '#9E9E9E' : isOccupied ? 'var(--slot-occupied)' : 'var(--slot-free)';
  const badgeText = isBlocked
    ? useAbbreviatedLabels
      ? 'N.D.'
      : 'NO DISPONIBLE'
    : isOccupied
    ? 'LLENO'
    : 'LIBRE';

  return (
    <button
      disabled={unavailable}
      onClick={onClick}
      style={{
        width: '100%',
        margin: 4,
        borderRadius: 'var(--radius-md)',
        background: backgroundColor,
        border: `${isSelected ? 2 : 1}px solid ${borderColor}`,
        cursor: unavailable ? 'not-allowed' : 'pointer',
        minHeight: 48,
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: unavailable && !isBlocked ? 1 : unavailable ? 0.85 : 1,
      }}
    >
      <span
        className="text-title-md fw-bold"
        style={{ color: isSelected ? 'var(--primary)' : 'var(--on-surface)', fontSize: 16 }}
      >
        {formatTimeForDisplay(time)}
      </span>
      <span
        className="text-label-sm fw-bold"
        style={{ background: badgeColor, color: '#fff', borderRadius: 'var(--radius-sm)', padding: '4px 8px' }}
      >
        {badgeText}
      </span>
    </button>
  );
}
