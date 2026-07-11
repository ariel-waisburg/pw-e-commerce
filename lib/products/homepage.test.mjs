import assert from "node:assert/strict";
import test from "node:test";

import fallbackProducts from "../../data/products.js";
import { mapFallbackProducts } from "./mappers.js";
import {
  HOMEPAGE_PRIMARY_CTA,
  HOMEPAGE_QUICK_LINKS,
  HOMEPAGE_SECONDARY_CTA,
  buildHomepageContent,
  selectHomepagePreviewProducts,
} from "./homepage.mjs";

test("homepage content exposes the updated hero and catalog preview CTAs", () => {
  const homepage = buildHomepageContent(mapFallbackProducts(fallbackProducts));

  assert.equal(HOMEPAGE_PRIMARY_CTA.label, "Encontrá tu colchón");
  assert.equal(HOMEPAGE_PRIMARY_CTA.href, "/catalog?saleType=mattress");
  assert.equal(HOMEPAGE_SECONDARY_CTA.href, "/catalog?saleType=mattress");
  assert.equal(homepage.hero.primaryCta.label, "Encontrá tu colchón");
  assert.equal(homepage.hero.title, "Elegí el colchón indicado para el sueño que te merecés.");
  assert.equal(homepage.catalogPreview.title, "Entrá directo a opciones reales de compra");
  assert.equal(homepage.catalogPreview.primaryCta.href, "/catalog?saleType=mattress");
  assert.equal(homepage.catalogPreview.secondaryCta.label, "Ver catálogo completo");
});

test("homepage catalog preview exposes the main quick links", () => {
  const homepage = buildHomepageContent(mapFallbackProducts(fallbackProducts));

  assert.equal(homepage.catalogPreview.quickLinks.length, HOMEPAGE_QUICK_LINKS.length);
  assert.deepEqual(
    homepage.catalogPreview.quickLinks.map((link) => link.href),
    ["/catalog?saleType=mattress", "/catalog?saleType=set", "/catalog/guia-medidas"]
  );
});

test("homepage preview prioritizes featured mattress products and ignores sets or accessories", () => {
  const preview = selectHomepagePreviewProducts([
    {
      id: "set-featured",
      saleType: "set",
      line: "Classic Rest",
      name: "Conjunto destacado",
      price: 1200000,
      isFeatured: true,
      tags: ["destacado"],
    },
    {
      id: "pillow",
      category: "almohadas",
      name: "Almohada",
      price: 50000,
      tags: ["destacado"],
    },
    {
      id: "mattress-featured-a",
      saleType: "mattress",
      line: "High Rest",
      name: "Mattress A",
      price: 800000,
      isFeatured: true,
      tags: ["destacado"],
      media: [{ url: "/products/a.jpg" }],
    },
    {
      id: "mattress-featured-b",
      saleType: "mattress",
      line: "Superior Rest",
      name: "Mattress B",
      price: 950000,
      isFeatured: true,
      tags: ["destacado"],
      media: [{ url: "/products/b.jpg" }],
    },
    {
      id: "mattress-regular-cheap",
      saleType: "mattress",
      line: "Classic Rest",
      name: "Mattress C",
      price: 600000,
      tags: [],
      media: [{ url: "/products/c.jpg" }],
    },
    {
      id: "mattress-regular-same-line",
      saleType: "mattress",
      line: "Classic Rest",
      name: "Mattress D",
      price: 650000,
      tags: [],
      media: [{ url: "/products/d.jpg" }],
    },
  ]);

  assert.equal(preview.length, 4);
  assert.deepEqual(
    preview.map((product) => product.id),
    [
      "mattress-featured-a",
      "mattress-featured-b",
      "mattress-regular-cheap",
      "mattress-regular-same-line",
    ]
  );
  preview.forEach((product) => {
    assert.equal(product.saleType, "mattress");
  });
});

test("homepage preview uses valid fallback catalog products", () => {
  const homepage = buildHomepageContent(mapFallbackProducts(fallbackProducts));

  assert.equal(homepage.catalogPreview.featuredProducts.length, 4);
  homepage.catalogPreview.featuredProducts.forEach((product) => {
    assert.equal(product.saleType, "mattress");
    assert.ok(product.slug);
    assert.ok(product.line);
    assert.equal(typeof product.price, "number");
  });
});
