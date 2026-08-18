import React, { useEffect, useMemo, useState } from 'react';
import type { Profile } from '../../types/models';
import Icon from '../../components/Icon';
import { IconButton } from '../../components/Button';
import { LoadingIndicator } from '../../components/Misc';
import { toLocalDisplay } from '../../utils/validators';
import { getTodayDateString } from '../../utils/dateFormatter';
import * as store from '../../data/store';

/** Directorio de clientes del admin (Ajustes -> Clientes). Puerto de AdminClientsScreen.kt. */
export default function AdminClientsScreen({ onBackClick }: { onBackClick: () => void }) {
  const [clients, setClients] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    store.getAllClients().then((c) => {
      setClients(c);
      setIsLoading(false);
    });
  }, []);

  const todayMonthDay = useMemo(() => getTodayDateString().slice(5), []);

  const filtered = clients.filter((c) => {
    const q = query.trim().toLowerCase();
    if (q === '') return true;
    return c.fullName.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const birthdaysToday = clients.filter((c) => c.birthday && c.birthday.slice(5) === todayMonthDay);

  return (
    <div className="device-scroll" style={{ overflowY: 'auto' }}>
      <div className="flex items-center" style={{ padding: 8 }}>
        <IconButton icon="arrow_back" label="Volver" onClick={onBackClick} />
        <span className="text-title-md fw-bold">Clientes ({clients.length})</span>
      </div>

      <div style={{ padding: '0 16px' }}>
        <label className="field">
          <span className="field-input-wrap">
            <span className="field-icon">
              <Icon name="search" size={20} />
            </span>
            <input
              className="field-input"
              placeholder="Buscar por nombre o teléfono..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </span>
        </label>

        {birthdaysToday.length > 0 && (
          <div
            className="flex items-center gap-2 mt-3"
            style={{ background: 'color-mix(in srgb, #F9A825 15%, transparent)', borderRadius: 'var(--radius-md)', padding: 12 }}
          >
            <Icon name="cake" size={22} style={{ color: '#F9A825' }} />
            <span className="text-body-sm fw-semibold">
              🎉 {birthdaysToday.map((c) => c.fullName).join(', ')} {birthdaysToday.length === 1 ? 'cumple' : 'cumplen'} años hoy
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingIndicator />
      ) : filtered.length === 0 ? (
        <p className="text-body-md text-onSurfaceVariant text-center mt-4">No se encontraron clientes.</p>
      ) : (
        <div style={{ padding: '12px 16px 32px' }}>
          {filtered.map((c) => (
            <div
              key={c.id}
              className="card"
              style={{ padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'var(--primary-container)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="person" size={20} style={{ color: 'var(--on-primary-container)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="text-body-lg fw-semibold" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.fullName}
                </p>
                <p className="text-body-sm text-onSurfaceVariant" style={{ margin: 0 }}>
                  +53 {toLocalDisplay(c.phone)}
                  {c.birthday && c.birthday.slice(5) === todayMonthDay && ' · 🎂 Hoy'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Icon name="check" size={16} style={{ color: 'var(--slot-free)' }} />
                <span className="text-label-md">{c.visitCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Icon name="close" size={16} style={{ color: 'var(--slot-occupied)' }} />
                <span className="text-label-md">{c.noShowCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
