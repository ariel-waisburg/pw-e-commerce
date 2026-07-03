import assert from "node:assert/strict";
import test from "node:test";

import fallbackProducts from "../../data/products.js";
import { mapFallbackProducts } from "./mappers.js";
import { enrichProductsForSleepIntent } from "./sleep-intent.mjs";
import { parseSearchIntent, searchProductsByIntent } from "./search-intent.mjs";

test("search intent parses familiar mattress terms, dimensions and aliases", () => {
  assert.deepEqual(parseSearchIntent("Colchón firme 2 plazas"), {
    rawQuery: "Colchón firme 2 plazas",
    normalizedQuery: "colchon firme 2 plazas",
    saleType: "mattress",
    category: null,
    measure: "140x190",
    measureWarning: null,
    firmness: "firm",
    technology: null,
    technologyGroup: null,
    line: null,
    sleepMode: null,
    pillowTechnology: null,
  });

  assert.deepEqual(parseSearchIntent("Hotelero 160 x 200"), {
    rawQuery: "Hotelero 160 x 200",
    normalizedQuery: "hotelero 160 x 200",
    saleType: null,
    category: null,
    measure: "160x200",
    measureWarning: null,
    firmness: null,
    technology: null,
    technologyGroup: null,
    line: "Top Hotel Rest",
    sleepMode: null,
    pillowTechnology: null,
  });
});

test("search intent tolerates minor spelling errors and pillow synonyms", () => {
  assert.equal(parseSearchIntent("quen con reorte").measure, "160x200");
  assert.equal(parseSearchIntent("quen con reorte").technologyGroup, "springs");
  assert.equal(parseSearchIntent("Almohada memory foam").category, "almohadas");
  assert.equal(parseSearchIntent("Almohada memory foam").pillowTechnology, "viscoelastica");
});

test("intent search prioritizes available products and returns related categories when empty", () => {
  const products = enrichProductsForSleepIntent(mapFallbackProducts(fallbackProducts));

  const queenSprings = searchProductsByIntent(products, "Queen con resortes");
  assert.ok(queenSprings.results.length > 0);
  assert.equal(queenSprings.results[0].selectedMeasureCode, "160x200");
  assert.ok(["bonell", "pocket"].includes(queenSprings.results[0].technology));

  const noExact = searchProductsByIntent(products, "Diván hotelero");
  assert.equal(noExact.results.length, 0);
  assert.ok(noExact.relatedCategories.some((entry) => entry.slug === "colchones"));
  assert.ok(noExact.relatedCategories.some((entry) => entry.slug === "almohadas"));
});
