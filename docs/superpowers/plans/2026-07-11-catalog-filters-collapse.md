# Catalog Filters Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the catalog filter bar's Technology / Motion isolation / Height / Availability filters to real multi-select (checkbox groups), and Measure / Presentation to a matching collapse UI (radio groups), all rendered as independent `<details>` collapse sections instead of `<select>`/button grids.

**Architecture:** State for the 4 multi-value filters moves from `string|null` to `string[]` throughout `lib/products/catalog-discovery.mjs` (URL: comma-separated) and `lib/products/catalog.mjs` (filtering: `.includes()` instead of `===`). `components/catalog/CatalogExperience.jsx` gets one new presentational component, `FilterCollapseGroup`, that renders a `<details>` with checkboxes or radios; it replaces the existing `SelectFilter` and `ChoiceGroup` components, which are deleted.

**Tech Stack:** Next.js 16 (App Router, client component), React 19, plain CSS Modules, Node's built-in `node:test` runner.

## Global Constraints

- URL format for multi-value filters: comma-separated single query param (`?technology=bonell,pocket`).
- `measure`, `saleType`, `category` remain single-value — only their visual wrapper changes to the collapse pattern (measure/saleType), not their data shape.
- Chips in "Selección actual" show one chip per individual value, not one grouped chip per filter key.
- Filter groups render collapsed by default, except a group auto-opens if it already has an active value from the URL on load.
- Multiple groups can be expanded simultaneously (no exclusive accordion).
- No new design system / CSS framework — reuse existing tokens in `CatalogExperience.module.css` (`--radius`, `--color-primary`, etc).

---

### Task 1: Array-aware filtering in `lib/products/catalog.mjs`

**Files:**
- Modify: `lib/products/catalog.mjs:353-411` (`filterCatalogProducts`), `lib/products/catalog.mjs:413-455` (`applyVariantFiltersToProduct`)
- Test: `lib/products/catalog.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: `filterCatalogProducts(products, filters)` and `applyVariantFiltersToProduct(product, filters)` now accept `filters.technology`, `filters.heightProfile`, `filters.motionIsolation` (in `filterCatalogProducts`) and `filters.availability` (in both) as either `string`, `string[]`, or `null`/`undefined` — legacy single-string callers keep working unchanged.

- [ ] **Step 1: Write the failing tests**

Add to `lib/products/catalog.test.mjs` (place near the other `filterCatalogProducts` tests):

```javascript
test("filterCatalogProducts matches any product whose technology is in a multi-value filter array", () => {
  const bonell = { id: "p-bonell", saleType: "mattress", technology: "bonell", variants: [{ id: "v1", price: 100000, stockQuantity: 1 }] };
  const pocket = { id: "p-pocket", saleType: "mattress", technology: "pocket", variants: [{ id: "v2", price: 100000, stockQuantity: 1 }] };
  const foam = { id: "p-foam", saleType: "mattress", technology: "foam", variants: [{ id: "v3", price: 100000, stockQuantity: 1 }] };

  const filtered = filterCatalogProducts([bonell, pocket, foam], { technology: ["bonell", "pocket"] });

  assert.deepEqual(filtered.map((product) => product.id).sort(), ["p-bonell", "p-pocket"]);
});

test("filterCatalogProducts treats an empty technology array as no filter", () => {
  const bonell = { id: "p-bonell", saleType: "mattress", technology: "bonell", variants: [{ id: "v1", price: 100000, stockQuantity: 1 }] };

  const filtered = filterCatalogProducts([bonell], { technology: [] });

  assert.deepEqual(filtered.map((product) => product.id), ["p-bonell"]);
});

