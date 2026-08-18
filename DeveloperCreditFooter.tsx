import React from 'react';

const WEBSITE_URL = 'https://leonar2.pages.dev';
const WHATSAPP_URL = 'https://wa.me/5352940801'; // +53 5294-0801

/** Pie de página de Ajustes: crédito de la app + enlaces a web/WhatsApp de L2dev. */
export default function DeveloperCreditFooter() {
  return (
    <div className="flex-col items-center" style={{ padding: '16px 0' }}>
      <p className="text-body-sm fw-medium text-onSurfaceVariant" style={{ margin: 0 }}>
        Esta app fue hecha por L2dev
      </p>
      <div className="flex justify-center" style={{ marginTop: 2 }}>
        <a href={WEBSITE_URL} target="_blank" rel="noreferrer" className="btn btn-text btn-sm">
          Sitio web
        </a>
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="btn btn-text btn-sm">
          WhatsApp
        </a>
      </div>
    </div>
  );
}
