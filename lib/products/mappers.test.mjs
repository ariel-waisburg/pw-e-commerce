import assert from "node:assert/strict";
import test from "node:test";

import {
  mapFallbackProductToDetail,
  mapFallbackProducts,
  mapSupabaseProductToCardData,
  mapSupabaseProductToDetail,
} from "./mappers.js";

test("mapFallbackProducts exposes the new mattress catalog domain on cards", () => {
  const [card] = mapFallbackProducts([
    {
      id: "mattress-high-rest-pocket",
      slug: "colchon-high-rest-pocket",
      name: "Colchón High Rest Mid",
      category: "colchones",
      saleType: "mattress",
      line: "High Rest",
      technology: "pocket",
      description: "Pocket con euro pillow.",
      variants: [
        {
          id: "variant-160x200",
          price: 999999,
          compareAtPrice: 1199999,
          measureCode: "160x200",
          dimensions: {
            measure_code: "160x200",
            width_cm: 160,
            length_cm: 200,
          },
        },
      ],
    },
  ]);

  assert.equal(card.saleType, "mattress");
  assert.equal(card.saleTypeLabel, "Colchón");
  assert.equal(card.line, "High Rest");
  assert.equal(card.technology, "pocket");
  assert.equal(card.displayName, "Pocket");
  assert.equal(card.pillowType, "euro");
  assert.equal(card.heightProfile, "media");
  assert.equal(card.topFabric, "knit");
  assert.equal(card.sideFabric, "jacquard");
  assert.equal(card.media[0]?.url, "/products/HIGH-REST-MID.jpg");
  assert.equal(card.catalogMedia[0]?.url, "/products/HIGH-REST-MID.jpg");
  assert.equal(card.mediaCandidates[0]?.url, "/products/HIGH-REST-MID.jpg");
});

test("mapSupabaseProductToCardData keeps mattress/set cards in the main domain and exposes remote to local media fallback", () => {
  const card = mapSupabaseProductToCardData({
    id: "supabase-superior-pocket-set",
    slug: "combo-superior-pocket",
    name: "Combo Colchón y Sommier Doble Europillow Espuma de Alta Densidad + Almohadas de Regalo",
    tagline: "Superior Rest",
    shortDescription: "Combo con media remota y fallback local.",
    longDescription: "",
    attributes: {},
    metadata: {
      line: "Superior Rest",
      technology: "pocket",
    },
    category: {
      id: "cat-sets",
      slug: "conjuntos",
      name: "Conjuntos",
    },
    variants: [
      {
        id: "variant-160x200",
        title: "160 x 200",
        price: 1499999,
        compareAtPrice: 1799999,
        metadata: {
          measure_code: "160x200",
        },
        dimensions: {
          measure_code: "160x200",
          width_cm: 160,
          length_cm: 200,
        },
      },
    ],
    media: [
      {
        id: "remote-primary",
        url: "https://cdn.sleep.test/catalog/superior-pocket-set.jpg",
        alt: "Media remota",
        isPrimary: true,
      },
    ],
    badges: [],
    isFeatured: false,
  });

  assert.equal(card.saleType, "set");
  assert.equal(card.saleTypeLabel, "Conjunto");
  assert.equal(card.category, "conjuntos");
  assert.equal(card.categoryLabel, "Conjuntos");
  assert.equal(card.line, "Superior Rest");
  assert.equal(card.technology, "pocket");
  assert.equal(card.media[0]?.url, "https://cdn.sleep.test/catalog/superior-pocket-set.jpg");
  assert.equal(card.catalogMedia[0]?.url, "/products/SUPERIOR-REST-ULTRA-PLUSH-S.jpg");
  assert.equal(card.mediaCandidates[0]?.url, "https://cdn.sleep.test/catalog/superior-pocket-set.jpg");
  assert.equal(card.mediaCandidates[1]?.url, "/products/SUPERIOR-REST-ULTRA-PLUSH-S.jpg");
  assert.equal(card.mediaCandidates.length, 2);
});

