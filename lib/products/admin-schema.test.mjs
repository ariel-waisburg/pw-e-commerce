import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAdminProductInput } from "./admin-schema.mjs";

const validInput = {
  name: "Sleep Air Hybrid",
  slug: "sleep-air-hybrid",
  skuBase: "SAH",
  tagline: "Híbrido con resortes pocket",
  shortDescription: "Colchón híbrido",
  longDescription: "Descripción larga del colchón híbrido.",
  status: "active",
  isFeatured: false,
  media: [{ url: "https://cdn.sleep.test/products/sleep-air-hybrid.jpg", alt: "Sleep Air Hybrid" }],
  variants: [
    { sku: "SAH-Q", title: "Queen 160x200", priceCents: 9900000, compareAtPriceCents: 10500000, stockQuantity: 5 },
  ],
};

test("accepts a valid product payload", () => {
  const result = parseAdminProductInput(validInput);
  assert.equal(result.success, true);
  assert.equal(result.data.slug, "sleep-air-hybrid");
  assert.equal(result.data.variants.length, 1);
});

test("rejects a missing name", () => {
  const result = parseAdminProductInput({ ...validInput, name: "" });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "name");
});

test("rejects an invalid slug format", () => {
  const result = parseAdminProductInput({ ...validInput, slug: "Sleep Air Hybrid!" });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "slug");
});

test("rejects an empty variants array", () => {
  const result = parseAdminProductInput({ ...validInput, variants: [] });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "variants");
});

test("rejects an empty media array", () => {
  const result = parseAdminProductInput({ ...validInput, media: [] });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "media");
});

test("rejects an invalid media URL", () => {
  const result = parseAdminProductInput({
    ...validInput,
    media: [{ url: "productos/sleep-air-hybrid.jpg", alt: "Sleep Air Hybrid" }],
  });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "media.0.url");
});

test("rejects a negative variant price", () => {
  const result = parseAdminProductInput({
    ...validInput,
    variants: [{ ...validInput.variants[0], priceCents: -100 }],
  });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "variants.0.priceCents");
});

test("coerces numeric-string variant fields", () => {
  const result = parseAdminProductInput({
    ...validInput,
    variants: [{ ...validInput.variants[0], priceCents: "9900000", stockQuantity: "5" }],
  });
  assert.equal(result.success, true);
  assert.equal(result.data.variants[0].priceCents, 9900000);
});
