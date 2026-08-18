import React from 'react';
import type { Product } from '../../types/models';
import ProductCard from '../../components/ProductCard';
import Icon from '../../components/Icon';

interface CatalogScreenProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

export default function CatalogScreen({ products, onProductClick }: CatalogScreenProps) {
  if (products.length === 0) {
    return (
      <div className="flex-col items-center justify-center" style={{ height: '100%', padding: 32 }}>
        <Icon name="shopping_bag" size={64} style={{ color: 'color-mix(in srgb, var(--on-surface-variant) 40%, transparent)' }} />
        <p className="text-title-md fw-bold text-onSurfaceVariant mt-4 text-center">
          El catálogo está vacío en este momento.
        </p>
        <p className="text-body-sm text-onSurfaceVariant mt-2 text-center" style={{ opacity: 0.7 }}>
          Vuelve pronto para descubrir nuestros productos exclusivos de barbería.
        </p>
      </div>
    );
  }

  return (
    <div className="device-scroll" style={{ overflowY: 'auto', padding: '12px 0 24px' }}>
      <p className="text-title-md fw-bold text-primary" style={{ padding: '4px 16px 8px' }}>
        Productos Exclusivos
      </p>
      <div className="card-grid" style={{ padding: '0 12px' }}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onClick={() => onProductClick(product)} />
        ))}
      </div>
    </div>
  );
}
