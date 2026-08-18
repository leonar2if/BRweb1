import React, { useEffect, useState } from 'react';
import type { ClientNote } from '../types/models';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';
import { Button } from './Button';
import * as store from '../data/store';

/**
 * Notas de cliente acumulables (CRM simple), puerto de la sección de notas
 * que reemplaza al viejo campo único "notas" por cita. Se guardan por
 * teléfono del cliente, así que todas sus citas comparten el mismo
 * historial de notas del admin.
 */
export default function ClientNotesSection({ clientPhone, clientName }: { clientPhone: string; clientName: string }) {
  const { userId } = useAuth();
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    store.listClientNotes(clientPhone).then((result) => {
      if (!cancelled) {
        setNotes(result);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [clientPhone]);

  const addNote = async () => {
    if (draft.trim() === '') return;
    setIsSaving(true);
    const created = await store.addClientNote(clientPhone, clientName, draft.trim(), userId);
    setNotes((prev) => [created, ...prev]);
    setDraft('');
    setIsSaving(false);
  };

  return (
    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
      <p className="text-title-sm fw-bold" style={{ margin: '0 0 6px' }}>
        Notas de este cliente
      </p>

      {isLoading ? (
        <span className="spinner spinner-sm" />
      ) : notes.length === 0 ? (
        <p className="text-body-sm text-onSurfaceVariant" style={{ margin: 0 }}>
          Sin notas todavía.
        </p>
      ) : (
        <div className="flex-col gap-1">
          {notes.map((n) => (
            <div
              key={n.id}
              className="surface-variant"
              style={{ borderRadius: 'var(--radius-sm)', padding: '6px 10px' }}
            >
              <p className="text-body-sm" style={{ margin: 0 }}>
                {n.note}
              </p>
              <p className="text-body-sm text-onSurfaceVariant" style={{ margin: '2px 0 0', fontSize: 11 }}>
                {new Date(n.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        <input
          className="field-input"
          style={{
            flex: 1,
            border: '1px solid var(--outline)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 10px',
            background: 'var(--surface)',
          }}
          placeholder="Agregar nota..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addNote()}
        />
        <Button small loading={isSaving} disabled={draft.trim() === '' || isSaving} onClick={addNote}>
          <Icon name="add" size={18} />
        </Button>
      </div>
    </div>
  );
}
