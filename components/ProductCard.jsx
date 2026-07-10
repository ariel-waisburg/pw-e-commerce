'use client';

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  buildMattressCardModel,
  formatPrice,
} from "@/lib/products/product-card.mjs";
import styles from "./ProductCard.module.css";

const FALLBACK_VARIANT = (product) => ({
  id: `${product.id}-default`,
  title: product.sizes?.[0] ?? "Único",
  label: product.sizes?.[0] ?? "Único",
  price: product.price,
  compareAtPrice: product.originalPrice,
  stockStatus: "in_stock",
});

function buildImageCandidates(product = {}) {
  const seenUrls = new Set();
  const candidates = product.mediaCandidates?.length
    ? product.mediaCandidates
    : [...(product.media ?? []), ...(product.catalogMedia ?? [])];

  return candidates.filter((asset) => {
    if (!asset?.url || seenUrls.has(asset.url)) return false;
    seenUrls.add(asset.url);
    return true;
  });
}

function ProductPlaceholder({ lineName, hasBadges = false }) {
  return (
    <div
      className={`${styles.imagePlaceholder} ${hasBadges ? styles.imagePlaceholderWithBadges : ""}`}
      aria-hidden="true"
    >
      <div className={styles.placeholderMark}>
        <span className={styles.placeholderBrand}>Sleep</span>
        <span className={styles.placeholderModel}>{lineName}</span>
      </div>
      <div className={styles.placeholderBase} />
      <div className={styles.placeholderMattress} />
    </div>
  );
}

