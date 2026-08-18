import React, { useState } from 'react';
import type { Product } from '../../types/models';
import Icon from '../../components/Icon';
import { Button, IconButton } from '../../components/Button';

interface ProductDetailScreenProps {
  product: Product;
  managerPhone?: string;
  onBack: () => void;
}

export default function ProductDetailScreen({ product, managerPhone = '', onBack }: ProductDetailScreenProps) {
  const images = [product.imageUrl1, product.imageUrl2].filter(Boolean) as string[];
  const [activeImage, setActiveImage] = useState(0);

  return (
    <div className="device-scroll" style={{ overflowY: 'auto' }}>
      <div className="flex items-center" style={{ padding: 8 }}>
        <IconButton icon="arrow_back" label="Volver" onClick={onBack} />
      </div>

      <div style={{ padding: '0 16px 32px' }}>
        <div
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: 'var(--radius-2xl)',
            background: 'var(--surface-variant)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--elevation-2)',
          }}
        >
          {images.length > 0 ? (
            <img src={images[activeImage]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Icon name="image" size={72} style={{ color: 'color-mix(in srgb, var(--on-surface-variant) 50%, transparent)' }} />
          )}
        </div>

        {images.length > 1 && (
          <div className="flex mt-2 justify-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  background: i === activeImage ? 'var(--primary)' : 'var(--outline-variant)',
                }}
              />
            ))}
          </div>
        )}

        <h1 className="text-headline-sm fw-extrabold mt-4" style={{ margin: '20px 0 0' }}>
          {product.name}
        </h1>
        <p className="text-headline-sm fw-extrabold text-primary mt-2" style={{ margin: '8px 0 0' }}>
          {product.price} €
        </p>

        <div className="card mt-5" style={{ padding: 16, background: 'var(--surface-variant)' }}>
          <p className="text-title-sm fw-bold text-onSurfaceVariant" style={{ margin: 0 }}>
            Descripción
          </p>
          <p className="text-body-lg mt-2" style={{ margin: '8px 0 0', lineHeight: 1.6 }}>
            {product.description}
          </p>
        </div>

        <div
          className="card mt-4 flex items-center gap-3"
          style={{ padding: 14, background: 'color-mix(in srgb, var(--tertiary-container) 60%, transparent)' }}
        >
          <Icon name="storefront" size={22} style={{ color: 'var(--tertiary)' }} />
          <p className="text-body-sm" style={{ margin: 0, color: 'var(--on-tertiary-container)' }}>
            Disponible para compra directamente en nuestra barbería.
          </p>
        </div>

        {managerPhone && (
          <div className="mt-4">
            <a
              href={`https://wa.me/${managerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                `Hola, estoy interesado en el producto: ${product.name}`
              )}`}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <Button variant="whatsapp" full large icon="chat">
                📞 Contactar gestor por WhatsApp
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
