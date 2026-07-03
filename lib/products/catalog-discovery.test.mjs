import assert from "node:assert/strict";
import test from "node:test";

import fallbackProducts from "../../data/products.js";
import { mapFallbackProducts } from "./mappers.js";
import {
  buildCatalogDiscoveryModel,
  getCatalogStateFromSearchParams,
  removeCatalogStateKey,
  serializeCatalogState,
} from "./catalog-discovery.mjs";

const products = mapFallbackProducts(fallbackProducts);

test("legacy budget query params are translated to numeric budget range state", () => {
  const state = getCatalogStateFromSearchParams({
    budget: "700000_1000000",
    measure: "160x200",
  });

  assert.equal(state.measure, "160x200");
  assert.equal(state.rawMeasure, "160x200");
  assert.equal(state.budgetMin, 700001);
  assert.equal(state.budgetMax, 1000000);
});

test("catalog state serializes numeric budget params and clearing budget removes both ends", () => {
  const serialized = serializeCatalogState({
    q: "queen",
    measure: "160x200",
    rawMeasure: "160x200",
    budgetMin: 700000,
    budgetMax: 1200000,
    sleepPosition: "side",
  });

  assert.equal(
    serialized,
    "q=queen&measure=160x200&budgetMin=700000&budgetMax=1200000&sleepPosition=side"
  );

  assert.deepEqual(
    removeCatalogStateKey({
      budgetMin: 700000,
      budgetMax: 1200000,
      sleepMode: "partner",
    }, "budget"),
    {
      budgetMin: null,
      budgetMax: null,
      sleepMode: "partner",
    }
  );
});

test("selector answers filter visible products and sleep position reorders them without forcing zero results", () => {
  const budgetFiltered = buildCatalogDiscoveryModel(products, {
    measure: "160x200",
    budgetMax: "700000",
  });

  assert.ok(budgetFiltered.visibleProducts.length > 0);
  assert.ok(
    budgetFiltered.visibleProducts.every((product) =>
      product.variants.some((variant) => variant.price <= 700000)
    )
  );

  const sideSleepModel = buildCatalogDiscoveryModel(products, {
    measure: "160x200",
    sleepPosition: "side",
  });

  assert.ok(sideSleepModel.visibleProducts.length > 1);
  assert.notEqual(sideSleepModel.visibleProducts[0].firmness, "firm");
  assert.ok(
    sideSleepModel.activeSelectorChips.some(
      (chip) => chip.key === "sleepPosition" && chip.label === "De costado"
    )
  );
});

test("budget chip is summarized as a single selector chip", () => {
  const model = buildCatalogDiscoveryModel(products, {
    budgetMin: "700000",
    budgetMax: "900000",
  });

  const budgetChips = model.activeSelectorChips.filter((chip) => chip.key === "budget");
  assert.equal(budgetChips.length, 1);
  assert.match(budgetChips[0].label, /^Entre /);
});
