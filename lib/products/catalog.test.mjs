import test from "node:test";
import assert from "node:assert/strict";

import {
  CANONICAL_MEASURE_CODES,
  normalizeMeasureCode,
  getVisiblePlazaFromMeasure,
  formatCatalogMeasureLabel,
  formatMeasureLabel,
  formatVariantLabel,
  normalizeCatalogProduct,
  filterCatalogProducts,
  applyVariantFiltersToProduct,
  collectCatalogFilterOptions,
  groupVariantsByPlaza,
  getSetSplitForMeasure,
} from "./catalog.mjs";

test("canonical measures follow the latest business definition", () => {
  assert.deepEqual(CANONICAL_MEASURE_CODES, [
    "080x190",
    "080x200",
    "090x190",
    "090x200",
    "100x190",
    "100x200",
    "105x190",
    "105x200",
    "130x190",
    "140x190",
    "140x200",
    "150x190",
    "150x200",
    "160x190",
    "160x200",
    "180x200",
    "200x200",
  ]);
  assert.equal(normalizeMeasureCode("090 x 190"), "090x190");
  assert.equal(normalizeMeasureCode("160 x 190"), "160x190");
  assert.equal(normalizeMeasureCode("200 x 190"), null);
});

test("visible plaza labels group the full grid into five tiers", () => {
  assert.equal(getVisiblePlazaFromMeasure("080x190"), "1 plaza");
  assert.equal(getVisiblePlazaFromMeasure("090x200"), "1 plaza");
  assert.equal(getVisiblePlazaFromMeasure("100x190"), "1 plaza y media");
  assert.equal(getVisiblePlazaFromMeasure("105x200"), "1 plaza y media");
  assert.equal(getVisiblePlazaFromMeasure("130x190"), "2 plazas");
  assert.equal(getVisiblePlazaFromMeasure("140x200"), "2 plazas");
  assert.equal(getVisiblePlazaFromMeasure("150x190"), "queen");
  assert.equal(getVisiblePlazaFromMeasure("160x190"), "queen");
  assert.equal(getVisiblePlazaFromMeasure("160x200"), "queen");
  assert.equal(getVisiblePlazaFromMeasure("200x200"), "king");
  assert.equal(formatMeasureLabel("160x200"), "160 x 200 cm");
  assert.equal(formatCatalogMeasureLabel("140x190"), "2 plazas — 140 x 190 cm");
  assert.equal(formatVariantLabel({ measureCode: "160x200" }), "Queen · 160 x 200 cm");
  assert.equal(formatVariantLabel({ measureCode: "100x190" }), "1 Plaza y Media · 100 x 190 cm");
});

test("normalizeCatalogProduct derives classic rest business rules", () => {
  const product = normalizeCatalogProduct({
    id: "prod-1",
    slug: "colchon-classic-rest-pocket",
    name: "Colchón Classic Rest Pocket",
    saleType: "mattress",
    line: "Classic Rest",
    technology: "pocket",
    variants: [{ id: "variant-1", title: "Queen", price: 1, measureCode: "160x200" }],
  });

  assert.equal(product.saleType, "mattress");
  assert.equal(product.line, "Classic Rest");
  assert.equal(product.technology, "pocket");
  assert.equal(product.pillowType, "none");
  assert.equal(product.heightCm, 24);
  assert.equal(product.heightProfile, "media");
  assert.equal(product.topFabric, "jacquard");
  assert.equal(product.sideFabric, "jacquard");
  assert.equal(product.displayName, "Pocket");
});

test("normalizeCatalogProduct derives high rest and top hotel rules", () => {
  const highRestFoam = normalizeCatalogProduct({
    id: "prod-2",
    slug: "colchon-high-rest-firm",
    name: "Colchón High Rest Firm",
    saleType: "mattress",
    line: "High Rest",
    technology: "foam",
    variants: [{ id: "variant-1", title: "2 plazas", price: 1, measureCode: "140x190" }],
  });

  const highRestPocket = normalizeCatalogProduct({
    id: "prod-3",
    slug: "colchon-high-rest-mid",
    name: "Colchón High Rest Mid",
    saleType: "mattress",
    line: "High Rest",
    technology: "pocket",
    variants: [{ id: "variant-1", title: "Queen", price: 1, measureCode: "160x200" }],
  });

  const topHotel = normalizeCatalogProduct({
    id: "prod-4",
    slug: "colchon-top-hotel-pocket",
    name: "Colchón Top Hotel Pocket",
    saleType: "mattress",
    line: "Top Hotel Rest",
    technology: "pocket",
    variants: [{ id: "variant-1", title: "King", price: 1, measureCode: "180x200" }],
  });

  assert.equal(highRestFoam.pillowType, "none");
  assert.equal(highRestFoam.heightCm, 27);
  assert.equal(highRestFoam.topFabric, "knit");
  assert.equal(highRestFoam.sideFabric, "jacquard");
  assert.equal(highRestFoam.displayName, "Firm");

  assert.equal(highRestPocket.pillowType, "euro");
  assert.equal(highRestPocket.heightCm, 27);
  assert.equal(highRestPocket.displayName, "Mid");

  assert.equal(topHotel.pillowType, "american");
  assert.equal(topHotel.heightCm, 37);
  assert.equal(topHotel.topFabric, "knit");
  assert.equal(topHotel.sideFabric, "suede_like");
});

