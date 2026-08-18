import React, { useState } from 'react';
import { IconButton } from './Button';
import { LogoutConfirmDialog } from './Misc';

interface TopAppBarProps {
  title: string;
  subtitle?: string;
  onBackClick?: () => void;
  onThemeToggle?: () => void;
  isDarkMode?: boolean;
  onLogoutClick?: () => void;
  isDataFresh?: boolean | null;
  onRefreshClick?: () => void;
  isRefreshing?: boolean;
}

/** Puerto directo de CustomTopBar.kt (gradiente, punto de frescura, logout con confirmación). */
export default function TopAppBar({
  title,
  subtitle,
  onBackClick,
  onThemeToggle,
  isDarkMode,
  onLogoutClick,
  isDataFresh = null,
  onRefreshClick,
  isRefreshing = false,
}: TopAppBarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      <div className="top-bar">
        <div className="top-bar-gradient">
          <div className="top-bar-row">
            <div className="top-bar-left">
              {onBackClick ? (
                <IconButton icon="arrow_back" label="Volver" onClick={onBackClick} />
              ) : (
                <span style={{ width: 8 }} />
              )}
              <div>
                <div className="top-bar-title-row">
                  <span className="top-bar-title">{title}</span>
                  {isDataFresh !== null && (
                    <span className={`fresh-dot ${isDataFresh ? 'fresh' : 'stale'}`} />
                  )}
                </div>
                {subtitle && <div className="top-bar-subtitle">{subtitle}</div>}
              </div>
            </div>
            <div className="top-bar-actions">
              {onRefreshClick && (
                <IconButton
                  icon="refresh"
                  label="Actualizar"
                  onClick={onRefreshClick}
                  disabled={isRefreshing}
                  className={isRefreshing ? 'spin-icon' : ''}
                />
              )}
              {onThemeToggle && (
                <IconButton
                  icon={isDarkMode ? 'brightness_7' : 'brightness_4'}
                  label="Cambiar tema"
                  color="var(--primary)"
                  onClick={onThemeToggle}
                />
              )}
              {onLogoutClick && (
                <IconButton
                  icon="exit_to_app"
                  label="Cerrar sesión"
                  color="var(--error)"
                  onClick={() => setShowLogoutConfirm(true)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {showLogoutConfirm && onLogoutClick && (
        <LogoutConfirmDialog
          onConfirm={() => {
            setShowLogoutConfirm(false);
            onLogoutClick();
          }}
          onDismiss={() => setShowLogoutConfirm(false)}
        />
      )}
    </>
  );
}
