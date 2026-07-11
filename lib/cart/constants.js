export const CART_COOKIE_NAME = "sleep-cart";
export const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const CART_SELECT =
  `
  id,
  status,
  currency_code,
  subtotal_cents,
  discount_cents,
  shipping_cents,
  total_cents,
  created_at,
  updated_at,
  items:cart_items (
    id,
    quantity,
    unit_price_cents,
    currency_code,
    variant:product_variants (
      id,
      title,
      sku,
      price_cents,
      currency_code,
      dimensions,
      metadata
    ),
    product:products!cart_items_product_id_fkey (
      id,
      name,
      slug,
      metadata,
      media:product_media (
        id,
        url,
        alt,
        is_primary,
        sort_index
      )
    )
  )
`.trim();
