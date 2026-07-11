import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSupabaseProductRecord } from "./product-normalizer.mjs";

test("normalizeSupabaseProductRecord converts variant cent amounts to storefront peso prices", () => {
  const product = normalizeSupabaseProductRecord({
    id: "product-1",
    slug: "colchon-classic-rest",
    sku_base: "SLP-CR",
    name: "Colchón Classic Rest",
    tagline: "Classic Rest",
    short_description: "Colchón classic.",
    long_description: "Colchón classic rest.",
    attributes: {},
    metadata: {},
    status: "active",
    is_featured: true,
    category: {
      id: "cat-1",
      slug: "colchones",
      name: "Colchones",
    },
    variants: [
      {
        id: "variant-1",
        sku: "SLP-CR-140190",
        title: "2 Plazas · 140 x 190 cm",
        price_cents: 8900000,
        compare_at_price_cents: 17800000,
        currency_code: "ARS",
        stock_quantity: 4,
        inventory_status: "in_stock",
        dimensions: { measure_code: "140x190" },
        metadata: {},
      },
    ],
    media: [],
  });

  assert.equal(product.variants[0].price, 89000);
  assert.equal(product.variants[0].compareAtPrice, 178000);
  assert.deepEqual(product.priceRange, { min: 89000, max: 89000 });
});
