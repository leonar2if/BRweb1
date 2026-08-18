import React from 'react';

export function Dialog({
  onDismiss,
  title,
  children,
  actions,
  titleSize = 'lg',
}: {
  onDismiss?: () => void;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  titleSize?: 'lg' | 'md';
}) {
  return (
    <div className="dialog-scrim" onMouseDown={(e) => e.target === e.currentTarget && onDismiss?.()}>
      <div className="dialog-surface" role="dialog" aria-modal="true">
        <h2 className={titleSize === 'lg' ? 'dialog-title' : 'dialog-title-md'}>{title}</h2>
        <div className="text-body-md text-onSurfaceVariant">{children}</div>
        {actions && <div className="dialog-actions">{actions}</div>}
      </div>
    </div>
  );
}
