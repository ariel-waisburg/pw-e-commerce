'use client';

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCatalogMeasureLabel } from "@/lib/products/sleep-intent.mjs";
import { buildMattressCardModel, formatPrice } from "@/lib/products/product-card.mjs";
import styles from "./RecommendationProductCard.module.css";

function RecommendationPlaceholder({ lineName, commercialName }) {
  return (
    <div className={styles.imagePlaceholder} aria-hidden="true">
      <span className={styles.placeholderBrand}>Sleep</span>
      <span className={styles.placeholderLine}>{lineName}</span>
      <div className={styles.placeholderBase} />
      <div className={styles.placeholderMattress} />
      <span className={styles.placeholderName}>{commercialName}</span>
    </div>
  );
}

export default function RecommendationProductCard({ product, href, whyItMatches }) {
  const [imageFailed, setImageFailed] = useState(false);
  const selectedVariant = product?.selectedVariant ?? product?.variants?.[0] ?? null;

  const card = useMemo(
    () => buildMattressCardModel(product, selectedVariant, { featured: false }),
    [product, selectedVariant]
  );

  const measureLabel = formatCatalogMeasureLabel(selectedVariant?.measureCode) ?? selectedVariant?.label ?? null;

  return (
    <article className={styles.card}>
      <Link href={href} className={styles.mediaLink}>
        <div className={styles.imageWrap}>
          {product?.media?.[0]?.url && !imageFailed ? (
            <Image
              src={product.media[0].url}
              alt={product.media[0].alt ?? `${card.lineName} ${card.commercialName}`}
              fill
              sizes="(max-width: 1024px) 100vw, 30vw"
              className={styles.productImage}
              unoptimized
              onError={() => setImageFailed(true)}
            />
          ) : (
            <RecommendationPlaceholder lineName={card.lineName} commercialName={card.commercialName} />
          )}
        </div>
      </Link>

      <div className={styles.content}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Opción principal</p>
            <h3 className={styles.name}>{card.commercialName}</h3>
          </div>
          {card.saleTypeLabel ? <span className={styles.saleType}>{card.saleTypeLabel}</span> : null}
        </div>

        <p className={styles.line}>{card.lineName}</p>
        <p className={styles.technology}>{card.technologyLabel}</p>

        <div className={styles.specGrid}>
          <div className={styles.specItem}>
            <span className={styles.specLabel}>Altura</span>
            <strong>{card.heightLabel}</strong>
          </div>
          <div className={styles.specItem}>
            <span className={styles.specLabel}>Terminación</span>
            <strong>{card.pillowLabel}</strong>
          </div>
          {measureLabel ? (
            <div className={styles.specItem}>
              <span className={styles.specLabel}>Medida</span>
              <strong>{measureLabel}</strong>
            </div>
          ) : null}
        </div>

        <p className={styles.reason}>{whyItMatches}</p>

        <div className={styles.priceBlock}>
          <p className={styles.price}>{card.currentPrice ? formatPrice(card.currentPrice) : "Precio a confirmar"}</p>
          {card.installmentsLabel ? <p className={styles.installments}>{card.installmentsLabel}</p> : null}
        </div>

        <Link href={href} className={styles.primaryAction}>
          Ir al detalle
        </Link>
      </div>
    </article>
  );
}
