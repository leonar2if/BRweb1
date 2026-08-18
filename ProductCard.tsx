import React from 'react';
import type { Product } from '../types/models';
import Icon from './Icon';
import { IconButton } from './Button';

interface ProductCardProps {
  product: Product;
  isAdmin?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ProductCard({ product, isAdmin = false, onClick, onEdit, onDelete }: ProductCardProps) {
  return (
    <div
      className="card list-item-card"
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      style={{
        padding: 12,
        cursor: onClick ? 'pointer' : 'default',
        background: 'color-mix(in srgb, var(--surface-variant) 50%, transparent)',
        boxShadow: 'var(--elevation-2)',
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {product.imageUrl1 ? (
          <img src={product.imageUrl1} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Icon name="image" size={36} style={{ color: 'color-mix(in srgb, var(--on-surface-variant) 50%, transparent)' }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center gap-2">
          <span
            className="text-title-md fw-bold"
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {product.name}
          </span>
          {!product.isActive && isAdmin && <span className="chip chip-error">Inactivo</span>}
        </div>
        <div
          className="mt-1 text-body-sm text-onSurfaceVariant"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.description}
        </div>
        <div className="mt-1 text-title-md fw-extrabold text-primary">{product.price} €</div>
      </div>

      {isAdmin && (
        <div className="flex-col">
          <IconButton icon="edit" label="Editar" color="var(--primary)" onClick={(e) => { e.stopPropagation(); onEdit?.(); }} />
          <IconButton icon="delete" label="Eliminar" color="var(--error)" onClick={(e) => { e.stopPropagation(); onDelete?.(); }} />
        </div>
      )}
    </div>
  );
}