function ProductMedia({
  productKey,
  productHref,
  imageCandidates,
  imageAlt,
  lineName,
  hasBadges = false,
  badges = null,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const activeImage = imageCandidates[activeImageIndex] ?? null;

  return (
    <Link key={productKey} href={productHref} className={styles.mediaLink}>
      <div className={styles.imageWrap}>
        {activeImage?.url && !imageFailed ? (
          <Image
            key={activeImage.url}
            src={activeImage.url}
            alt={imageAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className={styles.productImage}
            unoptimized
            onError={() => {
              if (activeImageIndex < imageCandidates.length - 1) {
                setActiveImageIndex((current) => current + 1);
                return;
              }

              setImageFailed(true);
            }}
          />
        ) : (
          <ProductPlaceholder lineName={lineName} hasBadges={hasBadges} />
        )}

        {badges}
      </div>
    </Link>
  );
}

function MattressProductCard({
  product,
  href,
  layout = "grid",
  featured = undefined,
  forceOutOfStock = false,
}) {
  const variantOptions = useMemo(() => {
    if (product.variants?.length) return product.variants;
    return [FALLBACK_VARIANT(product)];
  }, [product]);

  const [selectedVariantId, setSelectedVariantId] = useState(
    product.defaultVariantId ?? variantOptions[0]?.id
  );
  const imageCandidates = useMemo(() => buildImageCandidates(product), [product]);

  const selectedVariant = useMemo(
    () => variantOptions.find((variant) => variant.id === selectedVariantId) ?? variantOptions[0],
    [selectedVariantId, variantOptions]
  );

  const card = useMemo(
    () => buildMattressCardModel(product, selectedVariant, { featured, forceOutOfStock }),
    [featured, forceOutOfStock, product, selectedVariant]
  );

  const productHref = href ?? `/catalog/${product.slug}`;
  const imageAlt = `${card.lineName} ${card.commercialName}`;
  const mediaKey = `${product.id}:${imageCandidates.length}:${productHref}`;

  return (
    <article
      className={[
        styles.card,
        styles.cardMattress,
        layout === "carousel" ? styles.cardCarousel : "",
        layout === "list" ? styles.cardList : "",
        card.isFeatured ? styles.cardFeatured : "",
        card.stockState === "out_of_stock" || card.stockState === "unconfigured" ? styles.cardOutOfStock : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.mediaColumn}>
        <ProductMedia
          productKey={mediaKey}
          productHref={productHref}
          imageCandidates={imageCandidates}
          imageAlt={imageAlt}
          lineName={card.lineName}
          hasBadges={card.isFeatured || card.stockState === "out_of_stock" || card.stockState === "unconfigured"}
          badges={
            <div className={styles.badges}>
              {card.isFeatured ? <span className={styles.featuredBadge}>Destacado</span> : null}
              {card.stockState === "out_of_stock" ? (
                <span className={styles.stockBadge}>Sin stock</span>
              ) : null}
              {card.stockState === "unconfigured" ? (
                <span className={styles.stockBadge}>Sin stock configurado</span>
              ) : null}
            </div>
          }
        />

        {variantOptions.length > 1 ? (
          <div className={styles.measureStrip}>
            <p className={styles.measureStripLabel}>Medida</p>
            <div className={styles.sizes} aria-label="Medidas disponibles">
              {variantOptions.slice(0, 4).map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  className={`${styles.sizeBtn} ${
                    selectedVariant?.id === variant.id ? styles.sizeSelected : ""
                  }`}
                  aria-pressed={selectedVariant?.id === variant.id}
                  onClick={() => setSelectedVariantId(variant.id)}
                >
                  {variant.label ?? variant.title}
                </button>
              ))}
              {variantOptions.length > 4 ? (
                <Link href={productHref} className={styles.moreSizes}>
                  Ver más
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className={styles.contentColumn}>
        <div className={styles.contentMain}>
          <div className={styles.header}>
            <p className={styles.lineEyebrow}>{card.lineName}</p>
            {card.saleTypeLabel ? <span className={styles.saleTypePill}>{card.saleTypeLabel}</span> : null}
          </div>

          <div className={styles.nameBlock}>
            <h3 className={styles.name} title={card.commercialName}>
              {card.commercialName}
            </h3>
            <p className={styles.technologyLabel}>{card.technologyLabel}</p>
          </div>

          <p className={styles.specSummary}>
            {card.heightLabel} · {card.pillowLabel}
          </p>
        </div>

        <div className={styles.contentFooter}>
          <div className={styles.priceBlock}>
            <div className={styles.priceHeader}>
              <div>
                <p className={styles.price}>
                  {card.currentPrice != null ? formatPrice(card.currentPrice) : "Precio a confirmar"}
                </p>
              </div>
              {card.promotionLabel ? <span className={styles.promoBadge}>{card.promotionLabel}</span> : null}
            </div>

            <div className={styles.financeBlock}>
              {card.compareAtPrice ? (
                <p className={styles.originalPrice}>Antes {formatPrice(card.compareAtPrice)}</p>
              ) : (
                <p className={styles.regularPrice}>Precio vigente</p>
              )}
              {card.installmentsLabel ? <p className={styles.installments}>{card.installmentsLabel}</p> : null}
            </div>
          </div>

          <div className={styles.supportRow}>
            {card.measureSummary ? <p className={styles.supportMeta}>{card.measureSummary} disponibles</p> : null}
            {card.setSplitLabel ? <p className={styles.supportMeta}>Sommier: {card.setSplitLabel}</p> : null}
          </div>

          <div className={styles.actions}>
            <Link
              href={productHref}
              className={`${styles.primaryAction} ${
                card.stockState === "out_of_stock" || card.stockState === "unconfigured"
                  ? styles.primaryActionMuted
                  : ""
              }`}
            >
              {card.stockState === "out_of_stock" || card.stockState === "unconfigured"
                ? "Ver producto"
                : "Elegir medida"}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function AccessoryProductCard({ product, href }) {
  const productHref = href ?? `/catalog/${product.slug}`;
  const price = product.price ?? product.variants?.[0]?.price ?? 0;
  const imageCandidates = useMemo(() => buildImageCandidates(product), [product]);
  const mediaKey = `${product.id}:${imageCandidates.length}:${productHref}`;

  return (
    <article className={`${styles.card} ${styles.cardAccessory}`}>
      <ProductMedia
        productKey={mediaKey}
        productHref={productHref}
        imageCandidates={imageCandidates}
        imageAlt={product.name}
        lineName="Sleep"
      />
      <div className={styles.contentColumn}>
        <h3 className={styles.name}>{product.name}</h3>
        {product.description ? <p className={styles.accessoryDescription}>{product.description}</p> : null}
        <p className={styles.price}>{formatPrice(price)}</p>
        <div className={styles.actions}>
          <Link href={productHref} className={styles.primaryAction}>
            Ver detalle
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function ProductCard(props) {
  const { product } = props;

  if (product?.saleType === "mattress" || product?.saleType === "set") {
    return <MattressProductCard {...props} />;
  }

  return <AccessoryProductCard {...props} />;
}
