import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import { getAndroidDownloadUrl, isAndroidDevice } from '../utils/deviceDetect';

const DISMISS_KEY = 'br_app_android_banner_dismissed_v1';

/**
 * Banner que se muestra automáticamente cuando la web se abre desde un
 * dispositivo Android, invitando a descargar la app nativa en su lugar.
 * Se oculta si no hay VITE_ANDROID_DOWNLOAD_URL configurada, o si la
 * persona ya lo cerró antes (recordado en localStorage).
 */
export default function AndroidDownloadBanner() {
  const [visible, setVisible] = useState(false);
  const url = getAndroidDownloadUrl();

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY) === 'true';
    setVisible(isAndroidDevice() && Boolean(url) && !dismissed);
  }, [url]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setVisible(false);
  };

  return (
    <div
      className="flex items-center gap-3"
      style={{
        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
        color: 'var(--on-primary)',
        padding: '10px 12px',
        flexShrink: 0,
        position: 'relative',
        zIndex: 20,
      }}
    >
      <Icon name="android" size={26} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="text-body-sm fw-bold" style={{ margin: 0 }}>
          Tenemos app para Android
        </p>
        <p className="text-body-sm" style={{ margin: 0, opacity: 0.9 }}>
          Descárgala para una mejor experiencia.
        </p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-label-lg fw-bold"
        style={{
          background: 'var(--on-primary)',
          color: 'var(--primary)',
          borderRadius: 'var(--radius-pill)',
          padding: '8px 14px',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Descargar
      </a>
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--on-primary)',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
        }}
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