test("mapFallbackProductToDetail builds the new technical summary and set split data", () => {
  const detail = mapFallbackProductToDetail({
    id: "set-top-hotel-pocket",
    slug: "conjunto-top-hotel-rest-pocket",
    name: "Conjunto Top Hotel Rest Pocket",
    category: "conjuntos",
    saleType: "set",
    line: "Top Hotel Rest",
    technology: "pocket",
    description: "Conjunto pocket premium.",
    variants: [
      {
        id: "variant-160x200",
        price: 1499999,
        compareAtPrice: 1799999,
        measureCode: "160x200",
        dimensions: {
          measure_code: "160x200",
          width_cm: 160,
          length_cm: 200,
        },
      },
      {
        id: "variant-180x200",
        price: 1599999,
        compareAtPrice: 1899999,
        measureCode: "180x200",
        dimensions: {
          measure_code: "180x200",
          width_cm: 180,
          length_cm: 200,
        },
      },
    ],
  });

  assert.equal(detail.saleType, "set");
  assert.equal(detail.line, "Top Hotel Rest");
  assert.equal(detail.pillowType, "american");
  assert.equal(detail.heightCm, 37);
  assert.equal(detail.topFabric, "knit");
  assert.equal(detail.sideFabric, "suede_like");
  assert.equal(detail.media[0]?.url, "/products/TOP-HOTEL-REST-S.jpg");

  const attributesByLabel = Object.fromEntries(detail.attributes.map((attribute) => [attribute.label, attribute.value]));

  assert.equal(attributesByLabel["Pillow"], "Americano");
  assert.equal(attributesByLabel["Altura"], "37 cm · Muy grande");
  assert.equal(attributesByLabel["Tela superior"], "Tejido de punto");
  assert.equal(attributesByLabel["Tela lateral"], "Gamuza / similar");
  assert.equal(attributesByLabel["Sommier"], "160 x 200 cm: 2 sommiers de 80 cm · 180 x 200 cm: 2 sommiers de 90 cm");
});

test("mapSupabaseProductToDetail normalizes category objects for accessory detail pages", () => {
  const detail = mapSupabaseProductToDetail({
    id: "supabase-pillow-visco",
    slug: "almohada-viscoelastica",
    name: "Almohada Viscoelástica",
    tagline: null,
    shortDescription: "Almohada con memoria.",
    longDescription: "",
    attributes: {},
    metadata: {
      pillow_technology: "viscoelastica",
    },
    category: {
      id: "cat-pillows",
      slug: "almohadas",
      name: "Almohadas",
    },
    variants: [
      {
        id: "variant-unico",
        title: "Único",
        price: 99999,
        compareAtPrice: 129999,
        metadata: {},
        dimensions: {},
      },
    ],
    media: [],
    badges: [],
    isFeatured: false,
  });

  assert.equal(detail.category, "almohadas");
  assert.equal(detail.categoryLabel, "Almohadas");
  assert.equal(detail.pillowTechnologyLabel, "Viscoelástica");
});

test("mapFallbackProductToDetail keeps pillow products in a separate domain", () => {
  const detail = mapFallbackProductToDetail({
    id: "pillow-visco",
    slug: "almohada-viscoelastica",
    name: "Almohada Viscoelástica",
    category: "almohadas",
    description: "Almohada viscoelástica.",
    metadata: {
      pillow_technology: "viscoelastica",
    },
    variants: [
      {
        id: "variant-unico",
        title: "Único",
        price: 99999,
        compareAtPrice: 129999,
      },
    ],
  });

  assert.equal(detail.pillowTechnology, "viscoelastica");
  assert.equal(detail.pillowTechnologyLabel, "Viscoelástica");
  assert.equal(detail.categoryLabel, "Almohadas");
  assert.equal(detail.attributes[0]?.label, "Tecnología");
  assert.equal(detail.attributes[0]?.value, "Viscoelástica");
});
