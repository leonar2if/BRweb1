import React from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';

export function LogoutConfirmDialog({ onConfirm, onDismiss }: { onConfirm: () => void; onDismiss: () => void }) {
  return (
    <Dialog
      onDismiss={onDismiss}
      title="¿Quieres cerrar sesión?"
      actions={
        <>
          <Button variant="text" onClick={onDismiss}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Cerrar sesión
          </Button>
        </>
      }
    />
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <input
      type="checkbox"
      className="m3-switch"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
    />
  );
}

export function RefreshToast({ message, isError = false }: { message: string | null; isError?: boolean }) {
  if (!message) return null;
  return (
    <div className="refresh-toast" style={isError ? { background: 'var(--error)', color: 'var(--on-error)' } : undefined}>
      {message}
    </div>
  );
}

export function LoadingIndicator({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex-col items-center justify-center" style={{ height: '100%', padding: 16 }}>
      <span className="spinner" />
      <p className="text-body-md text-onSurfaceVariant mt-4">{message}</p>
    </div>
  );
}
