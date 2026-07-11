# Sleep Catalog Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Sleep catalog data model so it matches the real business taxonomy (valid line/technology combinations, commercial names, the full measure/plaza grid) and the real product photos stored in the Supabase `colchones` bucket.

**Architecture:** This is a data-correction pass over existing modules, not new architecture. Six independent-but-sequential tasks each fix one source-of-truth file and its tests: measure/plaza taxonomy (`lib/products/catalog.mjs`), measure/plaza taxonomy in the search-intent helper (`lib/products/sleep-intent.mjs`), line/technology validity and commercial names (`lib/products/catalog-config.mjs`), the fallback catalog generator (`data/products.js`), and the real image sync (`lib/products/media.js` + a new sync script). A final task runs the full suite and verifies the catalog visually.

**Tech Stack:** Next.js 16, React 19, plain JS (`.js`/`.mjs`), Node's built-in `node:test` runner, `@supabase/supabase-js`.

## Global Constraints

- Do not add a "Falso pillow" pillow-type option (explicit user decision — out of scope for this iteration).
- Do not add "Sommier" as an independent, purchasable product type (no photo exists for a sommier without a mattress on top).
- Do not invent exact height-in-cm values for any line — keep the current placeholder heights and their relative order (Classic Special 20 < Classic Rest 24 < High Rest 27 < Superior Rest 32 < Top Hotel Rest 37).
- Do not serve images live from Supabase Storage — the bucket `colchones` is private (`public: false`); keep using local copies under `/public/products/`, synced from the bucket.
- Run `npm test` (== `node --test`) after every task; all tests must pass before moving to the next task.

---

### Task 1: Fix the measure/plaza taxonomy in `lib/products/catalog.mjs`

**Files:**
- Modify: `lib/products/catalog.mjs:30-54` (`CANONICAL_MEASURE_CODES`, `MEASURE_TO_VISIBLE_PLAZA`, `PLAZA_ORDER`), `lib/products/catalog.mjs:89-95` (`formatVisiblePlaza`)
- Test: `lib/products/catalog.test.mjs:19-43`

