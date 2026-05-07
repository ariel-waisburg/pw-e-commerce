'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useMemo, useState } from 'react';
import styles from './ProductCard.module.css';

function formatPrice(p) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(p);
}

const CATEGORY_EMOJI = {
  colchones: '🛏',
  conjuntos: '🏠',
  almohadas: '😴',
  divan: '🪑',
  pillow: '☁️',
  'super-combos': '⭐',
};

const FALLBACK_VARIANT = (product) => ({
  id: `${product.id}-default`,
  title: product.sizes?.[0] ?? 'Único',
  price: product.price,
  compareAtPrice: product.originalPrice,
});

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const variantOptions = useMemo(() => {
    if (product.variants?.length) return product.variants;
    return [FALLBACK_VARIANT(product)];
  }, [product]);

  const [selectedVariantId, setSelectedVariantId] = useState(product.defaultVariantId ?? variantOptions[0]?.id);
  const [added, setAdded] = useState(false);
  const selectedVariant = useMemo(() => {
    return variantOptions.find((variant) => variant.id === selectedVariantId) ?? variantOptions[0];
  }, [variantOptions, selectedVariantId]);

  const discount = selectedVariant?.compareAtPrice
    ? Math.round((1 - selectedVariant.price / selectedVariant.compareAtPrice) * 100)
    : null;

  const handleAdd = (e) => {
    e.preventDefault();
    if (!selectedVariant) return;
    addItem({ variantId: selectedVariant.id, quantity: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Link href={`/catalog/${product.slug}`} className={styles.card}>
      <div className={styles.imageWrap}>
        <div className={styles.imagePlaceholder}>
          <span className={styles.emoji}>{CATEGORY_EMOJI[product.category] || '🛒'}</span>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles.shippingBadge}`}>Envio gratis</span>
          {discount ? <span className={`${styles.badge} ${styles.discountBadge}`}>-{discount}% OFF</span> : null}
        </div>
      </div>

      <div className={styles.body}>
        <p className={styles.brand}>{product.line || product.brand || product.category}</p>
        <h3 className={styles.name}>{product.name}</h3>

        {variantOptions.length > 1 && (
          <div className={styles.sizes}>
            {variantOptions.map((variant) => (
              <button
                key={variant.id}
                className={`${styles.sizeBtn} ${selectedVariant?.id === variant.id ? styles.sizeSelected : ''}`}
                onClick={e => { e.preventDefault(); setSelectedVariantId(variant.id); }}
              >
                {variant.title}
              </button>
            ))}
          </div>
        )}

        <div className={styles.pricing}>
          <span className={styles.price}>{formatPrice(selectedVariant?.price ?? product.price)}</span>
          {selectedVariant?.compareAtPrice ? (
            <div className={styles.promoLine}>
              <span className={styles.discountText}>-{discount}% OFF</span>
              <span className={styles.originalPrice}>{formatPrice(selectedVariant.compareAtPrice)}</span>
            </div>
          ) : null}
        </div>
        <p className={styles.installments}>12 x {formatPrice((selectedVariant?.price ?? product.price) / 12)} sin interés</p>

        <button className={`${styles.addBtn} ${added ? styles.added : ''}`} onClick={handleAdd}>
          {added ? '✓ Agregado' : 'Agregar al carrito'}
        </button>
      </div>
    </Link>
  );
}
