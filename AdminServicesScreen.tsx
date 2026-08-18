import React, { useState } from 'react';
import type { Service } from '../../types/models';
import ServiceCard from '../../components/ServiceCard';
import { Button, IconButton } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Switch } from '../../components/Misc';
import Icon from '../../components/Icon';
import * as store from '../../data/store';

interface AdminServicesScreenProps {
  services: Service[];
  onRefresh: () => void;
}

const emptyService = (): Service => ({
  id: 0,
  name: '',
  durationMinutes: 30,
  durationSlots: 1,
  price: 0,
  isActive: true,
});

export default function AdminServicesScreen({ services, onRefresh }: AdminServicesScreenProps) {
  const [editing, setEditing] = useState<Service | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Service | null>(null);

  const save = async () => {
    if (!editing) return;
    await store.saveService(editing);
    setEditing(null);
    onRefresh();
  };

  return (
    <div className="device-scroll" style={{ overflowY: 'auto', padding: '12px 0 90px', position: 'relative' }}>
      <p className="text-title-md fw-bold" style={{ padding: '4px 16px 8px' }}>
        Servicios ({services.length})
      </p>
      <div className="card-grid" style={{ padding: '0 12px' }}>
        {services.map((s) => (
          <ServiceCard key={s.id} service={s} isAdmin onEdit={() => setEditing(s)} onDelete={() => setConfirmDelete(s)} />
        ))}
      </div>

      <button
        onClick={() => setEditing(emptyService())}
        className="btn btn-filled"
        style={{
          position: 'fixed',
          right: 24,
          bottom: 88,
          width: 56,
          height: 56,
          borderRadius: '50%',
          padding: 0,
          boxShadow: 'var(--elevation-4)',
        }}
        aria-label="Añadir servicio"
      >
        <Icon name="add" size={26} />
      </button>

      {editing && (
        <Dialog
          title={editing.id ? 'Editar servicio' : 'Nuevo servicio'}
          onDismiss={() => setEditing(null)}
          actions={
            <>
              <Button variant="text" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button variant="filled" disabled={editing.name.trim() === ''} onClick={save}>
                Guardar
              </Button>
            </>
          }
        >
          <label className="field">
            <span className="field-static-label">Nombre del servicio</span>
            <span className="field-input-wrap">
              <input
                className="field-input"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </span>
          </label>

          <div className="mt-3">
            <span className="field-static-label">Duración</span>
            <div className="flex gap-2 mt-1">
              {[
                { slots: 1, label: '30 min' },
                { slots: 2, label: '60 min' },
              ].map((opt) => (
                <div
                  key={opt.slots}
                  onClick={() => setEditing({ ...editing, durationSlots: opt.slots, durationMinutes: opt.slots * 30 })}
                  style={{
                    flex: 1,
                    padding: 10,
                    textAlign: 'center',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    border: `${editing.durationSlots === opt.slots ? 2 : 1}px solid ${
                      editing.durationSlots === opt.slots ? 'var(--primary)' : 'var(--outline)'
                    }`,
                    background: editing.durationSlots === opt.slots ? 'var(--primary-container)' : 'transparent',
                    color: editing.durationSlots === opt.slots ? 'var(--on-primary-container)' : 'var(--on-surface)',
                  }}
                  className="text-body-sm fw-semibold"
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </div>

          <label className="field mt-3">
            <span className="field-static-label">Precio (€)</span>
            <span className="field-input-wrap">
              <input
                className="field-input"
                type="number"
                value={editing.price}
                onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
              />
            </span>
          </label>

          <div className="flex items-center justify-between mt-3">
            <span className="text-body-md">Servicio activo</span>
            <Switch checked={editing.isActive} onChange={(v) => setEditing({ ...editing, isActive: v })} />
          </div>
        </Dialog>
      )}

      {confirmDelete && (
        <Dialog
          title="¿Eliminar servicio?"
          onDismiss={() => setConfirmDelete(null)}
          actions={
            <>
              <Button variant="text" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await store.deleteService(confirmDelete.id);
                  setConfirmDelete(null);
                  onRefresh();
                }}
              >
                Eliminar
              </Button>
            </>
          }
        >
          <p>
            Se eliminará <strong>{confirmDelete.name}</strong> del catálogo de servicios. Esta acción no se puede
            deshacer.
          </p>
        </Dialog>
      )}
    </div>
  );
}
