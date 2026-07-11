import assert from "node:assert/strict";
import test from "node:test";

import {
  getCardMediaCandidates,
  getCatalogMedia,
  getProductImageFilename,
  getLocalMediaRef,
  getStorageMediaRef,
} from "./media.js";

test("getProductImageFilename maps core catalog products to the expected filenames", () => {
  assert.equal(
    getProductImageFilename({ line: "Classic Special", technology: "pocket", saleType: "mattress" }),
    "CLASSIC-POCKET.jpg"
  );
  assert.equal(
    getProductImageFilename({ line: "Classic Special", technology: "pocket", saleType: "set" }),
    "CLASSIC-POCKET-S.jpg"
  );
  assert.equal(
    getProductImageFilename({ line: "Classic Rest", technology: "bonell", saleType: "mattress" }),
    "CLASSIC-REST-BONELL.jpg"
  );
  assert.equal(
    getProductImageFilename({ line: "Superior Rest", technology: "foam", saleType: "mattress" }),
    "SUPERIOR-REST-MID.jpg"
  );
  assert.equal(
    getProductImageFilename({ line: "Superior Rest", technology: "bonell", saleType: "mattress" }),
    "SUPERIOR-REST-MID-PLUSH.jpg"
  );
  assert.equal(
    getProductImageFilename({ line: "Superior Rest", technology: "pocket", saleType: "mattress" }),
    "SUPERIOR-REST-ULTRA-PLUSH.jpg"
  );
  assert.equal(
    getProductImageFilename({ line: "Top Hotel Rest", technology: "pocket", saleType: "set" }),
    "TOP-HOTEL-REST-S.jpg"
  );
});

test("storage and local refs derive from the same filename mapping", () => {
  const product = {
    slug: "conjunto-high-rest-pocket",
    name: "Conjunto High Rest Mid",
    line: "High Rest",
    technology: "pocket",
    saleType: "set",
  };

  const storageRef = getStorageMediaRef(product);
  const localRef = getLocalMediaRef(product);

  assert.equal(storageRef.bucket, "colchones");
  assert.equal(storageRef.path, "HIGH-REST-MID-S.jpg");
  assert.equal(localRef.url, "/products/HIGH-REST-MID-S.jpg");
  assert.equal(storageRef.alt, "Conjunto High Rest Mid");
});

test("legacy product payloads still resolve the right storage object", () => {
  const storageRef = getStorageMediaRef({
    slug: "conjunto-high-rest-mid",
    name: "Conjunto High Rest Mid",
    tagline: "High Rest",
    metadata: {
      linea: "High Rest",
      variante: "Mid",
    },
  });

  assert.equal(storageRef.path, "HIGH-REST-MID-S.jpg");
});

test("card media candidates prefer remote media and fall back to catalog media without duplicates", () => {
  const product = {
    slug: "conjunto-superior-rest-pocket",
    name: "Combo Colchón y Sommier Superior Rest Ultra Plush",
    line: "Superior Rest",
    technology: "pocket",
    saleType: "set",
    media: [
      {
        id: "remote-primary",
        url: "https://cdn.sleep.test/superior-rest-pocket-set.jpg",
        alt: "Foto remota",
      },
    ],
  };

  const catalogMedia = getCatalogMedia(product);
  const candidates = getCardMediaCandidates(product);

  assert.equal(catalogMedia[0]?.url, "/products/SUPERIOR-REST-ULTRA-PLUSH-S.jpg");
  assert.equal(candidates[0]?.url, "https://cdn.sleep.test/superior-rest-pocket-set.jpg");
  assert.equal(candidates[1]?.url, "/products/SUPERIOR-REST-ULTRA-PLUSH-S.jpg");
  assert.equal(candidates.length, 2);

  const dedupedCandidates = getCardMediaCandidates({
    ...product,
    media: [...product.media, catalogMedia[0]],
  });

  assert.equal(dedupedCandidates.length, 2);
});
