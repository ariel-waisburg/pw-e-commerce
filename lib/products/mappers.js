import {
  formatMeasureLabel,
  getPillowTechnologyLabel,
  normalizeCatalogProduct,
  normalizePillowTechnology,
} from "./catalog.mjs";
import { getCardMediaCandidates, getCatalogMedia, getDerivedProductMedia } from "./media.js";

const FALLBACK_SIZE = "Único";
const CATEGORY_LABELS = {
  colchones: "Colchones",
  conjuntos: "Conjuntos",
  almohadas: "Almohadas",
  pillow: "Pillow Top",
  otros: "Otros",
};

function normalizeCategorySlug(category) {
  if (!category) return "otros";
  if (typeof category === "string") return category;
  if (typeof category.slug === "string" && category.slug) return category.slug;
  return "otros";
}

function normalizeCategoryLabel(category) {
  if (!category) return CATEGORY_LABELS.otros;
  if (typeof category === "object" && typeof category.name === "string" && category.name) {
    return category.name;
  }

  const slug = normalizeCategorySlug(category);
  return CATEGORY_LABELS[slug] ?? slug;
}

function buildTags(product) {
  const tags = new Set([
    ...(product.isFeatured ? ["destacado"] : []),
    ...((product.badges ?? []).map((badge) => String(badge).toLowerCase()) ?? []),
    ...((product.tags ?? []).map((tag) => String(tag).toLowerCase()) ?? []),
  ]);

  return [...tags];
}

function normalizeVariants(variants = []) {
  return variants.map((variant) => ({
    id: variant.id,
    title: variant.title ?? FALLBACK_SIZE,
    label: variant.label,
    price: Math.round((variant.price ?? variant.price_cents ?? 0) / (variant.price_cents ? 100 : 1)),
    compareAtPrice:
      variant.compareAtPrice != null
        ? Math.round(variant.compareAtPrice)
        : variant.compare_at_price_cents != null
          ? Math.round(variant.compare_at_price_cents / 100)
          : undefined,
    currency: variant.currency ?? variant.currency_code ?? "ARS",
    stockStatus: variant.inventoryStatus ?? variant.inventory_status ?? "in_stock",
    stockQuantity: variant.stockQuantity ?? variant.stock_quantity ?? 0,
    dimensions: variant.dimensions ?? {},
    metadata: variant.metadata ?? {},
    measureCode: variant.measureCode ?? variant.metadata?.measure_code ?? variant.dimensions?.measure_code,
    widthCm: variant.widthCm ?? variant.dimensions?.width_cm,
    lengthCm: variant.lengthCm ?? variant.dimensions?.length_cm,
    heightCm: variant.heightCm ?? variant.dimensions?.height_cm,
  }));
}

function buildCatalogSeed(product) {
  return normalizeCatalogProduct({
    ...product,
    tags: buildTags(product),
    variants: normalizeVariants(product.variants),
  });
}

function getPillowTechnology(product = {}, rawProduct = {}) {
  return normalizePillowTechnology(
    product.pillowTechnology ??
      rawProduct.pillowTechnology ??
      rawProduct.metadata?.pillow_technology ??
      rawProduct.metadata?.technology ??
      rawProduct.attributes?.technology ??
      rawProduct.name
  );
}

