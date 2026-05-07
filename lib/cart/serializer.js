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
      ? {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          metadata: item.product.metadata ?? {},
        }
      : null,
    variant: item.variant
      ? {
          id: item.variant.id,
          title: item.variant.title,
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
