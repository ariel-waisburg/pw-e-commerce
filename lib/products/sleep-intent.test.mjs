import assert from "node:assert/strict";
import test from "node:test";

import fallbackProducts from "../../data/products.js";
import { mapFallbackProducts } from "./mappers.js";
import {
  BUDGET_DEFINITIONS,
  enrichProductForSleepIntent,
  enrichProductsForSleepIntent,
  formatCatalogMeasureLabel,
  getBudgetRangeLabel,
  getLegacyBudgetRange,
  getZeroResultsGuidance,
  normalizeBudgetRange,
  parseMeasureSelection,
  recommendMattress,
} from "./sleep-intent.mjs";

test("measure labels use Argentine size names plus exact dimensions", () => {
  assert.equal(formatCatalogMeasureLabel("100x190"), "1 plaza y media — 100 x 190 cm");
  assert.equal(formatCatalogMeasureLabel("140x190"), "2 plazas — 140 x 190 cm");
  assert.equal(formatCatalogMeasureLabel("150x190"), "Queen — 150 x 190 cm");
  assert.equal(formatCatalogMeasureLabel("160x190"), "Queen — 160 x 190 cm");
  assert.equal(formatCatalogMeasureLabel("160x200"), "Queen — 160 x 200 cm");
  assert.equal(formatCatalogMeasureLabel("200x200"), "King — 200 x 200 cm");
});

test("measure parsing recognizes aliases and warns on confused dimensions", () => {
  assert.deepEqual(parseMeasureSelection("queen"), {
    measureCode: "160x200",
    matchedFromAlias: true,
    warning: null,
  });

  assert.deepEqual(parseMeasureSelection("2 plazas — 140 x 190 cm"), {
    measureCode: "140x190",
    matchedFromAlias: true,
    warning: null,
  });

  assert.deepEqual(parseMeasureSelection("160 x 190"), {
    measureCode: "160x190",
    matchedFromAlias: true,
    warning: null,
  });

  assert.deepEqual(parseMeasureSelection("200 x 190"), {
    measureCode: null,
    matchedFromAlias: false,
    warning: {
      kind: "confusing_size",
      suggestedMeasureCode: "200x200",
    },
  });
});

test("sleep intent enrichment derives firmness, motion isolation, availability and size labels", () => {
  const product = enrichProductForSleepIntent({
    id: "prod-pocket",
    slug: "colchon-high-rest-mid",
    saleType: "mattress",
    line: "High Rest",
    technology: "pocket",
    variants: [
      {
        id: "variant-queen",
        title: "Queen",
        price: 1200000,
        inventoryStatus: "in_stock",
        stockQuantity: 4,
        measureCode: "160x200",
        dimensions: { measure_code: "160x200", width_cm: 160, length_cm: 200 },
      },
    ],
  });

  assert.equal(product.firmness, "balanced");
  assert.equal(product.motionIsolation, "high");
  assert.equal(product.availability, "available_now");
  assert.deepEqual(product.sleepModeFit, ["partner"]);
  assert.equal(product.variants[0].sizeLabel, "Queen — 160 x 200 cm");
  assert.equal(product.variants[0].availability, "available_now");
});

test("recommendation engine returns a primary mattress plus alternatives and disclaimer", () => {
  const products = enrichProductsForSleepIntent(mapFallbackProducts(fallbackProducts));
  const recommendation = recommendMattress(products, {
    measure: "160x200",
    budgetMin: 1000000,
    budgetMax: 1400000,
    firmness: "balanced",
    sleepPosition: "back",
    sleepMode: "partner",
  });

  assert.equal(recommendation.primaryRecommendation?.saleType, "mattress");
  assert.equal(recommendation.primaryRecommendation?.selectedMeasureCode, "160x200");
  assert.ok(recommendation.whyItMatches.includes("equilibr"));
  assert.equal(recommendation.cheaperAlternative, null);
  assert.ok(recommendation.premiumAlternative);
  assert.match(recommendation.disclaimer, /no reemplaza consejo médico/i);
});

test("numeric budget helpers support min-only, max-only, full, inverted, and legacy ranges", () => {
  assert.deepEqual(
    normalizeBudgetRange({
      budgetMin: "650000",
      budgetMax: null,
      bounds: { min: 550000, max: 1800000 },
    }),
    {
      min: 650000,
      max: null,
    }
  );

  assert.deepEqual(
    normalizeBudgetRange({
      budgetMin: null,
      budgetMax: "900000",
      bounds: { min: 550000, max: 1800000 },
    }),
    {
      min: null,
      max: 900000,
    }
  );

  assert.deepEqual(
    normalizeBudgetRange({
      budgetMin: "800000",
      budgetMax: "1200000",
      bounds: { min: 550000, max: 1800000 },
    }),
    {
      min: 800000,
      max: 1200000,
    }
  );

  assert.deepEqual(
    normalizeBudgetRange({
      budgetMin: "1200000",
      budgetMax: "800000",
      bounds: { min: 550000, max: 1800000 },
    }),
    {
      min: 800000,
      max: 1200000,
    }
  );

  assert.deepEqual(getLegacyBudgetRange(BUDGET_DEFINITIONS[1].value), {
    min: 700001,
    max: 1000000,
  });
});

test("budget range labels summarize the active selector chip copy", () => {
  assert.match(getBudgetRangeLabel({ min: 700000, max: null }), /^Desde /);
  assert.match(getBudgetRangeLabel({ min: null, max: 900000 }), /^Hasta /);
  assert.match(getBudgetRangeLabel({ min: 700000, max: 900000 }), /^Entre /);
});

test("zero-result guidance prefers removing high-priority filters and suggests nearby size when only measure is active", () => {
  const products = enrichProductsForSleepIntent(mapFallbackProducts(fallbackProducts));

  const priorityGuidance = getZeroResultsGuidance({
    activeFilters: {
      availability: "backorder",
      motionIsolation: "high",
      budgetMax: 700000,
    },
    products,
  });

  assert.equal(priorityGuidance.kind, "remove_filter");
  assert.equal(priorityGuidance.filterKey, "availability");

  const measureOnlyGuidance = getZeroResultsGuidance({
    activeFilters: {
      measure: "200x190",
    },
    products,
  });

  assert.equal(measureOnlyGuidance.kind, "suggest_measure");
  assert.equal(measureOnlyGuidance.currentMeasureCode, "200x190");
  assert.equal(measureOnlyGuidance.suggestedMeasureCode, "200x200");
});
