import React from 'react';
import type { Service } from '../types/models';
import { IconButton } from './Button';

interface ServiceCardProps {
  service: Service;
  isAdmin?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ServiceCard({
  service,
  isAdmin = false,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
}: ServiceCardProps) {
  return (
    <div
      className="card list-item-card"
      role={onSelect ? 'button' : undefined}
      onClick={onSelect}
      style={{
        padding: 16,
        cursor: onSelect ? 'pointer' : 'default',
        background: isSelected ? 'var(--primary-container)' : 'color-mix(in srgb, var(--surface-variant) 50%, transparent)',
        boxShadow: isSelected ? 'var(--elevation-4)' : 'var(--elevation-1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center gap-2">
          <span
            className="text-title-md fw-bold"
            style={{ color: isSelected ? 'var(--on-primary-container)' : 'var(--on-surface)' }}
          >
            {service.name}
          </span>
          {!service.isActive && isAdmin && <span className="chip chip-error">Inactivo</span>}
        </div>
        <div className="mt-1 text-body-sm text-onSurfaceVariant">
          Duración: {service.durationMinutes} min ({service.durationSlots}{' '}
          {service.durationSlots === 1 ? 'turno' : 'turnos'})
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="text-title-lg fw-extrabold"
          style={{ color: isSelected ? 'var(--primary)' : 'var(--on-surface)' }}
        >
          {service.price} €
        </span>
        {isAdmin && (
          <>
            <IconButton icon="edit" label="Editar" color="var(--primary)" onClick={(e) => { e.stopPropagation(); onEdit?.(); }} />
            <IconButton icon="delete" label="Eliminar" color="var(--error)" onClick={(e) => { e.stopPropagation(); onDelete?.(); }} />
          </>
        )}
      </div>
    </div>
  );
}
