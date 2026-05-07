'use client';

import { useState, useMemo } from 'react';
import { useCart } from '@/context/CartContext';
import styles from './AddToCartForm.module.css';

function formatPrice(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AddToCartForm({ variants, defaultVariantId }) {
  const { addItem, status } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariantId ?? variants?.[0]?.id);
  const selectedVariant = useMemo(
    () => variants?.find((variant) => variant.id === selectedVariantId) ?? variants?.[0],
    [variants, selectedVariantId]
  );

  const handleAdd = () => {
    if (!selectedVariant) return;
    addItem({ variantId: selectedVariant.id, quantity: 1 });
  };

  const discount = selectedVariant?.compareAtPrice
    ? Math.round((1 - selectedVariant.price / selectedVariant.compareAtPrice) * 100)
    : null;

  if (!variants?.length) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.priceBlock}>
        <span className={styles.freeShipping}>Envio gratis</span>
        {selectedVariant?.compareAtPrice && (
          <div className={styles.compareRow}>
            <span className={styles.discountBadge}>-{discount}% OFF</span>
            <span className={styles.compareAt}>{formatPrice(selectedVariant.compareAtPrice)}</span>
          </div>
        )}
        <span className={styles.price}>{formatPrice(selectedVariant?.price ?? 0)}</span>
        <p className={styles.installments}>
          12 cuotas sin interés de {formatPrice((selectedVariant?.price ?? 0) / 12)}
        </p>
      </div>

      <div className={styles.variantPicker}>
        <p className={styles.variantLabel}>Elegí tu medida</p>
        <div className={styles.variantGrid}>
          {variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              className={`${styles.variantBtn} ${
                selectedVariant?.id === variant.id ? styles.variantSelected : ''
              }`}
              onClick={() => setSelectedVariantId(variant.id)}
            >
              {variant.title}
            </button>
          ))}
        </div>
      </div>

      <button
        className={styles.cta}
        onClick={handleAdd}
        disabled={!selectedVariant || status === 'loading'}
      >
        {status === 'loading' ? 'Agregando...' : 'Agregar al carrito'}
      </button>
      <button className={styles.secondaryCta} type="button" onClick={() => window.open('https://wa.me/541139205184', '_blank')}>
        Consultar por WhatsApp
      </button>
    </div>
  );
}