function buildStructuredAttributes(product, rawProduct = {}) {
  const attributes = [];
  const pushAttribute = (label, value) => {
    if (!value) return;
    if (attributes.some((attribute) => attribute.label === label && attribute.value === value)) return;
    attributes.push({ label, value });
  };

  if (product.saleType) {
    const pillowLabel = product.pillowTypeLabel
      ? product.pillowTypeLabel.replace(/^Pillow\s+/i, "").replace(/^\w/, (letter) => letter.toUpperCase())
      : null;

    pushAttribute("Tipo de venta", product.saleTypeLabel);
    pushAttribute("Línea", product.line);
    pushAttribute("Tecnología", product.technologyLabel);
    pushAttribute("Pillow", pillowLabel);

    if (product.heightCm || product.heightProfileLabel) {
      const heightParts = [`${product.heightCm} cm`, product.heightProfileLabel].filter(Boolean);
      pushAttribute("Altura", heightParts.join(" · "));
    }

    pushAttribute("Tela superior", product.topFabricLabel);
    pushAttribute("Tela lateral", product.sideFabricLabel);

    const measures = product.variants
      .map((variant) => formatMeasureLabel(variant.measureCode))
      .filter(Boolean)
      .join(" · ");
    pushAttribute("Medidas disponibles", measures);

    if (product.saleType === "set") {
      const setSplit = product.variants
        .filter((variant) => variant.measureCode && variant.setSplit?.label)
        .map((variant) => `${formatMeasureLabel(variant.measureCode)}: ${variant.setSplit.label}`)
        .join(" · ");
      pushAttribute("Sommier", setSplit);
    }

    return attributes;
  }

  const pillowTechnology = getPillowTechnology(product, rawProduct);
  if (pillowTechnology) {
    pushAttribute("Tecnología", getPillowTechnologyLabel(pillowTechnology));
  }

  const normalizedVariants = product.variants ?? [];
  const nonUniqueSizes = normalizedVariants
    .map((variant) => variant.label ?? variant.title)
    .filter((value) => value && value !== FALLBACK_SIZE && value !== "Único")
    .join(" · ");
  pushAttribute("Tamaño", nonUniqueSizes);

  return attributes;
}

function buildAttributes(product, rawAttributes = [], rawProduct = {}) {
  const structuredAttributes = buildStructuredAttributes(product, rawProduct);
  const normalizedAttributes = Array.isArray(rawAttributes)
    ? rawAttributes
    : Object.entries(rawAttributes ?? {}).map(([label, value]) => ({
        label,
        value: Array.isArray(value) ? value.join(", ") : String(value),
      }));

  const merged = [...structuredAttributes];
  normalizedAttributes.forEach((attribute) => {
    if (!attribute?.label || !attribute?.value) return;
    if (merged.some((entry) => entry.label === attribute.label)) return;
    merged.push(attribute);
  });

  return merged;
}

function mapCatalogProductToCardData(product, rawProduct = {}, { includeCatalogFallbackMedia = true } = {}) {
  const primaryVariant = product.variants[0] ?? null;

  const pillowTechnology = getPillowTechnology(product, rawProduct);
  const mediaProduct = {
    ...product,
    media: rawProduct.media,
  };
  const media = includeCatalogFallbackMedia
    ? getDerivedProductMedia(mediaProduct)
    : Array.isArray(rawProduct.media)
      ? rawProduct.media
      : [];
  const catalogMedia = includeCatalogFallbackMedia ? getCatalogMedia(product) : [];
  const mediaCandidates = includeCatalogFallbackMedia ? getCardMediaCandidates(mediaProduct) : media;

  return {
    id: product.id,
    slug: product.slug,
    category: normalizeCategorySlug(rawProduct.category ?? product.category),
    categoryLabel: normalizeCategoryLabel(rawProduct.category ?? product.category),
    brand: rawProduct.brand ?? product.brand ?? "Sleep",
    name: product.name,
    description: product.description ?? "",
    saleType: product.saleType,
    saleTypeLabel: product.saleTypeLabel,
    line: product.line,
    lineLabel: product.lineLabel,
    technology: product.technology,
    technologyLabel: product.technologyLabel,
    displayName: product.displayName,
    legacyName: product.legacyName,
    commercialAlias: product.commercialAlias,
    pillowType: product.pillowType,
    pillowTypeLabel: product.pillowTypeLabel,
    heightCm: product.heightCm,
    heightProfile: product.heightProfile,
    heightProfileLabel: product.heightProfileLabel,
    topFabric: product.topFabric,
    topFabricLabel: product.topFabricLabel,
    sideFabric: product.sideFabric,
    sideFabricLabel: product.sideFabricLabel,
    pillowTechnology,
    pillowTechnologyLabel: getPillowTechnologyLabel(pillowTechnology),
    media,
    catalogMedia,
    mediaCandidates,
    variants: product.variants,
    defaultVariantId: primaryVariant?.id ?? null,
    sizes: product.variants.map((variant) => variant.label || variant.title).filter(Boolean),
    price: primaryVariant?.price ?? null,
    originalPrice: primaryVariant?.compareAtPrice ?? null,
    tags: product.tags ?? [],
  };
}

