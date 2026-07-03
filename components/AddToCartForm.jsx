'use client';

import { useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import { groupVariantsByPlaza } from "@/lib/products/catalog.mjs";
import styles from "./AddToCartForm.module.css";

function formatPrice(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AddToCartForm({ variants, defaultVariantId, preferredMeasureCode = null }) {
  const { addItem, status } = useCart();
  const plazaGroups = useMemo(() => groupVariantsByPlaza(variants ?? []), [variants]);
  const initialVariant =
    variants?.find((variant) => variant.measureCode === preferredMeasureCode) ??
    variants?.find((variant) => variant.id === defaultVariantId) ??
    variants?.[0];
  const [manualSelectedPlaza, setManualSelectedPlaza] = useState(null);
  const [manualSelectedVariantId, setManualSelectedVariantId] = useState(null);
  const selectedPlaza = manualSelectedPlaza ?? initialVariant?.plaza ?? plazaGroups[0]?.plaza ?? null;

  const visibleVariants = useMemo(() => {
    const group = plazaGroups.find((entry) => entry.plaza === selectedPlaza);
    return group?.variants ?? variants ?? [];
  }, [plazaGroups, selectedPlaza, variants]);

  const selectedVariant = useMemo(
    () =>
      visibleVariants.find((variant) => variant.id === manualSelectedVariantId) ??
      visibleVariants.find((variant) => variant.id === initialVariant?.id) ??
      visibleVariants[0] ??
      variants?.find((variant) => variant.id === manualSelectedVariantId) ??
      initialVariant ??
      variants?.[0],
    [initialVariant, manualSelectedVariantId, variants, visibleVariants]
  );

  const shouldShowPlazaSelector =
    plazaGroups.length > 1 || (plazaGroups.length === 1 && plazaGroups[0]?.plaza !== "sin-plaza");

  const handleAdd = () => {
    if (!selectedVariant) return;
    addItem({ variantId: selectedVariant.id, quantity: 1 });
  };

  const handlePlazaSelect = (group) => {
    setManualSelectedPlaza(group.plaza);

    if (!group.variants.some((variant) => variant.id === manualSelectedVariantId)) {
      setManualSelectedVariantId(group.variants[0]?.id ?? null);
    }
  };

  const discount = selectedVariant?.compareAtPrice
    ? Math.round((1 - selectedVariant.price / selectedVariant.compareAtPrice) * 100)
    : null;

  if (!variants?.length) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.freeShipping}>Envío gratis</span>
        <p className={styles.headerCopy}>Configurá tu compra por plaza y cerrá por medida exacta.</p>
      </div>

      <div className={styles.priceBlock}>
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

      <div className={styles.selectionSummary}>
        <p className={styles.selectionLabel}>Configuración elegida</p>
        <strong className={styles.selectionValue}>{selectedVariant?.label ?? selectedVariant?.title}</strong>
        {selectedVariant?.setSplit?.label ? (
          <p className={styles.variantHint}>Composición del sommier: {selectedVariant.setSplit.label}</p>
        ) : (
          <p className={styles.variantHint}>La plaza orienta la compra; la medida exacta define la variante final.</p>
        )}
      </div>

      {shouldShowPlazaSelector ? (
        <div className={styles.variantPicker}>
          <p className={styles.variantLabel}>1. Elegí tu plaza</p>
          <div className={styles.variantGrid}>
            {plazaGroups.map((group) => (
              <button
                key={group.plaza}
                type="button"
                className={`${styles.variantBtn} ${
                  selectedPlaza === group.plaza ? styles.variantSelected : ""
                }`}
                aria-pressed={selectedPlaza === group.plaza}
                onClick={() => handlePlazaSelect(group)}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className={styles.variantPicker}>
        <p className={styles.variantLabel}>
          {shouldShowPlazaSelector ? "2. Elegí tu medida exacta" : "Elegí tu medida"}
        </p>
        <div className={styles.variantGrid}>
          {visibleVariants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                className={`${styles.variantBtn} ${
                  selectedVariant?.id === variant.id ? styles.variantSelected : ""
                }`}
                aria-pressed={selectedVariant?.id === variant.id}
                onClick={() => setManualSelectedVariantId(variant.id)}
              >
                {variant.label ?? variant.title}
              </button>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.cta}
          onClick={handleAdd}
          disabled={!selectedVariant || status === "loading"}
        >
          {status === "loading" ? "Agregando..." : "Agregar al carrito"}
        </button>
        <button
          className={styles.secondaryCta}
          type="button"
          onClick={() => window.open("https://wa.me/541139205184", "_blank")}
        >
          Consultar por WhatsApp
        </button>
      </div>
    </div>
  );
}
