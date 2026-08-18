import React, { useState } from 'react';
import type { Product } from '../../types/models';
import ProductCard from '../../components/ProductCard';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Switch } from '../../components/Misc';
import Icon from '../../components/Icon';
import * as store from '../../data/store';
import { uploadProductImage } from '../../data/supabaseClient';

interface AdminCatalogScreenProps {
  products: Product[];
  onRefresh: () => void;
}

const emptyProduct = (): Product => ({
  id: 0,
  name: '',
  description: '',
  price: 0,
  imageUrl1: '',
  isActive: true,
});

export default function AdminCatalogScreen({ products, onRefresh }: AdminCatalogScreenProps) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleImageUpload = async (file: File | undefined) => {
    if (!file || !editing) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const url = await uploadProductImage(file);
      setEditing({ ...editing, imageUrl1: url });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'No se pudo subir la imagen.');
    } finally {
      setIsUploading(false);
    }
  };

  const save = async () => {
    if (!editing) return;
    await store.saveProduct(editing);
    setEditing(null);
    onRefresh();
  };

  return (
    <div className="device-scroll" style={{ overflowY: 'auto', padding: '12px 0 90px', position: 'relative' }}>
      <p className="text-title-md fw-bold" style={{ padding: '4px 16px 8px' }}>
        Productos ({products.length})
      </p>
      <div className="card-grid" style={{ padding: '0 12px' }}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} isAdmin onEdit={() => setEditing(p)} onDelete={() => setConfirmDelete(p)} />
        ))}
      </div>

      <button
        onClick={() => setEditing(emptyProduct())}
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
        aria-label="Añadir producto"
      >
        <Icon name="add" size={26} />
      </button>

      {editing && (
        <Dialog
          title={editing.id ? 'Editar producto' : 'Nuevo producto'}
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
            <span className="field-static-label">Nombre del producto</span>
            <span className="field-input-wrap">
              <input
                className="field-input"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </span>
          </label>

          <label className="field mt-3">
            <span className="field-static-label">Descripción</span>
            <span className="field-input-wrap" style={{ minHeight: 80, alignItems: 'flex-start', paddingTop: 8 }}>
              <textarea
                className="field-input"
                rows={3}
                style={{ resize: 'vertical', paddingTop: 8 }}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </span>
          </label>

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

          <label className="field mt-3">
            <span className="field-static-label">Imagen del producto</span>
            <span className="flex items-center gap-2 mt-1">
              {editing.imageUrl1 && (
                <img
                  src={editing.imageUrl1}
                  alt=""
                  style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
                />
              )}
              <Button variant="outlined" small loading={isUploading} disabled={isUploading}>
                <label style={{ cursor: 'pointer' }}>
                  {editing.imageUrl1 ? 'Cambiar imagen' : 'Subir imagen'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleImageUpload(e.target.files?.[0])}
                  />
                </label>
              </Button>
            </span>
            {uploadError && (
              <p className="text-body-sm mt-1" style={{ color: 'var(--error)' }}>
                {uploadError}
              </p>
            )}
          </label>

          <label className="field mt-3">
            <span className="field-static-label">o URL de imagen directa (opcional)</span>
            <span className="field-input-wrap">
              <span className="field-icon">
                <Icon name="image" size={20} />
              </span>
              <input
                className="field-input"
                value={editing.imageUrl1 ?? ''}
                onChange={(e) => setEditing({ ...editing, imageUrl1: e.target.value })}
              />
            </span>
          </label>

          <div className="flex items-center justify-between mt-3">
            <span className="text-body-md">Producto activo</span>
            <Switch checked={editing.isActive} onChange={(v) => setEditing({ ...editing, isActive: v })} />
          </div>
        </Dialog>
      )}

      {confirmDelete && (
        <Dialog
          title="¿Eliminar producto?"
          onDismiss={() => setConfirmDelete(null)}
          actions={
            <>
              <Button variant="text" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await store.deleteProduct(confirmDelete.id);
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
            Se eliminará <strong>{confirmDelete.name}</strong> del catálogo. Esta acción no se puede deshacer.
          </p>
        </Dialog>
      )}
    </div>
  );
}