test("normalizeCatalogProduct derives superior rules and keeps plush mapped to bonell", () => {
  const superior = normalizeCatalogProduct({
    id: "prod-5",
    slug: "colchon-superior-bonell",
    name: "Colchón Superior Plush",
    saleType: "mattress",
    line: "Superior Rest",
    technology: "bonell",
    displayName: "Plush",
    variants: [{ id: "variant-1", title: "Queen", price: 1, measureCode: "160x200" }],
  });

  assert.equal(superior.pillowType, "american");
  assert.equal(superior.heightCm, 32);
  assert.equal(superior.topFabric, "knit");
  assert.equal(superior.sideFabric, "jacquard");
  assert.equal(superior.displayName, "Plush");
  assert.equal(superior.technology, "bonell");
});

test("normalizeCatalogProduct infers legacy mid/plush names and top hotel defaults", () => {
  const highRestMid = normalizeCatalogProduct({
    id: "prod-legacy-mid",
    slug: "colchon-high-rest-mid",
    name: "Colchón High Rest Mid",
    saleType: "mattress",
    line: "High Rest",
    variants: [{ id: "variant-1", title: "Queen", price: 1, measureCode: "160x200" }],
  });

  const topHotel = normalizeCatalogProduct({
    id: "prod-top-default",
    slug: "conjunto-top-hotel-rest",
    name: "Conjunto Top Hotel Rest",
    saleType: "set",
    line: "Top Hotel Rest",
    variants: [{ id: "variant-2", title: "King", price: 1, measureCode: "180x200" }],
  });

  assert.equal(highRestMid.technology, "pocket");
  assert.equal(highRestMid.displayName, "Mid");
  assert.equal(highRestMid.pillowType, "euro");

  assert.equal(topHotel.technology, "pocket");
  assert.equal(topHotel.displayName, "Pocket");
  assert.equal(topHotel.pillowType, "american");
});

test("set products derive split sommier composition from measure", () => {
  const setProduct = normalizeCatalogProduct({
    id: "prod-6",
    slug: "conjunto-high-rest-pocket",
    name: "Conjunto High Rest Mid",
    saleType: "set",
    line: "High Rest",
    technology: "pocket",
    variants: [
      { id: "variant-1", title: "2 plazas", price: 1, measureCode: "150x190" },
      { id: "variant-2", title: "Queen", price: 1, measureCode: "160x200" },
    ],
  });

  assert.deepEqual(getSetSplitForMeasure("150x190"), {
    baseCount: 1,
    widthsCm: [150],
    label: "1 sommier de 150 cm",
  });
  assert.deepEqual(getSetSplitForMeasure("160x200"), {
    baseCount: 2,
    widthsCm: [80, 80],
    label: "2 sommiers de 80 cm",
  });
  assert.deepEqual(
    setProduct.variants.map((variant) => variant.setSplit.label),
    ["1 sommier de 150 cm", "2 sommiers de 80 cm"]
  );
});

test("filterCatalogProducts applies main and secondary filters for the new domain", () => {
  const products = [
    normalizeCatalogProduct({
      id: "prod-1",
      slug: "colchon-high-rest-pocket",
      name: "Colchón High Rest Mid",
      saleType: "mattress",
      line: "High Rest",
      technology: "pocket",
      variants: [
        {
          id: "variant-1",
          title: "Queen",
          price: 999999,
          inventoryStatus: "in_stock",
          stockQuantity: 4,
          measureCode: "160x200",
          dimensions: { measure_code: "160x200", width_cm: 160, length_cm: 200 },
        },
      ],
    }),
    normalizeCatalogProduct({
      id: "prod-2",
      slug: "conjunto-top-hotel-pocket",
      name: "Conjunto Top Hotel Pocket",
      saleType: "set",
      line: "Top Hotel Rest",
      technology: "pocket",
      variants: [
        {
          id: "variant-2",
          title: "King",
          price: 1599999,
          inventoryStatus: "backorder",
          stockQuantity: 0,
          measureCode: "180x200",
          dimensions: { measure_code: "180x200", width_cm: 180, length_cm: 200 },
        },
      ],
    }),
  ];

  const filtered = filterCatalogProducts(products, {
    saleType: "mattress",
    line: "High Rest",
    technology: "pocket",
    pillowType: "euro",
    plaza: "queen",
    measure: "160x200",
    budget: "700000_1000000",
    sleepMode: "partner",
    motionIsolation: "high",
    availability: "available_now",
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].slug, "colchon-high-rest-pocket");
});

