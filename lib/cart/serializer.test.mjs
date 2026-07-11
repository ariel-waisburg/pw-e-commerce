import assert from "node:assert/strict";
import test from "node:test";

import { serializeCartRecord } from "./serializer.js";

test("serializeCartRecord exposes primary product media for cart items", () => {
  const cart = serializeCartRecord({
    id: "cart-1",
    status: "active",
    currency_code: "ARS",
    subtotal_cents: 100000,
    discount_cents: 0,
    shipping_cents: 0,
    total_cents: 100000,
    items: [
      {
        id: "item-1",
        quantity: 1,
        unit_price_cents: 100000,
        currency_code: "ARS",
        product: {
          id: "product-1",
          name: "Colchón visible",
          slug: "colchon-visible",
          metadata: {},
          media: [
            {
              id: "media-secondary",
              url: "https://cdn.sleep.test/secondary.jpg",
              alt: "Foto secundaria",
              is_primary: false,
              sort_index: 1,
            },
            {
              id: "media-primary",
              url: "https://cdn.sleep.test/primary.jpg",
              alt: "Foto principal",
              is_primary: true,
              sort_index: 0,
            },
          ],
        },
        variant: {
          id: "variant-1",
          title: "Queen 160x200",
          sku: "VIS-Q",
          metadata: { measure_code: "160x200" },
          dimensions: {},
        },
      },
    ],
  });

  assert.equal(cart.items[0].product.media.length, 2);
  assert.equal(cart.items[0].product.primaryMedia.url, "https://cdn.sleep.test/primary.jpg");
});

test("serializeCartRecord normalizes storage media with legacy filenames", () => {
  const cart = serializeCartRecord({
    id: "cart-1",
    status: "active",
    currency_code: "ARS",
    subtotal_cents: 100000,
    discount_cents: 0,
    shipping_cents: 0,
    total_cents: 100000,
    items: [
      {
        id: "item-1",
        quantity: 1,
        unit_price_cents: 100000,
        currency_code: "ARS",
        product: {
          id: "product-1",
          name: "Colchón High Rest Plush",
          slug: "colchon-high-rest-plush",
          metadata: {
            line: "High Rest",
            technology: "bonell",
            sale_type: "mattress",
          },
          media: [
            {
              id: "media-primary",
              url: "storage://colchones/HIGH-REST-PLUSH-1.jpg",
              alt: "Colchón High Rest Plush",
              is_primary: true,
              sort_index: 0,
            },
          ],
        },
        variant: {
          id: "variant-1",
          title: "Único",
          sku: "HIGH-REST-PLUSH-UNICO",
          metadata: {},
          dimensions: {},
        },
      },
    ],
  });

  assert.equal(cart.items[0].product.primaryMedia.url, "/products/HIGH-REST-PLUSH.jpg");
});
