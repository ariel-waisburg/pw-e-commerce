import { normalizeStorageMediaUrl } from "../../products/media.js";

function centsToPesos(value) {
  return value == null ? null : Math.round(value / 100);
}

export function normalizeSupabaseProductRecord(record) {
  if (!record) return null;

  const mediaProduct = {
    line: record.metadata?.line ?? record.metadata?.line_family ?? record.tagline,
    technology: record.metadata?.technology ?? record.metadata?.core_technology,
    saleType: record.metadata?.sale_type ?? record.metadata?.type,
    name: record.name,
    slug: record.slug,
    id: record.id,
  };

  const variants = (record.variants ?? []).map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    title: variant.title,
    price: centsToPesos(variant.price_cents) ?? 0,
    compareAtPrice: centsToPesos(variant.compare_at_price_cents),
    currency: variant.currency_code,
    inventoryStatus: variant.inventory_status,
    stockQuantity: variant.stock_quantity,
    dimensions: variant.dimensions ?? {},
    metadata: variant.metadata ?? {},
  }));

  const media = (record.media ?? [])
    .sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0))
    .map((asset) => ({
      id: asset.id,
      url: normalizeStorageMediaUrl(asset.url, mediaProduct),
      alt: asset.alt,
      isPrimary: asset.is_primary,
      sortIndex: asset.sort_index ?? 0,
    }));

  const priceValues = variants.map((variant) => variant.price);
  const priceRange = priceValues.length
    ? {
        min: Math.min(...priceValues),
        max: Math.max(...priceValues),
      }
    : null;

  return {
    id: record.id,
    slug: record.slug,
    skuBase: record.sku_base,
    name: record.name,
    tagline: record.tagline,
    shortDescription: record.short_description,
    longDescription: record.long_description,
    attributes: record.attributes ?? {},
    metadata: record.metadata ?? {},
    category: record.category
      ? {
          id: record.category.id,
          slug: record.category.slug,
          name: record.category.name,
        }
      : null,
    variants,
    media,
    priceRange,
    badges: record.metadata?.badges ?? [],
    isFeatured: record.is_featured,
  };
}