test("collectCatalogFilterOptions exposes main and secondary filter groups", () => {
  const products = [
    normalizeCatalogProduct({
      id: "prod-1",
      slug: "colchon-classic-rest-foam",
      name: "Colchón Classic Rest Foam",
      saleType: "mattress",
      line: "Classic Rest",
      technology: "foam",
      variants: [
        {
          id: "variant-1",
          title: "1 plaza",
          price: 620000,
          inventoryStatus: "in_stock",
          stockQuantity: 5,
          measureCode: "100x190",
          dimensions: { measure_code: "100x190", width_cm: 100, length_cm: 190 },
        },
      ],
    }),
    normalizeCatalogProduct({
      id: "prod-2",
      slug: "conjunto-high-rest-pocket",
      name: "Conjunto High Rest Mid",
      saleType: "set",
      line: "High Rest",
      technology: "pocket",
      variants: [
        {
          id: "variant-2",
          title: "Queen",
          price: 1210000,
          inventoryStatus: "backorder",
          stockQuantity: 0,
          measureCode: "160x200",
          dimensions: { measure_code: "160x200", width_cm: 160, length_cm: 200 },
        },
      ],
    }),
  ];

  const options = collectCatalogFilterOptions(products);

  assert.deepEqual(options.saleTypes.map((option) => option.value), ["mattress", "set"]);
  assert.deepEqual(options.lines.map((option) => option.value), ["Classic Rest", "High Rest"]);
  assert.deepEqual(options.technologies.map((option) => option.value), ["foam", "pocket"]);
  assert.deepEqual(options.pillowTypes.map((option) => option.value), ["none", "euro"]);
  assert.deepEqual(options.heightProfiles.map((option) => option.value), ["media"]);
  assert.deepEqual(options.topFabrics.map((option) => option.value), ["jacquard", "knit"]);
  assert.deepEqual(options.sideFabrics.map((option) => option.value), ["jacquard"]);
  assert.deepEqual(options.measures.map((option) => option.value), ["100x190", "160x200"]);
  assert.deepEqual(options.measures.map((option) => option.label), [
    "1 plaza — 100 x 190 cm",
    "Queen — 160 x 200 cm",
  ]);
  assert.deepEqual(options.plazas.map((option) => option.value), ["1 plaza", "queen"]);
  assert.deepEqual(options.budgets.map((option) => option.value), ["hasta_700000", "1000000_1400000"]);
  assert.deepEqual(options.firmnesses.map((option) => option.value), ["balanced", "firm"]);
  assert.deepEqual(options.motionIsolationLevels.map((option) => option.value), ["high", "medium"]);
  assert.deepEqual(options.availability.map((option) => option.value), ["available_now", "backorder"]);
});

test("applyVariantFiltersToProduct and groupVariantsByPlaza support plaza-first PDP flow", () => {
  const product = normalizeCatalogProduct({
    id: "prod-3",
    slug: "colchon-top-hotel-pocket",
    name: "Colchón Top Hotel Pocket",
    saleType: "mattress",
      line: "Top Hotel Rest",
      technology: "pocket",
      variants: [
      { id: "variant-1", title: "2 plazas", price: 1, inventoryStatus: "backorder", stockQuantity: 0, measureCode: "150x190", dimensions: { measure_code: "150x190", width_cm: 150, length_cm: 190 } },
      { id: "variant-2", title: "Queen", price: 1, inventoryStatus: "in_stock", stockQuantity: 6, measureCode: "160x200", dimensions: { measure_code: "160x200", width_cm: 160, length_cm: 200 } },
      { id: "variant-3", title: "King", price: 1, inventoryStatus: "in_stock", stockQuantity: 6, measureCode: "180x200", dimensions: { measure_code: "180x200", width_cm: 180, length_cm: 200 } },
    ],
  });

  const filtered = applyVariantFiltersToProduct(product, { plaza: "queen", availability: "available_now" });
  const grouped = groupVariantsByPlaza(product.variants);

  assert.deepEqual(filtered.variants.map((variant) => variant.measureCode), ["160x200"]);
  assert.deepEqual(grouped.map((group) => group.plaza), ["2 plazas", "queen", "king"]);
});