test("applyVariantFiltersToProduct matches any variant whose availability is in a multi-value filter array", () => {
  const product = {
    id: "p-multi-availability",
    variants: [
      { id: "v-now", price: 100000, availability: "available_now" },
      { id: "v-backorder", price: 110000, availability: "backorder" },
      { id: "v-discontinued", price: 120000, availability: "discontinued" },
    ],
  };

  const result = applyVariantFiltersToProduct(product, { availability: ["available_now", "backorder"] });

  assert.deepEqual(
    result.variants.map((variant) => variant.id).sort(),
    ["v-backorder", "v-now"]
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `~/.nvm/versions/node/v22.22.3/bin/node --test lib/products/catalog.test.mjs`
Expected: the 3 new tests FAIL (first two because `technology: ["bonell","pocket"]` doesn't match a single string with `!==`, third because `availability` array isn't handled).

- [ ] **Step 3: Add an array-normalizing helper and use it in both functions**

In `lib/products/catalog.mjs`, add near the top of the file (after imports, before `filterCatalogProducts`):

```javascript
function toFilterList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}
```

In `filterCatalogProducts`, change the `normalizedFilters` object build for the 4 affected keys:

```javascript
  const normalizedFilters = {
    saleType: filters.saleType ?? (filters.type === "colchon" ? "mattress" : filters.type === "conjunto" ? "set" : null),
    line: filters.line ?? filters.lineFamily ?? null,
    technology: toFilterList(filters.technology ?? filters.coreTechnology),
    pillowType: filters.pillowType ?? null,
    heightProfile: toFilterList(filters.heightProfile),
    topFabric: filters.topFabric ?? null,
    sideFabric: filters.sideFabric ?? null,
    firmness: filters.firmness ?? null,
    motionIsolation: toFilterList(filters.motionIsolation),
    budgetMin: filters.budgetMin ?? null,
    budgetMax: filters.budgetMax ?? null,
    budget: filters.budget ?? null,
    availability: toFilterList(filters.availability),
    sleepMode: filters.sleepMode ?? null,
    measure: normalizeMeasureCode(filters.measure),
    plaza: filters.plaza ? toComparable(filters.plaza) : null,
  };
```

Then update the equality checks in the same function:

```javascript
    if (normalizedFilters.technology.length && !normalizedFilters.technology.includes(product.technology)) return false;
    if (normalizedFilters.pillowType && product.pillowType !== normalizedFilters.pillowType) return false;
    if (normalizedFilters.heightProfile.length && !normalizedFilters.heightProfile.includes(product.heightProfile)) return false;
    if (normalizedFilters.topFabric && product.topFabric !== normalizedFilters.topFabric) return false;
    if (normalizedFilters.sideFabric && product.sideFabric !== normalizedFilters.sideFabric) return false;
    if (normalizedFilters.firmness && product.firmness !== normalizedFilters.firmness) return false;
    if (normalizedFilters.motionIsolation.length && !normalizedFilters.motionIsolation.includes(product.motionIsolation)) return false;
```

And the variant-level checks further down in the same function:

```javascript
    if (!product.variants.length) {
      const hasVariantLevelFilter = Boolean(
        normalizedFilters.measure ||
          normalizedFilters.plaza ||
          normalizedFilters.availability.length ||
          normalizedFilters.sleepMode ||
          budgetRange.min != null ||
          budgetRange.max != null
      );
      return !hasVariantLevelFilter;
    }

    return product.variants.some((variant) => {
      if (normalizedFilters.measure && variant.measureCode !== normalizedFilters.measure) return false;
      if (normalizedFilters.plaza && toComparable(variant.plaza) !== normalizedFilters.plaza) return false;
      if (!isPriceWithinBudgetRange(variant.price, budgetRange)) {
        return false;
      }
      if (normalizedFilters.availability.length && !normalizedFilters.availability.includes(variant.availability)) return false;
      if (!isSleepModeEligible(variant, normalizedFilters.sleepMode)) {
        return false;
      }
      return true;
    });
```

In `applyVariantFiltersToProduct`, change:

```javascript
  const normalizedMeasure = normalizeMeasureCode(filters.measure);
  const normalizedPlaza = filters.plaza ? toComparable(filters.plaza) : null;
  const normalizedAvailability = toFilterList(filters.availability);
  const normalizedSleepMode = filters.sleepMode ?? null;
  const budgetRange = normalizeBudgetRange(filters);

  if (
    !normalizedMeasure &&
    !normalizedPlaza &&
    !normalizedAvailability.length &&
    !normalizedSleepMode &&
    budgetRange.min == null &&
    budgetRange.max == null
  ) {
    return product;
  }

  const visibleVariants = product.variants.filter((variant) => {
    if (normalizedMeasure && variant.measureCode !== normalizedMeasure) return false;
    if (normalizedPlaza && toComparable(variant.plaza) !== normalizedPlaza) return false;
    if (normalizedAvailability.length && !normalizedAvailability.includes(variant.availability)) return false;
    if (!isPriceWithinBudgetRange(variant.price, budgetRange)) {
      return false;
    }
    if (!isSleepModeEligible(variant, normalizedSleepMode)) {
      return false;
    }
    return true;
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `~/.nvm/versions/node/v22.22.3/bin/node --test lib/products/catalog.test.mjs`
Expected: all tests PASS, including the 3 new ones and every pre-existing test (single-string filters like `technology: "bonell"` must still work since `toFilterList("bonell")` returns `["bonell"]`).

- [ ] **Step 5: Commit**

```bash
git add lib/products/catalog.mjs lib/products/catalog.test.mjs
git commit -m "feat(catalog): support multi-value technology/height/motion/availability filters"
```

---

### Task 2: Array-aware state, URL serialization, and chips in `lib/products/catalog-discovery.mjs`

**Files:**
- Modify: `lib/products/catalog-discovery.mjs`
- Test: `lib/products/catalog-discovery.test.mjs`

**Interfaces:**
- Consumes: `filterCatalogProducts` / `applyVariantFiltersToProduct` from Task 1 (already accept arrays for `technology`, `heightProfile`, `motionIsolation`, `availability`).
- Produces:
  - `getCatalogStateFromSearchParams(searchParams)` — `state.technology`, `state.heightProfile`, `state.motionIsolation`, `state.availability` are now always `string[]` (never `null`, empty array when absent).
  - `serializeCatalogState(state)` — unchanged signature, writes those 4 keys as comma-joined strings when non-empty.
  - `removeCatalogStateKey(state, key, value)` — new optional third parameter `value`; when provided and `key` is one of the 4 array keys, removes only that value from the array; otherwise behaves exactly as before (resets the key).
  - `clearCatalogState(state)` — the 4 array keys reset to `[]` instead of `null`.
  - `buildCatalogDiscoveryModel(...).activeFilterChips` — for the 4 array keys, contains one chip per array value (chip `key` stays the filter key, e.g. `"technology"`, so `removeCatalogStateKey(state, chip.key, chip.value)` can target the single value).

- [ ] **Step 1: Write the failing tests**

Add to `lib/products/catalog-discovery.test.mjs`:

```javascript
test("catalog state parses comma-separated multi-value filters from the URL", () => {
  const state = getCatalogStateFromSearchParams({
    technology: "bonell,pocket",
    availability: "available_now",
  });

  assert.deepEqual(state.technology, ["bonell", "pocket"]);
  assert.deepEqual(state.availability, ["available_now"]);
  assert.deepEqual(state.heightProfile, []);
  assert.deepEqual(state.motionIsolation, []);
});

test("catalog state serializes multi-value filters back as comma-separated params", () => {
  const serialized = serializeCatalogState({
    technology: ["bonell", "pocket"],
    heightProfile: [],
    availability: ["available_now"],
  });

  assert.equal(serialized, "technology=bonell%2Cpocket&availability=available_now");
});

test("removeCatalogStateKey with a value removes only that value from a multi-value filter", () => {
  const next = removeCatalogStateKey(
    { technology: ["bonell", "pocket"], availability: ["available_now"] },
    "technology",
    "bonell"
  );

  assert.deepEqual(next.technology, ["pocket"]);
  assert.deepEqual(next.availability, ["available_now"]);
});

test("removeCatalogStateKey without a value clears the whole multi-value filter", () => {
  const next = removeCatalogStateKey(
    { technology: ["bonell", "pocket"] },
    "technology"
  );

  assert.deepEqual(next.technology, []);
});

test("active filter chips include one chip per value for multi-value filters", () => {
  const model = buildCatalogDiscoveryModel(products, {
    technology: "bonell,pocket",
  });

  const technologyChips = model.activeFilterChips.filter((chip) => chip.key === "technology");
  assert.deepEqual(
    technologyChips.map((chip) => chip.value).sort(),
    ["bonell", "pocket"]
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `~/.nvm/versions/node/v22.22.3/bin/node --test lib/products/catalog-discovery.test.mjs`
Expected: FAIL — `state.technology` is currently a plain string or `null`, `removeCatalogStateKey` doesn't accept a third argument, `activeFilterChips` emits one chip per key not per value.

- [ ] **Step 3: Add `getListValue` and use it for the 4 array keys**

In `lib/products/catalog-discovery.mjs`, add next to `getSingleValue` (around line 73-77):

```javascript
function getListValue(searchParams, key) {
  const value = searchParams?.[key];
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
```

In `getCatalogStateFromSearchParams`, change the `technology`/`motionIsolation`/`heightProfile`/`availability` lines to:

```javascript
    technology: getListValue(searchParams, "technology").length
      ? getListValue(searchParams, "technology")
      : getListValue(searchParams, "coreTechnology"),
    motionIsolation: getListValue(searchParams, "motionIsolation"),
    heightProfile: getListValue(searchParams, "heightProfile"),
    availability: getListValue(searchParams, "availability"),
```

(`firmness`, `sleepPosition`, `sleepMode`, `saleType`, `category`, `measure` stay on `getSingleValue` — unchanged.)

- [ ] **Step 4: Update `serializeCatalogState` to join arrays**

```javascript
export function serializeCatalogState(state = {}) {
  const params = new URLSearchParams();

  URL_KEYS.forEach((key) => {
    if (key === "measure") {
      const nextValue = state.rawMeasure ?? state.measure;
      if (nextValue) params.set("measure", nextValue);
      return;
    }

    const value = state[key];
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","));
      return;
    }
    if (value != null && value !== "") params.set(key, value);
  });

  return params.toString();
}
```

- [ ] **Step 5: Update `removeCatalogStateKey` to accept an optional `value`**

```javascript
export function removeCatalogStateKey(state, key, value) {
  if (key === "measure") {
    return {
      ...state,
      measure: null,
      rawMeasure: null,
      measureWarning: null,
    };
  }

  if (key === "budget") {
    return {
      ...state,
      budgetMin: null,
      budgetMax: null,
    };
  }

  if (Array.isArray(state[key])) {
    return {
      ...state,
      [key]: value == null ? [] : state[key].filter((entry) => entry !== value),
    };
  }

  return {
    ...state,
    [key]: null,
  };
}
```

- [ ] **Step 6: Update `clearCatalogState` to reset array keys to `[]`**

```javascript
export function clearCatalogState(state = {}) {
  return {
    ...state,
    q: "",
    saleType: null,
    category: null,
    budgetMin: null,
    budgetMax: null,
    firmness: null,
    sleepPosition: null,
    sleepMode: null,
    technology: [],
    motionIsolation: [],
    heightProfile: [],
    availability: [],
    measure: null,
    rawMeasure: null,
    measureWarning: null,
  };
}
```

- [ ] **Step 7: Update `activeFilterChips` in `buildCatalogDiscoveryModel` to emit one chip per value**

Add a module-level constant near `FILTER_LABELS` (top of file):

```javascript
const MULTI_VALUE_FILTER_KEYS = new Set(["technology", "motionIsolation", "heightProfile", "availability"]);
```

Replace the existing `activeFilterChips` block inside `buildCatalogDiscoveryModel`:

```javascript
  const activeFilterChips = ["saleType", "technology", "motionIsolation", "heightProfile", "availability", "category"]
    .flatMap((key) => {
      const value = effectiveState[key];
      if (MULTI_VALUE_FILTER_KEYS.has(key)) {
        return (Array.isArray(value) ? value : []).map((entry) =>
          buildChip(key, entry, getChipLabel(key, entry), "filter")
        );
      }
      return value ? [buildChip(key, value, getChipLabel(key, value), "filter")] : [];
    });
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `~/.nvm/versions/node/v22.22.3/bin/node --test lib/products/catalog-discovery.test.mjs lib/products/catalog.test.mjs`
Expected: all tests PASS, including every pre-existing test in both files.

- [ ] **Step 9: Commit**

```bash
git add lib/products/catalog-discovery.mjs lib/products/catalog-discovery.test.mjs
git commit -m "feat(catalog): model technology/height/motion/availability filters as arrays in state and URL"
```

---

### Task 3: `FilterCollapseGroup` UI component and wiring in `CatalogExperience.jsx`

**Files:**
- Modify: `components/catalog/CatalogExperience.jsx`
- Modify: `components/catalog/CatalogExperience.module.css`

**Interfaces:**
- Consumes: `model.state.technology/motionIsolation/heightProfile/availability` (now `string[]`, from Task 2), `model.state.measure`/`model.state.saleType` (still single value), `handleFieldChange(key, value)` (already exists, unchanged signature — `value` can now be an array), `removeCatalogStateKey` (now accepts a third `value` arg, from Task 2), `model.filterOptions.*` (unchanged shape: `{ value, label }[]`).
- Produces: `FilterCollapseGroup({ title, options, values, onChange, exclusive, defaultOpen })` — a local component in this file, not exported elsewhere.

- [ ] **Step 1: Add the `FilterCollapseGroup` component**

Add this after the `SelectFilter` function definition (it replaces `SelectFilter` and `ChoiceGroup` in Step 3, but write it alongside first so both exist during the transition):

```jsx
function FilterCollapseGroup({ title, options, values, onChange, exclusive = false, defaultOpen = false }) {
  const groupId = useId();
  const selectedValues = exclusive ? (values ? [values] : []) : values ?? [];
  const isOpen = defaultOpen || selectedValues.length > 0;

  const toggleValue = (optionValue) => {
    if (exclusive) {
      onChange(values === optionValue ? null : optionValue);
      return;
    }

    const next = selectedValues.includes(optionValue)
      ? selectedValues.filter((entry) => entry !== optionValue)
      : [...selectedValues, optionValue];
    onChange(next);
  };

  return (
    <details className={styles.filterCollapseGroup} open={isOpen}>
      <summary className={styles.filterCollapseSummary}>
        {title}
        {selectedValues.length ? (
          <span className={styles.filterCollapseCount}>{selectedValues.length}</span>
        ) : null}
      </summary>
      <div className={styles.filterCollapseOptions}>
        {options.map((option) => {
          const inputId = `${groupId}-${option.value}`;
          return (
            <label key={option.value} className={styles.filterCollapseOption} htmlFor={inputId}>
              <input
                id={inputId}
                type={exclusive ? "radio" : "checkbox"}
                name={exclusive ? groupId : undefined}
                checked={selectedValues.includes(option.value)}
                onChange={() => toggleValue(option.value)}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </details>
  );
}
```

- [ ] **Step 2: Replace the `decisionControls` and `advancedFilters` blocks with `FilterCollapseGroup` instances**

In `filtersSection` (the `!model.isAccessoryMode ? (...) : null` block), replace the `decisionControls` div and the `advancedFilters` details block with:

```jsx
          <div className={styles.filterCollapseList}>
            <FilterCollapseGroup
              title="Medida"
              options={model.filterOptions.measures}
              values={model.state.measure}
              onChange={(value) => handleFieldChange("measure", value)}
              exclusive
            />

            <FilterCollapseGroup
              title="Presentación"
              options={model.filterOptions.saleTypes.map((option) => ({
                value: option.value,
                label: option.value === "mattress" ? "Solo colchón" : "Colchón + sommier",
              }))}
              values={model.state.saleType}
              onChange={(value) => handleFieldChange("saleType", value)}
              exclusive
            />

            <FilterCollapseGroup
              title="Tecnología"
              options={model.filterOptions.technologies.map((option) => ({
                value: option.value,
                label:
                  option.value === "bonell"
                    ? "Resortes tradicionales"
                    : option.value === "pocket"
                      ? "Resortes pocket"
                      : option.label,
              }))}
              values={model.state.technology}
              onChange={(value) => handleFieldChange("technology", value)}
            />

            <FilterCollapseGroup
              title="Aislación de movimiento"
              options={model.filterOptions.motionIsolationLevels}
              values={model.state.motionIsolation}
              onChange={(value) => handleFieldChange("motionIsolation", value)}
            />

            <FilterCollapseGroup
              title="Altura"
              options={model.filterOptions.heightProfiles}
              values={model.state.heightProfile}
              onChange={(value) => handleFieldChange("heightProfile", value)}
            />

            <FilterCollapseGroup
              title="Disponibilidad"
              options={model.filterOptions.availability}
              values={model.state.availability}
              onChange={(value) => handleFieldChange("availability", value)}
            />
          </div>
```

- [ ] **Step 3: Delete the now-unused `SelectFilter` and `ChoiceGroup` component definitions**

First confirm they're no longer used elsewhere in the file: `grep -n "ChoiceGroup\|SelectFilter" components/catalog/CatalogExperience.jsx` — note that `ChoiceGroup` is still used further down in the file, in the selector-section (firmness/sleep position/sleep mode questions), which is NOT part of this change. **Only delete `SelectFilter`** — keep `ChoiceGroup` since it has other live callers outside `filtersSection`.

- [ ] **Step 4: Wire chip removal to pass the individual value**

In the `filtersSection`'s `activeChipRow` block, change the `onClick`:

```jsx
                <button
                  key={`${chip.kind}-${chip.key}`}
                  type="button"
                  className={`${styles.activeChip} ${
                    chip.kind === "selector" ? styles.activeChipGuided : ""
                  }`}
                  onClick={() => replaceState(removeCatalogStateKey(model.state, chip.key, chip.value))}
                >
                  {chip.label} <span aria-hidden="true">×</span>
                </button>
```

(only the `onClick` line changes — `chip.value` is already available on every chip object from `buildChip(key, value, label, kind)`; for single-value keys `removeCatalogStateKey` ignores the third argument, so this is safe for all chip kinds.)

- [ ] **Step 5: Add CSS for the new component, remove CSS exclusive to the deleted `SelectFilter`**

In `components/catalog/CatalogExperience.module.css`: first run `grep -n "decisionControls\|advancedFilters\|advancedFilterGrid\|advancedFilterGroup\|selectFilter\|selectFilterLabel\|selectFilterDescription\|selectFilterInput"` to find exact line ranges (they will have shifted from earlier edits in this plan), then delete those rule blocks — they are exclusive to the removed `SelectFilter`/advanced-filters markup. Do **not** touch `.choiceGrid`, `.choiceBtn`, `.choiceBtnActive`, `.groupLabel` — those are still used by the "related categories" empty-state block and by the remaining `ChoiceGroup` usages in the selector section.

Add:

```css
.filterCollapseList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filterCollapseGroup {
  border: 1px solid rgba(18, 58, 63, 0.12);
  border-radius: var(--radius, 12px);
  padding: 0;
  background: #fff;
}

.filterCollapseSummary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  cursor: pointer;
  font-weight: 700;
  color: var(--color-primary);
  list-style: none;
}

.filterCollapseSummary::-webkit-details-marker {
  display: none;
}

.filterCollapseCount {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--radius-full, 999px);
  background: var(--color-primary);
  color: #fff;
  font-size: 0.75rem;
}

.filterCollapseOptions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 14px 14px;
}

.filterCollapseOption {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  cursor: pointer;
}
```

- [ ] **Step 6: Manual verification in preview**

Start the dev server (this session's own instance — do not reuse another session's), navigate to `/catalog`.

Check:
- All 6 groups (Medida, Presentación, Tecnología, Aislación de movimiento, Altura, Disponibilidad) render as collapsed `<details>` by default.
- Checking "Resortes tradicionales" and "Resortes pocket" under Tecnología shows products with either technology, and the URL gets `?technology=bonell,pocket`.
- The "Selección actual" row shows two separate chips, one per technology; clicking the "×" on one removes only that value (the other stays checked and the other products stay filtered).
- Reloading `/catalog?technology=bonell,pocket` opens the Tecnología group automatically with both boxes checked.
- Medida and Presentación still only allow one value at a time (radio behavior).
- "Limpiar todo" clears every group back to unchecked/collapsed.

- [ ] **Step 7: Commit**

```bash
git add components/catalog/CatalogExperience.jsx components/catalog/CatalogExperience.module.css
git commit -m "feat(catalog): render filter bar as collapsible checkbox/radio groups"
```

---

## Self-Review Notes

- Spec coverage: Section A (state/URL) → Task 2. Section B (filtering) → Task 1. Section C (UI) → Task 3 Steps 1-3, 5. Section D (chip removal) → Task 3 Step 4. Testing section → Task 1 Step 1, Task 2 Step 1, Task 3 Step 6.
- Type consistency checked: `handleFieldChange(key, value)` signature is untouched across all tasks — it already spreads `[key]: value` into state, so passing an array through it needs no changes there. `removeCatalogStateKey(state, key, value)` signature matches between Task 2 (definition) and Task 3 Step 4 (call site). `FilterCollapseGroup` prop names (`values`, `onChange`, `exclusive`, `defaultOpen`) are consistent between Step 1 (definition) and Step 2 (usage).
- Corrected during self-review: the original draft said to delete both `SelectFilter` and `ChoiceGroup`, but `ChoiceGroup` has live callers outside `filtersSection` (the selector-section firmness/sleep-position/sleep-mode questions further down in the same file) — only `SelectFilter` is safe to delete. CSS classes `.choiceGrid`/`.choiceBtn`/`.choiceBtnActive`/`.groupLabel` must be kept for the same reason.