**Interfaces:**
- Produces: `CANONICAL_MEASURE_CODES` (17-entry array, exported, consumed by Task 3/4's `data/products.js` and by `lib/products/sleep-intent.mjs`), `getVisiblePlazaFromMeasure(measureCode)` (exported, now returns one of `"1 plaza" | "1 plaza y media" | "2 plazas" | "queen" | "king"`), `formatVariantLabel({ measureCode, plaza })` (exported, unchanged signature).

- [ ] **Step 1: Write the failing tests**

Replace the two existing tests at the top of `lib/products/catalog.test.mjs` (lines 19-43) with:

```javascript
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/products/catalog.test.mjs`
Expected: FAIL — `CANONICAL_MEASURE_CODES` still has 9 entries, `getVisiblePlazaFromMeasure("100x190")` still returns `"1 plaza"`, `normalizeMeasureCode("160 x 190")` still returns `null`.

- [ ] **Step 3: Replace the measure/plaza source data**

In `lib/products/catalog.mjs`, replace lines 30-54 (`CANONICAL_MEASURE_CODES`, `MEASURE_TO_VISIBLE_PLAZA`, `PLAZA_ORDER`) with:

```javascript
export const CANONICAL_MEASURE_CODES = [
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
];

const MEASURE_TO_VISIBLE_PLAZA = {
  "080x190": "1 plaza",
  "080x200": "1 plaza",
  "090x190": "1 plaza",
  "090x200": "1 plaza",
  "100x190": "1 plaza y media",
  "100x200": "1 plaza y media",
  "105x190": "1 plaza y media",
  "105x200": "1 plaza y media",
  "130x190": "2 plazas",
  "140x190": "2 plazas",
  "140x200": "2 plazas",
  "150x190": "queen",
  "150x200": "queen",
  "160x190": "queen",
  "160x200": "queen",
  "180x200": "king",
  "200x200": "king",
};

const PLAZA_ORDER = ["1 plaza", "1 plaza y media", "2 plazas", "queen", "king"];
```

- [ ] **Step 4: Fix plaza title-casing for the new two-word-plus-"y" tier**

In `lib/products/catalog.mjs`, update `formatVisiblePlaza` (originally lines 89-95):

```javascript
function formatVisiblePlaza(plaza) {
  if (!plaza) return "";
  if (plaza === "queen" || plaza === "king") {
    return plaza.charAt(0).toUpperCase() + plaza.slice(1);
  }
  if (plaza === "1 plaza y media") {
    return "1 Plaza y Media";
  }
  return titleCase(plaza);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test lib/products/catalog.test.mjs`
Expected: the two tests from Step 1 PASS. Other tests in this file (`normalizeCatalogProduct derives classic rest business rules`, `collectCatalogFilterOptions...`, `applyVariantFiltersToProduct and groupVariantsByPlaza...`) are expected to FAIL at this point — they depend on Task 3 and Task 4 changes. That is expected; do not fix them here.

- [ ] **Step 6: Commit**

```bash
git add lib/products/catalog.mjs lib/products/catalog.test.mjs
git commit -m "fix: correct measure-to-plaza grid in catalog.mjs"
```

---

### Task 2: Fix the measure/plaza taxonomy in `lib/products/sleep-intent.mjs`

**Files:**
- Modify: `lib/products/sleep-intent.mjs:37-119` (`SIZE_DEFINITIONS`, `CONFUSING_SIZE_SUGGESTIONS`)
- Test: `lib/products/sleep-intent.test.mjs:19-46`

**Interfaces:**
- Consumes: nothing new from Task 1 (this file has its own independent `SIZE_DEFINITIONS`, deliberately kept as a separate source per the approved design — only the values are being reconciled to agree).
- Produces: `formatCatalogMeasureLabel(measureCode)` (exported from this file, re-exported by `catalog.mjs`), `parseMeasureSelection(value)` (exported, same return shape `{ measureCode, matchedFromAlias, warning }`).

- [ ] **Step 1: Write the failing tests**

Replace `lib/products/sleep-intent.test.mjs` lines 19-46 with:

```javascript
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/products/sleep-intent.test.mjs`
Expected: FAIL — `formatCatalogMeasureLabel("100x190")` still returns `"1 plaza — 100 x 190 cm"`, `formatCatalogMeasureLabel("200x200")` still returns `"Super King — 200 x 200 cm"`, `parseMeasureSelection("160 x 190")` still returns a `confusing_size` warning instead of a resolved code.

- [ ] **Step 3: Replace `SIZE_DEFINITIONS` and `CONFUSING_SIZE_SUGGESTIONS`**

In `lib/products/sleep-intent.mjs`, replace the `SIZE_DEFINITIONS` array (originally lines 37-103) with:

```javascript
export const SIZE_DEFINITIONS = [
  {
    measureCode: "080x190",
    name: "1 plaza",
    label: "1 plaza — 80 x 190 cm",
    aliases: ["80x190", "80 x 190", "1 plaza 80", "single 80"],
    relatedMeasureCodes: ["080x200", "090x190", "100x190"],
  },
  {
    measureCode: "080x200",
    name: "1 plaza extra largo",
    label: "1 plaza extra largo — 80 x 200 cm",
    aliases: ["80x200", "80 x 200", "1 plaza extra largo 80"],
    relatedMeasureCodes: ["080x190", "090x200", "100x200"],
  },
  {
    measureCode: "090x190",
    name: "1 plaza ancho",
    label: "1 plaza ancho — 90 x 190 cm",
    aliases: ["90x190", "90 x 190", "1 plaza 90"],
    relatedMeasureCodes: ["080x190", "090x200", "100x190"],
  },
  {
    measureCode: "090x200",
    name: "1 plaza ancho extra largo",
    label: "1 plaza ancho extra largo — 90 x 200 cm",
    aliases: ["90x200", "90 x 200"],
    relatedMeasureCodes: ["080x200", "090x190", "100x200"],
  },
  {
    measureCode: "100x190",
    name: "1 plaza y media",
    label: "1 plaza y media — 100 x 190 cm",
    aliases: ["100x190", "100 x 190", "1 plaza y media", "plaza y media", "una plaza y media"],
    relatedMeasureCodes: ["090x190", "100x200", "105x190"],
  },
  {
    measureCode: "100x200",
    name: "1 plaza y media extra largo",
    label: "1 plaza y media extra largo — 100 x 200 cm",
    aliases: ["100x200", "100 x 200", "1 plaza y media extra largo", "extra largo"],
    relatedMeasureCodes: ["100x190", "105x200", "090x200"],
  },
  {
    measureCode: "105x190",
    name: "1 plaza y media ancho",
    label: "1 plaza y media ancho — 105 x 190 cm",
    aliases: ["105x190", "105 x 190"],
    relatedMeasureCodes: ["100x190", "105x200", "130x190"],
  },
  {
    measureCode: "105x200",
    name: "1 plaza y media ancho extra largo",
    label: "1 plaza y media ancho extra largo — 105 x 200 cm",
    aliases: ["105x200", "105 x 200"],
    relatedMeasureCodes: ["100x200", "105x190", "140x200"],
  },
  {
    measureCode: "130x190",
    name: "2 plazas",
    label: "2 plazas — 130 x 190 cm",
    aliases: ["130x190", "130 x 190", "2 plazas angosto"],
    relatedMeasureCodes: ["105x190", "140x190"],
  },
  {
    measureCode: "140x190",
    name: "2 plazas",
    label: "2 plazas — 140 x 190 cm",
    aliases: ["140x190", "140 x 190", "2 plazas", "matrimonial"],
    relatedMeasureCodes: ["130x190", "140x200", "150x190"],
  },
  {
    measureCode: "140x200",
    name: "2 plazas extra largo",
    label: "2 plazas extra largo — 140 x 200 cm",
    aliases: ["140x200", "140 x 200", "2 plazas extra largo"],
    relatedMeasureCodes: ["140x190", "105x200", "150x200"],
  },
  {
    measureCode: "150x190",
    name: "Queen",
    label: "Queen — 150 x 190 cm",
    aliases: ["150x190", "150 x 190"],
    relatedMeasureCodes: ["140x190", "150x200", "160x190"],
  },
  {
    measureCode: "150x200",
    name: "Queen extra largo",
    label: "Queen extra largo — 150 x 200 cm",
    aliases: ["150x200", "150 x 200"],
    relatedMeasureCodes: ["150x190", "160x200", "140x200"],
  },
  {
    measureCode: "160x190",
    name: "Queen",
    label: "Queen — 160 x 190 cm",
    aliases: ["160x190", "160 x 190"],
    relatedMeasureCodes: ["150x190", "160x200"],
  },
  {
    measureCode: "160x200",
    name: "Queen",
    label: "Queen — 160 x 200 cm",
    aliases: ["160x200", "160 x 200", "queen", "queen size"],
    relatedMeasureCodes: ["150x200", "180x200", "160x190"],
  },
  {
    measureCode: "180x200",
    name: "King",
    label: "King — 180 x 200 cm",
    aliases: ["180x200", "180 x 200", "king", "king size"],
    relatedMeasureCodes: ["160x200", "200x200"],
  },
  {
    measureCode: "200x200",
    name: "King",
    label: "King — 200 x 200 cm",
    aliases: ["200x200", "200 x 200", "super king", "superking"],
    relatedMeasureCodes: ["180x200"],
    confusionWith: ["200x190"],
  },
];
```

Then replace `CONFUSING_SIZE_SUGGESTIONS` (originally lines 116-119) with:

```javascript
const CONFUSING_SIZE_SUGGESTIONS = {
  "200x190": "200x200",
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test lib/products/sleep-intent.test.mjs`
Expected: the two tests from Step 1 PASS. The remaining tests in this file (`sleep intent enrichment...`, `recommendation engine...`, `numeric budget helpers...`, `budget range labels...`, `zero-result guidance...`) should still PASS unchanged — none of them assert on a measure code whose plaza tier changed. If `recommendation engine returns a primary mattress...` fails, it is because Task 3/4 (not yet done) changed which fallback products exist; leave it failing and revisit after Task 4.

- [ ] **Step 5: Commit**

```bash
git add lib/products/sleep-intent.mjs lib/products/sleep-intent.test.mjs
git commit -m "fix: correct measure-to-plaza grid in sleep-intent.mjs"
```

---

### Task 3: Fix line/technology validity and commercial names in `lib/products/catalog-config.mjs`

**Files:**
- Modify: `lib/products/catalog-config.mjs:50-152` (`LINE_DEFINITIONS`)
- Test: `lib/products/catalog.test.mjs:45-160` (the four `normalizeCatalogProduct` tests)

**Interfaces:**
- Consumes: nothing new.
- Produces: `LINE_DEFINITIONS` (exported, each entry's `allowedTechnologies`/`pillowByTechnology`/`displayNameByTechnology` now only list technologies with a real product photo), used by `lib/products/catalog.mjs` (`normalizeCatalogProduct`) and by `data/products.js` (Task 4).
- Ground truth to match exactly: `lib/products/product-card.mjs`'s `MATTRESS_CARD_DEFINITIONS` (already correct, already tested by `lib/products/product-card.test.mjs` — do not modify that file).

- [ ] **Step 1: Write the failing tests**

In `lib/products/catalog.test.mjs`, replace the test `"normalizeCatalogProduct derives classic rest business rules"` (originally lines 45-65) with:

```javascript
test("normalizeCatalogProduct derives classic rest business rules", () => {
  const product = normalizeCatalogProduct({
    id: "prod-1",
    slug: "colchon-classic-rest-bonell",
    name: "Colchón Classic Rest Bonell",
    saleType: "mattress",
    line: "Classic Rest",
    technology: "bonell",
    variants: [{ id: "variant-1", title: "Queen", price: 1, measureCode: "160x200" }],
  });

  assert.equal(product.saleType, "mattress");
  assert.equal(product.line, "Classic Rest");
  assert.equal(product.technology, "bonell");
  assert.equal(product.pillowType, "none");
  assert.equal(product.heightCm, 24);
  assert.equal(product.heightProfile, "media");
  assert.equal(product.topFabric, "jacquard");
  assert.equal(product.sideFabric, "jacquard");
  assert.equal(product.displayName, "Rest");
});
```

Replace the test `"normalizeCatalogProduct derives high rest and top hotel rules"` (originally lines 67-112) with:

```javascript
test("normalizeCatalogProduct derives high rest and top hotel rules", () => {
  const highRestFoam = normalizeCatalogProduct({
    id: "prod-2",
    slug: "colchon-high-rest-foam",
    name: "Colchón High Rest Foam",
    saleType: "mattress",
    line: "High Rest",
    technology: "foam",
    variants: [{ id: "variant-1", title: "2 plazas", price: 1, measureCode: "140x190" }],
  });

  const highRestPocket = normalizeCatalogProduct({
    id: "prod-3",
    slug: "colchon-high-rest-pocket",
    name: "Colchón High Rest Pocket",
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
  assert.equal(highRestFoam.displayName, "Foam");

  assert.equal(highRestPocket.pillowType, "euro");
  assert.equal(highRestPocket.heightCm, 27);
  assert.equal(highRestPocket.displayName, "Pocket");

  assert.equal(topHotel.pillowType, "american");
  assert.equal(topHotel.heightCm, 37);
  assert.equal(topHotel.topFabric, "knit");
  assert.equal(topHotel.sideFabric, "suede_like");
});
```

Replace the test `"normalizeCatalogProduct infers legacy mid/plush names and top hotel defaults"` (originally lines 134-160) with:

```javascript
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
  assert.equal(highRestMid.displayName, "Pocket");
  assert.equal(highRestMid.pillowType, "euro");

  assert.equal(topHotel.technology, "pocket");
  assert.equal(topHotel.displayName, "Top Hotel");
  assert.equal(topHotel.pillowType, "american");
});
```

The test `"normalizeCatalogProduct derives superior rules and keeps plush mapped to bonell"` (originally lines 114-132) needs no change — it passes an explicit `displayName: "Plush"` override, which always wins regardless of `LINE_DEFINITIONS`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/products/catalog.test.mjs`
Expected: FAIL on the three tests above — e.g. `highRestFoam.displayName` is still `"Firm"` (expected `"Foam"`), `topHotel.displayName` is still `"Pocket"` (expected `"Top Hotel"`).

- [ ] **Step 3: Fix `LINE_DEFINITIONS` in `catalog-config.mjs`**

In `lib/products/catalog-config.mjs`, replace the five entries in `LINE_DEFINITIONS` (originally lines 50-152) with:

```javascript
export const LINE_DEFINITIONS = [
  {
    value: "Classic Rest",
    label: "Classic Rest",
    summary: "La base noble de la línea Sleep para un descanso simple y rendidor.",
    comfortLabel: "Esencial",
    allowedTechnologies: ["bonell"],
    heightCm: 24,
    heightProfile: "media",
    topFabric: "jacquard",
    sideFabric: "jacquard",
    pillowByTechnology: {
      bonell: "none",
    },
    displayNameByTechnology: {
      bonell: "Rest",
    },
  },
  {
    value: "Classic Special",
    label: "Classic Special",
    summary: "Una opción liviana y directa para quien busca entrada de gama.",
    comfortLabel: "Inicial",
    allowedTechnologies: ["foam", "pocket"],
    heightCm: 20,
    heightProfile: "baja",
    topFabric: "jacquard",
    sideFabric: "jacquard",
    pillowByTechnology: {
      foam: "none",
      pocket: "none",
    },
    displayNameByTechnology: {
      foam: "Special Foam",
      pocket: "Special Pocket",
    },
  },
  {
    value: "High Rest",
    label: "High Rest",
    summary: "Más presencia, mejor terminación y una experiencia de comfort más equilibrada.",
    comfortLabel: "Equilibrado",
    allowedTechnologies: ["foam", "bonell", "pocket"],
    heightCm: 27,
    heightProfile: "media",
    topFabric: "knit",
    sideFabric: "jacquard",
    pillowByTechnology: {
      foam: "none",
      bonell: "euro",
      pocket: "euro",
    },
    displayNameByTechnology: {
      foam: "Foam",
      bonell: "Plush",
      pocket: "Pocket",
    },
  },
  {
    value: "Superior Rest",
    label: "Superior Rest",
    summary: "Mayor volumen, pillow americano y una sensación más envolvente y premium.",
    comfortLabel: "Premium",
    allowedTechnologies: ["foam", "bonell", "pocket"],
    heightCm: 32,
    heightProfile: "grande",
    topFabric: "knit",
    sideFabric: "jacquard",
    pillowByTechnology: {
      foam: "american",
      bonell: "american",
      pocket: "american",
    },
    displayNameByTechnology: {
      foam: "Mid",
      bonell: "Mid Plush",
      pocket: "Ultra Plush",
    },
  },
  {
    value: "Top Hotel Rest",
    label: "Top Hotel Rest",
    summary: "La propuesta más alta de la colección, con presencia hotelera y máximo confort.",
    comfortLabel: "Hotel",
    allowedTechnologies: ["pocket"],
    heightCm: 37,
    heightProfile: "muy_grande",
    topFabric: "knit",
    sideFabric: "suede_like",
    pillowByTechnology: {
      pocket: "american",
    },
    displayNameByTechnology: {
      pocket: "Top Hotel",
    },
  },
];
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test lib/products/catalog.test.mjs`
Expected: the three tests from Step 1 PASS. `collectCatalogFilterOptions...` and `applyVariantFiltersToProduct and groupVariantsByPlaza...` are expected to still FAIL — they are fixed in Task 4. Also run `node --test lib/products/product-card.test.mjs` and confirm all tests there still PASS unchanged (this file already encodes the correct commercial names and is not modified).

- [ ] **Step 5: Commit**

```bash
git add lib/products/catalog-config.mjs lib/products/catalog.test.mjs
git commit -m "fix: restrict Classic line technologies and align commercial names with product-card.mjs"
```

---

### Task 4: Fix the fallback catalog generator and remaining `catalog.mjs` consumer tests

**Files:**
- Modify: `data/products.js:23-76` (`LINE_MEASURE_CODES`, `FEATURED_PRODUCT_KEYS`)
- Test: `lib/products/catalog.test.mjs:251-334` (`collectCatalogFilterOptions...`, `applyVariantFiltersToProduct and groupVariantsByPlaza...`)

**Interfaces:**
- Consumes: `CANONICAL_MEASURE_CODES` from Task 1, `LINE_DEFINITIONS` from Task 3 (both already updated).
- Produces: `fallbackProducts` (default export of `data/products.js`, an array of raw product objects) — consumed by `lib/products/mappers.js`, `lib/products/sleep-intent.mjs` tests, and any page that has no real Supabase data yet.

- [ ] **Step 1: Write the failing tests**

In `lib/products/catalog.test.mjs`, replace the test `"collectCatalogFilterOptions exposes main and secondary filter groups"` (originally lines 251-312) with:

```javascript
test("collectCatalogFilterOptions exposes main and secondary filter groups", () => {
  const products = [
    normalizeCatalogProduct({
      id: "prod-1",
      slug: "colchon-classic-rest-bonell",
      name: "Colchón Classic Rest Bonell",
      saleType: "mattress",
      line: "Classic Rest",
      technology: "bonell",
      variants: [
        {
          id: "variant-1",
          title: "1 plaza y media",
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
  assert.deepEqual(options.technologies.map((option) => option.value), ["bonell", "pocket"]);
  assert.deepEqual(options.pillowTypes.map((option) => option.value), ["none", "euro"]);
  assert.deepEqual(options.heightProfiles.map((option) => option.value), ["media"]);
  assert.deepEqual(options.topFabrics.map((option) => option.value), ["jacquard", "knit"]);
  assert.deepEqual(options.sideFabrics.map((option) => option.value), ["jacquard"]);
  assert.deepEqual(options.measures.map((option) => option.value), ["100x190", "160x200"]);
  assert.deepEqual(options.measures.map((option) => option.label), [
    "1 plaza y media — 100 x 190 cm",
    "Queen — 160 x 200 cm",
  ]);
  assert.deepEqual(options.plazas.map((option) => option.value), ["1 plaza y media", "queen"]);
  assert.deepEqual(options.budgets.map((option) => option.value), ["hasta_700000", "1000000_1400000"]);
  assert.deepEqual(options.firmnesses.map((option) => option.value), ["balanced", "firm"]);
  assert.deepEqual(options.motionIsolationLevels.map((option) => option.value), ["high", "medium"]);
  assert.deepEqual(options.availability.map((option) => option.value), ["available_now", "backorder"]);
});
```

Replace the test `"applyVariantFiltersToProduct and groupVariantsByPlaza support plaza-first PDP flow"` (originally lines 314-334) with:

```javascript
test("applyVariantFiltersToProduct and groupVariantsByPlaza support plaza-first PDP flow", () => {
  const product = normalizeCatalogProduct({
    id: "prod-3",
    slug: "colchon-top-hotel-pocket",
    name: "Colchón Top Hotel Pocket",
    saleType: "mattress",
    line: "Top Hotel Rest",
    technology: "pocket",
    variants: [
      { id: "variant-1", title: "Queen", price: 1, inventoryStatus: "backorder", stockQuantity: 0, measureCode: "150x190", dimensions: { measure_code: "150x190", width_cm: 150, length_cm: 190 } },
      { id: "variant-2", title: "Queen", price: 1, inventoryStatus: "in_stock", stockQuantity: 6, measureCode: "160x200", dimensions: { measure_code: "160x200", width_cm: 160, length_cm: 200 } },
      { id: "variant-3", title: "King", price: 1, inventoryStatus: "in_stock", stockQuantity: 6, measureCode: "180x200", dimensions: { measure_code: "180x200", width_cm: 180, length_cm: 200 } },
    ],
  });

  const filtered = applyVariantFiltersToProduct(product, { plaza: "queen", availability: "available_now" });
  const grouped = groupVariantsByPlaza(product.variants);

  assert.deepEqual(filtered.variants.map((variant) => variant.measureCode), ["160x200"]);
  assert.deepEqual(grouped.map((group) => group.plaza), ["queen", "king"]);
});
```

Note: `filtered` only keeps `160x200` because the `150x190` variant is `backorder` and the filter also requires `availability: "available_now"`; both `150x190` and `160x200` are in the `"queen"` plaza tier, so `grouped` now has 2 groups (`queen`, `king`) instead of the old 3 (`2 plazas`, `queen`, `king`).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/products/catalog.test.mjs`
Expected: FAIL — `options.technologies` is still `["foam", "pocket"]` (the old test's Classic Rest product used `foam`, now invalid), `options.plazas` is still `["1 plaza", "queen"]`, `grouped.map(...)` is still `["2 plazas", "queen", "king"]`.

- [ ] **Step 3: Fix `LINE_MEASURE_CODES` and `FEATURED_PRODUCT_KEYS` in `data/products.js`**

In `data/products.js`, replace `LINE_MEASURE_CODES` (originally lines 23-29) with:

```javascript
const LINE_MEASURE_CODES = {
  "Classic Rest": CANONICAL_MEASURE_CODES,
  "Classic Special": CANONICAL_MEASURE_CODES,
  "High Rest": CANONICAL_MEASURE_CODES,
  "Superior Rest": CANONICAL_MEASURE_CODES,
  "Top Hotel Rest": [
    "130x190",
    "140x190",
    "140x200",
    "150x190",
    "150x200",
    "160x190",
    "160x200",
    "180x200",
    "200x200",
  ],
};
```

`Top Hotel Rest` keeps its existing "2 plazas and up" floor (it never sold 1-plaza or 1-plaza-y-media sizes) — just expressed with the corrected, complete measure codes for that floor instead of the old partial/mislabeled list.

Then replace `FEATURED_PRODUCT_KEYS` (originally lines 68-76) with:

```javascript
const FEATURED_PRODUCT_KEYS = new Set([
  "mattress:Classic Rest:bonell",
  "mattress:High Rest:pocket",
  "mattress:Superior Rest:bonell",
  "mattress:Top Hotel Rest:pocket",
  "set:Classic Rest:bonell",
  "set:High Rest:pocket",
  "set:Top Hotel Rest:pocket",
]);
```

(`"mattress:Classic Rest:pocket"` is removed because Classic Rest no longer allows `pocket`; replaced with the mattress version of the one technology Classic Rest actually has, `bonell`.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test lib/products/catalog.test.mjs`
Expected: ALL tests in this file PASS.

Then run the full suite:

Run: `npm test`
Expected: ALL tests PASS. If `lib/products/sleep-intent.test.mjs`'s `"recommendation engine returns a primary mattress plus alternatives and disclaimer"` or `lib/products/homepage.test.mjs` fail, they were relying on the old fallback catalog shape — inspect the actual `recommendMattress`/`featuredProducts` output with `console.log` and adjust only the failing assertion's expected values (not the input query), following the same reasoning used in Steps 1-3 (measure codes must belong to the corrected plaza tier, technologies must be in the corrected `allowedTechnologies` list).

- [ ] **Step 5: Commit**

```bash
git add data/products.js lib/products/catalog.test.mjs
git commit -m "fix: restrict fallback catalog to real line/technology combinations"
```

---

### Task 5: Sync real product photos from Supabase Storage

**Files:**
- Create: `scripts/sync-sleep-images.mjs`
- Modify: `lib/products/media.js:5-26` (`PRODUCT_IMAGE_BY_KEY`)
- Modify (delete stale files, add synced files): `public/products/*.jpg`
- Test: `lib/products/media.test.mjs`, `lib/products/mappers.test.mjs:42-49,105,153`

**Interfaces:**
- Consumes: `normalizeCatalogProduct` from `lib/products/catalog.mjs` (already imported, unchanged signature).
- Produces: `getProductImageFilename(product)`, `getStorageMediaRef(product)`, `getLocalMediaRef(product)` (all exported, same signatures, new return values).

- [ ] **Step 1: Write the failing tests**

Replace `lib/products/media.test.mjs` entirely with:

```javascript
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
```

Also update `lib/products/mappers.test.mjs`:
- Line 42: change `assert.equal(card.displayName, "Mid");` to `assert.equal(card.displayName, "Pocket");` (High Rest's `pocket` display name is now `"Pocket"`, per Task 3).
- Lines 47-49: change all three `"/products/HIGH-REST-MID-1.jpg"` to `"/products/HIGH-REST-MID.jpg"` (this fixture is `saleType: "mattress"`, which now maps to the no-suffix filename).
- Line 105: change `"/products/SUPERIOR-REST-ULTRA-PLUSH.jpg"` to `"/products/SUPERIOR-REST-ULTRA-PLUSH-S.jpg"` (this fixture is `saleType: "set"`, which now maps to the `-S` filename).
- Line 153: change `"/products/TOP-HOTEL-REST.jpg"` to `"/products/TOP-HOTEL-REST-S.jpg"` (this fixture is `saleType: "set"`).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test lib/products/media.test.mjs lib/products/mappers.test.mjs`
Expected: FAIL — `getProductImageFilename` still returns `null` for `"Classic Special"` (no such key exists yet), and returns the old `-1`-suffixed / unswapped filenames for the other assertions.

- [ ] **Step 3: Write the image sync script**

Create `scripts/sync-sleep-images.mjs`:

```javascript
import { createClient } from "@supabase/supabase-js";
import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";

const BUCKET = "colchones";
const TARGET_DIR = path.join(process.cwd(), "public", "products");

const STALE_FILES = [
  "CLASSIC-FOAM-1.jpg",
  "CLASSIC-POCKET-1.jpg",
  "CLASSIC-REST-BONELL-1.jpg",
  "HIGH-REST-FIRM-1.jpg",
  "HIGH-REST-MID-1.jpg",
  "HIGH-REST-PLUSH-1.jpg",
  "SUPERIOR-REST-MID-1.jpg",
  "SUPERIOR-REST-MID-PLUSH-1.jpg",
  "SUPERIOR-REST-ULTRA-PLUSH-1.jpg",
  "TOP-HOTEL-REST-1.jpg",
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment");
  }

  const supabase = createClient(url, key);
  const { data: files, error: listError } = await supabase.storage.from(BUCKET).list("", { limit: 1000 });
  if (listError) throw listError;

  for (const file of files) {
    const { data, error } = await supabase.storage.from(BUCKET).download(file.name);
    if (error) throw new Error(`Failed to download ${file.name}: ${error.message}`);
    const buffer = Buffer.from(await data.arrayBuffer());
    await writeFile(path.join(TARGET_DIR, file.name), buffer);
    console.log(`Synced ${file.name} (${buffer.length} bytes)`);
  }

  for (const staleFile of STALE_FILES) {
    await unlink(path.join(TARGET_DIR, staleFile)).catch(() => {});
    console.log(`Removed stale ${staleFile}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run it: `node --env-file=.env.local scripts/sync-sleep-images.mjs`
Expected output: 20 `Synced ...` lines (one per file in the bucket: `CLASSIC-FOAM.jpg`, `CLASSIC-FOAM-S.jpg`, `CLASSIC-POCKET.jpg`, `CLASSIC-POCKET-S.jpg`, `CLASSIC-REST-BONELL.jpg`, `CLASSIC-REST-BONELL-S.jpg`, `HIGH-REST-FIRM.jpg`, `HIGH-REST-FIRM-S.jpg`, `HIGH-REST-MID.jpg`, `HIGH-REST-MID-S.jpg`, `HIGH-REST-PLUSH.jpg`, `HIGH-REST-PLUSH-S.jpg`, `SUPERIOR-REST-MID.jpg`, `SUPERIOR-REST-MID-S.jpg`, `SUPERIOR-REST-MID-PLUSH.jpg`, `SUPERIOR-REST-MID-PLUSH-S.jpg`, `SUPERIOR-REST-ULTRA-PLUSH.jpg`, `SUPERIOR-REST-ULTRA-PLUSH-S.jpg`, `TOP-HOTEL-REST.jpg`, `TOP-HOTEL-REST-S.jpg`), followed by 10 `Removed stale ...` lines.

Verify: `ls public/products/*.jpg | wc -l` should print `20`.

- [ ] **Step 4: Fix `PRODUCT_IMAGE_BY_KEY` in `lib/products/media.js`**

In `lib/products/media.js`, replace `PRODUCT_IMAGE_BY_KEY` (originally lines 5-26) with:

```javascript
const PRODUCT_IMAGE_BY_KEY = {
  "Classic Special|foam|mattress": "CLASSIC-FOAM.jpg",
  "Classic Special|foam|set": "CLASSIC-FOAM-S.jpg",
  "Classic Special|pocket|mattress": "CLASSIC-POCKET.jpg",
  "Classic Special|pocket|set": "CLASSIC-POCKET-S.jpg",
  "Classic Rest|bonell|mattress": "CLASSIC-REST-BONELL.jpg",
  "Classic Rest|bonell|set": "CLASSIC-REST-BONELL-S.jpg",
  "High Rest|foam|mattress": "HIGH-REST-FIRM.jpg",
  "High Rest|foam|set": "HIGH-REST-FIRM-S.jpg",
  "High Rest|pocket|mattress": "HIGH-REST-MID.jpg",
  "High Rest|pocket|set": "HIGH-REST-MID-S.jpg",
  "High Rest|bonell|mattress": "HIGH-REST-PLUSH.jpg",
  "High Rest|bonell|set": "HIGH-REST-PLUSH-S.jpg",
  "Superior Rest|foam|mattress": "SUPERIOR-REST-MID.jpg",
  "Superior Rest|foam|set": "SUPERIOR-REST-MID-S.jpg",
  "Superior Rest|pocket|mattress": "SUPERIOR-REST-ULTRA-PLUSH.jpg",
  "Superior Rest|pocket|set": "SUPERIOR-REST-ULTRA-PLUSH-S.jpg",
  "Superior Rest|bonell|mattress": "SUPERIOR-REST-MID-PLUSH.jpg",
  "Superior Rest|bonell|set": "SUPERIOR-REST-MID-PLUSH-S.jpg",
  "Top Hotel Rest|pocket|mattress": "TOP-HOTEL-REST.jpg",
  "Top Hotel Rest|pocket|set": "TOP-HOTEL-REST-S.jpg",
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test lib/products/media.test.mjs lib/products/mappers.test.mjs`
Expected: ALL tests PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/sync-sleep-images.mjs lib/products/media.js lib/products/media.test.mjs lib/products/mappers.test.mjs public/products
git commit -m "fix: sync real Supabase product photos and correct image filename mapping"
```

---

### Task 6: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`
Expected: ALL tests PASS (this repo's full suite, includes `lib/products/*.test.mjs` and any other `*.test.mjs`/`*.test.js` file under the repo).

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build completes with no errors (confirms no broken imports and no case where a removed line/technology combination is referenced from a page or component that assumed it existed).

- [ ] **Step 3: Start the dev server and verify the catalog visually**

Use `preview_start` to start the `dev` server (add it to `.claude/launch.json` if not already present, with `runtimeExecutable: "npm"`, `runtimeArgs: ["run", "dev"]`, `port: 3000`).

Then:
1. `preview_eval`: `window.location.href = "/catalog"` (or navigate directly).
2. `preview_snapshot` on `/catalog`: confirm at least one Classic Special (Foam or Pocket) product card is present.
3. `preview_screenshot`: confirm the Classic Special card shows a real mattress photo, not the `Sleep` placeholder graphic (`ProductPlaceholder` in `components/ProductCard.jsx`).
4. Filter by línea "Superior Rest": `preview_click` on the Superior Rest filter option, then `preview_snapshot` to confirm card names read "Mid", "Mid Plush", "Ultra Plush" (not "Firm"/"Plush"/"Mid").
5. Click into a Superior Rest product detail page: `preview_click` the product link, then `preview_snapshot` and confirm the detail page's technology/commercial name matches what the card showed (same "Mid"/"Mid Plush"/"Ultra Plush" naming — this is the specific cross-file bug this plan fixes).
6. Filter by plaza "1 plaza y media": confirm the sidebar shows this as one of the plaza options (previously mislabeled "1 plaza").

- [ ] **Step 4: Report results**

Summarize to the user: test suite status, build status, and what was visually confirmed in steps 3.2-3.6. No commit needed for this task (verification only).