function mapCatalogProductToDetailData(product, rawProduct = {}, { includeCatalogFallbackMedia = true } = {}) {
  const primaryVariant = product.variants[0] ?? null;

  const rawMedia = (rawProduct.media ?? []).map((asset) => ({
    id: asset.id,
    url: asset.url,
    alt: asset.alt ?? product.name,
    isPrimary: asset.isPrimary ?? asset.is_primary,
  }));
  const media = includeCatalogFallbackMedia ? getDerivedProductMedia({
    ...product,
    media: rawMedia,
  }) : rawMedia;
  const pillowTechnology = getPillowTechnology(product, rawProduct);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: rawProduct.brand ?? product.brand ?? "Sleep",
    category: normalizeCategorySlug(rawProduct.category ?? product.category),
    categoryLabel: normalizeCategoryLabel(rawProduct.category ?? product.category),
    description: rawProduct.shortDescription ?? rawProduct.description ?? product.description ?? "",
    longDescription:
      rawProduct.longDescription ??
      rawProduct.long_description ??
      rawProduct.metadata?.long_description ??
      product.longDescription ??
      "",
    tags: product.tags ?? [],
    saleType: product.saleType,
    saleTypeLabel: product.saleTypeLabel,
    line: product.line,
    lineLabel: product.lineLabel,
    technology: product.technology,
    technologyLabel: product.technologyLabel,
    displayName: product.displayName,
    legacyName: product.legacyName,
    commercialAlias: product.commercialAlias,
    pillowType: product.pillowType,
    pillowTypeLabel: product.pillowTypeLabel,
    heightCm: product.heightCm,
    heightProfile: product.heightProfile,
    heightProfileLabel: product.heightProfileLabel,
    topFabric: product.topFabric,
    topFabricLabel: product.topFabricLabel,
    sideFabric: product.sideFabric,
    sideFabricLabel: product.sideFabricLabel,
    pillowTechnology,
    pillowTechnologyLabel: getPillowTechnologyLabel(pillowTechnology),
    variants: product.variants,
    defaultVariantId: primaryVariant?.id ?? null,
    attributes: buildAttributes(product, rawProduct.attributes, rawProduct),
    media,
  };
}

function buildSupabaseCatalogSeed(product) {
  return buildCatalogSeed({
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category?.slug,
    saleType: product.metadata?.sale_type ?? product.metadata?.type,
    line: product.metadata?.line ?? product.metadata?.line_family ?? product.tagline,
    technology: product.metadata?.technology ?? product.metadata?.core_technology,
    displayName: product.metadata?.display_name ?? product.metadata?.model_name,
    legacyName: product.metadata?.legacy_name,
    commercialAlias: product.metadata?.commercial_alias,
    pillowTechnology: product.metadata?.pillow_technology,
    description: product.shortDescription ?? "",
    longDescription: product.longDescription ?? "",
    tags: buildTags(product),
    isFeatured: product.isFeatured,
    badges: product.badges,
    variants: product.variants,
    metadata: product.metadata,
    attributes: product.attributes,
  });
}

export function mapSupabaseProductToCardData(product) {
  if (!product) return null;
  return mapCatalogProductToCardData(buildSupabaseCatalogSeed(product), product, {
    includeCatalogFallbackMedia: false,
  });
}

export function mapFallbackProducts(products) {
  return products
    .map((product) => mapCatalogProductToCardData(buildCatalogSeed(product), product))
    .filter(Boolean);
}

export function mapSupabaseProductToDetail(product) {
  if (!product) return null;
  return mapCatalogProductToDetailData(buildSupabaseCatalogSeed(product), product, {
    includeCatalogFallbackMedia: false,
  });
}

export function mapFallbackProductToDetail(product) {
  if (!product) return null;
  return mapCatalogProductToDetailData(buildCatalogSeed(product), product);
}
