import test from "node:test";
import assert from "node:assert/strict";
import { buildMattressCardModel, getMattressCardDefinition } from "./product-card.mjs";

test("getMattressCardDefinition maps documented models without mixing line and technology", () => {
  assert.deepEqual(
    getMattressCardDefinition({
      line: "High Rest",
      technology: "bonell",
    }),
    {
      lineName: "High Rest",
      commercialName: "Plush",
      technologyLabel: "Resortes Bonnell",
      heightCm: 27,
      pillowLabel: "Euro pillow",
    }
  );

  assert.deepEqual(
    getMattressCardDefinition({
      line: "Superior Rest",
      technology: "pocket",
    }),
    {
      lineName: "Superior",
      commercialName: "Ultra Plush",
      technologyLabel: "Resortes pocket",
      heightCm: 32,
      pillowLabel: "Pillow americano",
    }
  );
});

test("buildMattressCardModel exposes comparison-ready commercial fields and promotion", () => {
  const model = buildMattressCardModel(
    {
      line: "Classic Special",
      technology: "foam",
      saleTypeLabel: "Colchón",
      tags: ["destacado"],
      variants: [
        { id: "1", price: 600000, compareAtPrice: 750000, measureCode: "140x190" },
        { id: "2", price: 650000, compareAtPrice: 750000, measureCode: "160x200" },
      ],
    },
    { id: "1", price: 600000, compareAtPrice: 750000, measureCode: "140x190" }
  );

  assert.equal(model.lineName, "Classic");
  assert.equal(model.commercialName, "Special Foam");
  assert.equal(model.technologyLabel, "Espuma");
  assert.equal(model.heightLabel, "20 cm");
  assert.equal(model.pillowLabel, "Sin pillow");
  assert.equal(model.currentPrice, 600000);
  assert.equal(model.compareAtPrice, 750000);
  assert.equal(model.discount, 20);
  assert.equal(model.promotionLabel, "20% OFF");
  assert.equal(model.installmentsLabel, "12 cuotas de $ 50.000");
  assert.equal(model.isFeatured, true);
  assert.equal(model.stockState, "available");
});

test("buildMattressCardModel supports out-of-stock state without inventing extra specs", () => {
  const model = buildMattressCardModel(
    {
      line: "Top Hotel Rest",
      technology: "pocket",
      saleTypeLabel: "Conjunto",
      variants: [
        {
          id: "hotel",
          price: 1800000,
          compareAtPrice: null,
          measureCode: "160x200",
          stockStatus: "out_of_stock",
        },
      ],
    },
    {
      id: "hotel",
      price: 1800000,
      compareAtPrice: null,
      measureCode: "160x200",
      stockStatus: "out_of_stock",
    }
  );

  assert.equal(model.lineName, "Top Hotel");
  assert.equal(model.commercialName, "Top Hotel");
  assert.equal(model.technologyLabel, "Resortes pocket");
  assert.equal(model.stockState, "out_of_stock");
  assert.equal(model.promotionLabel, null);
});

test("buildMattressCardModel preserves long commercial names for UI clamping", () => {
  const longName =
    "Combo Colchón y Sommier Doble Europillow Espuma de Alta Densidad + Almohadas de Regalo";
  const model = buildMattressCardModel(
    {
      line: "Línea a confirmar",
      technology: "foam",
      name: longName,
      saleTypeLabel: "Colchón",
      variants: [
        {
          id: "combo-140x190",
          price: 999999,
          compareAtPrice: 1299999,
          measureCode: "140x190",
        },
      ],
    },
    {
      id: "combo-140x190",
      price: 999999,
      compareAtPrice: 1299999,
      measureCode: "140x190",
    }
  );

  assert.equal(model.commercialName, longName);
  assert.equal(model.lineName, "Línea a confirmar");
});
