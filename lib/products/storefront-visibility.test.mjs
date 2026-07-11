import assert from "node:assert/strict";
import test from "node:test";

import {
  isHiddenStorefrontCategory,
  isStorefrontProductVisible,
} from "./storefront-visibility.mjs";

test("isStorefrontProductVisible rejects hidden categories even with media", () => {
  assert.equal(
    isStorefrontProductVisible({
      category: { slug: "almohadas" },
      media: [{ url: "https://cdn.sleep.test/almohada.jpg" }],
    }),
    false
  );
  assert.equal(isHiddenStorefrontCategory("pillow"), true);
});

test("isStorefrontProductVisible rejects products without usable media", () => {
  assert.equal(
    isStorefrontProductVisible({
      category: "colchones",
      media: [],
      variants: [{ id: "variant-1" }],
    }),
    false
  );
});

test("isStorefrontProductVisible accepts core products with derived or real media", () => {
  assert.equal(
    isStorefrontProductVisible({
      category: "colchones",
      catalogMedia: [{ url: "/products/classic.jpg" }],
    }),
    true
  );
});
