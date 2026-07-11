import { formatVariantLabel } from "../products/catalog.mjs";
import { normalizeStorageMediaUrl } from "../products/media.js";

function normalizeProductMedia(media = [], product = {}) {
  return media
    .map((asset) => ({
      id: asset.id,
      url: normalizeStorageMediaUrl(asset.url, {
        line: product.metadata?.line ?? product.metadata?.line_family,
        technology: product.metadata?.technology ?? product.metadata?.core_technology,
        saleType: product.metadata?.sale_type ?? product.metadata?.type,
        name: product.name,
        slug: product.slug,
        id: product.id,
      }),
      alt: asset.alt,
      isPrimary: asset.isPrimary ?? asset.is_primary ?? false,
      sortIndex: asset.sortIndex ?? asset.sort_index ?? 0,
    }))
    .filter((asset) => Boolean(asset.url))
    .sort((left, right) => {
      if (left.isPrimary !== right.isPrimary) return left.isPrimary ? -1 : 1;
      return left.sortIndex - right.sortIndex;
    });
}

export function serializeCartRecord(record) {
  if (!record) return null;

  const subtotal = (record.subtotal_cents ?? 0) / 100;
  const discount = (record.discount_cents ?? 0) / 100;
  const shipping = (record.shipping_cents ?? 0) / 100;
  const total = (record.total_cents ?? 0) / 100;

  const items = (record.items ?? []).map((item) => ({
    id: item.id,
    quantity: item.quantity,
    unitPrice: (item.unit_price_cents ?? item.variant?.price_cents ?? 0) / 100,
    currency: item.currency_code ?? item.variant?.currency_code ?? record.currency_code ?? "ARS",
    product: item.product
      ? (() => {
          const media = normalizeProductMedia(item.product.media ?? [], item.product);
          return {
            id: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            metadata: item.product.metadata ?? {},
            media,
            primaryMedia: media[0] ?? null,
          };
        })()
      : null,
    variant: item.variant
      ? {
          id: item.variant.id,
          title: item.variant.title,
          label:
            formatVariantLabel({
              measureCode:
                item.variant.metadata?.measure_code ?? item.variant.dimensions?.measure_code,
            }) || item.variant.title,
          sku: item.variant.sku,
        }
      : null,
  }));

  return {
    id: record.id,
    status: record.status,
    currency: record.currency_code ?? "ARS",
    subtotal,
    discount,
    shipping,
    total,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}
